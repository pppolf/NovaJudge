import { Contest, ContestConfig } from "@/app/(main)/page";
import ContestNoticeSniffer from "@/components/ContestNoticeSniffer";
import ContestTimer from "@/components/ContestTimer";
import { prisma } from "@/lib/prisma";

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

  return (
    <div className="w-full overflow-x-hidden">
      <ContestNoticeSniffer contestId={Number(contestId)} />
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

          <div className="mt-6 w-full">
            <ContestTimer
              startTime={contest.startTime}
              endTime={contest.endTime}
              frozenDuration={frozenDuration}
            />
          </div>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
