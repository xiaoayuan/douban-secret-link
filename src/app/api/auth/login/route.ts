import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  doubanUid: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doubanUid, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { doubanUid } });
    if (!user) return NextResponse.json({ error: "管理员账号不存在" }, { status: 401 });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "密码错误" }, { status: 401 });

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "账号未激活，请等待管理员激活" }, { status: 403 });
    }

    const token = signToken({ doubanUid: user.doubanUid, doubanName: user.doubanName });

    const response = NextResponse.json({
      user: { doubanUid: user.doubanUid, doubanName: user.doubanName, role: user.role },
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
    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
