import { NextRequest, NextResponse } from "next/server";
import { requireAuth, ApiError, handleApiError } from "@/lib/api-auth";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ApiError("请选择图片文件", 400);
    }

    if (file.size > MAX_SIZE) {
      throw new ApiError("图片大小不能超过 10MB", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ApiError("只支持 JPG、PNG、GIF、WebP 格式", 400);
    }

    const ext = file.type.split("/")[1] || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const uploadsDir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");

    await mkdir(uploadsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadsDir, filename), buffer);

    const url = `/uploads/${filename}`;

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
