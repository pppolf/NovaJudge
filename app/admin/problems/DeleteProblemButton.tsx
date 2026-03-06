"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { deleteProblem } from "./actions";
import { useState } from "react";
import ConfirmModal from "@/components/admin/ConfirmModal";

export default function RejudgeButton({ problemId }: { problemId: number }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleDelete = () => {
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setIsConfirmOpen(false);
    await deleteProblem(problemId);
  };

  return (
    <>
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Problem"
        message={`Are you sure you want to DELETE this problem #${problemId}?`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        isDestructive
      />
      <button
        onClick={handleDelete}
        className="text-red-400 hover:text-red-600 cursor-pointer"
        title="Delete Problem"
        type="button"
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </>
  );
}
