// app/admin/contests/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { ContestType, ContestStatus } from "@/lib/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// 创建比赛
export async function createContest(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const startTimeStr = formData.get("startTime") as string;
  const endTimeStr = formData.get("endTime") as string;
  const type = formData.get("type") as ContestType;
  const password = formData.get("password") as string;
  const visible = formData.get("visible") === "true";

  // --- 获取 Config 配置字段 ---
  // 封榜/解榜
  const frozenDuration = Number(formData.get("frozenDuration") || 0); // 分钟
  const unfreezeDelay = Number(formData.get("unfreezeDelay") || 300); // 小时

  // 奖牌设置
  const medalMode = formData.get("medalMode") as "ratio" | "fixed";
  const gold = Number(formData.get("medal_gold") || 0);
  const silver = Number(formData.get("medal_silver") || 0);
  const bronze = Number(formData.get("medal_bronze") || 0);

  const config = {
    frozenDuration, // 封榜时长 (分钟)，0 表示不封榜
    unfreezeDelay, // 多少小时后自动解榜
    medal: {
      mode: medalMode, // 'ratio' | 'fixed'
      gold,
      silver,
      bronze,
    },
  };

  // 简单的校验
  if (!title || !startTimeStr || !endTimeStr) {
    throw new Error("Missing required fields");
  }

  const startTime = new Date(startTimeStr);
  const endTime = new Date(endTimeStr);

  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }

  await prisma.contest.create({
    data: {
      title,
      description,
      startTime,
      endTime,
      type,
      password: password || null,
      status: ContestStatus.PENDING,
      visible,
      config: config,
    },
  });

  revalidatePath("/admin/contests");
  redirect("/admin/contests");
}

// 获取比赛列表
export async function getContests(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [contests, total] = await Promise.all([
    prisma.contest.findMany({
      skip,
      take: pageSize,
      orderBy: { id: "desc" },
      include: {
        _count: {
          select: {
            problems: true,
            users: true,
          },
        },
      },
    }),
    prisma.contest.count(),
  ]);
  return { contests, total };
}

export async function toggleContestVisibility(id: number, visible: boolean) {
  await prisma.contest.update({
    where: { id },
    data: { visible },
  });
  revalidatePath("/admin/contests");
  revalidatePath("/");
}
