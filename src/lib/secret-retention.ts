import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

export const SECRET_RETENTION_DAYS = 7;
export const SECRET_RETENTION_MS = SECRET_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function clampSecretExpiry(expiresAt?: string | null) {
  const maxExpiresAt = new Date(Date.now() + SECRET_RETENTION_MS);
  if (!expiresAt) return maxExpiresAt;
  const requested = new Date(expiresAt);
  if (Number.isNaN(requested.getTime())) return maxExpiresAt;
  return requested > maxExpiresAt ? maxExpiresAt : requested;
}

function uploadPathFromUrl(url: string) {
  if (!url.startsWith("/uploads/")) return null;
  const filename = url.slice("/uploads/".length);
  if (!filename || filename.includes("/") || filename.includes("..")) return null;
  return join(process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads"), filename);
}

export async function cleanupOldSecrets() {
  const cutoff = new Date(Date.now() - SECRET_RETENTION_MS);
  const oldSecrets = await prisma.secret.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, images: { select: { url: true } } },
    take: 100,
  });
  if (oldSecrets.length === 0) return 0;

  const imagePaths = oldSecrets.flatMap((secret) => secret.images.map((image) => uploadPathFromUrl(image.url)).filter((path): path is string => Boolean(path)));
  await prisma.secret.deleteMany({ where: { id: { in: oldSecrets.map((secret) => secret.id) } } });
  await Promise.all(imagePaths.map((path) => unlink(path).catch(() => undefined)));
  return oldSecrets.length;
}
