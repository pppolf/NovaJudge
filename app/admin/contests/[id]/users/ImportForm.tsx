"use client";

import { useState } from "react";
import { importUsers } from "./actions";
import { ArrowDownTrayIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import ConfirmModal from "@/components/admin/ConfirmModal";

interface ImportFormProps {
  contestId: number;
  type: "TEAM" | "STAFF";
}

interface PreviewRow {
  username: string;
  password?: string;
  displayName?: string;
  school?: string;
  members?: string;
  seat?: string;
  role?: string;
  coach?: string;
  category?: string;
}

export default function ImportForm({ contestId, type }: ImportFormProps) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // 解析 Excel 粘贴的数据 (Tab 分隔)
  const handleParse = (input: string) => {
    setText(input);
    const rows = input.trim().split("\n");
    const parsed = rows
      .map((row) => {
        // Excel 复制出来是 \t 分隔
        const cols = row.split("\t").map((c) => c.trim());

        if (type === "TEAM") {
          // 格式: Username | Password | TeamName | School | Members | Seat | Coach | Category
          return {
            username: cols[0],
            password: cols[1],
            displayName: cols[2],
            school: cols[3],
            members: cols[4],
            seat: cols[5],
            coach: cols[6],
            category: cols[7],
          };
        } else {
          // 格式: Username | Password | RealName | Role
          return {
            username: cols[0],
            password: cols[1],
            displayName: cols[2],
            role: cols[3],
          };
        }
      })
      .filter((u) => u.username); // 过滤空行

    setPreview(parsed);
  };

  const handleSubmit = async () => {
    if (preview.length === 0) return;
    setIsConfirmOpen(true);
  };

  const handleConfirmImport = async () => {
    setIsSubmitting(true);
    setIsConfirmOpen(false);
    try {
      await importUsers(contestId, preview, type);
      setText("");
      setPreview([]);
      toast.success("Import successful!");
    } catch (e) {
      toast.error("Import failed: " + e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 辅助函数：将类型代码转为文字
  const getCategoryLabel = (cat: string) => {
    if (cat === "0") return "Official";
    if (cat === "1") return "Unofficial (★)";
    if (cat === "2") return "Girls";
    return cat || "-";
  };

  return (
    <div className="space-y-4">
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Confirm Import"
        message={`Are you sure you want to import ${preview.length} users? This action cannot be undone.`}
        confirmText="Import"
        onConfirm={handleConfirmImport}
        onCancel={() => setIsConfirmOpen(false)}
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-bold flex items-center gap-2">
          <TableCellsIcon className="w-5 h-5" />
          Excel / CSV Paste Format
        </p>
        <div className="mt-2 font-mono bg-white p-2 rounded border border-blue-100 overflow-x-auto whitespace-nowrap">
          {type === "TEAM" ? (
            <span>
              Username &emsp; Password &emsp; TeamName &emsp; School &emsp;
              Members &emsp; Seat &emsp; Coach &emsp; Type(0/1/2)
            </span>
          ) : (
            <span>
              Username &emsp; Password &emsp; RealName &emsp;
              Role(JUDGE/BALLOON/ADMIN)
            </span>
          )}
        </div>
        <div className="mt-2 text-xs opacity-75 space-y-1">
          <p>* Columns are separated by Tab (default Excel copy format).</p>
          <p className="font-bold text-blue-900">
            * Leave Password empty to auto-generate.
          </p>
          {type === "TEAM" && (
            <p>* Type: 0 = Official, 1 = Star (Unofficial), 2 = Girls Team.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 输入区 */}
        <div>
          <textarea
            className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none whitespace-pre"
            placeholder={
              type === "TEAM"
                ? `team001\t123456\tMy Team\tXCPC Univ\tAlice,Bob\tA-101\tProf.Zhang\t0`
                : `admin01\t123456\tJohn Doe\tJUDGE`
            }
            value={text}
            onChange={(e) => handleParse(e.target.value)}
          ></textarea>
        </div>

        {/* 预览区 */}
        <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col h-64">
          <div className="bg-gray-50 px-4 py-2 border-b font-medium text-xs text-gray-500 flex justify-between items-center">
            <span>Preview ({preview.length} rows)</span>
            <button
              onClick={handleSubmit}
              disabled={preview.length === 0 || isSubmitting}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 transition-colors font-bold shadow-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              {isSubmitting ? "Importing..." : "Import Users"}
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Name</th>
                  {type === "TEAM" ? (
                    <>
                      <th className="px-3 py-2">School</th>
                      <th className="px-3 py-2">Seat</th>
                      <th className="px-3 py-2">Coach</th>
                      <th className="px-3 py-2">Type</th>
                    </>
                  ) : (
                    <th className="px-3 py-2">Role</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono text-blue-600">
                      {row.username}
                    </td>
                    <td className="px-3 py-1.5">{row.displayName}</td>
                    {type === "TEAM" ? (
                      <>
                        <td className="px-3 py-1.5 text-gray-500">
                          {row.school || "-"}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">
                          {row.seat || "-"}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">
                          {row.coach || "-"}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">
                          {getCategoryLabel(row.category as string)}
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-1.5">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded border">
                          {row.role || "JUDGE"}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
                {preview.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Paste data to preview
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
