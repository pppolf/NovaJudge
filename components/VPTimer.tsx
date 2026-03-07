"use client";

import { useState, useEffect } from "react";
import { ClockIcon } from "@heroicons/react/24/outline";

interface Props {
  vpStartTime: string | Date;
  vpEndTime: string | Date;
}

export default function VPTimer({ vpStartTime, vpEndTime }: Props) {
  const start = new Date(vpStartTime).getTime();
  const end = new Date(vpEndTime).getTime();

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) {
    return <div className="h-6 w-32 bg-gray-100 animate-pulse rounded" />;
  }

  // VP 已结束
  if (now > end) {
    return (
      <div className="flex items-center gap-2 text-gray-500 font-bold bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
        <span>虚拟参赛已结束</span>
      </div>
    );
  }

  // VP 进行中
  const duration = end - start;
  const elapsed = now - start;
  const progress = Math.min(100, (elapsed / duration) * 100);

  const remaining = end - now;
  const rHours = Math.floor(remaining / 3600000);
  const rMinutes = Math.floor((remaining % 3600000) / 60000);
  const rSeconds = Math.floor((remaining % 60000) / 1000);

  const eHours = Math.floor(elapsed / 3600000);
  const eMinutes = Math.floor((elapsed % 3600000) / 60000);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          <ClockIcon className="w-3.5 h-3.5" />
          虚拟参赛进行中
        </span>
      </div>
      <div className="flex justify-between text-base font-medium text-gray-600 mb-1">
        <span>
          VP Elapsed: {eHours}:{eMinutes.toString().padStart(2, "0")}
        </span>
        <span className="text-green-600 font-mono">
          -{rHours}:{rMinutes.toString().padStart(2, "0")}:
          {rSeconds.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden border border-gray-300">
        <div
          className="h-full bg-linear-to-r from-green-400 to-green-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
