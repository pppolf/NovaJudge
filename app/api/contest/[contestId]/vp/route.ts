import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { ContestStatus } from "@/lib/generated/prisma/client";

interface Params {
  params: Promise<{ contestId: string }>;
}

// GET /api/contest/[contestId]/vp - 获取当前用户的 VP 状态
export async function GET(_req: Request, { params }: Params) {
  const { contestId } = await params;
  const cid = Number(contestId);

  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  if (!authToken) {
    return NextResponse.json({ vpSession: null });
  }

  let payload;
  try {
    payload = await verifyAuth(authToken);
  } catch {
    return NextResponse.json({ vpSession: null });
  }

  // 仅限外部登录用户（非超级管理员）
  if (!payload?.userId || payload.isGlobalAdmin) {
    return NextResponse.json({ vpSession: null });
  }

  const vpSession = await prisma.virtualContest.findUnique({
    where: {
      globalUserId_contestId: {
        globalUserId: payload.userId,
        contestId: cid,
      },
    },
    include: {
      contest: {
        select: { startTime: true, endTime: true },
      },
    },
  });

  if (!vpSession) {
    return NextResponse.json({ vpSession: null });
  }

  const contestDurationMs =
    vpSession.contest.endTime.getTime() -
    vpSession.contest.startTime.getTime();
  const vpEndTime = new Date(vpSession.startedAt.getTime() + contestDurationMs);

  return NextResponse.json({
    vpSession: {
      id: vpSession.id,
      startedAt: vpSession.startedAt.toISOString(),
      vpEndTime: vpEndTime.toISOString(),
      contestDurationMs,
    },
  });
}

// POST /api/contest/[contestId]/vp - 开始虚拟参赛
export async function POST(_req: Request, { params }: Params) {
  const { contestId } = await params;
  const cid = Number(contestId);

  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  if (!authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyAuth(authToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 仅限外部登录用户（非超级管理员）
  if (!payload?.userId || payload.isGlobalAdmin) {
    return NextResponse.json(
      { error: "只有外部登录用户可以进行虚拟参赛" },
      { status: 403 },
    );
  }

  const contest = await prisma.contest.findUnique({
    where: { id: cid },
    select: { status: true, startTime: true, endTime: true },
  });

  if (!contest) {
    return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
  }

  if (contest.status !== ContestStatus.ENDED) {
    return NextResponse.json(
      { error: "只能对已结束的比赛进行虚拟参赛" },
      { status: 400 },
    );
  }

  // 检查是否已有 VP 会话
  const existing = await prisma.virtualContest.findUnique({
    where: {
      globalUserId_contestId: {
        globalUserId: payload.userId,
        contestId: cid,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "你已经参加过此比赛的虚拟参赛" },
      { status: 400 },
    );
  }

  const vpSession = await prisma.virtualContest.create({
    data: {
      globalUserId: payload.userId,
      contestId: cid,
    },
  });

  const contestDurationMs =
    contest.endTime.getTime() - contest.startTime.getTime();
  const vpEndTime = new Date(vpSession.startedAt.getTime() + contestDurationMs);

  return NextResponse.json({
    vpSession: {
      id: vpSession.id,
      startedAt: vpSession.startedAt.toISOString(),
      vpEndTime: vpEndTime.toISOString(),
      contestDurationMs,
    },
  });
}
