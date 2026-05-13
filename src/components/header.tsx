"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  doubanUid: string;
  doubanName: string;
  role?: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdOk, setPwdOk] = useState("");

  const fetchUser = () => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { setUser(data.user); setLoading(false); });
  };

  useEffect(() => { fetchUser(); }, []);

  const changePassword = async () => {
    setPwdError(""); setPwdOk("");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwdOk("密码已更新");
      setCurrentPwd(""); setNewPwd("");
      setTimeout(() => setShowPwd(false), 1500);
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : "修改失败");
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold text-gray-900">私密链接</Link>
        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-xs text-blue-600 hover:underline">管理</Link>
              )}
              <span className="text-sm text-gray-600">{user.doubanName}</span>
              <button onClick={() => setShowPwd(!showPwd)} className="text-xs text-gray-500 hover:text-gray-700">改密</button>
              <a href="/api/auth/logout" className="text-xs text-gray-500 hover:text-gray-700">退出</a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a href="/login" className="text-sm text-gray-600 hover:text-gray-900">管理员登录</a>
            </div>
          )}
        </div>
      </div>
      {showPwd && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">当前密码</label>
              <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm w-28" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">新密码</label>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm w-28" />
            </div>
            <button onClick={changePassword} className="rounded bg-gray-900 px-3 py-1 text-xs text-white hover:bg-gray-800">确认</button>
            {pwdError && <span className="text-xs text-red-500">{pwdError}</span>}
            {pwdOk && <span className="text-xs text-green-600">{pwdOk}</span>}
          </div>
        </div>
      )}
    </header>
  );
}
