import {
  getContestProblems,
  addContestProblem,
  removeContestProblem,
  swapProblemDisplayIds,
} from "./actions";
import {
  TrashIcon,
  PlusIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import EditableDisplayId from "@/components/admin/EditableDisplayId";

export default async function ContestProblemsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contestId = Number(id);

  // 获取已添加的题目
  const contestProblems = await getContestProblems(contestId);

  // 计算下一个推荐的 Display ID (如果已有 A, B，推荐 C)
  const nextDisplayId = String.fromCharCode(65 + contestProblems.length); // 65 is 'A'

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/admin/contests"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Contest Problems Configuration
          </h1>
          <p className="text-gray-500">
            Manage problems for Contest #{contestId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* === 左侧：已添加题目列表 (2/3) === */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">
              Problem List
            </div>

            {contestProblems.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic">
                No problems added yet. Use the form to add one.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="px-6 py-3 w-20">ID</th>
                    <th className="px-6 py-3 w-20">Move</th>
                    <th className="px-6 py-3 w-20">Color</th>
                    <th className="px-6 py-3">Original Title (ID)</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contestProblems.map((cp, index) => {
                    const prevCp =
                      index > 0 ? contestProblems[index - 1] : null;
                    const nextCp =
                      index < contestProblems.length - 1
                        ? contestProblems[index + 1]
                        : null;
                    return (
                      <tr key={cp.id} className="hover:bg-gray-50 group">
                        <td className="px-6 py-4 font-bold text-lg font-mono text-gray-800">
                          <EditableDisplayId
                            contestProblemId={cp.problemId}
                            contestId={contestId}
                            initialDisplayId={cp.displayId}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {prevCp ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await swapProblemDisplayIds(
                                    contestId,
                                    cp.problemId,
                                    prevCp.problemId,
                                  );
                                }}
                              >
                                <button
                                  type="submit"
                                  className="hover:bg-gray-200 p-1 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                                >
                                  <ArrowUpIcon className="w-4 h-4" />
                                </button>
                              </form>
                            ) : (
                              <div className="h-6 w-6" />
                            )}
                            {nextCp ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await swapProblemDisplayIds(
                                    contestId,
                                    cp.problemId,
                                    nextCp.problemId,
                                  );
                                }}
                              >
                                <button
                                  type="submit"
                                  className="hover:bg-gray-200 p-1 rounded text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                                >
                                  <ArrowDownIcon className="w-4 h-4" />
                                </button>
                              </form>
                            ) : (
                              <div className="h-6 w-6" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="w-6 h-6 rounded-full border shadow-sm"
                            style={{ backgroundColor: cp.color || "#ffffff" }}
                            title={cp.color || "No color"}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {cp.problem.title}
                          </div>
                          <div className="text-xs text-gray-400">
                            Original ID: {cp.problemId}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <form
                            action={async () => {
                              "use server";
                              await removeContestProblem(cp.id, contestId);
                            }}
                          >
                            <button
                              className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                              title="Remove from contest"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* === 右侧：添加题目表单 (1/3) === */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              Add Problem
            </h2>

            <form action={addContestProblem} className="space-y-4">
              <input type="hidden" name="contestId" value={contestId} />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Original Problem ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="problemId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 1001"
                />
                <p className="text-xs text-gray-400 mt-1">
                  ID from the global Problem Bank.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Display ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="displayId"
                    required
                    defaultValue={nextDisplayId}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Balloon Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="color"
                      defaultValue="#000000"
                      className="h-10 w-full cursor-pointer rounded border border-gray-300"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition-colors shadow-sm mt-2"
              >
                Add to Contest
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
