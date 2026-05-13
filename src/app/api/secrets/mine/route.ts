import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedMember, handleApiError } from "@/lib/api-auth";
import { cleanupOldSecrets } from "@/lib/secret-retention";

export async function GET() {
  try {
    const user = await requireVerifiedMember();
    await cleanupOldSecrets();

    const secrets = await prisma.secret.findMany({
      where: { creatorUid: user.doubanUid },
      orderBy: { createdAt: "desc" },
      select: {
        slug: true,
        title: true,
        createdAt: true,
        expiresAt: true,
        isActive: true,
        _count: { select: { replies: true, images: true } },
      },
    });

    return NextResponse.json({ secrets });
  } catch (error) {
    return handleApiError(error);
  }
}
