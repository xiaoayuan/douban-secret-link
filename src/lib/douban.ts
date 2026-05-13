export async function scrapeGroupMembers(url: string): Promise<{ doubanUid: string; doubanName: string; avatar: string | null }[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
  });
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
  });
  if (!response.ok) throw new Error(`无法访问豆瓣主页 (${response.status})`);
  const html = await response.text();

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const doubanName = titleMatch ? titleMatch[1].replace(/[\s(].*/, "").trim() : doubanUid;

  const avatarMatch = html.match(/<img[^>]+src="([^"]+\.doubanio\.com\/[^"]+\.(?:jpg|png|jpeg|webp))"/);
  const avatar = avatarMatch ? avatarMatch[1] : null;

  return { doubanName, avatar };
}
