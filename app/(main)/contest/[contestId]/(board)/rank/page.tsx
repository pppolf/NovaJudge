import { verifyAuth } from "@/lib/auth";
import {
  ContestRole,
  ContestStatus,
  Prisma,
  Verdict,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import RankSearch from "./RankSearch";
import RankTable from "./RankTable";
import Pagination from "@/components/Pagination";
import { ContestConfig } from "@/app/(main)/page";
import UnfreezeButton from "./UnfreezeButton";
import { getDictionary } from "@/lib/get-dictionary";

// 辅助函数：计算时间差
function formatTime(startTime: number, submissionTime: number): string {
  const diffMs = submissionTime - startTime;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

interface Props {
  searchParams: Promise<{
    page?: string;
    teamName?: string;
    school?: string;
    category?: string;
  }>;
  params: Promise<{
    contestId: string;
  }>;
}

export default async function Rank({ params, searchParams }: Props) {
  const { contestId } = await params;
  const { page = "1", teamName, school, category } = await searchParams;

  const cid = parseInt(contestId);
  const currentPage = parseInt(page as string) || 1;
  const pageSize = 50;

  // 1. 获取比赛信息
  const contestInfo = await prisma.contest.findUnique({
    where: { id: cid },
  });

  if (!contestInfo) {
    return (
      <div className="text-center py-10 text-gray-500">Contest not found.</div>
    );
  }

  // 2. 权限校验
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  const adminToken = cookieStore.get("auth_token")?.value;
  const payload = token ? await verifyAuth(token) : null;

  let currentUser = null;
  let isTeamMember = false;
  let isGlobalAdmin = false;
  let isContestAdmin = false;

  if (adminToken) {
    isGlobalAdmin = true;
  }

  if (payload?.userId) {
    currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        contestId: true,
      },
    });

    isTeamMember =
      currentUser?.contestId === cid && currentUser?.role === ContestRole.TEAM;

    isContestAdmin =
      currentUser?.contestId === cid && currentUser?.role === ContestRole.ADMIN;
  }

  // 3. 构建查询条件
  const where: Prisma.UserWhereInput = {
    contestId: cid,
    role: ContestRole.TEAM,
  };

  const config = contestInfo.config as ContestConfig;
  const now = new Date();
  const freezeTime =
    contestInfo.endTime.getTime() - config?.frozenDuration * 60 * 1000;

  // 判断是否处于封榜显示状态
  // 条件：当前时间 >= 封榜时间 且 比赛未结束 (或者结束后管理员未解榜，这里假设封榜时间持续有效)
  // 如果 contestInfo.freezeTime 存在，且当前时间超过了它，就是封榜状态
  const isFrozen =
    config?.frozenDuration !== 0 &&
    (freezeTime ? now.getTime() >= freezeTime : false);

  // 管理员可以看到实时榜单
  const canSeeLiveBoard = isGlobalAdmin || isContestAdmin;
  // 普通用户（包括未登录）看到的榜单是否应该是封榜状态
  const shouldShowFrozenState = isFrozen && !canSeeLiveBoard;

  if (teamName) where.displayName = { contains: teamName };
  if (school) where.school = { contains: school };
  if (category) {
    if (category === "0") {
      where.category = { in: ["0", "2"] };
    } else {
      where.category = category;
    }
  }

  // 4. 获取队伍和提交
  const allTeams = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      displayName: true,
      members: true,
      school: true,
      category: true,
      submissions: {
        where: { contestId: cid },
        select: {
          id: true,
          displayId: true,
          problemId: true,
          verdict: true,
          submittedAt: true,
        },
      },
    },
  });

  // 5. 获取题目
  const contestProblems = await prisma.contestProblem.findMany({
    where: { contestId: cid },
    select: {
      problemId: true,
      displayId: true,
      color: true,
    },
    orderBy: {
      displayId: "asc",
    },
  });

  // === 预先计算所有题目的一血 (全局最早AC) ===
  // 避免在循环中查询数据库 (N+1问题)
  const allAcSubmissions = await prisma.submission.findMany({
    where: {
      contestId: cid,
      verdict: Verdict.ACCEPTED,
    },
    select: {
      problemId: true,
      displayId: true,
      submittedAt: true,
    },
    orderBy: {
      submittedAt: "asc",
    },
  });

  // Map<ProblemId, SubmissionId>
  const firstBloodMap = new Map<number, number>();
  for (const sub of allAcSubmissions) {
    // 因为是按时间正序排列的，第一次遇到某个 problemId，就是该题的一血
    if (!firstBloodMap.has(sub.problemId)) {
      firstBloodMap.set(sub.problemId, sub.displayId);
    }
  }

  // 6. 计算排名
  const startTimeMs = contestInfo.startTime.getTime();
  const end = contestInfo.endTime.getTime();
  const freezeTimeMs = freezeTime ? new Date(freezeTime).getTime() : Infinity;

  // 排行榜数据接口定义
  interface TeamRankData {
    rank: number | string;
    id: string;
    username: string;
    displayName: string | null;
    members: string | null;
    school: string | null;
    category: string | null;
    solved: number;
    penalty: number;
    problems: Array<{
      problemId: number;
      displayId: string;
      color: string | null;
      firstBlood: boolean;
      accepted: boolean;
      time: string;
      tries: number; // 用于显示 (- 3)
      frozenTries: number; // 封榜后的提交次数 (? 2)
      unfrozenTries: number; // 封榜前的WA次数 (? 2 / - 1)
      firstAcceptedSubmissionId?: number;
      upsolved: boolean; // 是否赛后补题通过
    } | null>;
  }

  const allTeamRankings: TeamRankData[] = await Promise.all(
    allTeams.map(async (team) => {
      let solved = 0;
      let penalty = 0;

      const problems = await Promise.all(
        contestProblems.map(async (cp) => {
          // 过滤掉 CE 和 SE 的提交
          const rawSubmissions = team.submissions.filter(
            (s) =>
              s.problemId === cp.problemId &&
              s.verdict !== Verdict.COMPILE_ERROR &&
              s.verdict !== Verdict.SYSTEM_ERROR
            // s.submittedAt.getTime() <= end
          );

          if (rawSubmissions.length === 0) {
            return null;
          }

          // 分离赛中提交和赛后提交
          const contestSubmissions = rawSubmissions.filter(
            (s) => new Date(s.submittedAt).getTime() <= end
          );
          const afterContestSubmissions = rawSubmissions.filter(
            (s) => new Date(s.submittedAt).getTime() > end
          );

          // 按时间排序
          const submissions = contestSubmissions.sort(
            (a, b) =>
              new Date(a.submittedAt).getTime() -
              new Date(b.submittedAt).getTime()
          );

          // === 计算逻辑开始 ===
          // 我们需要根据 `shouldShowFrozenState` 决定 solved/penalty 的计算方式
          // 以及返回给前端的单元格状态

          let isAccepted = false;
          let acceptedTimeMs = 0;
          let acceptedSubId = 0;
          let waCountBeforeAcc = 0;

          // 1. 先计算【真实】情况（用于管理员或检测是否AC）
          for (const sub of submissions) {
            if (sub.verdict === Verdict.ACCEPTED) {
              isAccepted = true;
              acceptedTimeMs =
                new Date(sub.submittedAt).getTime() - startTimeMs;
              acceptedSubId = sub.displayId;
              break; // AC 后不再计算罚时次数
            }
            waCountBeforeAcc++;
          }

          // 2. 如果是封榜状态，需要计算【封榜前】的状态
          let isAcceptedBeforeFreeze = false;
          let waCountBeforeFreeze = 0; // 封榜前的错误次数
          let frozenTries = 0; // 封榜后的提交次数

          if (shouldShowFrozenState && freezeTime) {
            // 重新遍历计算封榜逻辑
            for (const sub of submissions) {
              const subTime = new Date(sub.submittedAt).getTime();

              if (subTime < freezeTimeMs) {
                // 封榜前的提交
                if (sub.verdict === Verdict.ACCEPTED) {
                  // 如果还没记录过AC（取第一次AC）
                  if (!isAcceptedBeforeFreeze) {
                    isAcceptedBeforeFreeze = true;
                    // 如果封榜前AC了，计算罚时就用封榜前的数据
                    // 这里覆盖上面的真实数据，只用于 Rank 排序
                    // 下面的 problems 返回对象中再做区分
                  }
                  break; // 封榜前已经AC，后面的都不看了
                } else {
                  waCountBeforeFreeze++;
                }
              } else {
                // 封榜后的提交，不管对错，都算一次尝试
                // 注意：如果封榜前已经AC了，通常排行榜上就不显示封榜后的提交了，而是直接显示绿色的AC
                if (!isAcceptedBeforeFreeze) {
                  frozenTries++;
                }
              }
            }
          }

          // === 决定最终用于【排序】的 Solved 和 Penalty ===
          if (shouldShowFrozenState) {
            // 封榜模式：只统计封榜前的 AC
            if (isAcceptedBeforeFreeze) {
              solved++;
              // 罚时 = AC时间(分钟) + 错误次数 * 20
              // 注意：AC时间必须是第一发AC的时间，我们上面循环里还没有抓取封榜前AC的具体时间
              // 简单处理：找到封榜前那个AC submission
              const preFreezeAC = submissions.find(
                (s) =>
                  s.verdict === Verdict.ACCEPTED &&
                  new Date(s.submittedAt).getTime() < freezeTimeMs
              );
              if (preFreezeAC) {
                const t =
                  new Date(preFreezeAC.submittedAt).getTime() - startTimeMs;
                penalty += Math.floor(t / 60000) + waCountBeforeFreeze * 20;
              }
            }
            // 如果封榜前没AC，不管封榜后有没有AC，Solved和Penalty都不加
          } else {
            // 实时模式：统计真实数据
            if (isAccepted) {
              solved++;
              penalty +=
                Math.floor(acceptedTimeMs / 60000) + waCountBeforeAcc * 20;
            }
          }

          // === 决定返回给【前端展示】的数据 ===
          // 检查该题目是否是一血 (First Blood)
          // 注意：通常一血是基于实时数据的，即使在封榜后，管理员看也是一血。
          // 普通用户看封榜数据，所谓的一血应该是封榜前产生的一血。封榜后产生的一血普通用户看不到是谁。
          let firstBlood = false;
          // 只有当显示的也是AC状态时，才去查是否一血
          const showAsAccepted = shouldShowFrozenState
            ? isAcceptedBeforeFreeze
            : isAccepted;

          const globalFirstBloodId = firstBloodMap.get(cp.problemId);

          if (showAsAccepted && globalFirstBloodId) {
            const myDisplayACId = shouldShowFrozenState
              ? submissions.find(
                  (s) =>
                    s.verdict === Verdict.ACCEPTED &&
                    new Date(s.submittedAt).getTime() < freezeTimeMs
                )?.displayId
              : acceptedSubId;

            // 如果当前展示的提交 ID 等于全局一血 ID，那就是一血
            if (myDisplayACId === globalFirstBloodId) {
              firstBlood = true;
            }
          }

          // 构造返回对象
          // 时间：显示 AC 的时间
          let displayTime = "";
          if (showAsAccepted) {
            // 找到对应AC提交的时间
            const acSub = submissions.find((s) => {
              if (shouldShowFrozenState)
                return (
                  s.verdict === Verdict.ACCEPTED &&
                  new Date(s.submittedAt).getTime() < freezeTimeMs
                );
              return s.displayId === acceptedSubId;
            });
            if (acSub) {
              displayTime = formatTime(
                startTimeMs,
                new Date(acSub.submittedAt).getTime()
              );
            }
          }

          let upsolved = false;
          let upsolvedSubmissionId: number | undefined;
          // 只有当赛中状态判定为未通过时，才去检查 Upsolving
          // 如果 showAsAccepted 为 true，说明已经 AC 了（无论是实时还是封榜前），就不算 Upsolved
          const finalShowAccepted = shouldShowFrozenState
            ? isAcceptedBeforeFreeze
            : isAccepted;

          if (!finalShowAccepted) {
            // 查找赛后的第一次 AC
            const afterContestAC = afterContestSubmissions.find(
              (s) => s.verdict === Verdict.ACCEPTED
            ); // 注意：afterContestSubmissions 通常没有排序，最好 sort 或者 find 之前确认顺序
            // 前面 rawSubmissions 是根据 filter 分出来的，可能顺序是对的，
            // 但为了保险，对 afterContestSubmissions 也做一次时间排序

            if (afterContestAC) {
              upsolved = true;
              upsolvedSubmissionId = afterContestAC.displayId; // 记录 ID
            }
          }

          let finalLinkSubmissionId: number | undefined;

          if (finalShowAccepted) {
            // 赛中AC逻辑（保持原有）
            finalLinkSubmissionId = shouldShowFrozenState
              ? submissions.find(
                  (s) =>
                    s.verdict === Verdict.ACCEPTED &&
                    new Date(s.submittedAt).getTime() < freezeTimeMs
                )?.displayId
              : acceptedSubId;
          } else if (upsolved) {
            // 赛后AC逻辑
            finalLinkSubmissionId = upsolvedSubmissionId;
          }

          return {
            problemId: cp.problemId,
            displayId: cp.displayId,
            color: cp.color,
            firstBlood,
            accepted: finalShowAccepted, // 前端显示绿色的依据
            time: displayTime,
            tries: shouldShowFrozenState
              ? waCountBeforeFreeze
              : waCountBeforeAcc, // 红色 (- X) 的数字
            frozenTries: frozenTries, // 蓝色 (? X) 的数字 (仅在 !accepted 时有效)
            unfrozenTries: waCountBeforeFreeze, // 蓝色 (? Y / - X) 中的 X
            firstAcceptedSubmissionId: finalLinkSubmissionId,
            upsolved: upsolved, // 传递给前端
          };
        })
      );

      return {
        rank: 0,
        id: team.id,
        username: team.username,
        displayName: team.displayName,
        members: team.members,
        school: team.school,
        category: team.category,
        solved,
        penalty: Math.floor(penalty),
        problems,
      };
    })
  );

  // 排序
  allTeamRankings.sort((a, b) => {
    if (a.solved !== b.solved) return b.solved - a.solved;
    return a.penalty - b.penalty;
  });

  // 计算 Rank (处理并列)
  for (let i = 0; i < allTeamRankings.length; i++) {
    if (
      i > 0 &&
      allTeamRankings[i].solved === allTeamRankings[i - 1].solved &&
      allTeamRankings[i].penalty === allTeamRankings[i - 1].penalty
    ) {
      allTeamRankings[i].rank = allTeamRankings[i - 1].rank;
    } else {
      allTeamRankings[i].rank = i + 1;
    }
  }

  // 7. 获取当前用户的排名
  const myTeamRank = isTeamMember
    ? allTeamRankings.find((t) => t.id === currentUser?.id)
    : null;

  // 8. 分页
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTeams = allTeamRankings.slice(
    startIndex,
    startIndex + pageSize
  );

  // 获取所有的 School 和 Category 用于筛选
  const allSchools = await prisma.user.findMany({
    where: { contestId: cid, role: ContestRole.TEAM },
    select: { school: true },
    distinct: ["school"],
  });

  const allCategories = await prisma.user.findMany({
    where: { contestId: cid, role: ContestRole.TEAM },
    select: { category: true },
    distinct: ["category"],
  });
  const isContestEnded =
    contestInfo.status === ContestStatus.ENDED || now > contestInfo.endTime;
  const showUnfreezeButton = canSeeLiveBoard && isContestEnded && isFrozen;

  const dict = await getDictionary();

  return (
    <div className="bg-white w-full mx-auto shadow-sm border border-gray-100 rounded-sm p-6">
      <div className="flex justify-between items-center border-b mb-4 pb-4">
        <h2 className="text-2xl font-serif font-bold text-gray-800 pl-2 flex items-center">
          Rank
          {showUnfreezeButton && <UnfreezeButton contest={contestInfo} />}
        </h2>
        <RankSearch
          schools={allSchools.map((s) => s.school).filter(Boolean) as string[]}
          categories={
            allCategories.map((c) => c.category).filter(Boolean) as string[]
          }
        />
      </div>

      {shouldShowFrozenState && (
        <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-blue-800 font-semibold flex items-center gap-2">
            <span>❄️</span>
            <span>当前已封榜，等待管理员解榜</span>
          </p>
        </div>
      )}

      {contestInfo.status === ContestStatus.PENDING ? (
        <div className="text-center py-10 text-gray-500">
          {dict.contestList.noContestsFound}
        </div>
      ) : (
        <>
          {myTeamRank && (
            <div className="mb-4">
              <RankTable
                contestId={contestId}
                teams={[myTeamRank]}
                isMyTeam={true}
                isContestEnded={contestInfo.status === ContestStatus.ENDED}
                contestProblems={contestProblems}
                isFrozen={isFrozen}
              />
            </div>
          )}

          <RankTable
            contestId={contestId}
            teams={paginatedTeams}
            isMyTeam={false}
            isContestEnded={contestInfo.status === ContestStatus.ENDED}
            contestProblems={contestProblems}
            isFrozen={isFrozen}
          />
        </>
      )}

      <div className="mt-6">
        <Pagination totalItems={allTeamRankings.length} pageSize={pageSize} />
      </div>
    </div>
  );
}
