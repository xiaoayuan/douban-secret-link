import { prisma } from "@/lib/prisma";

export function buildProxyUrl(proxy: string, username?: string, password?: string) {
  if (!proxy) return "";
  const url = new URL(proxy.includes("://") ? proxy : `http://${proxy}`);
  if (username) url.username = username;
  if (password) url.password = password;
  return url.toString();
}

export async function getConfiguredProxyUrl() {
  const [proxy, username, password] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "scrape_proxy" } }),
    prisma.systemSetting.findUnique({ where: { key: "scrape_proxy_username" } }),
    prisma.systemSetting.findUnique({ where: { key: "scrape_proxy_password" } }),
  ]);
  return buildProxyUrl(
    proxy?.value || process.env.SCRAPE_PROXY || "",
    username?.value || process.env.SCRAPE_PROXY_USERNAME || "",
    password?.value || process.env.SCRAPE_PROXY_PASSWORD || ""
  );
}
