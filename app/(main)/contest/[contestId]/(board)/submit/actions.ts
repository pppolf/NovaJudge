"use server";

import { ContestConfig } from "@/app/(main)/page";
import { verifyAuth } from "@/lib/auth";
import { ContestRole, Verdict } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { judgeQueue } from "@/lib/queue";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 提交代码
export async function submitCode(
  contestId: number,
  problemDisplayId: string,
  language: string,
  code: string,
) {
  const cookieStore = await cookies();
  const teamToken = cookieStore.get("user_token")?.value;
  const globalToken = cookieStore.get("auth_token")?.value;
  if (!teamToken && !globalToken) throw new Error("Unauthorized");

  // 解析 Token 获取当前用户 ID
  const teamPayload = teamToken ? await verifyAuth(teamToken) : null;
  const globalPayload = globalToken ? await verifyAuth(globalToken) : null;
  if (!teamPayload && !globalPayload) throw new Error("Invalid Token");

  const userId = teamPayload?.userId || null;
  const globalUserId =
    !userId && globalPayload?.userId ? String(globalPayload.userId) : null;

  const contestProblem = await prisma.contestProblem.findFirst({
    where: {
      contestId,
      displayId: problemDisplayId,
    },
    include: {
      contest: true,
    },
  });

  if (!contestProblem) {
    throw new Error("Problem not found in this contest");
  }

  const contest = contestProblem.contest;

  // === 新增逻辑开始 ===
  const now = new Date();
  const config = contest.config as ContestConfig;
  const isEnded = now > contest.endTime;

  // 计算封榜开始时间
  let isFrozen = false;
  if (config && config.frozenDuration) {
    const freezeTime = new Date(
      contest.endTime.getTime() - config.frozenDuration * 60 * 1000,
    );
    // 如果当前时间已过封榜线，即为封榜状态（无论是否比赛结束，直到管理员修改配置解榜）
    isFrozen = now >= freezeTime;
  }

  // 校验：比赛结束 && 封榜期间 && 非全局管理员/比赛管理员 -> 禁止提交
  // (防止用户在封榜未揭晓前通过 Upsolving 试探结果)
  const isAdmin =
    teamPayload?.role === ContestRole.ADMIN ||
    teamPayload?.role === ContestRole.JUDGE ||
    teamPayload?.isGlobalAdmin ||
    globalPayload?.isGlobalAdmin;
  // console.log(isEnded, isFrozen, isAdmin);

  // 检查是否有活跃的 VP 会话（仅对外部登录的非管理员用户）
  let virtualContestId: string | null = null;
  if (globalUserId && !globalPayload?.isGlobalAdmin) {
    const vpSession = await prisma.virtualContest.findUnique({
      where: {
        globalUserId_contestId: {
          globalUserId,
          contestId,
        },
      },
      include: {
        contest: {
          select: { startTime: true, endTime: true },
        },
      },
    });

    if (vpSession) {
      const contestDurationMs =
        vpSession.contest.endTime.getTime() -
        vpSession.contest.startTime.getTime();
      const vpEndTime = new Date(
        vpSession.startedAt.getTime() + contestDurationMs,
      );

      if (now <= vpEndTime) {
        // VP 会话仍在进行中，允许提交并标记为 VP 提交
        virtualContestId = vpSession.id;
      }
      // VP 已结束：回落到普通赛后提交逻辑（isEnded 检查）
    }
  }

  // 团队选手：沿用封榜限制；全局普通用户：根据 VP 状态或赛后提交逻辑处理
  if (userId) {
    if (isEnded && isFrozen && !isAdmin) {
      throw new Error(
        "禁止提交：比赛已结束且处于封榜期间，请等待解榜后再尝试提交。",
      );
    }
  } else if (globalUserId) {
    if (virtualContestId === null) {
      // 没有活跃 VP：仅允许比赛结束后的赛后提交
      if (!isEnded) {
        throw new Error("仅支持比赛结束后的赛后提交");
      }
    }
    // 有活跃 VP：已在上面的 VP 检查中通过
  } else {
    throw new Error("Invalid submitter");
  }

  // 使用事务处理 displayId 自增，防止并发冲突
  // 1. 查找当前比赛最大的 displayId
  const submission = await prisma.$transaction(async (tx) => {
    const lastSubmission = await tx.submission.findFirst({
      where: { contestId },
      orderBy: { displayId: "desc" },
      select: { displayId: true },
    });

    const nextId = (lastSubmission?.displayId || 0) + 1;

    // 2. 创建提交
    return await tx.submission.create({
      data: {
        displayId: nextId,
        code,
        language,
        contestId,
        problemId: contestProblem.problemId,
        userId: userId || null,
        globalUserId: globalUserId || null,
        virtualContestId: virtualContestId || null,
        verdict: Verdict.PENDING,
        codeLength: code.length,
      },
    });
  });
  await judgeQueue.add("judge", {
    submissionId: submission.id,
  });

  redirect(`/contest/${contestId}/status`);
}

