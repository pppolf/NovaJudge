"use client";

import Link from "next/link";

interface Team {
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
    tries: number;
    frozenTries: number;
    unfrozenTries: number;
    firstAcceptedSubmissionId?: number;
    upsolved: boolean;
  } | null>;
}

interface ContestProblem {
  problemId: number;
  displayId: string;
  color: string | null;
}

interface RankTableProps {
  contestId: string;
  teams: Team[];
  isMyTeam: boolean;
  isContestEnded: boolean;
  contestProblems: ContestProblem[];
  isFrozen: boolean;
}

export default function RankTable({
  contestId,
  teams,
  isMyTeam,
  isContestEnded,
  contestProblems,
  isFrozen,
}: RankTableProps) {
  // 获取单元格背景色
  const getCellColor = (prob: Team["problems"][0]) => {
    if (!prob) return "";

    // 1. 优先判断是否AC (Green)
    if (prob.accepted) {
      if (prob.firstBlood) return "bg-[#1b5e20] text-white";
      return "bg-[#4caf50] text-white";
    }

    if (prob.upsolved) {
      return "bg-blue-400 text-white";
    }

    // 2. 判断是否有封榜后的提交 (Blue)
    if (prob.frozenTries > 0) {
      return "bg-blue-600 text-white"; // 整个背景深蓝色，或者用浅蓝背景深蓝字
    }

    // 3. 判断是否有错误尝试 (Red)
    if (prob.tries > 0) {
      return "bg-[#d32f2f] text-white";
    }

    return "text-white";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center text-xs border-collapse">
        <thead>
          <tr
            className={`h-10 text-base font-serif font-bold border-b-2 border-gray-400 ${
              isMyTeam
                ? "bg-linear-to-r from-blue-400 to-blue-300 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            <th className="w-12">Rank</th>
            <th className="w-52">Team</th>
            <th className="w-12">Solved</th>
            <th className="w-20">Penalty</th>
            {contestProblems.map((cp, i) => (
              <th key={cp.problemId} className="min-w-20 text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <Link href={`/contest/${contestId}/problems/${cp.displayId}`}>
                    {String.fromCharCode(65 + i)}
                  </Link>
                  <svg
                    viewBox="0 0 512 512"
                    width="22"
                    height="22"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill={cp?.color || "#6b7280"}
                      d="M391 307.27c32.75-46.35 46.59-101.63 39-155.68C416.47 55.59 327.38-11.54 231.38 2S68.24 104.53 81.73 200.53c7.57 53.89 36.12 103.16 80.37 138.74c26.91 21.64 57.59 36.1 86.05 41.33l-8.36 45.23a8 8 0 0 0 9 9.38L279 431c15.9 35.87 41.65 60.48 78.41 75l14.88 5.88l11.77-29.75l-14.88-5.89c-26.35-10.42-44.48-26.16-57-49.92l21.84-3.07a8 8 0 0 0 6.05-11.49l-20.49-41.16c25.98-12.87 51.49-35.18 71.42-63.33m-160.82 15.66c-41.26-16.32-76.3-52.7-91.45-94.94l-5.4-15.06l30.12-10.8l5.4 15.06c14.5 40.44 47.27 65.77 73.1 76l14.88 5.88l-11.77 29.76Z"
                    />
                  </svg>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr
              key={team.id}
              className={`h-16 font-[Menlo] ${
                isMyTeam
                  ? "bg-linear-to-r from-blue-100 via-blue-50 to-blue-100 hover:from-blue-200 hover:via-blue-100 hover:to-blue-200"
                  : "even:bg-[#eff5fa] odd:bg-white hover:bg-blue-100"
              }`}
            >
              <td className="text-gray-900 text-base font-serif font-bold">
                {typeof team.rank === "number" ? team.rank : `${team.rank}`}
              </td>
              <td>
                <div className="flex flex-col items-center max-h-full">
                  <div className="font-bold text-blue-900 truncate max-w-37.5">
                    {team.category === "1"
                      ? "⭐"
                      : team.category === "2"
                        ? "👧"
                        : ""}
                    {team.displayName || team.username}
                  </div>
                  <div className="text-gray-900 truncate max-w-37.5 text-xs">
                    {team.members || team.username}
                  </div>
                  <div className="text-gray-900 truncate max-w-37.5 text-xs">
                    {team.school}
                  </div>
                </div>
              </td>
              <td className="font-bold text-base text-gray-800">
                {team.solved}
              </td>
              <td className="text-gray-600 text-sm font-semibold">
                {Math.floor(team.penalty)}
              </td>
              {team.problems.map((prob, idx) => {
                const cellBg = getCellColor(prob);

                // 专门处理蓝色样式 (Pending/Frozen)
                const isFrozenCell =
                  prob && !prob.accepted && prob.frozenTries > 0;
                return (
                  <td
                    key={idx}
                    className={`p-1 border border-white relative group ${
                      isFrozenCell ? "bg-blue-700 text-white" : cellBg
                    }`}
                  >
                    {/* 代码查看按钮 - 固定在右上角(仅限已AC且比赛结束) */}
                    {(prob?.accepted || prob?.upsolved) &&
                      isContestEnded &&
                      !isFrozen &&
                      prob.firstAcceptedSubmissionId && (
                        <Link
                          href={`/contest/${contestId}/status/${prob.firstAcceptedSubmissionId}`}
                          className="absolute top-0 right-0  cursor-pointer rounded-sm p-0.5 z-10"
                          title="View first AC submission"
                        >
                          <svg
                            className="icon"
                            viewBox="0 0 1024 1024"
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                          >
                            <path
                              d="M414.165333 652.501333L273.664 512l140.501333-140.501333a42.666667 42.666667 0 1 0-60.330666-60.330667l-170.666667 170.666667a42.666667 42.666667 0 0 0 0 60.330666l170.666667 170.666667a42.666667 42.666667 0 1 0 60.330666-60.330667zM609.834667 371.498667L750.336 512l-140.501333 140.501333a42.666667 42.666667 0 1 0 60.330666 60.330667l170.666667-170.666667c7.936-7.936 12.501333-18.944 12.501333-30.165333s-4.565333-22.186667-12.501333-30.165333l-170.666667-170.666667a42.666667 42.666667 0 1 0-60.330666 60.330667z"
                              fill="#ffffff"
                            ></path>
                          </svg>
                        </Link>
                      )}

                    {/* 内容区域 */}
                    {prob && (
                      <div className="flex flex-col justify-center h-full text-xs gap-1 font-bold">
                        {prob.accepted ? (
                          // 1. 已 AC
                          <>
                            <span>{prob.time}</span>
                            {prob.tries > 0 && (
                              <span className="text-[12px] font-normal opacity-80">
                                (-{prob.tries})
                              </span>
                            )}
                          </>
                        ) : prob.upsolved ? (
                          // === Upsolved 展示逻辑 ===
                          <>
                            {prob.tries > 0 ? (
                              // Upsolved前有WA (- tries)
                              <div className="flex flex-col justify-center items-center">
                                <span className="text-lg font-bold">+</span>
                                <span>(-{prob.tries})</span>
                              </div>
                            ) : (
                              // Upsolved前有WA +
                              <span className="text-lg font-bold">+</span>
                            )}
                          </>
                        ) : // <span className="text-lg font-bold">+</span>
                        prob.frozenTries > 0 ? (
                          // 2. 封榜提交 (蓝色)
                          <>
                            {prob.unfrozenTries > 0 ? (
                              // 封榜前有WA (? frozen / - unfrozen)
                              <span>
                                (? {prob.frozenTries} / -{prob.unfrozenTries})
                              </span>
                            ) : (
                              // 封榜前无WA (? frozen)
                              <span>(? {prob.frozenTries})</span>
                            )}
                          </>
                        ) : prob.tries > 0 ? (
                          // 3. 只有封榜前的 WA (红色)
                          <span>(-{prob.tries})</span>
                        ) : null}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
