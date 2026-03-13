import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ProblemInfoCard from "@/components/ProblemInfoCard";
import { prisma } from "@/lib/prisma";
import {
  ContestRole,
  ContestStatus,
  Verdict,
} from "@/lib/generated/prisma/client";
import { notFound } from "next/navigation";
import { getCurrentSuper, getCurrentUser, UserJwtPayload } from "@/lib/auth";
import { getDictionary } from "@/lib/get-dictionary";
import { redirect } from "next/navigation";

type Problem = {
  id: number;
  title: string;
  defaultTimeLimit: number;
  defaultMemoryLimit: number;

  sections: {
    title: string;
    content: string;
  }[];

  samples: {
    input: string;
    output: string;
  }[];

  hint: string;
};

interface Props {
  params: Promise<{
    contestId: string;
    problemId: string;
  }>;
}
// 提取公共样式：标题样式 (蓝色竖线)
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-bold text-blue-800 border-l-4 border-blue-600 pl-3 mb-3 font-serif tracking-wide">
    {children}
  </h3>
);

export default async function ProblemDetail({ params }: Props) {
  const { contestId, problemId } = await params;
  const cid = Number(contestId);

  if (isNaN(cid)) return notFound();

  const contestProblem = await prisma.contestProblem.findFirst({
    where: {
      contestId: cid,
      displayId: problemId,
    },
    include: {
      problem: true,
      contest: true,
    },
  });

  if (!contestProblem) notFound();

  // 1. 鉴权逻辑：必须登录比赛账号或全局管理员
  const user = await getCurrentUser();
  const globalUser = await getCurrentSuper();
  const userPayload = user as UserJwtPayload | null;

  // 如果是私有比赛，且未登录比赛账号且不是超管，则重定向
  if (
    contestProblem.contest.type === "PRIVATE" &&
    !(globalUser as unknown as UserJwtPayload)?.isGlobalAdmin &&
    (!userPayload || userPayload.contestId !== cid)
  ) {
    redirect(`/contest/${contestId}`);
  }

  const problem = contestProblem.problem;

  if (!problem || contestProblem.contest.status === ContestStatus.PENDING)
    notFound();

  // 2. 封榜统计逻辑
  const config = contestProblem.contest.config as {
    frozenDuration?: number;
  } | null;
  const frozenDuration = config?.frozenDuration ?? 0;
  const endTime = contestProblem.contest.endTime;

  let dateFilter = {};

  if (frozenDuration > 0 && endTime) {
    const freezeTime = new Date(endTime.getTime() - frozenDuration * 60 * 1000);
    dateFilter = {
      submittedAt: {
        lt: freezeTime,
      },
    };
  }

  const totalStats = await prisma.submission.count({
    where: { contestId: cid, problemId: problem.id },
  });

  const acStats = await prisma.submission.count({
    where: {
      contestId: cid,
      problemId: problem.id,
      verdict: Verdict.ACCEPTED,
      ...dateFilter,
    },
  });
  const info = {
    timeLimit: problem?.defaultTimeLimit || 0,
    memoryLimit: problem?.defaultMemoryLimit || 0,
    submissions: totalStats,
    accepted: acStats,
  };
  // const problem = mockProblem;

  const SuperAdmin = await getCurrentSuper();
  const isAdmin =
    (SuperAdmin as unknown as UserJwtPayload)?.isGlobalAdmin ||
    (user as unknown as UserJwtPayload)?.role === ContestRole.ADMIN ||
    (user as unknown as UserJwtPayload)?.role === ContestRole.JUDGE;

  const dict = await getDictionary();

  return (
    <div className="flex flex-col w-full lg:flex-row gap-6 items-start">
      {/* --- 左侧：题目基本信息卡片 --- */}
      <aside className="w-full lg:w-72 shrink-0 space-y-4">
        <ProblemInfoCard
          contestId={contestId}
          problemId={problemId}
          info={info}
          type="problem"
          isAdmin={isAdmin}
        />
      </aside>

      {/* --- 右侧：题目详细描述 (Markdown 渲染) --- */}
      <main className="flex-1 w-full min-w-0">
        {" "}
        {/* min-w-0 防止 flex 子元素溢出 */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-6 lg:p-10">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8 text-center border-b pb-4">
            {problem?.title}
          </h1>

          <div className="space-y-8">
            {/* 1. 渲染常规文本段落 (Description, Input, Output) */}
            {(problem as unknown as Problem).sections?.map((section, index) => (
              <div key={`section-${index}`}>
                <SectionTitle>{section.title}</SectionTitle>
                <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-pre:bg-gray-100 prose-pre:text-gray-800">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                  >
                    {section.content}
                  </ReactMarkdown>
                </article>
              </div>
            ))}
            {/* 2. 渲染样例数组 */}
            {(problem as unknown as Problem).samples.map((sample, index) => {
              // 如果只有一组样例，标题不显示序号；如果有多组，显示 1, 2, 3...
              const suffix =
                (problem as unknown as Problem).samples.length > 1
                  ? ` ${index + 1}`
                  : "";

              return (
                <div key={`sample-${index}`} className="grid grid-cols-1 gap-6">
                  <div>
                    <SectionTitle>Sample Input{suffix}</SectionTitle>
                    <CodeBlock code={sample.input} />
                  </div>
                  <div>
                    <SectionTitle>Sample Output{suffix}</SectionTitle>
                    <CodeBlock code={sample.output} />
                  </div>
                </div>
              );
            })}
            {/* 3. 渲染 Hint (如果有) */}
            {problem.hint && (
              <div>
                <SectionTitle>Hint</SectionTitle>
                <article className="prose prose-sm md:prose-base max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                  >
                    {problem.hint}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>

          <div className="mt-12 text-center">
            {isAdmin ? (
              <button
                disabled
                className="bg-gray-400 text-white font-medium rounded-sm text-sm px-8 py-3 shadow-md cursor-not-allowed opacity-60"
                title="Cannot submit"
              >
                {dict.common.submit}
              </button>
            ) : (
              <Link
                href={`/contest/${contestId}/submit?problem=${problemId}`}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-sm font-bold shadow-md transition-transform active:scale-95"
              >
                {dict.common.submit}
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
