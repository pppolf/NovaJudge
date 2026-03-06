import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  const serializedCookie = serialize("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.ENABLE_SECURE_COOKIE === "true",
    sameSite: "strict",
    maxAge: -1, // 立即过期
    path: "/",
  });

  const serializedCookieUser = serialize("user_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.ENABLE_SECURE_COOKIE === "true",
    sameSite: "strict",
    maxAge: -1, // 立即过期
    path: "/",
  });

  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", serializedCookie);
  response.headers.append("Set-Cookie", serializedCookieUser);
  
  return response;
}