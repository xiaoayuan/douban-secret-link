"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface User {
  doubanUid: string;
  doubanName: string;
}

interface Secret {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  verifyCode: string | null;
  creatorName: string;
  creatorUid: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  images: { url: string; sortOrder: number }[];
  replies: Reply[];
  isCreator: boolean;
  needsVerifyCode: boolean;
}

interface Reply {
  id: string;
  content: string;
  authorUid: string;
  authorName: string;
  createdAt: string;
}

export default function SecretPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [user, setUser] = useState<User | null>(null);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchSecret = useCallback(async () => {
    const res = await fetch(`/api/secrets/${slug}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.secret as Secret;
  }, [slug]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (!data.user) { router.replace(`/verify?redirect=/s/${slug}`); return; }
      setUser(data.user);
    });
  }, [router, slug]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchSecret().then((s) => { if (!cancelled) setSecret(s); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "加载失败"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, fetchSecret]);

   useEffect(() => {
    if (!secret || secret.needsVerifyCode || loading) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/secrets/${slug}`);
        const data = await res.json();
        if (data.secret && !data.secret.needsVerifyCode) {
          setSecret((prev) => prev ? { ...prev, replies: data.secret.replies } : prev);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [slug, secret?.needsVerifyCode, loading]);

  const uploadReplyImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReplyText((prev) => prev + (prev ? "\n" : "") + data.url);
    } catch { setError("图片上传失败"); }
    setUploadingImg(false);
    e.target.value = "";
  };

  const handleVerify = async () => {
    if (!verifyInput.trim()) return;
    setVerifying(true); setError("");
    try {
      const res = await fetch(`/api/secrets/${slug}/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifyCode: verifyInput }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      fetchSecret().then((s) => setSecret(s));
    } catch (e) { setError(e instanceof Error ? e.message : "验证失败"); }
    setVerifying(false);
  };

  const sendReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/secrets/${slug}/replies`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (secret) setSecret({ ...secret, replies: [...secret.replies, data.reply] });
      setReplyText("");
      scrollToBottom();
    } catch (e) { setError(e instanceof Error ? e.message : "发送失败"); }
    setSending(false);
  };

  const formatTime = (d: string) => new Date(d).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="text-sm text-gray-500">加载中...</div></div>;

  if (!secret) return (
    <div className="min-h-screen bg-gray-50"><main className="flex min-h-[60vh] items-center justify-center px-4"><div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error || "密文不存在"}</div></main></div>
  );

  if (secret.needsVerifyCode) return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-xl font-bold text-gray-900">{secret.title || "私密内容"}</h1>
          <p className="mb-6 text-sm text-gray-600">需要验证数字</p>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <input type="text" value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)} placeholder="输入验证数字" className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg tracking-widest focus:border-gray-500 focus:outline-none" onKeyDown={(e) => e.key === "Enter" && handleVerify()} />
          <button onClick={handleVerify} disabled={verifying || !verifyInput.trim()} className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{verifying ? "验证中..." : "验证"}</button>
        </div>
      </main>
    </div>
  );

  const expired = secret.expiresAt && new Date(secret.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          {secret.title && <h1 className="mb-3 text-xl font-bold text-gray-900">{secret.title}</h1>}
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
            <span>{secret.creatorName}</span><span>·</span><span>{formatTime(secret.createdAt)}</span>
            {secret.expiresAt && (<><span>·</span><span className={expired ? "text-red-500" : ""}>{expired ? "已过期" : getRemaining(secret.expiresAt)}</span></>)}
            {secret.isCreator && (<><span>·</span><a href={`/m/${secret.slug}`} className="text-blue-500 hover:underline">管理</a></>)}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            <ContentWithLinks text={secret.content} />
          </div>
          {secret.images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {secret.images.map((img, i) => <img key={i} src={img.url} alt="" className="h-24 w-24 cursor-pointer rounded-lg object-cover" onClick={() => setSelectedImage(img.url)} />)}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3"><span className="text-sm font-medium text-gray-700">对话 ({secret.replies.length})</span></div>
          <div className="max-h-96 overflow-y-auto p-4">
            {secret.replies.length === 0 && <div className="py-8 text-center text-sm text-gray-500">还没有回复</div>}
            {secret.replies.map((reply) => (
              <div key={reply.id} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2"><span className="text-xs font-medium text-gray-900">{reply.authorName}</span><span className="text-xs text-gray-500">{formatTime(reply.createdAt)}</span></div>
                <ContentWithLinks text={reply.content} onImageClick={setSelectedImage} />
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {!expired && secret.isActive && (
            <div className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <label className={`rounded-lg border border-gray-200 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${uploadingImg ? "opacity-50" : ""}`}>
                  {uploadingImg ? "..." : "🖼"}
                  <input type="file" accept="image/*" onChange={uploadReplyImage} disabled={uploadingImg} className="hidden" />
                </label>
                <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="输入回复..." className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
                <button onClick={sendReply} disabled={sending || !replyText.trim()} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">{sending ? "..." : "发送"}</button>
              </div>
            </div>
          )}
        </div>
      </main>
      {selectedImage && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setSelectedImage(null)}><img src={selectedImage} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" /></div>}
    </div>
  );
}

function ContentWithLinks({ text, onImageClick }: { text: string; onImageClick?: (url: string) => void }) {
  // Split text by URLs and image paths
  const urlPattern = /(https?:\/\/[^\s<>"]+)/g;
  const parts = text.split(urlPattern);
  const matches = text.match(urlPattern) || [];

  return (
    <div className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
      {parts.map((part, i) => {
        const isUrl = /^https?:\/\//.test(part);
        const isImage = /\/uploads\/[^\s]+$/.test(part) && /\.(jpg|jpeg|png|gif|webp)$/i.test(part);
        const isDouban = isUrl && part.includes("douban.com");

        if (isImage && onImageClick) {
          return <img key={i} src={part} alt="" className="my-1 max-h-48 rounded-lg cursor-pointer" onClick={() => onImageClick(part)} />;
        }
        if (isUrl) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer"
              className={isDouban ? "text-green-700 hover:underline" : "text-blue-600 hover:underline"}>
              {isDouban ? part : part.length > 50 ? part.slice(0, 50) + "..." : part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function getRemaining(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "已过期";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}天后过期`;
  if (hours > 0) return `${hours}小时后过期`;
  return "即将过期";
}
