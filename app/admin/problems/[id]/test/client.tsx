"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { adminSubmit } from "./actions";
import { PlayIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import CodeBlock from "@/components/CodeBlock";
import CodeEditor from "@/components/CodeEditor";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// 提取公共样式：标题样式 (蓝色竖线)
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-bold text-blue-800 border-l-4 border-blue-600 pl-3 mb-3 font-serif tracking-wide">
    {children}
  </h3>
);

interface Section {
  title: string;
  content: string;
}

interface Sample {
  input: string;
  output: string;
}

interface ProblemDetail {
  id: number;
  title: string;
  defaultTimeLimit: number;
  defaultMemoryLimit: number;
  sections: Section[];
  samples: Sample[];
  hint: string;
}

export default function TestInterface({ problem }: { problem: ProblemDetail }) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cacheKey = `xcpc_admin_p${problem.id}_code`;
    const langKey = `xcpc_admin_p${problem.id}_lang`;

    const savedCode = localStorage.getItem(cacheKey);
    const savedLang = localStorage.getItem(langKey);

    if (savedCode !== null) setCode(savedCode);
    if (savedLang !== null) setLanguage(savedLang);

    setIsLoaded(true);
  }, [problem.id]);

  useEffect(() => {
    if (!isLoaded) return; // 防止未加载完成前的空状态覆盖了缓存

    const timer = setTimeout(() => {
      localStorage.setItem(`xcpc_admin_p${problem.id}_code`, code);
      localStorage.setItem(`xcpc_admin_p${problem.id}_lang`, language);
    }, 500);

    return () => clearTimeout(timer);
  }, [code, language, problem.id, isLoaded]);

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error("Code cannot be empty");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await adminSubmit(problem.id, code, language);
      if (res.success) {
        setLastId(res.submissionId);
        toast.success("Submitted successfully!");
        router.push("/admin/submissions");
      }
    } catch (e) {
      toast.error("Submission failed: " + e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4">
      {/* --- 左侧：题目预览区 (50%) --- */}
      <div className="flex-1 relative bg-white border border-gray-200 rounded-lg shadow-sm overflow-y-auto p-6 min-h-0">
        <div className="absolute inset-0 overflow-y-auto p-6">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8 text-center border-b pb-4">
            {problem.title}
          </h1>

          <div className="space-y-8">
            {/* 1. 渲染常规文本段落 (Description, Input, Output) */}
            {problem.sections.map((section: Section, index: number) => (
              <div key={`section-${index}`}>
                <SectionTitle>{section.title}</SectionTitle>
                <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-pre:bg-gray-100 prose-pre:text-gray-800">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                  >
                    {section.content}
                  </ReactMarkdown>
                </article>
              </div>
            ))}
            {/* 2. 渲染样例数组 */}
            {problem.samples.map((sample: Sample, index: number) => {
              // 如果只有一组样例，标题不显示序号；如果有多组，显示 1, 2, 3...
              const suffix = problem.samples.length > 1 ? ` ${index + 1}` : "";

              return (
                <div key={`sample-${index}`} className="grid grid-cols-1 gap-6">
                  <div>
                    <SectionTitle>Sample Input{suffix}</SectionTitle>
                    <CodeBlock code={sample.input} />
                  </div>
                  <div>
                    <SectionTitle>Sample Output{suffix}</SectionTitle>
                    <CodeBlock code={sample.output} />
                  </div>
                </div>
              );
            })}
            {/* 3. 渲染 Hint (如果有) */}
            {problem.hint && (
              <div>
                <SectionTitle>Hint</SectionTitle>
                <article className="prose prose-sm md:prose-base max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                  >
                    {problem.hint}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- 右侧：代码编辑区 (50%) --- */}
      <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">Code Editor</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-sm border-gray-300 rounded shadow-sm py-1 px-2"
            >
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="pypy3">PyPy3</option>
            </select>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <PlayIcon className="w-4 h-4" /> Submit
              </>
            )}
          </button>
        </div>

        {/* min-h-0 对于 flex 容器内的 Monaco 很重要 */}
        <div className="flex-1 relative w-full min-h-0">
          <div className="absolute inset-0">
            {/* pb-2 留一点底部空隙防止贴底 */}
            <CodeEditor
              value={code}
              language={language}
              onChange={setCode}
              height="100%"
            />
          </div>
        </div>

        {lastId && (
          <div className="bg-green-50 text-green-700 text-xs px-4 py-2 border-t border-green-100 flex items-center">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Last Submission: {lastId} (Check Global Submissions for result)
          </div>
        )}
      </div>
    </div>
  );
}
