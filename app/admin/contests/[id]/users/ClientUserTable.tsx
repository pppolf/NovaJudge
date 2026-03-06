"use client";

import { useState } from "react";
import { deleteUser } from "./actions";
import EditUserModal from "./EditUserModal";
import ConfirmModal from "@/components/admin/ConfirmModal";
import {
  TrashIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { User } from "@/lib/generated/prisma/client";
import { toast } from "sonner";

// 辅助组件：显示队伍类型
function TeamCategoryBadge({ category }: { category: string | null }) {
  if (category === "1")
    return (
      <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
        ★ Star
      </span>
    );
  if (category === "2")
    return (
      <span className="bg-pink-100 text-pink-700 border border-pink-200 px-2 py-0.5 rounded text-[10px] font-bold">
        Girls
      </span>
    );
  return (
    <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[10px]">
      Official
    </span>
  );
}

export default function ClientUserTable({
  initialUsers,
  contestId,
  activeTab,
}: {
  initialUsers: User[];
  contestId: number;
  activeTab: "TEAM" | "STAFF";
}) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState(false); // 控制是否显示密码
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // 删除用户操作
  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser(deletingUser.id, contestId);
      setDeletingUser(null);
      toast.success("User deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete user: " + error);
    }
  };

  // 导出 CSV 功能
  const handleExport = () => {
    const headers =
      activeTab === "TEAM"
        ? [
            "Username",
            "Password",
            "DisplayName",
            "School",
            "Members",
            "Seat",
            "Coach",
            "Category",
          ]
        : ["Username", "Password", "DisplayName", "Role"];

    // 生成 CSV 内容 (直接使用 u.plainPassword)
    const csvContent = [
      headers.join(","),
      ...initialUsers.map((u: User) => {
        const pass = u.plainPassword || "********"; // 如果是旧数据没有明文，显示星号
        const row =
          activeTab === "TEAM"
            ? [
                u.username,
                pass,
                u.displayName,
                u.school,
                u.members,
                u.seat,
                u.coach,
                u.category,
              ]
            : [u.username, pass, u.displayName, u.role];
        return row
          .map(
            (cell: string | null) =>
              `"${(cell || "").toString().replace(/"/g, '""')}"`,
          )
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contest_${contestId}_${activeTab.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
      <ConfirmModal
        isOpen={!!deletingUser}
        title="Delete User"
        message={`Are you sure you want to delete user ${deletingUser?.username}?`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeletingUser(null)}
        isDestructive
      />
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-700">User List</h3>
          <span className="text-xs text-gray-500 bg-white border px-2 py-1 rounded">
            Total: {initialUsers.length}
          </span>
        </div>

        <div className="flex gap-2">
          {/* 切换密码显示按钮 */}
          <button
            onClick={() => setShowPasswords(!showPasswords)}
            className="flex items-center cursor-pointer gap-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors"
          >
            {showPasswords ? (
              <EyeSlashIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
            {showPasswords ? "Hide" : "Show Passwords"}
          </button>

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded hover:bg-green-100 transition-colors cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Username</th>
              <th className="px-6 py-3">Display Name</th>

              {/* 密码列 */}
              <th className="px-6 py-3 w-32">Password</th>

              {activeTab === "TEAM" ? (
                <>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">School</th>
                  <th className="px-6 py-3">Coach</th>
                  <th className="px-6 py-3">Seat</th>
                </>
              ) : (
                <th className="px-6 py-3">Role</th>
              )}
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initialUsers.map((user: User) => (
              <tr key={user.id} className="hover:bg-gray-50 group">
                <td className="px-6 py-3 font-mono font-medium text-blue-600">
                  {user.username}
                </td>
                <td className="px-6 py-3 font-bold text-gray-800">
                  {user.displayName}
                </td>

                {/* 密码列显示 */}
                <td className="px-6 py-3 font-mono">
                  {showPasswords ? (
                    <span className="text-red-600 bg-red-50 px-1 rounded select-all">
                      {user.plainPassword || "N/A"}
                    </span>
                  ) : (
                    <span className="text-gray-400">••••••••</span>
                  )}
                </td>

                {activeTab === "TEAM" ? (
                  <>
                    <td className="px-6 py-3">
                      <TeamCategoryBadge category={user.category} />
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {user.school || "-"}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {user.coach || "-"}
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-500">
                      {user.seat || "-"}
                    </td>
                  </>
                ) : (
                  <td className="px-6 py-3">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs border">
                      {user.role}
                    </span>
                  </td>
                )}

                <td className="px-6 py-3 text-right flex justify-end gap-2">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-blue-500 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Edit User"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeletingUser(user)}
                    className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete User"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {initialUsers.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-8 text-center text-gray-400 italic"
                >
                  No users found. Import them above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          contestId={contestId}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}
