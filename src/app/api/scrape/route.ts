import { NextRequest, NextResponse } from "next/server";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";
import { z } from "zod";

const scrapeSchema = z.object({
  url: z.string().url("请提供有效的URL"),
});

interface ParsedMember {
  doubanUid: string;
  doubanName: string;
  avatar: string | null;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { url } = scrapeSchema.parse(body);

    const members = await scrapeGroupMembers(url);

    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "参数错误", details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

async function scrapeGroupMembers(url: string): Promise<ParsedMember[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new ApiError(
      `无法访问豆瓣页面 (${response.status})，请确认链接是否正确`,
      400
    );
  }

  const html = await response.text();

  // 从 HTML 中提取成员信息
  // 豆瓣小组成员页面的典型结构: <a href="https://www.douban.com/people/UID/">昵称</a>
  const memberPattern =
    /<a\s+href="https?:\/\/www\.douban\.com\/people\/([^\/"]+)\/"[^>]*>([^<]+)<\/a>/g;

  const members: ParsedMember[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = memberPattern.exec(html)) !== null) {
    const doubanUid = match[1];
    const doubanName = match[2].trim();

    if (doubanUid && doubanName && !seen.has(doubanUid)) {
      seen.add(doubanUid);
      members.push({
        doubanUid,
        doubanName,
        avatar: null,
      });
    }
  }

  if (members.length === 0) {
    throw new ApiError(
      "未能从页面中解析到成员信息，请确认这是豆瓣小组成员页面",
      400
    );
  }

  return members;
}
