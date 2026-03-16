"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ContestNoticeSniffer({
  contestId,
}: {
  contestId: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkNotice = async () => {
      try {
        const res = await fetch(`/api/contests/${contestId}/latest-notice`);
        const json = await res.json();

        if (json.success && json.data) {
          const latest = json.data;
          const storageKey = `contest_${contestId}_last_notice_id`;
          const lastSeenId = localStorage.getItem(storageKey);

          if (!lastSeenId || parseInt(lastSeenId) < latest.id) {
            toast.info("📢 裁判发布了新公告", {
              description: latest.title,
              position: "top-right",
              duration: Infinity,
              action: {
                label: "前往查看",
                onClick: () => {
                  router.push(`/contest/${contestId}/clarifications`);
                },
              },
            });

            localStorage.setItem(storageKey, latest.id.toString());
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    checkNotice();

    const interval = setInterval(checkNotice, 15000);
    return () => clearInterval(interval);
  }, [contestId, router]);

  return null;
}
