import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { HttpsProxyAgent } from "https-proxy-agent";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, signToken } from "@/lib/auth";
import { ApiError, handleApiError } from "@/lib/api-auth";

const startSchema = z.object({
  doubanUid: z.string().min(1).max(80),
});

const verifySchema = z.object({
  challengeId: z.string().min(1),
});

function makeCode() {
  return `DSL-${randomInt(100000, 999999)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getVerifyPostUrl() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "douban_verify_post_url" } });
  const url = setting?.value || process.env.DOUBAN_VERIFY_POST_URL || "";
  if (!url) throw new ApiError("管理员还没有配置豆瓣验证帖URL", 500);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError("豆瓣验证帖URL配置不正确", 500);
  }
  if (parsed.hostname !== "www.douban.com") {
    throw new ApiError("豆瓣验证帖URL必须是 www.douban.com 页面", 500);
  }
  return url;
}

async function fetchVerifyPostHtml(url: string) {
  const cookie = await prisma.systemSetting.findUnique({ where: { key: "douban_cookie" } });
  const proxy = await prisma.systemSetting.findUnique({ where: { key: "scrape_proxy" } });
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
  };
  if (cookie?.value) headers.Cookie = cookie.value;

  const options: Record<string, unknown> = { headers };
  if (proxy?.value) {
    options.agent = new HttpsProxyAgent(proxy.value);
  }

  const response = await fetch(url, options as RequestInit);
  if (!response.ok) throw new ApiError(`无法访问豆瓣验证帖 (${response.status})`, 502);
  return response.text();
}

function hasUidCommentedCode(html: string, doubanUid: string, code: string) {
  const uid = escapeRegExp(doubanUid);
  const token = escapeRegExp(code);
  const uidBeforeCode = new RegExp(`www\\.douban\\.com/people/${uid}/[\\s\\S]{0,1600}${token}`, "i");
  const codeBeforeUid = new RegExp(`${token}[\\s\\S]{0,1600}www\\.douban\\.com/people/${uid}/`, "i");
  return uidBeforeCode.test(html) || codeBeforeUid.test(html);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doubanUid } = startSchema.parse(body);
    const member = await prisma.groupMember.findUnique({ where: { doubanUid } });
    if (!member) throw new ApiError("这个豆瓣UID不在当前小组成员名单中", 403);

    const verifyPostUrl = await getVerifyPostUrl();
    let code = makeCode();
    while (await prisma.authChallenge.findUnique({ where: { code } })) {
      code = makeCode();
    }

    const challenge = await prisma.authChallenge.create({
      data: {
        doubanUid,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return NextResponse.json({
      challengeId: challenge.id,
      code,
      verifyPostUrl,
      expiresAt: challenge.expiresAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.issues }, { status: 400 });
    }
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { challengeId } = verifySchema.parse(body);
    const challenge = await prisma.authChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new ApiError("验证口令不存在，请重新生成", 404);
    if (challenge.status === "VERIFIED") throw new ApiError("这个口令已经使用过，请重新生成", 400);
    if (challenge.expiresAt < new Date()) throw new ApiError("验证口令已过期，请重新生成", 410);
    if (challenge.attempts >= 5) throw new ApiError("验证次数过多，请重新生成口令", 429);

    await prisma.authChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });

    const verifyPostUrl = await getVerifyPostUrl();
    const html = await fetchVerifyPostHtml(verifyPostUrl);
    if (!hasUidCommentedCode(html, challenge.doubanUid, challenge.code)) {
      throw new ApiError("还没有在验证帖中找到你的口令回复", 404);
    }

    const member = await prisma.groupMember.findUnique({ where: { doubanUid: challenge.doubanUid } });
    if (!member) throw new ApiError("这个豆瓣UID不在当前小组成员名单中", 403);

    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    });

    const token = signToken({ doubanUid: member.doubanUid, doubanName: member.doubanName });
    const response = NextResponse.json({
      user: { doubanUid: member.doubanUid, doubanName: member.doubanName, role: "MEMBER" },
    });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.AUTH_COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.issues }, { status: 400 });
    }
    return handleApiError(error);
  }
}
