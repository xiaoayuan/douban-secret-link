import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";
import { z } from "zod";

const replySchema = z.object({
  content: z.string().min(1, "不能为空").max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await requireAuth();
    const { slug } = await params;

    const secret = await prisma.secret.findUnique({ where: { slug } });
    if (!secret) throw new ApiError("密文不存在", 404);
    if (!secret.isActive) throw new ApiError("已关闭", 403);
    if (secret.expiresAt && new Date() > secret.expiresAt) throw new ApiError("已过期", 410);

    const body = await request.json();
    const parsed = replySchema.parse(body);

    const reply = await prisma.reply.create({
      data: {
        secretId: secret.id,
        content: parsed.content,
        authorUid: user.doubanUid,
        authorName: user.doubanName,
      },
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.issues }, { status: 400 });
    }
    return handleApiError(error);
  }
}
