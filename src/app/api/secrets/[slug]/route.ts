import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireVerifiedMember, ApiError, handleApiError } from "@/lib/api-auth";
import { cookies } from "next/headers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await requireVerifiedMember();
    const { slug } = await params;

    const secret = await prisma.secret.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        replies: { orderBy: { createdAt: "asc" }, take: 100 },
      },
    });

    if (!secret) throw new ApiError("密文不存在", 404);
    if (!secret.isActive) throw new ApiError("此密文已被关闭", 403);
    if (secret.expiresAt && new Date() > secret.expiresAt) throw new ApiError("此密文已过期", 410);

    const isCreator = secret.creatorUid === user.doubanUid;

    const cookieStore = await cookies();
    const verifyCookie = cookieStore.get(`dsl_verify_${slug}`)?.value;
    const needsVerifyCode = !isCreator && !!secret.verifyCode && verifyCookie !== "verified";

    return NextResponse.json({
      secret: { ...secret, isCreator, needsVerifyCode },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await requireAuth();
    const secret = await prisma.secret.findUnique({ where: { slug } });
    if (!secret) throw new ApiError("密文不存在", 404);
    if (secret.creatorUid !== user.doubanUid) {
      const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
      if (!dbUser || dbUser.role !== "ADMIN") {
        throw new ApiError("只有创建者或管理员可以管理", 403);
      }
    }
    const body = await request.json();
    const updated = await prisma.secret.update({
      where: { id: secret.id },
      data: {
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        expiresAt: body.expiresAt !== undefined ? new Date(body.expiresAt) : undefined,
      },
    });
    return NextResponse.json({ secret: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await requireAuth();
    const secret = await prisma.secret.findUnique({ where: { slug } });
    if (!secret) throw new ApiError("密文不存在", 404);
    if (secret.creatorUid !== user.doubanUid) {
      const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
      if (!dbUser || dbUser.role !== "ADMIN") {
        throw new ApiError("只有创建者或管理员可以删除", 403);
      }
    }
    await prisma.secret.delete({ where: { id: secret.id } });
    return NextResponse.json({ message: "已删除" });
  } catch (error) {
    return handleApiError(error);
  }
}
