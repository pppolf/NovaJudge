"use server";

import { ContestConfig } from "@/app/(main)/page";
import { getCurrentSuper, verifyAuth } from "@/lib/auth";
import { ContestRole, Verdict } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { judgeQueue } from "@/lib/queue";
import { redis } from "@/lib/redis";

async function getNextDisplayId(contestId: number) {
  const key = `contest:${contestId}:display_id`;
  const nextId = await redis.incr(key);

  // 如果 nextId === 1，说明 Key 刚被创建
  if (nextId === 1) {
    const lastSubmission = await prisma.submission.findFirst({
      where: { contestId },
      orderBy: { displayId: "desc" },
      select: { displayId: true },
    });

    const dbMaxId = lastSubmission?.displayId || 0;

    // 如果数据库里已经有记录 (例如 dbMaxId = 100)
    if (dbMaxId >= 1) {
      // 补齐差值: incrby(key, 100) -> 1 + 100 = 101
      // 这样就从 101 开始了
      return await redis.incrby(key, dbMaxId);
    }
  }

  return nextId;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 提交代码
export async function submitCode(
  contestId: number,
  problemDisplayId: string,
  language: string,
  code: string,
) {
  try {
    const cookieStore = await cookies();
    const teamToken = cookieStore.get("user_token")?.value;
    const globalPayload = await getCurrentSuper();
    if (!teamToken && !globalPayload) return { error: "请登录后再提交" };

    // 解析 Token 获取当前用户 ID
    const teamPayload = teamToken ? await verifyAuth(teamToken) : null;
    if (!teamPayload && !globalPayload) return { error: "Invalid Token" };

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
      return { error: "Problem not found in this contest" };
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
    // 团队选手：沿用封榜限制；全局普通用户：仅允许比赛结束后提交（不受封榜限制）
    if (userId) {
      if (isEnded && isFrozen && !isAdmin) {
        return {
          error: "禁止提交：比赛已结束且处于封榜期间，请等待解榜后再尝试提交。",
        };
      }
    } else if (globalUserId) {
      if (!isEnded) {
        return { error: "仅支持比赛结束后的赛后提交" };
      }
    } else {
      return { error: "Invalid submitter" };
    }

    // 使用 Redis 获取自增 ID
    const nextId = await getNextDisplayId(contestId);

    // 2. 创建提交
    const submission = await prisma.submission.create({
      data: {
        displayId: nextId,
        code,
        language,
        contestId,
        problemId: contestProblem.problemId,
        userId: userId || null,
        globalUserId: globalUserId || null,
        verdict: Verdict.PENDING,
        codeLength: code.length,
      },
    });

    await judgeQueue.add("judge", {
      submissionId: submission.id,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return { error: e.message || "Failed to submit" };
  }

  redirect(`/contest/${contestId}/status`);
}
