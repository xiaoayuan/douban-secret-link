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
  const delay = parseInt(process.env.SCRAPE_DELAY_MS || "2000");
  await new Promise((r) => setTimeout(r, delay));

  const response = await fetch(url, getFetchOptions(proxyUrl, cookie) as RequestInit);
  if (!response.ok) throw new Error(`无法访问豆瓣页面 (${response.status})`);

  const html = await response.text();
  return parseMembersFromHtml(html);
}

export async function scrapeGroupMembersAllPages(baseUrl: string, proxyUrl?: string, cookie?: string): Promise<{ doubanUid: string; doubanName: string; avatar: string | null }[]> {
  const allMembers: { doubanUid: string; doubanName: string; avatar: string | null }[] = [];
  const seen = new Set<string>();
  const delay = parseInt(process.env.SCRAPE_DELAY_MS || "2000");
  const pageSize = 50;
  let page = 0;
  let hasMore = true;

  // Parse base URL, remove existing start param
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.delete("start");

  while (hasMore) {
    const pageUrl = new URL(urlObj.toString());
    pageUrl.searchParams.set("start", String(page * pageSize));
    const fetchUrl = pageUrl.toString();

    console.log(`Scraping page ${page + 1}: ${fetchUrl}`);

    if (page > 0) await new Promise((r) => setTimeout(r, delay));

    const response = await fetch(fetchUrl, getFetchOptions(proxyUrl, cookie) as RequestInit);
    if (!response.ok) {
      if (response.status === 403 && page > 0) {
        // Maybe reached the end, just stop
        break;
      }
      throw new Error(`无法访问豆瓣页面 ${fetchUrl} (${response.status})`);
    }

    const html = await response.text();
    const members = parseMembersFromHtml(html);

    if (members.length === 0) {
      hasMore = false;
    } else {
      for (const m of members) {
        if (!seen.has(m.doubanUid)) {
          seen.add(m.doubanUid);
          allMembers.push(m);
        }
      }
      page++;
    }
  }

  console.log(`Total members scraped: ${allMembers.length} from ${page} pages`);
  return allMembers;
}

function parseMembersFromHtml(html: string): { doubanUid: string; doubanName: string; avatar: string | null }[] {
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
