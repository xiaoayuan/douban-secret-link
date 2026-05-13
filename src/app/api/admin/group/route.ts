import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";
import { scrapeGroupMembersAllPages } from "@/lib/douban";

async function requireAdmin() {
  const user = await requireAuth();
  const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
  if (!dbUser || dbUser.role !== "ADMIN") throw new ApiError("仅管理员可操作", 403);
  return dbUser;
}

export async function GET() {
  try {
    await requireAdmin();
    const groupUrl = await prisma.systemSetting.findUnique({ where: { key: "group_url" } });
    const memberCount = await prisma.groupMember.count();
    return NextResponse.json({ groupUrl: groupUrl?.value || "", memberCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { url } = body;

    if (!url) throw new ApiError("请提供豆瓣小组成员页URL", 400);

    try {
      new URL(url);
    } catch {
      throw new ApiError("URL格式不正确，请输入完整的豆瓣小组页面地址", 400);
    }

    if (!url.includes("douban.com")) {
      throw new ApiError("请输入豆瓣域名下的页面地址", 400);
    }

    // Save group URL
    await prisma.systemSetting.upsert({
      where: { key: "group_url" },
      update: { value: url },
      create: { key: "group_url", value: url },
    });

    // Get proxy setting
    const proxySetting = await prisma.systemSetting.findUnique({ where: { key: "scrape_proxy" } });
    const cookieSetting = await prisma.systemSetting.findUnique({ where: { key: "douban_cookie" } });
    const proxyUrl = proxySetting?.value || undefined;
    const cookie = cookieSetting?.value || undefined;

    const members = await scrapeGroupMembersAllPages(url, proxyUrl, cookie);

    // Upsert all members to GroupMember table
    let added = 0;
    for (const m of members) {
      await prisma.groupMember.upsert({
        where: { doubanUid: m.doubanUid },
        update: { doubanName: m.doubanName, avatar: m.avatar },
        create: { doubanUid: m.doubanUid, doubanName: m.doubanName, avatar: m.avatar },
      });
      added++;
    }

    // Deactivate registered users who are NOT in the group
    const groupUids = new Set(members.map((m) => m.doubanUid));
    const allUsers = await prisma.user.findMany({ select: { id: true, doubanUid: true, role: true } });
    let deactivated = 0;
    for (const u of allUsers) {
      if (u.role === "ADMIN") continue;
      if (!groupUids.has(u.doubanUid) && u.doubanUid !== "admin") {
        await prisma.user.update({ where: { id: u.id }, data: { status: "DISABLED" } });
        deactivated++;
      }
    }

    return NextResponse.json({ added, deactivated, totalMembers: members.length });
  } catch (error) {
    return handleApiError(error);
  }
}
