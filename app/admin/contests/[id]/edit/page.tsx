import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import EditForm from "./EditForm";

export interface ContestConfig {
  frozenDuration?: number;
  unfreezeDelay?: number;
  medal?: {
    mode: "ratio" | "fixed";
    gold: number;
    silver: number;
    bronze: number;
  };
}

export interface Contest {
  id: number;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  type: string;
  password: string | null;
  visible: boolean;
  config: ContestConfig; // Prisma Json
}

export default async function EditContestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contestId = Number(id);

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
  });

  if (!contest) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* 顶部导航 */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/admin/contests"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Edit Contest settings
          </h1>
          <p className="text-gray-500 mt-1">
            Contest ID: <span className="font-mono">{contest.id}</span>
          </p>
        </div>
      </div>

      <EditForm contest={contest as unknown as Contest} />
    </div>
  );
}
