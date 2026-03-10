
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@headlessui/react";

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [allowExternalLogin, setAllowExternalLogin] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        setAllowExternalLogin(data.allowExternalLogin);
        setLoading(false);
      })
      .catch(() => {
        toast.error("加载配置失败");
        setLoading(false);
      });
  }, []);

  const handleToggle = async (checked: boolean) => {
    setAllowExternalLogin(checked);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowExternalLogin: checked }),
      });
      if (!res.ok) throw new Error();
      toast.success("保存成功");
    } catch {
      toast.error("保存失败");
      setAllowExternalLogin(!checked); // revert
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">系统设置</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">允许外部登录</h3>
            <p className="text-sm text-gray-500 mt-1">
              开启后，用户可以通过第三方认证系统登录。关闭此选项通常用于内网比赛环境，仅允许使用比赛账号或管理员账号登录。
            </p>
          </div>
          
          <Switch
            checked={allowExternalLogin}
            onChange={handleToggle}
            className={`${
              allowExternalLogin ? "bg-blue-600" : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            <span
              className={`${
                allowExternalLogin ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
        </div>
      </div>
    </div>
  );
}
