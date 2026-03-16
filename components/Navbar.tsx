"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminLoginModal from "./AdminLoginModal";
import ExternalLoginModal from "./ExternalLoginModal";
import { ContestRole } from "@/lib/generated/prisma/enums";
import { 
  HomeIcon, 
  LanguageIcon, 
  Bars3Icon, 
  XMarkIcon 
} from "@heroicons/react/24/outline";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const [clickCount, setClickCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showExternalLogin, setShowExternalLogin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // 新增：移动端侧边栏状态
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user, logout, revalidate } = useAuth();
  const { dict, toggleLanguage, lang } = useLanguage();
  const isAdmin = user?.isGlobalAdmin;

  // 路由变化时，自动关闭移动端侧边栏
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // 处理登录回调
  useEffect(() => {
    if (searchParams.get("login") === "true") {
      revalidate?.();
    }
  }, [searchParams, revalidate]);

  // 处理点击外部关闭用户菜单
  useEffect(() => {
    const closeMenu = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener("click", closeMenu);
    }
    return () => document.removeEventListener("click", closeMenu);
  }, [showUserMenu]);

  // 锁定侧边栏打开时的底层滚动
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isMobileMenuOpen]);

  const handleUserMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUserMenu(!showUserMenu);
  };

  const [allowExternalLogin, setAllowExternalLogin] = useState(true);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        setAllowExternalLogin(data.allowExternalLogin);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleExternalLoginOpen = () => setShowExternalLogin(true);

  const match = pathname.match(/^\/contest\/(\d+)/);
  const contestId = match ? match[1] : null;

  const getContestLink = (subPath: string) => `/contest/${contestId}${subPath}`;

  const isActive = (path: string) => {
    if (path === `/contest/${contestId}`) {
      return pathname === `/contest/${contestId}`;
    }
    if (pathname === path) return true;
    return pathname.startsWith(path + "/");
  };

  // 桌面端链接样式
  const desktopLinkClass = (path: string, extraClass: string = "") =>
    `px-3 py-2 font-bold transition-colors whitespace-nowrap hidden md:block ${
      isActive(path) ? "text-blue-700" : "text-gray-900 hover:text-blue-700"
    } ${extraClass}`;

  // 移动端侧边栏链接样式
  const mobileLinkClass = (path: string, extraClass: string = "") =>
    `block px-4 py-4 text-lg font-bold border-b border-gray-100 transition-colors ${
      isActive(path) ? "text-blue-700 bg-blue-50" : "text-gray-900 active:bg-gray-50"
    } ${extraClass}`;

  useEffect(() => {
    if (clickCount === 0) return;
    const timer = setTimeout(() => setClickCount(0), 2000);
    return () => clearTimeout(timer);
  }, [clickCount]);

  const handleNavClick = (e: React.MouseEvent) => {
    if (user) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "NAV" || target?.className?.includes("max-w-7xl") || target?.className?.includes("nav-trigger")) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount === 3) {
        setShowAdminLogin(true);
        setClickCount(0);
      }
    }
  };

  const isContestAdmin =
    isAdmin ||
    user?.role === ContestRole.ADMIN ||
    user?.role === ContestRole.JUDGE ||
    user?.role === ContestRole.BALLOON;

  return (
    <>
      <nav
        onClick={handleNavClick}
        className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 nav-trigger">
          <div className="flex justify-between items-center h-14 font-serif text-xl nav-trigger">
            
            {/* 左侧：移动端汉堡菜单按钮 & 桌面端导航 */}
            <div className="flex items-center">
              
              {/* 移动端汉堡菜单按钮 */}
              <button 
                className="md:hidden mr-2 p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              <Link
                href="/"
                className="text-gray-900 font-bold px-2 py-2 shrink-0 flex items-center gap-1"
              >
                <HomeIcon className="w-6 h-6 md:hidden" />
                <span className="hidden md:block">{dict.nav.home}</span>
              </Link>

              {/* ================= 桌面端导航项 (移动端隐藏) ================= */}
              <div className="hidden md:flex items-center">
                {user && !user.contestId && (
                  <Link href="/train" className={desktopLinkClass("/train")}>
                    训练中心
                  </Link>
                )}

                {contestId && (
                  <>
                    <span className="text-gray-300 shrink-0 mx-1">|</span>
                    <Link href={getContestLink("")} className={desktopLinkClass(`/contest/${contestId}`)}>
                      {dict.nav.contest}
                    </Link>
                    <Link href={getContestLink("/problems")} className={desktopLinkClass(`/contest/${contestId}/problems`)}>
                      {dict.nav.problems}
                    </Link>
                    <Link href={getContestLink("/status")} className={desktopLinkClass(`/contest/${contestId}/status`)}>
                      {dict.nav.status}
                    </Link>
                    <Link href={getContestLink("/rank")} className={desktopLinkClass(`/contest/${contestId}/rank`)}>
                      {dict.nav.rank}
                    </Link>
                    <Link href={getContestLink("/clarifications")} className={desktopLinkClass(`/contest/${contestId}/clarifications`)}>
                      {dict.nav.clarifications}
                    </Link>
                  </>
                )}

                {contestId && isContestAdmin && (
                  <>
                    <span className="text-gray-300 shrink-0 mx-1">|</span>
                    <Link href={getContestLink("/balloon")} className={desktopLinkClass(`/contest/${contestId}/balloon`, "text-orange-600 hover:text-orange-800")}>
                      🎈 {dict.nav.balloon}
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <span className="text-gray-300 shrink-0 mx-1">|</span>
                    <Link href="/admin" className="text-red-600 hover:text-red-800 px-3 py-2 text-xl font-bold flex items-center shrink-0">
                      {dict.nav.adminPanel}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* 右侧：用户菜单与多语言 (始终在顶部显示) */}
            <div className="flex space-x-4 text-lg items-center gap-2 sm:gap-4 shrink-0">
              <button
                onClick={toggleLanguage}
                className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100 cursor-pointer"
                title="Switch Language"
              >
                <div className="flex items-center text-sm font-bold gap-1">
                  <LanguageIcon className="w-5 h-5" />
                  <span>{lang === "zh" ? "中" : "EN"}</span>
                </div>
              </button>
              
              {user ? (
                <div className="relative">
                  <button
                    onClick={handleUserMenuClick}
                    className="text-gray-700 font-bold flex items-center gap-1 max-w-30 sm:max-w-none truncate focus:outline-none cursor-pointer"
                  >
                    {user.isGlobalAdmin && (
                      <span className="text-red-600 hidden sm:inline">[{dict.nav.superAdmin}]</span>
                    )}
                    <span className="truncate">{user.username}</span>
                    <span
                      className="text-xs transition-transform duration-200"
                      style={{ transform: showUserMenu ? "rotate(180deg)" : "rotate(0)" }}
                    >
                      ▼
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-gray-200 shadow-lg rounded-sm z-50">
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer active:bg-gray-200"
                      >
                        {dict.nav.logout}
                      </button>
                    </div>
                  )}
                </div>
              ) : allowExternalLogin ? (
                <button
                  onClick={handleExternalLoginOpen}
                  className="px-3 py-2 text-sm font-bold rounded-sm border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  外部登录
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div 
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <span className="font-bold text-xl font-serif">NovaJudge</span>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <Link href="/" className={mobileLinkClass("/")}>{dict.nav.home}</Link>

          {user && !user.contestId && (
            <Link href="/train" className={mobileLinkClass("/train")}>训练中心</Link>
          )}

          {contestId && (
            <>
              <div className="px-4 py-2 mt-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                比赛菜单
              </div>
              <Link href={getContestLink("")} className={mobileLinkClass(`/contest/${contestId}`)}>
                {dict.nav.contest}
              </Link>
              <Link href={getContestLink("/problems")} className={mobileLinkClass(`/contest/${contestId}/problems`)}>
                {dict.nav.problems}
              </Link>
              <Link href={getContestLink("/status")} className={mobileLinkClass(`/contest/${contestId}/status`)}>
                {dict.nav.status}
              </Link>
              <Link href={getContestLink("/rank")} className={mobileLinkClass(`/contest/${contestId}/rank`)}>
                {dict.nav.rank}
              </Link>
              <Link href={getContestLink("/clarifications")} className={mobileLinkClass(`/contest/${contestId}/clarifications`)}>
                {dict.nav.clarifications}
              </Link>
            </>
          )}

          {contestId && isContestAdmin && (
            <Link href={getContestLink("/balloon")} className={mobileLinkClass(`/contest/${contestId}/balloon`, "text-orange-600")}>
              🎈 {dict.nav.balloon}
            </Link>
          )}

          {isAdmin && (
            <>
              <div className="px-4 py-2 mt-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                管理
              </div>
              <Link href="/admin" className={mobileLinkClass("/admin", "text-red-600")}>
                {dict.nav.adminPanel}
              </Link>
            </>
          )}
        </div>
      </div>

      {showAdminLogin && (
        <AdminLoginModal onClose={() => setShowAdminLogin(false)} />
      )}
      {showExternalLogin && (
        <ExternalLoginModal
          onClose={() => setShowExternalLogin(false)}
          onSuccess={() => revalidate?.()}
        />
      )}
    </>
  );
}