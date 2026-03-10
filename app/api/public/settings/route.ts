import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // 获取设置，如果不存在则创建默认值
  const setting = await prisma.systemSetting.findUnique({
    where: { id: "default" },
    select: { allowExternalLogin: true }, // 只返回公开字段
  });

  if (!setting) {
    // 如果没有配置，默认为 true
    return NextResponse.json({ allowExternalLogin: true });
  }

  return NextResponse.json(setting);
}
