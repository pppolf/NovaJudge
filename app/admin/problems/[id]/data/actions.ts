"use server";

import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import JSZip from "jszip";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads", "problems");

interface problemYml {
  type?: string;
  time?: number;
  memory?: number;
  cases?: {
    input: string;
    output: string;
  }[];
  checker?: string;
  interactor?: string;
  time_limit_rate?: {
    java?: number;
    pypy3?: number;
  };
  memory_limit_rate?: {
    java?: number;
    pypy3?: number;
  };
}

function getDataDir(problemId: number) {
  if (!problemId || isNaN(problemId)) {
    throw new Error(`Invalid problemId: ${problemId}`);
  }
  return path.join(UPLOAD_ROOT, problemId.toString(), "data");
}

const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

async function autoDetectCases(dir: string, currentYamlContent: string) {
  const files = await fs.readdir(dir);
  const inputs = files.filter((f) => f.endsWith(".in")).sort(naturalSort);
  const detectedCases = [];
  const checker = files.find((f) => f === "checker.cpp");
  const interactor = files.find((f) => f === "interactor.cpp");
  for (const input of inputs) {
    const basename = path.basename(input, ".in");
    if (files.includes(`${basename}.out`)) {
      detectedCases.push({ input: input, output: `${basename}.out` });
    } else if (files.includes(`${basename}.ans`)) {
      detectedCases.push({ input: input, output: `${basename}.ans` });
    } else {
      detectedCases.push({ input: input, output: "/dev/null" });
    }
  }

  let parsed: problemYml = {};
  try {
    parsed = yaml.load(currentYamlContent) || {};
  } catch (e) {
    console.log(e);
  }
  if (detectedCases.length > 0) {
    parsed.cases = detectedCases;
  }
  if (checker) {
    parsed.checker = checker;
  }
  if (interactor) {
    parsed.interactor = interactor;
  }
  return yaml.dump(parsed);
}

// 1. 获取数据
export async function getProblemData(problemId: number) {
  const dir = getDataDir(problemId);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }

  const files = await fs.readdir(dir);
  const fileStats = await Promise.all(
    files.map(async (file) => {
      const stat = await fs.stat(path.join(dir, file));
      return { name: file, size: stat.size, updatedAt: stat.mtime };
    }),
  );

  fileStats.sort((a, b) => naturalSort(a.name, b.name));

  const yamlPath = path.join(dir, "problem.yml");
  let yamlContent = "";
  try {
    yamlContent = await fs.readFile(yamlPath, "utf-8");
  } catch {
    yamlContent = "";
    await fs.writeFile(yamlPath, yamlContent);
  }

  return {
    files: fileStats.filter((f) => f.name !== "problem.yml"),
    yamlContent,
  };
}

// 2. 保存 YAML
export async function saveYamlConfig(problemId: number, content: string) {
  const dir = getDataDir(problemId);
  await fs.writeFile(path.join(dir, "problem.yml"), content);
  try {
    const parsed = yaml.load(content) as problemYml;
    await prisma.problem.update({
      where: { id: problemId },
      data: {
        judgeConfig: parsed as {
          input: string;
          output: string;
        }[],
      },
    });
  } catch (e) {
    console.log(e);
  }
  revalidatePath(`/admin/problems/${problemId}/data`);
}

// 3. 上传文件
export async function uploadFiles(problemId: number, formData: FormData) {
  // 【检查】确保 problemId 存在
  if (!problemId) throw new Error("Missing Problem ID");

  // 确保目录存在

  const dir = getDataDir(problemId);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }

  // 1. 读取旧的配置内容（为了保留 Time Limit, Memory Limit 等非文件及其的配置）
  let currentYamlContent = "";
  try {
    currentYamlContent = await fs.readFile(
      path.join(dir, "problem.yml"),
      "utf-8",
    );
  } catch {}

  const existingFiles = await fs.readdir(dir);
  await Promise.all(
    existingFiles.map(async (file) => {
      await fs.unlink(path.join(dir, file));
    }),
  );

  // 3. 写入新上传的文件
  const entries = Array.from(formData.entries());
  for (const [, value] of entries) {
    if (value instanceof File) {
      // 特殊处理 ZIP 文件
      if (value.name.toLowerCase().endsWith(".zip")) {
        const arrayBuffer = await value.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // 遍历压缩包内容
        const writePromises: Promise<void>[] = [];

        zip.forEach((relativePath, zipEntry) => {
          if (zipEntry.dir) return; // 跳过目录

          // 防止路径遍历攻击，只取文件名
          // 如果你需要保留 zip 里的目录结构，这里需要更复杂的逻辑来创建嵌套文件夹
          const fileName = path.basename(relativePath);

          // 忽略以 . 或 __MACOSX 开头的隐藏/系统文件
          if (fileName.startsWith(".") || relativePath.includes("__MACOSX"))
            return;

          const promise = zipEntry.async("nodebuffer").then((content) => {
            return fs.writeFile(path.join(dir, fileName), content);
          });
          writePromises.push(promise);
        });

        await Promise.all(writePromises);
      } else {
        // 普通文件直接写入
        const arrayBuffer = await value.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = path.basename(value.name);
        await fs.writeFile(path.join(dir, fileName), buffer);
      }
    }
  }

  const newYaml = await autoDetectCases(dir, currentYamlContent);
  await saveYamlConfig(problemId, newYaml);
  return newYaml;
}

// 4. 删除文件
export async function deleteFile(problemId: number, fileName: string) {
  const filePath = path.join(getDataDir(problemId), fileName);
  try {
    await fs.unlink(filePath);
  } catch {}
  revalidatePath(`/admin/problems/${problemId}/data`);
}

// 【新增】读取文件内容
export async function getFileContent(problemId: number, fileName: string) {
  const filePath = path.join(getDataDir(problemId), fileName);
  try {
    // 限制读取文件大小，防止读取过大的数据文件导致崩盘 (例如限制 20MB)
    const stat = await fs.stat(filePath);
    if (stat.size > 1024 * 1024 * 20) {
      return "Error: File is too large to preview (limit 20MB).";
    }
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (e) {
    console.error(`Read file ${fileName} failed`, e);
    return "Error: Failed to read file.";
  }
}

// 【新增】保存文件内容
export async function saveFileContent(
  problemId: number,
  fileName: string,
  content: string,
) {
  const dir = getDataDir(problemId);
  const filePath = path.join(dir, fileName);

  await fs.writeFile(filePath, content);
  revalidatePath(`/admin/problems/${problemId}/data`);
}
