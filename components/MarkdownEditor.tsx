"use client";

import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useState, useEffect } from "react";

// 动态导入 MDEditor，关闭 SSR
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// 定义数学公式插件 (为了在编辑器预览里也能看到公式)
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  height?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  height = 300,
}: MarkdownEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted)
    return <div className="h-75 bg-gray-50 border rounded animate-pulse" />;

  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="live" // 默认显示编辑+预览
        previewOptions={{
          rehypePlugins: [rehypeKatex],
          remarkPlugins: [remarkMath],
        }}
        textareaProps={{
          placeholder:
            "Type your problem description here... Supports Markdown & LaTeX ($E=mc^2$)",
        }}
      />
    </div>
  );
}
