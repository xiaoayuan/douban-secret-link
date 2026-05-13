import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员可访问", 403);

    const members = await prisma.groupMember.findMany({
      orderBy: { doubanName: "asc" },
      select: { doubanUid: true, doubanName: true, avatar: true },
    });

    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}
