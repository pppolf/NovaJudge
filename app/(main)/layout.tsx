import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* 主内容区域 */}
      <main className="flex justify-center w-full max-w-full mx-auto p-4 sm:p-6 lg:p-8 bg-zinc-100">
        {children}
      </main>

      {/* 底部 Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 text-center">
          <p className="text-gray-500 text-xs">
            China West Normal University
            <br />
            NovaJudge © {new Date().getFullYear()} All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
