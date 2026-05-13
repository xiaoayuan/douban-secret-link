import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, getUserFromToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = getUserFromToken(token);
  if (!session) return NextResponse.json({ user: null });

  const dbUser = await prisma.user.findUnique({ where: { doubanUid: session.doubanUid } });
  if (!dbUser) {
    const member = await prisma.groupMember.findUnique({ where: { doubanUid: session.doubanUid } });
    if (!member) return NextResponse.json({ user: null });
    return NextResponse.json({
      user: {
        doubanUid: member.doubanUid,
        doubanName: member.doubanName,
        avatar: member.avatar,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
  }

  return NextResponse.json({
    user: {
      doubanUid: dbUser.doubanUid,
      doubanName: dbUser.doubanName,
      avatar: dbUser.avatar,
      role: dbUser.role,
      status: dbUser.status,
    },
  });
}
