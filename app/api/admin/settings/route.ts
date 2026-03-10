
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSuper, UserJwtPayload } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentSuper();
  if (!admin || (admin as UserJwtPayload).isGlobalAdmin !== true) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 获取设置，如果不存在则创建默认值
  let setting = await prisma.systemSetting.findUnique({
    where: { id: "default" },
  });

  if (!setting) {
    setting = await prisma.systemSetting.create({
      data: { id: "default" },
    });
  }

  return NextResponse.json(setting);
}

export async function PUT(req: NextRequest) {
  const admin = await getCurrentSuper();
  if (!admin || (admin as UserJwtPayload).isGlobalAdmin !== true) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { allowExternalLogin } = body;

    const setting = await prisma.systemSetting.upsert({
      where: { id: "default" },
      update: {
        allowExternalLogin,
      },
      create: {
        id: "default",
        allowExternalLogin,
      },
    });

    return NextResponse.json(setting);
  } catch (e) {
    console.error(e);
    return new NextResponse("Error updating settings", { status: 500 });
  }
}
