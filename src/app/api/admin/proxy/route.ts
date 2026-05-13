import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";

export async function GET() {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员", 403);

    const proxy = await prisma.systemSetting.findUnique({ where: { key: "scrape_proxy" } });
    return NextResponse.json({ proxy: proxy?.value || "" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员", 403);

    const { proxy } = await request.json();
    await prisma.systemSetting.upsert({
      where: { key: "scrape_proxy" },
      update: { value: proxy || "" },
      create: { key: "scrape_proxy", value: proxy || "" },
    });

    return NextResponse.json({ proxy });
  } catch (error) {
    return handleApiError(error);
  }
}
