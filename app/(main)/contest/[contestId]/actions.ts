"use server";

import { signAuth } from "@/lib/auth";
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
