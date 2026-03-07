import { Contest, ContestConfig } from "@/app/(main)/page";
import ContestTimer from "@/components/ContestTimer";
import VPTimer from "@/components/VPTimer";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { cookies } from "next/headers";

interface Props {
  children: React.ReactNode;
  params: Promise<{
    contestId: string;
  }>;
}

export default async function ContestLayout({ children, params }: Props) {
  const { contestId } = await params;

  const contest: Contest | null = await prisma.contest.findUnique({
    where: { id: Number(contestId) },
  });

  if (!contest) return <div>Contest not found</div>;
  const frozenDuration = Number(
    (contest.config as ContestConfig)?.frozenDuration || 0,
  );

  // 检查当前用户是否有活跃的 VP 会话
  let vpSession: { startedAt: Date; vpEndTime: Date } | null = null;

  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  if (authToken) {
    try {
      const payload = await verifyAuth(authToken);
      if (payload?.userId && !payload.isGlobalAdmin) {
        const existing = await prisma.virtualContest.findUnique({
          where: {
            globalUserId_contestId: {
              globalUserId: payload.userId,
              contestId: Number(contestId),
            },
          },
        });
        if (existing) {
          const contestDurationMs =
            contest.endTime.getTime() - contest.startTime.getTime();
          const vpEndTime = new Date(
            existing.startedAt.getTime() + contestDurationMs,
          );
          // 只在 VP 仍在进行中时显示 VP 计时器
          if (vpEndTime.getTime() > Date.now()) {
            vpSession = { startedAt: existing.startedAt, vpEndTime };
          }
        }
      }
    } catch {
      // 忽略 token 验证错误
    }
  }

  return (
    <div className="w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white shadow-sm border border-gray-100 rounded-sm p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="w-full md:w-auto">
              <h1 className="text-xl md:text-3xl font-serif font-bold text-gray-900 mb-2 wrap-break-word">
                {contest.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-xs md:text-sm text-gray-500">
                <span>
                  ID:{" "}
                  <span className="font-mono text-gray-700">{contest.id}</span>
                </span>
                <span>
                  Type:{" "}
                  <span className="font-bold text-blue-700">
                    {contest.type}
                  </span>
                </span>
                <span>
                  Status:{" "}
                  <span className="font-bold text-red-600">
                    {contest.status}
                  </span>
                </span>
              </div>
            </div>

            <div className="text-left md:text-right w-full md:w-auto">
              <div className="text-xs text-gray-400 uppercase">Ends At</div>
              <div className="text-sm md:text-base text-gray-800 font-mono wrap-break-word">
                {contest.endTime.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-6 w-full space-y-3">
            <ContestTimer
              startTime={contest.startTime}
              endTime={contest.endTime}
              frozenDuration={frozenDuration}
            />
            {vpSession && (
              <VPTimer
                vpStartTime={vpSession.startedAt}
                vpEndTime={vpSession.vpEndTime}
              />
            )}
          </div>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
