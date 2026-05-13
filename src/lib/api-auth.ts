import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getUserFromToken, SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function requireVerifiedMember(): Promise<SessionUser> {
  const user = await requireAuth();
  const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
  if (!dbUser || dbUser.status !== "ACTIVE") {
    throw new ApiError("账号未激活或已被禁用", 403);
  }
  if (dbUser.role === "ADMIN") return user;

  const member = await prisma.groupMember.findUnique({ where: { doubanUid: user.doubanUid } });
  if (!member) {
    throw new ApiError("当前豆瓣账号不在小组成员名单中", 403);
  }
  return { doubanUid: dbUser.doubanUid, doubanName: dbUser.doubanName };
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
