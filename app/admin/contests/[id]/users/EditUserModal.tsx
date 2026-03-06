"use client";

import { useState } from "react";
import { updateUser } from "./actions";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  school: string | null;
  members: string | null;
  seat: string | null;
  role: string;
  coach: string | null;
  category: string | null;
}

interface EditUserModalProps {
  user: User;
  contestId: number;
  onClose: () => void;
}

export default function EditUserModal({
  user,
  contestId,
  onClose,
}: EditUserModalProps) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    password: "", // 默认为空，表示不修改
    school: user.school || "",
    members: user.members || "",
    seat: user.seat || "",
    coach: user.coach || "",
    category: user.category || "0",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateUser(user.id, contestId, formData);
      onClose(); // 关闭弹窗
    } catch (error) {
      toast.error("Failed to update: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">
            Edit User:{" "}
            <span className="text-blue-600 font-mono">{user.username}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Display Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Reset Password
            </label>
            <input
              type="text"
              placeholder="Leave empty to keep unchanged"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-yellow-50 placeholder-gray-400"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Enter a new value to update the user&apos;s password.
            </p>
          </div>

          {/* 只有 TEAM 角色才显示这些字段 */}
          {user.role === "TEAM" && (
            <>
              {/* [新增] 队伍类型选择 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Team Category
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value="0"
                      checked={formData.category === "0"}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Official</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value="1"
                      checked={formData.category === "1"}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-purple-700 font-medium">
                      ★ Star
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value="2"
                      checked={formData.category === "2"}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="text-pink-600 focus:ring-pink-500"
                    />
                    <span className="text-sm text-pink-700 font-medium">
                      Girls
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    School
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.school}
                    onChange={(e) =>
                      setFormData({ ...formData, school: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Seat
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.seat}
                    onChange={(e) =>
                      setFormData({ ...formData, seat: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* [新增] Coach 字段 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Coach
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.coach}
                    onChange={(e) =>
                      setFormData({ ...formData, coach: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Members
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.members}
                    onChange={(e) =>
                      setFormData({ ...formData, members: e.target.value })
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
