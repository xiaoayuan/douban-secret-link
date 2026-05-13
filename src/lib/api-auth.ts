import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getUserFromToken, SessionUser } from "@/lib/auth";

export async function requireAuth(): Promise<SessionUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    throw new ApiError("请先登录", 401);
  }

  const user = getUserFromToken(token);
  if (!user) {
    throw new ApiError("登录已过期，请重新登录", 401);
  }

  return user;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("API Error:", error);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
