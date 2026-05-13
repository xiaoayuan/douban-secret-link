"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  doubanUid: string;
  doubanName: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");

  const [groupUrl, setGroupUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [savedGroupUrl, setSavedGroupUrl] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<{ doubanUid: string; doubanName: string; avatar: string | null }[]>([]);

  const fetchUsers = useCallback(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setUsers(data.users);
        return data;
      });
  }, []);

  const fetchGroupInfo = useCallback(() => {
    fetch("/api/admin/group")
      .then((r) => r.json())
      .then((data) => {
        setSavedGroupUrl(data.groupUrl || "");
        setMemberCount(data.memberCount || 0);
        if (!groupUrl) setGroupUrl(data.groupUrl || "");
        return data;
      });
  }, [groupUrl]);

  const fetchMembers = useCallback(() => {
    fetch("/api/admin/members")
      .then((r) => r.json())
      .then((data) => setMembers(data.members || []));
  }, []);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchGroupInfo()]);
  }, [fetchUsers, fetchGroupInfo]);

  const toggleStatus = async (doubanUid: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doubanUid, status: newStatus }) });
    fetchUsers();
  };

  const handleScan = async () => {
    if (!groupUrl) return;
    if (!groupUrl.startsWith("http")) { setScanResult("请输入完整URL，以 https:// 开头"); return; }
    if (!groupUrl.includes("douban.com")) { setScanResult("请输入豆瓣域名下的页面地址"); return; }
    setScanning(true);
    setScanResult("");
    try {
      const res = await fetch("/api/admin/group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: groupUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScanResult(`新增 ${data.added} 个成员，清理 ${data.deactivated} 个已退组用户`);
      fetchUsers();
      fetchGroupInfo();
      fetchMembers();
    } catch (e) {
      setScanResult(e instanceof Error ? e.message : "扫描失败");
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">管理员面板</h1>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {/* 小组管理 */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">豆瓣小组同步</h2>
          <p className="mb-3 text-xs text-gray-500">
            设置豆瓣小组成员页URL，系统将抓取小组成员列表。只有小组成员才能注册。
            {savedGroupUrl && <> 当前已同步 {memberCount} 名成员。</>}
          </p>
          <div className="flex gap-2">
            <input
              type="text" value={groupUrl} onChange={(e) => setGroupUrl(e.target.value)}
              placeholder="https://www.douban.com/group/xxxxx/members"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <button onClick={handleScan} disabled={scanning || !groupUrl}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >{scanning ? "扫描中..." : "扫描同步"}</button>
          </div>
          {scanResult && <div className="mt-2 text-xs text-blue-600">{scanResult}</div>}
          {savedGroupUrl && (
            <button onClick={() => { setShowMembers(!showMembers); if (!showMembers) fetchMembers(); }}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700">
              {showMembers ? "收起" : "查看"}白名单 ({memberCount}人)
            </button>
          )}
          {showMembers && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2">
              <div className="flex flex-wrap gap-1">
                {members.map((m) => (
                  <span key={m.doubanUid} className="inline-flex rounded bg-white px-2 py-0.5 text-xs border border-gray-200">
                    <span className="text-gray-900">{m.doubanName}</span>
                    <span className="ml-1 text-gray-500">{m.doubanUid}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 用户管理 */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <span className="text-sm font-medium text-gray-700">用户列表 ({users.length})</span>
          </div>
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.doubanUid} className="flex items-center justify-between px-6 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{u.doubanName}</div>
                  <div className="text-xs text-gray-500">UID: {u.doubanUid} · {u.role} · {new Date(u.createdAt).toLocaleDateString("zh-CN")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {u.status === "ACTIVE" ? "已激活" : "禁用"}
                  </span>
                  {u.role !== "ADMIN" && (
                    <button onClick={() => toggleStatus(u.doubanUid, u.status)}
                      className={`rounded px-2 py-0.5 text-xs font-medium ${u.status === "ACTIVE" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                    >{u.status === "ACTIVE" ? "禁用" : "激活"}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
