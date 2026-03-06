"use client";

import { useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface Props {
  contestId: number;
}

export default function ExportEventFeedButton({ contestId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);

      // 1. 尝试直接使用 Cookie 下载
      // static=true: 不流式传输
      // runs=false: 不包含 runs 数据
      let response = await fetch(
        `/api/ccs/contests/${contestId}/event-feed?stream=false&runs=false`,
      );

      // 2. 如果 Cookie 验证失败 (401)，则弹出提示输入 CCS 账号密码
      if (response.status === 401) {
        setLoading(false); // 暂时取消 loading，因为要弹窗
        // 等待下一帧以确保 UI 更新
        await new Promise((resolve) => setTimeout(resolve, 0));

        const username = prompt(
          "Authentication required. Please enter CCS username (admin):",
          "admin",
        );
        if (!username) return;
        const password = prompt("Please enter CCS password:");
        if (!password) return;

        setLoading(true);
        const credentials = btoa(`${username}:${password}`);
        response = await fetch(
          `/api/ccs/contests/${contestId}/event-feed?stream=false&runs=false`,
          {
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          },
        );
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized: Invalid credentials");
        }
        throw new Error(`Failed to fetch event feed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-feed.ndjson`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="ml-2 flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
      title="Export Event Feed JSON"
    >
      <ArrowDownTrayIcon className="w-4 h-4" />
      {loading ? "Exporting..." : "Event Feed"}
    </button>
  );
}
