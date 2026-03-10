import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSuper } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentSuper();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const contests = await prisma.contest.findMany({
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
      title: true,
    },
  });

  return NextResponse.json(contests);
}
