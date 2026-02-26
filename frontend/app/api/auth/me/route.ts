import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
