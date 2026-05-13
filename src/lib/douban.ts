import { HttpsProxyAgent } from "https-proxy-agent";

function getFetchOptions(proxyUrl?: string, cookie?: string): Record<string, unknown> {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
  };
  if (cookie) headers.Cookie = cookie;

  const options: Record<string, unknown> = { headers };

  const proxy = proxyUrl || process.env.SCRAPE_PROXY || "";
  if (proxy) {
    options.agent = new HttpsProxyAgent(proxy);
  }

  return options;
}

export async function scrapeGroupMembers(url: string, proxyUrl?: string, cookie?: string): Promise<{ doubanUid: string; doubanName: string; avatar: string | null }[]> {
  const response = await fetch(url, getFetchOptions(proxyUrl, cookie) as RequestInit);
  if (!response.ok) throw new Error(`无法访问豆瓣页面 (${response.status})`);

  const html = await response.text();
  const members: { doubanUid: string; doubanName: string; avatar: string | null }[] = [];
  const seen = new Set<string>();

  // Match: <a href="https://www.douban.com/people/UID/">昵称</a>
  const pattern = /<a\s+href="https?:\/\/www\.douban\.com\/people\/([^\/"]+)\/"[^>]*>([^<]+)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const uid = match[1];
    const name = match[2].trim();
    if (uid && name && !seen.has(uid)) {
      seen.add(uid);
      members.push({ doubanUid: uid, doubanName: name, avatar: null });
    }
  }

  // Also try matching profile images for avatars
  const imgPattern = /https?:\/\/www\.douban\.com\/people\/([^\/]+)\/[\s\S]{0,200}?<img[^>]+src="([^"]+\.doubanio\.com\/[^"]+)"/g;
  while ((match = imgPattern.exec(html)) !== null) {
    const uid = match[1];
    const avatar = match[2];
    const member = members.find((m) => m.doubanUid === uid);
    if (member) member.avatar = avatar;
  }

  return members;
}

export async function scrapeProfileInfo(doubanUid: string) {
  const url = `https://www.douban.com/people/${doubanUid}/`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  } as RequestInit);
  if (!response.ok) throw new Error(`无法访问豆瓣主页 (${response.status})`);
  const html = await response.text();

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const doubanName = titleMatch ? titleMatch[1].replace(/[\s(].*/, "").trim() : doubanUid;

  const avatarMatch = html.match(/<img[^>]+src="([^"]+\.doubanio\.com\/[^"]+\.(?:jpg|png|jpeg|webp))"/);
  const avatar = avatarMatch ? avatarMatch[1] : null;

  return { doubanName, avatar };
}
