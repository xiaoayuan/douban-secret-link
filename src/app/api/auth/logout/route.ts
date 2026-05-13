import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const response = NextResponse.redirect(new URL("/", "http://localhost:3006"), { status: 302 });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
