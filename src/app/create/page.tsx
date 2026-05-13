"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/header";

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [expireHours, setExpireHours] = useState<number | null>(null);

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url as string;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    setError("");
    const newFiles = [...images];
    const newUrls = [...imageUrls];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) { setError("图片不能超过10MB"); continue; }
      try {
        const url = await uploadImage(file);
        newFiles.push(file);
        newUrls.push(url);
      } catch { setError("上传失败"); }
    }
    setImages(newFiles);
    setImageUrls(newUrls);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setError("内容不能为空"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          content,
          verifyCode: verifyCode || undefined,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          expiresAt: expireHours !== null ? new Date(Date.now() + expireHours * 3600000).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/s/${data.secret.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">创建密文</h1>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        <div className="space-y-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">标题（可选）</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="给密文起个名字..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">验证数字（可选）</label>
            <input type="text" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="例如：7294，访客需要输入此数字才能查看" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none" />
            <p className="mt-1 text-xs text-gray-500">把这个数字发在豆瓣小组评论区</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">内容 *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下你想分享的内容..." rows={6} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none resize-y" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">图片（可选）</label>
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={handleImageChange} disabled={uploading} className="w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200" />
            {imageUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    <button onClick={() => { setImageUrls(imageUrls.filter((_, j) => j !== i)); setImages(images.filter((_, j) => j !== i)); }} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">过期时间（可选）</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "24小时", hours: 24 }, { label: "7天", hours: 168 }, { label: "30天", hours: 720 }, { label: "永不过期", hours: null },
              ].map((opt) => (
                <button key={opt.label} onClick={() => setExpireHours(opt.hours)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${(opt.hours === null && expireHours === null) || opt.hours === expireHours ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >{opt.label}</button>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitting || !content}
            className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >{submitting ? "创建中..." : "创建密文"}</button>
        </div>
      </main>
    </div>
  );
}
