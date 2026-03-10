import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSuper } from "@/lib/auth";

// 获取目录结构
export async function GET() {
  const admin = await getCurrentSuper();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const nodes = await prisma.trainingNode.findMany({
    orderBy: {
      rank: "asc",
    },
    include: {
      contest: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return NextResponse.json(nodes);
}

// 创建节点 (文件夹或比赛)
export async function POST(req: NextRequest) {
  const admin = await getCurrentSuper();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, type, parentId, contestId, rank, slug } = body;

    const node = await prisma.trainingNode.create({
      data: {
        name,
        type, // "FOLDER" | "CONTEST"
        slug: slug || null,
        parentId: parentId || null,
        contestId: contestId ? parseInt(contestId) : null,
        rank: rank || 0,
      },
    });

    return NextResponse.json(node);
  } catch (e) {
    console.error(e);
    return new NextResponse("Error creating node", { status: 500 });
  }
}

// 更新节点 (移动、重命名)
export async function PUT(req: NextRequest) {
  const admin = await getCurrentSuper();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, parentId, rank, slug } = body;

    const node = await prisma.trainingNode.update({
      where: { id },
      data: {
        name,
        slug: slug || null,
        parentId,
        rank,
      },
    });

    return NextResponse.json(node);
  } catch (e) {
    console.error(e);
    return new NextResponse("Error updating node", { status: 500 });
  }
}

// 删除节点
export async function DELETE(req: NextRequest) {
  const admin = await getCurrentSuper();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing id", { status: 400 });
    }

    await prisma.trainingNode.delete({
      where: { id },
    });

    return new NextResponse("Deleted", { status: 200 });
  } catch (e) {
    console.error(e);
    return new NextResponse("Error deleting node", { status: 500 });
  }
}
