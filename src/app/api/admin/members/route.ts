import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";
import { scrapeProfileInfo } from "@/lib/douban";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员可访问", 403);

    const members = await prisma.groupMember.findMany({
      orderBy: { doubanName: "asc" },
      select: { id: true, doubanUid: true, doubanName: true, avatar: true },
    });

    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员可访问", 403);

    const body = await request.json();
    const { uids } = body;
    if (!uids || !Array.isArray(uids) || uids.length === 0) {
      throw new ApiError("请选择要删除的成员", 400);
    }

    await prisma.groupMember.deleteMany({
      where: { doubanUid: { in: uids } },
    });

    return NextResponse.json({ deleted: uids.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员可访问", 403);

    const body = await request.json();
    const { doubanUid, doubanName: inputName } = body;
    if (!doubanUid) throw new ApiError("请提供UID", 400);

    let doubanName = inputName || doubanUid;
    if (!inputName) {
      try {
        const info = await scrapeProfileInfo(doubanUid);
        doubanName = info.doubanName;
      } catch { /* use UID as fallback */ }
    }

    const member = await prisma.groupMember.upsert({
      where: { doubanUid },
      update: { doubanName },
      create: { doubanUid, doubanName },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员可访问", 403);

    const body = await request.json();
    const { doubanUid, protected: protect } = body;
    if (!doubanUid) throw new ApiError("请提供UID", 400);

    const member = await prisma.groupMember.update({
      where: { doubanUid },
      data: { protected: protect },
    });

    return NextResponse.json({ member });
  } catch (error) {
    return handleApiError(error);
  }
}
