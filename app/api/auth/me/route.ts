import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getVerifiedGlobalUser, verifyAuth } from "@/lib/auth";
import { serialize } from "cookie";

function clearAuthTokenResponse() {
  const cookie = serialize("auth_token", "", {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_SECURE_COOKIE === "true",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return NextResponse.json(
    { user: null },
    { headers: { "Set-Cookie": cookie } },
  );
}

export async function GET() {
  try {
    const store = await cookies();
    const authToken = store.get("auth_token")?.value;
    const userToken = store.get("user_token")?.value;

    if (authToken) {
      const user = await getVerifiedGlobalUser(authToken);
      if (user) {
        return NextResponse.json({
          user: {
            username: user.username,
            role: user.role,
            isGlobalAdmin: !!user.isGlobalAdmin,
            contestId: user.contestId ?? null,
            displayName: user.displayName,
            studentId: user.studentId,
            email: user.email,
          },
        });
      }

      return clearAuthTokenResponse();
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
