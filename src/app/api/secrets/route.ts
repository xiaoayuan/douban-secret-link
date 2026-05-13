import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedMember, handleApiError } from "@/lib/api-auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "内容不能为空"),
  verifyCode: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let slug = "";
  for (let i = 0; i < 20; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireVerifiedMember();
    const body = await request.json();
    const parsed = createSchema.parse(body);

    let slug = generateSlug();
    while (await prisma.secret.findUnique({ where: { slug } })) {
      slug = generateSlug();
    }

    const secret = await prisma.secret.create({
      data: {
        slug,
        title: parsed.title,
        content: parsed.content,
        verifyCode: parsed.verifyCode || null,
        creatorName: user.doubanName,
        creatorUid: user.doubanUid,
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
        images: parsed.imageUrls ? {
          create: parsed.imageUrls.map((url, i) => ({ url, sortOrder: i })),
        } : undefined,
      },
      include: { images: true },
    });

    return NextResponse.json({ secret }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.issues }, { status: 400 });
    }
    return handleApiError(error);
  }
}
