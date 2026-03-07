
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey) {
      const user = await validateApiKey(apiKey);
      if (!user) {
        return NextResponse.json({ error: "Invalid API Key" }, { status: 403 });
      }
    }

    const { contestId } = await params;
    const contestIdNumber = parseInt(contestId, 10);

    if (isNaN(contestIdNumber)) {
      return NextResponse.json({ error: "Invalid contestId" }, { status: 400 });
    }

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
