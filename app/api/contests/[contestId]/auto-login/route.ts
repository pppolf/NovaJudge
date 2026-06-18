import { signAuth, verifyAuth } from "@/lib/auth";
import { ContestRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{ contestId: string }>;
}

function normalizeIp(value: string | null | undefined) {
  let ip = value?.trim();
  if (!ip) return null;

  if (ip.startsWith("[") && ip.includes("]")) {
    ip = ip.slice(1, ip.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice("::ffff:".length);
  }

  if (ip === "::1") return "127.0.0.1";
  return isIP(ip) ? ip : null;
}

function getForwardedHeaderIp(value: string | null) {
  const firstForwarded = value?.split(",")[0];
  const forPart = firstForwarded
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("for="));

  return forPart?.slice(4).replace(/^"|"$/g, "");
}

function getClientIpCandidates(req: NextRequest) {
  const rawCandidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("x-client-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0],
    getForwardedHeaderIp(req.headers.get("forwarded")),
  ];

  return Array.from(
    new Set(rawCandidates.map(normalizeIp).filter((ip): ip is string => !!ip)),
  );
}

function contestRedirect(contestId: number, query = "") {
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

  const clientIps = getClientIpCandidates(req);
  if (clientIps.length === 0) {
    return contestRedirect(cid, "?autoLogin=miss&reason=no_ip");
  }

  const user = await prisma.user.findFirst({
    where: {
      contestId: cid,
      role: ContestRole.TEAM,
      autoLoginIp: { in: clientIps },
    },
    select: {
      id: true,
      username: true,
      role: true,
      contestId: true,
      autoLoginIp: true,
    },
  });

  if (!user) {
    return contestRedirect(cid, "?autoLogin=miss&reason=no_match");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginIp: user.autoLoginIp,
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
