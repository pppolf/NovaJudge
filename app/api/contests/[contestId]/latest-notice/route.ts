import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClariCategory } from "@/lib/generated/prisma/enums";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const contestId = parseInt((await params).contestId);
  if (isNaN(contestId)) return NextResponse.json({ success: false });

  try {
    const latestNotice = await prisma.clarification.findFirst({
      where: {
        contestId,
        category: ClariCategory.NOTICE,
        isPublic: true,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    });

    return NextResponse.json({ success: true, data: latestNotice });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
