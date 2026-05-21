import { ContestRole, Verdict } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { judgeQueue } from "@/lib/queue";
import { redis } from "@/lib/redis";

type ContestFreezeConfig = {
  frozenDuration?: number;
};

const QUEUE_TIMEOUT_MS = 5000;

export type SubmissionActor =
  | {
      type: "contest";
      userId: string;
      role: string;
      isGlobalAdmin?: boolean;
    }
  | {
      type: "global";
      globalUserId: string;
      isGlobalAdmin?: boolean;
    };

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
) {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function getNextDisplayId(contestId: number) {
  const key = `contest:${contestId}:display_id`;
  const nextId = await withTimeout(
    redis.incr(key),
    QUEUE_TIMEOUT_MS,
    "Redis is unavailable while generating submission id.",
  );

  if (nextId === 1) {
    const lastSubmission = await prisma.submission.findFirst({
      where: { contestId },
      orderBy: { displayId: "desc" },
      select: { displayId: true },
    });

    const dbMaxId = lastSubmission?.displayId || 0;
    if (dbMaxId >= 1) {
      return await withTimeout(
        redis.incrby(key, dbMaxId),
        QUEUE_TIMEOUT_MS,
        "Redis is unavailable while syncing submission id.",
      );
    }
  }

  return nextId;
}

export async function createContestSubmission({
  contestId,
  problemDisplayId,
  language,
  code,
  actor,
}: {
  contestId: number;
  problemDisplayId: string;
  language: string;
  code: string;
  actor: SubmissionActor;
}) {
  const contestProblem = await prisma.contestProblem.findFirst({
    where: {
      contestId,
      displayId: problemDisplayId,
    },
    include: {
      contest: true,
      problem: { select: { title: true } },
    },
  });

  if (!contestProblem) {
    throw new Error("Problem not found in this contest");
  }

  const now = new Date();
  const contest = contestProblem.contest;
  const config = contest.config as ContestFreezeConfig | null;
  const isEnded = now > contest.endTime;

  let isFrozen = false;
  if (config?.frozenDuration) {
    const freezeTime = new Date(
      contest.endTime.getTime() - config.frozenDuration * 60 * 1000,
    );
    isFrozen = now >= freezeTime;
  }

  if (actor.type === "contest") {
    if (actor.role !== ContestRole.TEAM) {
      throw new Error("Only contest teams can submit code.");
    }

    if (isEnded && isFrozen) {
      throw new Error(
        "Submissions are disabled while the ended contest is still frozen.",
      );
    }
  } else if (!isEnded) {
    throw new Error("Global users can submit only after the contest ends.");
  }

  const nextId = await getNextDisplayId(contestId);

  const submission = await prisma.submission.create({
    data: {
      displayId: nextId,
      code,
      language,
      contestId,
      problemId: contestProblem.problemId,
      userId: actor.type === "contest" ? actor.userId : null,
      globalUserId: actor.type === "global" ? actor.globalUserId : null,
      verdict: Verdict.PENDING,
      codeLength: code.length,
    },
  });

  try {
    await withTimeout(
      judgeQueue.add("judge", {
        submissionId: submission.id,
      }),
      QUEUE_TIMEOUT_MS,
      "Judge queue is unavailable. Please contact staff.",
    );
  } catch (error) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        verdict: Verdict.SYSTEM_ERROR,
        errorMessage:
          error instanceof Error ? error.message : "Judge queue unavailable.",
      },
    });
    throw error;
  }

  return {
    id: submission.id,
    displayId: submission.displayId,
    contestId,
    problemId: contestProblem.problemId,
    problemDisplayId,
    problemTitle: contestProblem.problem.title,
    language,
    verdict: submission.verdict,
    submittedAt: submission.submittedAt,
  };
}
