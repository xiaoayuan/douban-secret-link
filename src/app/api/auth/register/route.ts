import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const registerSchema = z.object({
  doubanUid: z.string().min(1, "豆瓣UID不能为空"),
  doubanName: z.string().min(1, "昵称不能为空"),
  password: z.string().min(6, "密码至少6位"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doubanUid, doubanName: inputName, password } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { doubanUid } });
    if (existing) {
      return NextResponse.json({ error: "该豆瓣UID已被注册" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Check if UID is in the group member list
    const groupUrlSetting = await prisma.systemSetting.findUnique({ where: { key: "group_url" } });
    const member = await prisma.groupMember.findUnique({ where: { doubanUid } });

    if (groupUrlSetting && !member) {
      return NextResponse.json(
        { error: "该豆瓣UID不在小组成员列表中，请确认你加入了正确的小组" },
        { status: 403 }
      );
    }

    const doubanName = member ? member.doubanName : inputName;

    // First user becomes ADMIN + ACTIVE
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "MEMBER";
    const status = userCount === 0 ? "ACTIVE" : "DISABLED";

    await prisma.user.create({
      data: { doubanUid, doubanName, passwordHash, role, status },
    });

    return NextResponse.json(
      { message: role === "ADMIN" ? "注册成功，你是管理员" : "注册成功，等待管理员激活" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误", details: error.issues }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
