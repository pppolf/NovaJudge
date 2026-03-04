import { notFound } from "next/navigation";
import ProblemInfoCard from "@/components/ProblemInfoCard";
import { prisma } from "@/lib/prisma";
import SubmitForm from "./client";
import { getCurrentSuper, getCurrentUser, UserJwtPayload } from "@/lib/auth";
import { ContestRole, Verdict } from "@/lib/generated/prisma/client";

interface Props {
  searchParams: Promise<{ problem?: string }>;
  params: Promise<{ contestId: string }>;
}

export default async function SubmitPage({ params, searchParams }: Props) {
  const { contestId } = await params;
  const { problem: displayId } = await searchParams;
  if (!displayId) return notFound();

  const cid = Number(contestId);
  const contestProblem = await prisma.contestProblem.findFirst({
    where: { contestId: cid, displayId },
    include: { problem: true },
  });
  if (!contestProblem) return notFound();
  const { problem } = contestProblem;

  const [totalStats, acStats] = await Promise.all([
    prisma.submission.count({
      where: { contestId: cid, problemId: problem.id },
    }),
    prisma.submission.count({
      where: {
        contestId: cid,
        problemId: problem.id,
        verdict: Verdict.ACCEPTED,
      },
    }),
  ]);

  const info = {
    timeLimit: problem.defaultTimeLimit,
    memoryLimit: problem.defaultMemoryLimit,
    submissions: totalStats,
    accepted: acStats,
  };

  const SuperAdmin = await getCurrentSuper();
  const user = await getCurrentUser();

  const isAdmin =
    (SuperAdmin as unknown as UserJwtPayload)?.isGlobalAdmin ||
    (user as unknown as UserJwtPayload)?.role === ContestRole.ADMIN ||
    (user as unknown as UserJwtPayload)?.role === ContestRole.JUDGE;
  return (
    <div className="flex flex-col w-full lg:flex-row gap-6 items-start">
      <aside>
        <ProblemInfoCard
          contestId={contestId}
          problemId={displayId}
          info={info}
          type="submit"
          isAdmin={isAdmin}
        />
      </aside>

      <SubmitForm
        contestId={contestId}
        problemId={displayId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
