"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { rejudgeProblem } from "./actions"; // 确保这里能导入 rejudgeProblem 或者将其通过 props 传递
import { useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";

export default function RejudgeButton({ problemId }: { problemId: number }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleRejudge = () => {
    setIsConfirmOpen(true);
  };

  const confirmRejudge = async () => {
    setIsConfirmOpen(false);
    await rejudgeProblem(problemId);
  };

  return (
    <>
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Rejudge Problem"
        message={`Are you sure you want to rejudge ALL submissions for problem #${problemId}?`}
        confirmText="Rejudge All"
        onConfirm={confirmRejudge}
        onCancel={() => setIsConfirmOpen(false)}
      />
      <button
        onClick={handleRejudge}
        className="text-green-600 hover:text-green-800 cursor-pointer"
        title="Rejudge All Submissions"
        type="button"
      >
        <ArrowPathIcon className="w-5 h-5" />
      </button>
    </>
  );
}
