import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const store = await cookies();
    const authToken = store.get("auth_token")?.value;
    const userToken = store.get("user_token")?.value;

    if (authToken) {
      try {
        const u = await verifyAuth(authToken);
        const gu = await prisma.globalUser.findUnique({
          where: { id: String(u.userId) },
        });
        if (gu) {
          return NextResponse.json({
            user: {
              username: gu.username,
              role: u.role,
              isGlobalAdmin: !!u.isGlobalAdmin,
              contestId: u.contestId ?? null,
              displayName: gu.displayName,
              studentId: gu.studentId,
              email: gu.email,
            },
          });
        } else {
          return NextResponse.json({
            user: {
              username: u.username,
              role: u.role,
              isGlobalAdmin: !!u.isGlobalAdmin,
              contestId: u.contestId ?? null,
            },
          });
        }
      } catch {}
    }

    if (userToken) {
      try {
        const u = await verifyAuth(userToken);
        return NextResponse.json({
          user: {
            username: u.username,
            role: u.role,
            isGlobalAdmin: !!u.isGlobalAdmin,
            contestId: u.contestId ?? null,
          },
        });
      } catch {}
    }

    return NextResponse.json({ user: null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
