import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAuth();
    const { slug } = await params;

    const secret = await prisma.secret.findUnique({ where: { slug } });
    if (!secret) throw new ApiError("密文不存在", 404);
    if (!secret.isActive) throw new ApiError("已关闭", 403);
    if (secret.expiresAt && new Date() > secret.expiresAt) throw new ApiError("已过期", 410);

    const body = await request.json();
    const verifyCode = body.verifyCode || secret.verifyCode;
    if (secret.verifyCode && verifyCode !== secret.verifyCode) {
      throw new ApiError("验证数字错误", 403);
    }

    const response = NextResponse.json({ verified: true });
    response.cookies.set(`dsl_verify_${slug}`, "verified", {
      httpOnly: true,
      secure: process.env.AUTH_COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
