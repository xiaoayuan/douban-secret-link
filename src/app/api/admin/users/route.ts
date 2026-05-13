import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") {
      throw new ApiError("仅管理员可访问", 403);
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, doubanUid: true, doubanName: true, role: true, status: true, createdAt: true },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") {
      throw new ApiError("仅管理员可操作", 403);
    }

    const body = await request.json();
    const { doubanUid, status, role } = body;

    if (!doubanUid) throw new ApiError("缺少UID", 400);

    const target = await prisma.user.findUnique({ where: { doubanUid } });
    if (!target) throw new ApiError("用户不存在", 404);

    if (target.role === "ADMIN" && role === "MEMBER" && body.role !== undefined) {
      // Don't allow demoting the last admin
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) throw new ApiError("不能移除最后一个管理员", 400);
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
      },
      select: { id: true, doubanUid: true, doubanName: true, role: true, status: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
