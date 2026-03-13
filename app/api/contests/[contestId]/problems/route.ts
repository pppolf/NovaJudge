import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateApiKey,
  getCurrentUser,
  getCurrentSuper,
  UserJwtPayload,
} from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const { contestId } = await params;
    const contestIdNumber = parseInt(contestId, 10);

    if (isNaN(contestIdNumber)) {
      return NextResponse.json({ error: "Invalid contestId" }, { status: 400 });
    }

    // --- 鉴权逻辑 ---
    // 先获取比赛信息判断类型
    const contest = await prisma.contest.findUnique({
      where: { id: contestIdNumber },
      select: { type: true },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    let isAuthenticated = false;

    // 如果是公开比赛，默认允许访问（除非有其他限制）
    // 但如果你的逻辑是“任何比赛的题目列表都需要登录”，则保持原样。
    // 这里按照你的需求：私有赛必须登录。
    if (contest.type === "PUBLIC") {
      isAuthenticated = true;
    } else {
      // 私有赛：必须鉴权

      // 1. 尝试 API Key
      const apiKey = request.headers.get("x-api-key");
      if (apiKey) {
        const user = await validateApiKey(apiKey);
        if (user) {
          isAuthenticated = true;
        }
      }

      // 2. 尝试用户登录态 (比赛账号 或 全局超管)
      if (!isAuthenticated) {
        const user = await getCurrentUser();
        const superAdmin = await getCurrentSuper();
        const userPayload = user as UserJwtPayload | null;

        if (superAdmin) {
          isAuthenticated = true;
        } else if (userPayload && userPayload.contestId === contestIdNumber) {
          isAuthenticated = true;
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // --- 鉴权结束 ---

    const contestProblems = await prisma.contestProblem.findMany({
      where: {
        contestId: contestIdNumber,
      },
      include: {
        problem: true,
      },
      orderBy: {
        displayId: "asc",
      },
    });

    const result = contestProblems.map((cp) => {
      // 优先使用 ContestProblem 中的限制，如果没有则使用 Problem 中的默认限制
      const timeLimit = cp.realTimeLimit ?? cp.problem.defaultTimeLimit;
      const memoryLimit = cp.realMemoryLimit ?? cp.problem.defaultMemoryLimit;

      return {
        displayId: cp.displayId,
        name: cp.problem.title,
        time: timeLimit,
        memory: memoryLimit,
        score: 100, // 默认分数
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get problems error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
