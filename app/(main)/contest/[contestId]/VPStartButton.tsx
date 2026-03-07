"use client";

import { useState } from "react";
import { PlayCircleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface Props {
  contestId: number;
}

export default function VPStartButton({ contestId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contest/${contestId}/vp`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "启动虚拟参赛失败");
        return;
      }
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </p>
      )}
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <PlayCircleIcon className="w-5 h-5" />
        {loading ? "正在启动..." : "开始虚拟参赛 (VP)"}
      </button>
      <p className="text-xs text-gray-500 text-center">
        虚拟参赛将模拟完整的比赛时长，提交将计入个人 VP 成绩
      </p>
    </div>
  );
}
