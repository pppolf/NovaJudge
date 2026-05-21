"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createPrintJob } from "@/app/(main)/contest/[contestId]/print/actions";
import { XMarkIcon } from "@heroicons/react/24/outline";

const ALLOWED_EXTENSIONS = [".cpp", ".c", ".cc", ".cxx", ".java", ".py"];
const LANGUAGES = [
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
  { value: "pypy3", label: "Python" },
];
const MAX_PRINT_BYTES = 120_000;

type PrintHistoryJob = {
  id: number;
  language: string;
  sourceFilename: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  printedAt: string | null;
  updatedAt: string;
};

function hasAllowedExtension(fileName: string) {
  const lowerName = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

function languageFromFile(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".c")) return "c";
  if (lowerName.endsWith(".java")) return "java";
  if (lowerName.endsWith(".py")) return "pypy3";
  return "cpp";
}

export default function PrintRequestModal({
  contestId,
  onClose,
}: {
  contestId: number;
  onClose: () => void;
}) {
  const [language, setLanguage] = useState("cpp");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<PrintHistoryJob[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/contests/${contestId}/print-jobs/mine`, {
        cache: "no-store",
      });
      const data = await response.json();
      setHistory(Array.isArray(data.jobs) ? data.jobs : []);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadHistory();
    const timer = window.setInterval(() => void loadHistory(), 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const fileError = useMemo(() => {
    if (!file) return "";
    if (!hasAllowedExtension(file.name)) {
      return `Only ${ALLOWED_EXTENSIONS.join(", ")} files can be printed.`;
    }
    if (file.size > MAX_PRINT_BYTES) {
      return "File is too large to print.";
    }
    return "";
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    if (selected) setLanguage(languageFromFile(selected.name));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error("Please choose a source file.");
      return;
    }
    if (fileError) {
      toast.error(fileError);
      return;
    }

    setIsSubmitting(true);
    try {
      const code = await file.text();
      if (code.includes("\0")) {
        toast.error("Binary files cannot be printed.");
        return;
      }

      const result = await createPrintJob(contestId, language, code, file.name);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Print request sent.");
      setFile(null);
      await loadHistory();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl bg-white border border-gray-200 shadow-xl rounded-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Print Source File</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-sm"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="w-full border border-gray-300 bg-gray-50 rounded-sm px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Source File
            </label>
            <input
              type="file"
              accept=".cpp,.c,.cc,.cxx,.java,.py"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700 file:mr-4 file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-700 hover:file:bg-slate-200"
            />
            <p className="mt-2 text-xs text-gray-500">
              Allowed: {ALLOWED_EXTENSIONS.join(", ")}
            </p>
            {fileError && (
              <p className="mt-2 text-xs font-bold text-red-600">{fileError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file || !!fileError}
              className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed rounded-sm"
            >
              {isSubmitting ? "Sending..." : "Send to Print"}
            </button>
          </div>
        </form>

        <div className="border-t border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">My Print Requests</h3>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              {isLoadingHistory ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">No print requests yet.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {history.map((job) => (
                <div
                  key={job.id}
                  className="border border-gray-200 bg-gray-50 rounded-sm px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate">
                        #{job.id} / {job.sourceFilename || job.language}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(job.createdAt).toLocaleString("zh-CN", {
                          hour12: false,
                        })}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-1 text-xs font-bold rounded-sm ${
                        job.status === "FAILED"
                          ? "bg-red-100 text-red-700"
                          : job.status === "PRINTED"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  {job.status === "FAILED" && job.errorMessage && (
                    <p className="mt-2 text-xs font-bold text-red-600">
                      Rejected: {job.errorMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
