import Link from "next/link";
import { ContestStatus, Verdict } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSuper, getCurrentUser, UserJwtPayload } from "@/lib/auth";
import { getDictionary } from "@/lib/get-dictionary";

interface Props {
  params: Promise<{
    contestId: string;
  }>;
}

export default async function Problems({ params }: Props) {
  const contestId = Number((await params).contestId);
  // const contestInfo = await getContestData(contestId);
  const contestInfo = await prisma.contest.findUnique({
    where: {
      id: contestId,
    },
  });
  const contestProblem = await prisma.contestProblem.findMany({
    where: {
      contestId: contestId,
    },
    orderBy: {
      displayId: "asc",
    },
    include: {
      problem: true,
    },
  });

  // 封榜统计逻辑
  const config = contestInfo?.config as { frozenDuration?: number } | null;
  const frozenDuration = config?.frozenDuration ?? 0;
  const endTime = contestInfo?.endTime;

  let dateFilter = {};

  if (frozenDuration > 0 && endTime) {
    const freezeTime = new Date(endTime.getTime() - frozenDuration * 60 * 1000);
    dateFilter = {
      submittedAt: {
        lt: freezeTime,
      },
    };
  }

  const totalStats = await prisma.submission.groupBy({
    by: ["problemId"],
    where: { contestId: contestId },
    _count: { _all: true },
  });

  const acStats = await prisma.submission.groupBy({
    by: ["problemId"],
    where: {
      contestId: contestId,
      verdict: Verdict.ACCEPTED,
      ...dateFilter,
    },
    _count: { _all: true },
  });
  const totalMap = new Map(totalStats.map((s) => [s.problemId, s._count._all]));
  const acMap = new Map(acStats.map((s) => [s.problemId, s._count._all]));
  const user = await getCurrentUser();
  const globalUser = await getCurrentSuper();
  const userStats = await prisma.submission.findMany({
    where: {
      userId: (user as UserJwtPayload)?.userId,
      contestId: contestId,
      verdict: Verdict.ACCEPTED,
      globalUserId: (globalUser as UserJwtPayload)?.userId,
    },
  });
  const statsMap = new Map(userStats.map((s) => [s.problemId, 1]));

  const dict = await getDictionary();

  return (
    <div className="bg-white w-full mx-auto shadow-sm border border-gray-100 rounded-sm p-6">
      <h2 className="text-2xl font-serif font-bold text-gray-800 mb-6 pl-2">
        {dict.problemList.title}
      </h2>
      {contestInfo?.status === ContestStatus.PENDING ? (
        <div className="text-center py-10 text-gray-500">
          {dict.contestList.noContestsFound}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-serif text-left text-gray-600">
            <thead className="text-lg text-gray-700 bg-white border-b border-gray-400 border-t">
              <tr>
                <th scope="col" className="px-6 py-2 w-24">
                  {dict.problemDetail.status}
                </th>
                <th scope="col" className="px-6 py-2 w-24">
                  ID
                </th>
                <th scope="col" className="px-6 py-2">
                  {dict.problemDetail.title}
                </th>
                <th scope="col" className="px-6 py-2 w-80">
                  {dict.problemDetail.ratio} ({dict.problemDetail.accepted} /{" "}
                  {dict.problemDetail.submissions})
                </th>
                <th scope="col" className="px-6 py-2 w-24">
                  {dict.problemDetail.balloon}
                </th>
              </tr>
            </thead>
            <tbody>
              {contestProblem.map((prob) => {
                const acceptedCount = acMap.get(prob.problemId) || 0;
                const totalCount = totalMap.get(prob.problemId) || 0;
                const rate =
                  totalCount > 0 ? (acceptedCount / totalCount) * 100 : 0;
                return (
                  <tr
                    key={prob.id}
                    className="odd:bg-white even:bg-[#f4f7fa] border-b border-gray-300 hover:bg-blue-50 transition-colors h-10 text-base"
                  >
                    <td className="px-6 py-2 flex justify-center">
                      {(statsMap.get(prob.problemId) || 0) !== 0 && (
                        <svg
                          className="icon"
                          viewBox="0 0 1024 1024"
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          p-id="13161"
                          width="22"
                          height="22"
                        >
                          <path
                            d="M86.528 491.666286a45.787429 45.787429 0 0 1 64.731429 0l247.954285 247.954285 506.88-506.806857a45.787429 45.787429 0 0 1 64.731429 64.731429L431.616 836.754286a45.787429 45.787429 0 0 1-64.658286 0L86.528 556.324571a45.787429 45.787429 0 0 1 0-64.658285z"
                            fill="#2CA641"
                            p-id="13162"
                          ></path>
                        </svg>
                      )}
                    </td>
                    <td className="px-6 py-2 text-gray-900">
                      <div className="flex gap-2 items-center">
                        {prob.displayId}
                      </div>
                    </td>
                    <td className="px-6 py-2">
                      <Link
                        href={`/contest/${contestId}/problems/${prob.displayId}`}
                        className="text-blue-600 hover:underline hover:text-blue-800"
                      >
                        {prob.problem.title}
                      </Link>
                    </td>
                    <td className="px-6 py-2 text-left">
                      {rate.toFixed(2)}% ({acceptedCount} / {totalCount})
                    </td>
                    <td className="px-6 py-2">
                      <div className="flex items-center justify-center">
                        <svg
                          viewBox="0 0 512 512"
                          width="24"
                          height="24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill={prob?.color || "#6b7280"}
                            d="M391 307.27c32.75-46.35 46.59-101.63 39-155.68C416.47 55.59 327.38-11.54 231.38 2S68.24 104.53 81.73 200.53c7.57 53.89 36.12 103.16 80.37 138.74c26.91 21.64 57.59 36.1 86.05 41.33l-8.36 45.23a8 8 0 0 0 9 9.38L279 431c15.9 35.87 41.65 60.48 78.41 75l14.88 5.88l11.77-29.75l-14.88-5.89c-26.35-10.42-44.48-26.16-57-49.92l21.84-3.07a8 8 0 0 0 6.05-11.49l-20.49-41.16c25.98-12.87 51.49-35.18 71.42-63.33m-160.82 15.66c-41.26-16.32-76.3-52.7-91.45-94.94l-5.4-15.06l30.12-10.8l5.4 15.06c14.5 40.44 47.27 65.77 73.1 76l14.88 5.88l-11.77 29.76Z"
                          />
                        </svg>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
