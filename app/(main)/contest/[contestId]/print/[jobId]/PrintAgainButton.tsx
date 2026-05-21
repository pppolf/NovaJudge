"use client";

export default function PrintAgainButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 rounded-sm bg-slate-800 text-white text-sm font-bold"
    >
      Print Again
    </button>
  );
}
