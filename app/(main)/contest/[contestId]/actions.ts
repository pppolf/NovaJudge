"use server";

import { signAuth, verifyAuth } from "@/lib/auth";
import { ContestStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 比赛用户登录
export async function loginContestUser(contestId: number, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  // console.log(username, password);
  if (!username || !password) throw new Error("Username and password required");
  const user = await prisma.user.findFirst({
    where: {
      username,
      contestId: contestId,
    },
  });
  // 2. 验证用户和密码
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid credentials");
  }
  // 3. 生成 Token
  const token = await signAuth({
    userId: user.id,
    username: user.username,
    role: user.role,
    contestId: user.contestId,
    isGlobalAdmin: false,
  });

  // 4. 设置 Cookie
  const cookieStore = await cookies();
  cookieStore.set("user_token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.ENABLE_SECURE_COOKIE === "true",
  });

  // 5. 重定向到比赛主页
  redirect(`/contest/${contestId}?login=true`);
}

// 开始虚拟参赛
export async function startVirtualContest(contestId: number) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;

  if (!authToken) {
    throw new Error("请先登录外部账号才能进行虚拟参赛");
  }

  const payload = await verifyAuth(authToken);

  // 仅限外部登录用户（非超级管理员）
  if (!payload?.userId || payload.isGlobalAdmin) {
    throw new Error("只有外部登录用户可以进行虚拟参赛");
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { status: true },
  });

  if (!contest) throw new Error("比赛不存在");

  if (contest.status !== ContestStatus.ENDED) {
    throw new Error("只能对已结束的比赛进行虚拟参赛");
  }

  // 检查是否已有 VP 会话
  const existing = await prisma.virtualContest.findUnique({
    where: {
      globalUserId_contestId: {
        globalUserId: payload.userId,
        contestId,
      },
    },
  });

  if (existing) {
    throw new Error("你已经参加过此比赛的虚拟参赛");
  }

  await prisma.virtualContest.create({
    data: {
      globalUserId: payload.userId,
      contestId,
    },
  });

  redirect(`/contest/${contestId}?vp=started`);
}

