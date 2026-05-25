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

async function fileExists(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const { contestId } = await params;
  const id = Number(contestId);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  const contest = await prisma.contest.findUnique({
    where: { id },
    select: {
      id: true,
      config: true,
      status: true,
      type: true,
    },
  });

  if (!contest) {
    return NextResponse.json({ available: false }, { status: 404 });
  }

  const user = (await getCurrentUser()) as UserJwtPayload | null;
  const superUser = (await getCurrentSuper()) as UserJwtPayload | null;
  const isGlobalAdmin = !!superUser?.isGlobalAdmin;
  const isContestUser = user?.contestId === id;

  if (contest.type === ContestType.PRIVATE && !isGlobalAdmin && !isContestUser) {
    return NextResponse.json({ available: false }, { status: 403 });
  }

  const config = (contest.config as ContestConfig | null) || {};
  const available =
    contest.status === ContestStatus.ENDED &&
    !!config.editorialPdf &&
    (await fileExists(getEditorialPdfPath(id)));

  return NextResponse.json({
    available,
    filename: available ? config.editorialPdf?.filename : null,
  });
}
