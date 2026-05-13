import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";

export async function GET() {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员", 403);

    const proxy = await prisma.systemSetting.findUnique({ where: { key: "scrape_proxy" } });
    const proxyUsername = await prisma.systemSetting.findUnique({ where: { key: "scrape_proxy_username" } });
    const proxyPassword = await prisma.systemSetting.findUnique({ where: { key: "scrape_proxy_password" } });
    const cookie = await prisma.systemSetting.findUnique({ where: { key: "douban_cookie" } });
    const verifyPostUrl = await prisma.systemSetting.findUnique({ where: { key: "douban_verify_post_url" } });
    return NextResponse.json({ proxy: proxy?.value || "", proxyUsername: proxyUsername?.value || "", proxyPassword: proxyPassword?.value || "", cookie: cookie?.value || "", verifyPostUrl: verifyPostUrl?.value || "" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员", 403);

    const body = await request.json();
    const { proxy, proxyUsername, proxyPassword, cookie, verifyPostUrl } = body;

    if (proxy !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "scrape_proxy" },
        update: { value: proxy || "" },
        create: { key: "scrape_proxy", value: proxy || "" },
      });
    }

    if (proxyUsername !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "scrape_proxy_username" },
        update: { value: proxyUsername || "" },
        create: { key: "scrape_proxy_username", value: proxyUsername || "" },
      });
    }

    if (proxyPassword !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "scrape_proxy_password" },
        update: { value: proxyPassword || "" },
        create: { key: "scrape_proxy_password", value: proxyPassword || "" },
      });
    }

    if (cookie !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "douban_cookie" },
        update: { value: cookie || "" },
        create: { key: "douban_cookie", value: cookie || "" },
      });
    }

    if (verifyPostUrl !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "douban_verify_post_url" },
        update: { value: verifyPostUrl || "" },
        create: { key: "douban_verify_post_url", value: verifyPostUrl || "" },
      });
    }

    return NextResponse.json({ proxy, proxyUsername, proxyPassword, cookie, verifyPostUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
