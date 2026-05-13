import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAuth();
    const dbAdmin = await prisma.user.findUnique({ where: { doubanUid: admin.doubanUid } });
    if (!dbAdmin || dbAdmin.role !== "ADMIN") throw new ApiError("仅管理员可操作", 403);

    const body = await request.json();
    const { postUrl } = body;
    if (!postUrl) throw new ApiError("请提供帖子URL", 400);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(postUrl);
    } catch {
      throw new ApiError("URL格式不正确，请输入完整的豆瓣帖子地址", 400);
    }

    if (parsedUrl.hostname !== "www.douban.com") {
      throw new ApiError("请输入 www.douban.com 域名下的帖子地址", 400);
    }

    const response = await fetch(postUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    });
    if (!response.ok) throw new ApiError(`无法访问帖子 (${response.status})`, 400);

    const html = await response.text();
    const uidPattern = /https?:\/\/www\.douban\.com\/people\/([^\/"]+)\//g;
    const foundUids = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = uidPattern.exec(html)) !== null) {
      foundUids.add(match[1]);
    }

    const activated: string[] = [];
    for (const uid of foundUids) {
      const user = await prisma.user.findUnique({ where: { doubanUid: uid } });
      if (user && user.status === "DISABLED") {
        await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
        activated.push(uid);
      }
    }

    return NextResponse.json({
      activated,
      totalScanned: foundUids.size,
      totalActivated: activated.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
