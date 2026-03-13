"use client";

import { createContest } from "../actions";
import { useState } from "react";
import {
  ArrowLeftIcon,
  TrophyIcon,
  LockClosedIcon,
  GlobeAltIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import MarkdownEditor from "@/components/MarkdownEditor";

export default function CreateContestPage() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [medalMode, setMedalMode] = useState<"ratio" | "fixed">("ratio");
  const [description, setDescription] = useState("");

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
            Create New Contest
          </h1>
          <p className="text-gray-500 mt-1">
            Set up a new competitive programming contest.
          </p>
        </div>
      </div>

      <form
        action={createContest}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* === 左侧主栏 (2/3 宽度) === */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. 基础信息卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <GlobeAltIcon className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-800">Basic Information</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Contest Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="e.g. The 5th XCPC Collegiate Programming Contest"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description / Rules
                </label>
                {/* 使用 MarkdownEditor */}
                <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    height={300}
                  />
                </div>
                {/* 当表单提交时，formData.get('description') 会从这里取值 */}
                <input type="hidden" name="description" value={description} />
              </div>
            </div>
          </div>

          {/* 2. 奖牌设置卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <TrophyIcon className="w-5 h-5 text-yellow-500" />
              <h2 className="font-semibold text-gray-800">Awards & Medals</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* 模式切换 */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-medium text-gray-700">Mode:</span>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMedalMode("ratio")}
                    className={`px-4 py-1.5 cursor-pointer rounded-md text-sm font-medium transition-all ${
                      medalMode === "ratio"
                        ? "bg-white shadow text-blue-600"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Ratio (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedalMode("fixed")}
                    className={`px-4 py-1.5 cursor-pointer rounded-md text-sm font-medium transition-all ${
                      medalMode === "fixed"
                        ? "bg-white shadow text-blue-600"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Fixed Count
                  </button>
                </div>
                <input type="hidden" name="medalMode" value={medalMode} />
              </div>

              {/* 输入框 */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-yellow-600 uppercase tracking-wide">
                    Gold
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="medal_gold"
                      defaultValue={10}
                      min={0}
                      className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                    />
                    <span className="absolute right-3 top-2 text-gray-400 text-sm">
                      {medalMode === "ratio" ? "%" : ""}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Silver
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="medal_silver"
                      defaultValue={20}
                      min={0}
                      className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-gray-400 focus:border-gray-400 outline-none"
                    />
                    <span className="absolute right-3 top-2 text-gray-400 text-sm">
                      {medalMode === "ratio" ? "%" : ""}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-orange-600 uppercase tracking-wide">
                    Bronze
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="medal_bronze"
                      defaultValue={30}
                      min={0}
                      className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                    <span className="absolute right-3 top-2 text-gray-400 text-sm">
                      {medalMode === "ratio" ? "%" : ""}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {medalMode === "ratio"
                  ? "Percentages are based on the total number of effective teams (at least 1 solved)."
                  : "Fixed number of medals regardless of team count."}
              </p>
            </div>
          </div>
        </div>

        {/* === 右侧边栏 (1/3 宽度) === */}
        <div className="space-y-8">
          {/* 3. 访问权限卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <LockClosedIcon className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-800">Access Control</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Visibility Toggle */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Visibility
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="visible"
                    value="true"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    Show in Contest List (Publicly Visible)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Uncheck to create a hidden contest (accessible only via direct
                  link).
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Contest Type
                </label>
                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-3 border p-3 rounded-lg cursor-pointer transition-all ${
                      !isPrivate
                        ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200"
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="PUBLIC"
                      defaultChecked
                      onChange={() => setIsPrivate(false)}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-bold text-gray-800 text-sm">
                        Public Contest
                      </div>
                      <div className="text-xs text-gray-500">
                        Visible to everyone on the internet
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 border p-3 rounded-lg cursor-pointer transition-all ${
                      isPrivate
                        ? "bg-yellow-50 border-yellow-200 ring-1 ring-yellow-200"
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="PRIVATE"
                      onChange={() => setIsPrivate(true)}
                      className="text-yellow-600 focus:ring-yellow-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-bold text-gray-800 text-sm">
                        Private Contest
                      </div>
                      <div className="text-xs text-gray-500">
                        Password required to enter
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {isPrivate && (
                <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Contest Password
                  </label>
                  <input
                    type="text"
                    name="password"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 font-mono text-center tracking-widest"
                    placeholder="SECRET123"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. 榜单设置卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-800">Scoreboard</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Frozen Time (mins)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="frozenDuration"
                    defaultValue={60}
                    min={0}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    before end
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Scoreboard freezes to keep suspense.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Auto Unfreeze (hours)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="unfreezeDelay"
                    defaultValue={300}
                    min={0}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    after end
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Automatically reveal full scoreboard.
                </p>
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-lg hover:bg-black transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            Create Contest
          </button>
        </div>
      </form>
    </div>
  );
}
