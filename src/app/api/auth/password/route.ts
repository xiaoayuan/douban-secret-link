import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "新密码至少6位"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const dbUser = await prisma.user.findUnique({ where: { doubanUid: user.doubanUid } });
    if (!dbUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) return NextResponse.json({ error: "当前密码错误" }, { status: 403 });

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: dbUser.id }, data: { passwordHash: newHash } });

    return NextResponse.json({ message: "密码已更新" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.issues }, { status: 400 });
    }
    return handleApiError(error);
  }
}
