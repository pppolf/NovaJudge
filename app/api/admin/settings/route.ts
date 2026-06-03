
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSuper, UserJwtPayload } from "@/lib/auth";
import {
  getManagedEnvSettings,
  updateManagedEnvSettings,
} from "@/lib/env-settings";

export async function GET() {
  const admin = await getCurrentSuper();
  if (!admin || (admin as UserJwtPayload).isGlobalAdmin !== true) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const envSettings = await getManagedEnvSettings();

  return NextResponse.json({
    envSettings,
  });
}

export async function PUT(req: NextRequest) {
  const admin = await getCurrentSuper();
  if (!admin || (admin as UserJwtPayload).isGlobalAdmin !== true) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { envSettings } = body;

    const nextEnvSettings =
      envSettings && typeof envSettings === "object"
        ? await updateManagedEnvSettings(envSettings)
        : await getManagedEnvSettings();

    return NextResponse.json({
      envSettings: nextEnvSettings,
    });
  } catch (e) {
    console.error(e);
    return new NextResponse("Error updating settings", { status: 500 });
  }
}
