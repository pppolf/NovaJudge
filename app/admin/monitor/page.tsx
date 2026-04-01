"use client";

import { useEffect, useState } from "react";

// ================= 配置区 =================
// 1. 刚才运行的 Node.js 控制中心地址
const CONTROL_SERVER_URL =
  process.env.NEXT_PUBLIC_CONTROL_SERVER_URL || "http://localhost:4000";
// 2. MediaMTX (流媒体服务器) 的接收地址
// const RTSP_BASE_URL =
//   process.env.NEXT_PUBLIC_RTSP_BASE_URL || "rtsp://localhost:8554";

const PTMP_BASE_URL = 
  process.env.NEXT_PUBLIC_PTMP_BASE_URL || "rtmp://localhost:1935";

interface ClientAgent {
  socketId: string;
  seat: string;
  teamName: string;
  ip: string;
  isStreaming: boolean;
  lastHeartbeat: number;
}

export default function MonitorPage() {
  const [clients, setClients] = useState<ClientAgent[]>([]);

  // 1. 定时轮询：每 2 秒去控制中心拉取一次最新在线名单
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch(`${CONTROL_SERVER_URL}/api/clients`);
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch (e) {
        console.error("无法连接到控制中心", e);
      }
    };

    fetchClients(); // 初始拉取
    const timer = setInterval(fetchClients, 2000);
    return () => clearInterval(timer);
  }, []);

  // 2. 发送“开始推流”指令
  const handleStartStream = async (teamName: string) => {
    // 动态生成推流目标地址，例如: rtmp://ip:port/team001
    const streamUrl = `${PTMP_BASE_URL}/${teamName}`;
    try {
      const res = await fetch(`${CONTROL_SERVER_URL}/api/stream/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName, streamUrl }),
      });
      if (!res.ok) alert("下发指令失败！");
    } catch (e) {
      console.error("无法连接到控制中心", e);
      alert("网络错误，请检查控制中心是否运行！");
    }
  };

  // 3. 发送“停止推流”指令
  const handleStopStream = async (teamName: string) => {
    try {
      const res = await fetch(`${CONTROL_SERVER_URL}/api/stream/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName }),
      });
      if (!res.ok) alert("停止推流失败！");
    } catch (e) {
      console.error("无法连接到控制中心", e);
      alert("网络错误！");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          📡 考场推流控制中心
        </h1>
        <div className="bg-white px-4 py-2 rounded-lg shadow text-sm font-medium">
          当前在线机器:{" "}
          <span className="text-blue-600 text-lg">{clients.length}</span> 台
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {clients.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-12">
            等待考场机器接入... (请确保 Python 客户端已运行)
          </div>
        ) : (
          clients.map((client) => {
            // 判断是否掉线 (超过 15 秒没心跳算异常，虽然服务端会自动踢，前端也可以标灰)
            // eslint-disable-next-line react-hooks/purity
            const isOffline = Date.now() - client.lastHeartbeat > 15000;

            return (
              <div
                key={client.socketId}
                className={`p-5 rounded-xl border-2 transition-all ${
                  isOffline
                    ? "border-gray-200 bg-gray-50 opacity-60"
                    : client.isStreaming
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-green-400 bg-white shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {client.seat}
                    </h2>
                    <p className="text-sm text-gray-500 truncate max-w-40">
                      {client.teamName}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded-full ${
                      client.isStreaming
                        ? "bg-blue-100 text-blue-700 animate-pulse"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {client.isStreaming ? "● 直播中" : "空闲"}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-4 font-mono">
                  IP: {client.ip}
                </div>

                <div className="flex gap-2">
                  {!client.isStreaming ? (
                    <button
                      onClick={() => handleStartStream(client.teamName)}
                      disabled={isOffline}
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                      ▶ 开启推流
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStopStream(client.teamName)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                      ■ 停止推流
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
