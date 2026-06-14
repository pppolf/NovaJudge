import { signAuth, verifyAuth } from "@/lib/auth";
import { ContestRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{ contestId: string }>;
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  if (forwardedIp) return forwardedIp;

  return req.headers.get("x-real-ip")?.trim() || null;
}

function contestRedirect(contestId: number, query: string) {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: `/contest/${contestId}${query}`,
    },
  });
}

export async function GET(req: NextRequest, { params }: Props) {
  const { contestId } = await params;
  const cid = Number(contestId);
  if (!Number.isInteger(cid)) {
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  }

  const existingUserToken = req.cookies.get("user_token")?.value;
  if (existingUserToken) {
    try {
      const payload = await verifyAuth(existingUserToken);
      if (payload.contestId === cid) {
        return contestRedirect(cid, "?login=true");
      }
    } catch {}
  }

  const authToken = req.cookies.get("auth_token")?.value;
  if (authToken) {
    try {
      const payload = await verifyAuth(authToken);
      if (payload.isGlobalAdmin) {
        return contestRedirect(cid, "");
      }
    } catch {}
  }

  const clientIp = getClientIp(req);
  if (!clientIp) {
    return contestRedirect(cid, "?autoLogin=miss");
  }

  const user = await prisma.user.findFirst({
    where: {
      contestId: cid,
      role: ContestRole.TEAM,
      autoLoginIp: clientIp,
    },
    select: {
      id: true,
      username: true,
      role: true,
      contestId: true,
    },
  });

  if (!user) {
    return contestRedirect(cid, "?autoLogin=miss");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginIp: clientIp,
      lastLoginAt: new Date(),
    },
  });

  const token = await signAuth({
    userId: user.id,
    username: user.username,
    role: user.role,
    contestId: user.contestId,
    isGlobalAdmin: false,
  });

  const response = contestRedirect(cid, "?login=true");
  response.cookies.set("user_token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_SECURE_COOKIE === "true",
  });

  return response;
}
