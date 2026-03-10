import { NextRequest, NextResponse } from "next/server";
import { checkCCSAuth, unauthorizedResponse } from "@/lib/ccs/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> },
) {
  const isAuthorized = await checkCCSAuth(request);
  if (!isAuthorized) {
    return unauthorizedResponse();
  }

  const { contestId } = await params;
  const cid = parseInt(contestId);

  if (isNaN(cid)) {
    return new NextResponse("Invalid contest ID", { status: 400 });
  }

  const contest = await prisma.contest.findUnique({
    where: { id: cid },
    include: {
      problems: {
        include: {
          problem: true,
        },
        orderBy: {
          displayId: "asc",
        },
      },
      users: {
        where: {
          role: "TEAM",
        },
      },
      submissions: {
        orderBy: {
          submittedAt: "asc",
        },
        include: {
          user: true,
        },
      },
    },
  });

  if (!contest) {
    return new NextResponse("Contest not found", { status: 404 });
  }

  // Filter valid submissions first to get count
  const validSubmissions = contest.submissions.filter(
    (s) =>
      s.verdict !== "PENDING" &&
      s.verdict !== "JUDGING" &&
      s.user &&
      s.user.role === "TEAM",
  );

  let output = "";

  // Header
  // @contest "Title"
  output += `@contest "${contest.title.replace(/"/g, '\\"')}"\n`;

  // @contlen Duration in minutes
  const durationMinutes = Math.floor(
    (contest.endTime.getTime() - contest.startTime.getTime()) / 60000,
  );
  output += `@contlen ${durationMinutes}\n`;

  // @problems Count
  output += `@problems ${contest.problems.length}\n`;

  // @teams Count
  output += `@teams ${contest.users.length}\n`;

  // @submissions Count
  output += `@submissions ${validSubmissions.length}\n`;

  // Problems
  // @p <Letter>,<Title>,<TimeLimit>,<MemoryLimit>
  const problemMap = new Map<number, string>();
  contest.problems.forEach((cp) => {
    const letter = cp.displayId;
    problemMap.set(cp.problemId, letter);
    // Time limit in seconds
    const timeLimitSec = Math.floor(
      (cp.realTimeLimit || cp.problem.defaultTimeLimit) / 1000,
    );
    // Memory limit in MB (assuming defaultMemoryLimit is MB)
    const memoryLimitMB = cp.realMemoryLimit || cp.problem.defaultMemoryLimit;
    output += `@p ${letter},"${cp.problem.title.replace(/"/g, '\\"')}",${timeLimitSec},${memoryLimitMB}\n`;
  });

  // Submissions
  // TeamName, ProblemLetter, Attempts, Time(sec), Result
  const attemptsMap = new Map<string, number>();

  for (const sub of validSubmissions) {
    if (!sub.user) continue;
    const letter = problemMap.get(sub.problemId);
    if (!letter) continue;

    // Use displayName as team name, sanitize commas
    let teamName = sub.user.displayName || sub.user.username;
    teamName = teamName.replace(/,/g, " ");

    const key = `${sub.userId}-${sub.problemId}`;
    const attempt = (attemptsMap.get(key) || 0) + 1;
    attemptsMap.set(key, attempt);

    // Time in seconds from start
    let time = Math.floor(
      (sub.submittedAt.getTime() - contest.startTime.getTime()) / 1000,
    );
    if (time < 0) time = 0;

    let result = "RJ";
    switch (sub.verdict) {
      case "ACCEPTED":
        result = "OK";
        break;
      case "WRONG_ANSWER":
        result = "WA";
        break;
      case "TIME_LIMIT_EXCEEDED":
        result = "TL";
        break;
      case "MEMORY_LIMIT_EXCEEDED":
        result = "ML";
        break;
      case "RUNTIME_ERROR":
        result = "RE";
        break;
      case "COMPILE_ERROR":
        result = "CE";
        break;
      case "PRESENTATION_ERROR":
        result = "PE";
        break;
      default:
        result = "RJ";
        break;
    }

    output += `${teamName},${letter},${attempt},${time},${result}\n`;
  }

  return new NextResponse(output, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="contest-${cid}-ghost.dat"`,
    },
  });
}
