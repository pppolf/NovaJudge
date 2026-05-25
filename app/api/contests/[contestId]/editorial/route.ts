import { getCurrentSuper, getCurrentUser, UserJwtPayload } from "@/lib/auth";
import { ContestStatus, ContestType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import path from "node:path";

type ContestConfig = {
  editorialPdf?: {
    filename: string;
    uploadedAt: string;
  };
};

function getEditorialPdfPath(contestId: number) {
  return path.join(
    process.cwd(),
    "uploads",
    "contests",
    contestId.toString(),
    "editorial.pdf",
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  const id = Number(contestId);

  if (!Number.isInteger(id)) {
    return new NextResponse("Invalid contest id", { status: 400 });
  }

  const contest = await prisma.contest.findUnique({
    where: { id },
    select: {
      config: true,
      status: true,
      type: true,
    },
  });

  if (!contest) {
    return new NextResponse("Contest not found", { status: 404 });
  }

  const user = (await getCurrentUser()) as UserJwtPayload | null;
  const superUser = (await getCurrentSuper()) as UserJwtPayload | null;
  const isGlobalAdmin = !!superUser?.isGlobalAdmin;
  const isContestUser = user?.contestId === id;

  if (contest.type === ContestType.PRIVATE && !isGlobalAdmin && !isContestUser) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const config = (contest.config as ContestConfig | null) || {};

  if (contest.status !== ContestStatus.ENDED || !config.editorialPdf) {
    return new NextResponse("Editorial is not available", { status: 404 });
  }

  try {
    const file = await fs.readFile(getEditorialPdfPath(id));
    return new NextResponse(file, {
      headers: {
        "Content-Disposition": `inline; filename="${config.editorialPdf.filename}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch {
    return new NextResponse("Editorial PDF not found", { status: 404 });
  }
}
