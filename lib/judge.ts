import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import path from "path";
import { promises as fs } from "fs";
import { Verdict } from "@/lib/generated/prisma/enums";

const GO_JUDGE_URL = process.env.GO_JUDGE_API || "http://localhost:5050";
const STACK_SIZE_KB = Number(process.env.JUDGE_STACK_KB || 2097152);

// --- 类型定义 ---
interface LanguageConfig {
  srcName: string;
  exeName: string;
  compileCmd?: string[];
  runCmd: string[];
}

interface LanguageJudgeConfig {
  java?: number;
  pypy3?: number;
  c?: number;
  cpp?: number;
}

interface TestCaseConfig {
  input: string;
  output: string;
}

interface JudgeConfig {
  cases?: TestCaseConfig[];
  checker?: string;
  interactor?: string;
  time_limit_rate?: LanguageJudgeConfig;
  memory_limit_rate?: LanguageJudgeConfig;
}

interface JudgeProgress {
  verdict: string;
  passedTests: number;
  totalTests: number;
  finished: boolean;
}

// --- 语言配置 ---
export const LANGUAGES: Record<string, LanguageConfig> = {
  c: {
    srcName: "main.c",
    exeName: "main",
    compileCmd: [
      "/usr/bin/gcc",
      "main.c",
      "-o",
      "main",
      "-O2",
      "-Wall",
      "-lm",
      "-static",
      "-std=c11",
    ],
    runCmd: ["./main"],
  },
  cpp: {
    srcName: "main.cpp",
    exeName: "main",
    compileCmd: [
      "/usr/bin/g++",
      "main.cpp",
      "-o",
      "main",
      "-O2",
      "-Wall",
      "-lm",
      "-static",
      "-std=c++23",
    ],
    runCmd: ["./main"],
  },
  java: {
    srcName: "Main.java",
    exeName: "Main.jar",
    compileCmd: [
      "/usr/bin/bash",
      "-c",
      "export PATH=$PATH:/usr/lib/jvm/java-21-openjdk-amd64/bin && /usr/lib/jvm/java-21-openjdk-amd64/bin/javac -d . -encoding utf8 ./Main.java && jar cvf Main.jar *.class >/dev/null",
    ],
    runCmd: [
      "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
      "-Dfile.encoding='UTF-8'",
      "-cp",
      "Main.jar",
      "Main",
    ],
  },
  pypy3: {
    srcName: "main.py",
    exeName: "main.py",
    runCmd: ["/usr/bin/pypy3", "main.py"],
  },
};

// --- 辅助函数 ---

// 调用 go-judge 的 /run 接口
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGoJudge(payload: any) {
  const res = await fetch(`${GO_JUDGE_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Judge Server Error: ${res.statusText}`);
  return res.json();
}

async function deleteTmpFile(id: string) {
  try {
    const res = await fetch(`${GO_JUDGE_URL}/file/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) console.warn(`Failed to delete file ${id}: ${res.statusText}`);
    return res;
  } catch (e) {
    console.warn(`Failed to delete file ${id}`, e);
  }
}

// 清理文本 (去除末尾空白) 用于比对
function cleanOutput(str: string) {
  if (!str) return "";
  return str.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// 辅助：更新进度到 Redis
async function updateProgress(submissionId: string, data: JudgeProgress) {
  const key = `submission:${submissionId}:progress`;
  await redis.set(key, JSON.stringify(data), "EX", 3600);
}

// 编译 SPJ Checker
async function compileChecker(dataDir: string, checkerName: string) {
  const checkerPath = path.join(dataDir, checkerName);
  let checkerCode = "";
  try {
    checkerCode = await fs.readFile(checkerPath, "utf-8");
  } catch (e) {
    console.log(e);
    throw new Error(`Checker file not found: ${checkerName}`);
  }

  const testlibPath = path.join(process.cwd(), "lib", "judge", "testlib.h");
  let testlibCode = "";
  try {
    testlibCode = await fs.readFile(testlibPath, "utf-8");
  } catch (e) {
    console.error("Missing testlib.h", e);
    throw new Error("System Error: testlib.h not found on server.");
  }

  const compileRes = await callGoJudge({
    cmd: [
      {
        args: [
          "/usr/bin/g++",
          "checker.cpp",
          "-o",
          "checker",
          "-O2",
          "-std=c++23",
        ],
        env: ["PATH=/usr/bin:/bin"],
        files: [
          { content: "" },
          { name: "stdout", max: 1000000 },
          { name: "stderr", max: 1000000 },
        ],
        cpuLimit: 10000000000,
        memoryLimit: 1024 * 1024 * 1024, // 1GB
        procLimit: 50,
        copyIn: {
          "checker.cpp": { content: checkerCode },
          "testlib.h": { content: testlibCode },
        },
        copyOut: ["stdout", "stderr"],
        copyOutCached: ["checker"],
      },
    ],
  });

  if (compileRes[0].status !== "Accepted") {
    const fe = Array.isArray(compileRes[0].fileError)
      ? compileRes[0].fileError
          .map((x: { message?: string }) => x.message)
          .filter(Boolean)
          .join("; ")
      : "";
    const stderr = compileRes[0].files?.stderr || "";
    const stdout = compileRes[0].files?.stdout || "";
    const msg = stderr || fe || stdout || "Checker compile failed";
    throw new Error(msg);
  }

  return compileRes[0].fileIds["checker"];
}

// 编译 Interactor 交互文件
async function compileInteractor(dataDir: string, interactorName: string) {
  const interactorPath = path.join(dataDir, interactorName);

  let interactorCode = "";
  try {
    interactorCode = await fs.readFile(interactorPath, "utf-8");
  } catch (e) {
    console.log(e);
    throw new Error(`Interactor file not found: ${interactorName}`);
  }

  const testlibPath = path.join(process.cwd(), "lib", "judge", "testlib.h");
  let testlibCode = "";
  try {
    testlibCode = await fs.readFile(testlibPath, "utf-8");
  } catch (e) {
    console.log(e);
    throw new Error("System Error: testlib.h not found on server.");
  }

  const compileRes = await callGoJudge({
    cmd: [
      {
        args: [
          "/usr/bin/g++",
          "interactor.cpp",
          "-o",
          "interactor",
          "-O2",
          "-std=c++23",
        ],
        env: ["PATH=/usr/bin:/bin"],
        files: [
          { content: "" },
          { name: "stdout", max: 1000000 },
          { name: "stderr", max: 1000000 },
        ],
        cpuLimit: 10000000000,
        memoryLimit: 1024 * 1024 * 1024,
        procLimit: 50,
        copyIn: {
          "interactor.cpp": { content: interactorCode },
          "testlib.h": { content: testlibCode },
        },
        copyOut: ["stdout", "stderr"],
        copyOutCached: ["interactor"],
      },
    ],
  });
  if (compileRes[0].status !== "Accepted") {
    const fe = Array.isArray(compileRes[0].fileError)
      ? compileRes[0].fileError
          .map((x: { message?: string }) => x.message)
          .filter(Boolean)
          .join("; ")
      : "";
    const stderr = compileRes[0].files?.stderr || "";
    const stdout = compileRes[0].files?.stdout || "";
    const msg = stderr || fe || stdout || "Interactor compile failed";
    throw new Error(msg);
  }

  return compileRes[0].fileIds["interactor"];
}

// --- 核心判题逻辑 ---
export async function judgeSubmission(submissionId: string) {
  // A. 获取提交记录和题目信息
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { problem: true },
  });

  if (!submission) return;

  // 更新状态为 JUDGING
  await prisma.submission.update({
    where: { id: submissionId },
    data: { verdict: Verdict.JUDGING },
  });

  try {
    const { language, code, problem } = submission;
    const langConfig = LANGUAGES[language];
    if (!langConfig) throw new Error(`Unsupported Language: ${language}`);

    const judgeConfig = problem.judgeConfig as unknown as JudgeConfig;

    if (!judgeConfig || !judgeConfig.cases || judgeConfig.cases.length === 0) {
      throw new Error("No judge configuration or test cases found.");
    }

    const dataDir = path.join(
      process.cwd(),
      "uploads",
      "problems",
      problem.id.toString(),
      "data",
    );

    // 配对输入输出
    const testCases: { in: string; out: string }[] = [];
    for (const caseItem of judgeConfig.cases) {
      // 检查文件是否存在并读取
      try {
        let inputContent = "";
        // 1. 如果输入配置为 /dev/null，内容置空，不读文件
        if (caseItem.input === "/dev/null") {
          inputContent = "";
        } else {
          const inputPath = path.join(dataDir, caseItem.input);
          inputContent = await fs.readFile(inputPath, "utf-8");
        }

        let outputContent = "";
        // 2. 如果输出配置为 /dev/null，内容置空，不读文件
        if (caseItem.output === "/dev/null") {
          outputContent = "";
        } else {
          const outputPath = path.join(dataDir, caseItem.output);
          outputContent = await fs.readFile(outputPath, "utf-8");
        }

        testCases.push({
          in: inputContent,
          out: outputContent,
        });
      } catch (err) {
        console.error(
          `Error reading test case files: ${caseItem.input} / ${caseItem.output}`,
          err,
        );
        // 提供更友好的错误提示
        throw new Error(
          `Missing data files: ${caseItem.input} or ${caseItem.output}. Make sure they exist or use /dev/null.`,
        );
      }
    }

    // 初始化 Redis 状态
    await updateProgress(submissionId, {
      verdict: Verdict.JUDGING,
      passedTests: 0,
      totalTests: testCases.length,
      finished: false,
    });

    // 编译用户代码 (如果需要)
    let executableFileId = "";

    if (langConfig.compileCmd) {
      const compileRes = await callGoJudge({
        cmd: [
          {
            args: langConfig.compileCmd,
            env: [
              "PATH=/usr/bin:/bin:/usr/lib/jvm/java-21-openjdk-amd64/bin",
              "LANG=en_US.UTF-8",
              "LC_ALL=en_US.UTF-8",
              "JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64",
            ],
            files: [
              { content: "" },
              { name: "stdout", max: 1000000 },
              { name: "stderr", max: 1000000 },
            ],
            cpuLimit: 10000000000,
            memoryLimit: 1024 * 1024 * 1024,
            procLimit: 50,
            copyIn: {
              [langConfig.srcName]: { content: code },
            },
            copyOut: ["stdout", "stderr"],
            copyOutCached: [langConfig.exeName],
          },
        ],
      });

      const result = compileRes[0];
      if (result.status !== "Accepted") {
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            verdict: Verdict.COMPILE_ERROR,
            errorMessage: result.files?.stderr || "Compilation Failed",
          },
        });
        await updateProgress(submissionId, {
          verdict: Verdict.COMPILE_ERROR,
          passedTests: 0,
          totalTests: testCases.length,
          finished: true,
        });
        return;
      }
      if (result.fileIds && result.fileIds[langConfig.exeName]) {
        executableFileId = result.fileIds[langConfig.exeName];
      }
    }

    // 编译辅助程序 (Checker / Interactor)
    let checkerFileId = "";
    let interactorFileId = "";
    const isSpj = problem.type === "spj";
    const isInteractive = problem.type === "interactive";

    if (isSpj && judgeConfig.checker) {
      try {
        checkerFileId = await compileChecker(dataDir, judgeConfig.checker);
      } catch (e) {
        const err = e as Error;
        await prisma.submission.update({
          where: { id: submissionId },
          data: { verdict: Verdict.SYSTEM_ERROR, errorMessage: err.message },
        });
        await redis.del(`submission:${submissionId}:progress`);
        return;
      }
    } else if (isInteractive && judgeConfig.interactor) {
      try {
        interactorFileId = await compileInteractor(
          dataDir,
          judgeConfig.interactor,
        );
      } catch (e) {
        const err = e as Error;
        await prisma.submission.update({
          where: { id: submissionId },
          data: { verdict: Verdict.SYSTEM_ERROR, errorMessage: err.message },
        });
        await redis.del(`submission:${submissionId}:progress`);
        return;
      }
    }

    // D. 运行阶段
    let time_limit_rate =
      judgeConfig.time_limit_rate?.[language as keyof LanguageJudgeConfig] || 1;
    let memory_limit_rate =
      judgeConfig.memory_limit_rate?.[language as keyof LanguageJudgeConfig] ||
      1;

    // 如果是 Java 语言，时限和内存限制翻倍
    if (language === "java") {
      time_limit_rate *= 2;
      memory_limit_rate *= 2;
    }

    let finalVerdict: Verdict = Verdict.ACCEPTED;
    let maxTime = 0;
    let maxMemory = 0;
    let error = "";
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const timeLimit = problem.defaultTimeLimit * 1000000 * time_limit_rate;
      const memoryLimit =
        problem.defaultMemoryLimit * 1024 * 1024 * memory_limit_rate;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let res: any;

      if (isInteractive) {
        // --- 交互题模式 ---
        const runResults = await callGoJudge({
          cmd: [
            // Cmd 0: 用户程序
            {
              args: langConfig.runCmd,
              env: [
                "PATH=/usr/bin:/bin:/usr/lib/jvm/java-21-openjdk-amd64/bin",
                "LANG=en_US.UTF-8",
                "JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64",
              ],
              files: [null, null, { name: "stderr", max: 10485760 }],
              cpuLimit: timeLimit,
              memoryLimit: memoryLimit,
              procLimit: 50,
              stackLimit: STACK_SIZE_KB * 1024,
              copyIn: executableFileId
                ? { [langConfig.exeName]: { fileId: executableFileId } }
                : { [langConfig.srcName]: { content: code } },
            },
            // Cmd 1: 交互器
            {
              args: ["./interactor", "input.in", "output.xml"],
              env: ["PATH=/usr/bin:/bin"],
              files: [
                null,
                null,
                { name: "stderr", max: 10485760 }, // stderr (交互结果)
              ],
              cpuLimit: 10000 * 1000000, // 10s
              memoryLimit: 512 * 1024 * 1024,
              procLimit: 50,
              copyIn: {
                interactor: { fileId: interactorFileId },
                "input.in": { content: testCase.in },
              },
            },
          ],
          pipeMapping: [
            // 用户(0) stdout -> 交互器(1) stdin
            { in: { index: 0, fd: 1 }, out: { index: 1, fd: 0 } },
            // 交互器(1) stdout -> 用户(0) stdin
            { in: { index: 1, fd: 1 }, out: { index: 0, fd: 0 } },
          ],
        });

        const userRes = runResults[0];
        const interactorRes = runResults[1];
        res = userRes; // 统计数据取用户的

        // 判定逻辑
        // 1. 优先检查硬性资源限制 (TLE / MLE)
        // 这些是绝对的错误，优先级最高
        if (userRes.status === "Time Limit Exceeded") {
          if (res.time > timeLimit) {
            finalVerdict = Verdict.TIME_LIMIT_EXCEEDED;
          } else {
            finalVerdict = Verdict.RUNTIME_ERROR;
          }
        } else if (userRes.status === "Memory Limit Exceeded") {
          if (res.memory > memoryLimit) {
            finalVerdict = Verdict.MEMORY_LIMIT_EXCEEDED;
          } else {
            finalVerdict = Verdict.RUNTIME_ERROR;
          }
        }
        // 2. 其次检查交互器判定 (WA)
        // 只要交互器认为不对 (ExitCode != 0)，哪怕用户程序后面 SIGPIPE 崩了，也算是 WA
        else if (interactorRes.exitStatus !== 0) {
          finalVerdict = Verdict.WRONG_ANSWER;
          // 使用交互器的 stderr 作为错误信息，它通常包含 "Wrong answer..."
          error = interactorRes.files?.stderr || "Interactive check failed";
        }
        // 3. 最后检查用户程序是否崩溃 (RE)
        // 如果交互器都说 AC 了 (Exit 0)，但用户程序还是崩了 (非 SIGPIPE 的其他 RE)，那才是真 RE
        else if (userRes.status !== "Accepted") {
          finalVerdict = Verdict.RUNTIME_ERROR;
          error = userRes.files?.stderr || "Runtime Error";
        }
      } else {
        // --- 普通/SPJ 模式 ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cmdObj: any = {
          args: langConfig.runCmd,
          env: [
            "PATH=/usr/bin:/bin:/usr/lib/jvm/java-21-openjdk-amd64/bin",
            "LANG=en_US.UTF-8",
            "JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64",
          ],
          files: [
            { content: testCase.in },
            { name: "stdout", max: 10485760 }, // 10MB
            { name: "stderr", max: 10485760 },
          ],
          cpuLimit: timeLimit,
          memoryLimit: memoryLimit,
          procLimit: 50,
          stackLimit: STACK_SIZE_KB * 1024,
        };

        if (executableFileId) {
          cmdObj.copyIn = {
            [langConfig.exeName]: { fileId: executableFileId },
          };
        } else {
          cmdObj.copyIn = {
            [langConfig.srcName]: { content: code },
          };
        }

        const runResults = await callGoJudge({ cmd: [cmdObj] });
        res = runResults[0];

        // 判定逻辑
        if (res.status !== "Accepted") {
          if (res.status === "Time Limit Exceeded")
            finalVerdict = Verdict.TIME_LIMIT_EXCEEDED;
          else if (res.status === "Memory Limit Exceeded")
            finalVerdict = Verdict.MEMORY_LIMIT_EXCEEDED;
          else finalVerdict = Verdict.RUNTIME_ERROR;
          error = res.files?.stderr || "";
        } else {
          // 运行成功，检查答案
          const userOutput = res.files?.stdout || "";

          if (isSpj) {
            // SPJ 检查
            const checkerRes = await callGoJudge({
              cmd: [
                {
                  args: ["./checker", "input.in", "user.out", "answer.out"],
                  env: ["PATH=/usr/bin:/bin"],
                  files: [
                    { content: "", name: "stdout", max: 10485760 },
                    { content: "", name: "stderr", max: 10485760 },
                  ],
                  cpuLimit: 10000 * 1000000,
                  memoryLimit: 512 * 1024 * 1024,
                  procLimit: 50,
                  copyIn: {
                    checker: { fileId: checkerFileId },
                    "input.in": { content: testCase.in },
                    "user.out": { content: userOutput },
                    "answer.out": { content: testCase.out },
                  },
                },
              ],
            });
            const chkResult = checkerRes[0];
            if (chkResult.exitStatus !== 0) {
              finalVerdict = Verdict.WRONG_ANSWER;
              // error = chkResult.files?.stderr || "SPJ Failed";
            }
          } else {
            // 普通比对
            const stdOutput = cleanOutput(testCase.out);
            const myOutput = cleanOutput(userOutput);
            if (myOutput !== stdOutput) {
              finalVerdict = Verdict.WRONG_ANSWER;
            }
          }
        }
      }
      // 统计资源
      const timeMs = Math.floor(res.time / 1000000);
      const memoryKB = Math.floor(res.memory / 1024);
      maxTime = Math.max(maxTime, timeMs);
      maxMemory = Math.max(maxMemory, memoryKB);

      // 如果出错了，跳出循环
      if (finalVerdict !== Verdict.ACCEPTED) {
        // 更新这一点的状态（失败）
        await updateProgress(submissionId, {
          verdict: finalVerdict,
          passedTests: i,
          totalTests: testCases.length,
          finished: false,
        });
        break;
      }

      passedCount++;
      // 更新成功进度
      await updateProgress(submissionId, {
        verdict: Verdict.JUDGING,
        passedTests: i + 1,
        totalTests: testCases.length,
        finished: false,
      });
    }

    // 最终更新
    await updateProgress(submissionId, {
      verdict: finalVerdict,
      passedTests: passedCount,
      totalTests: testCases.length,
      finished: true,
    });

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        verdict: finalVerdict,
        timeUsed: maxTime,
        memoryUsed: maxMemory,
        errorMessage: error,
        passedTests: passedCount,
        totalTests: testCases.length,
      },
    });

    // 清理文件
    if (executableFileId) deleteTmpFile(executableFileId);
    if (checkerFileId) deleteTmpFile(checkerFileId);
    if (interactorFileId) deleteTmpFile(interactorFileId);
  } catch (error) {
    console.error("Judge Error:", error);
    const err = error as Error;
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        verdict: Verdict.SYSTEM_ERROR,
        errorMessage: err.message || "Unknown System Error",
      },
    });
    await redis.del(`submission:${submissionId}:progress`);
  }
}
