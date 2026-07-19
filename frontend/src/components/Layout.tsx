import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  RefreshCw,
  BarChart3,
  ShieldCheck,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bell
} from 'lucide-react';

const PesoSign: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 18V4h6a5 5 0 0 1 5 5 5 5 0 0 1-5 5H6" />
    <path d="M3 8h12" />
    <path d="M3 11h12" />
  </svg>
);

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
    { name: 'Product Costs', path: '/products', icon: Package, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
    { name: 'Orders Log', path: '/orders', icon: ShoppingCart, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
    { name: 'Settlements', path: '/settlements', icon: PesoSign, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
    { name: 'Waybill & OCR', path: '/waybills', icon: FileText, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
    { name: 'Returns Module', path: '/returns', icon: RefreshCw, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
    { name: 'Financial Reports', path: '/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'VIEWER'] },
    { name: 'Audit Trails', path: '/audit', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['SUPER_ADMIN', 'MANAGER'] }
  ];

  const filteredMenu = menuItems.filter(item => hasRole(item.roles as any));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentRouteName = menuItems.find(m => m.path === location.pathname)?.name || 'TikTracker Pro';

  return (
    <div className="min-h-screen flex text-slate-800 bg-[#FAFBFD] dark:text-slate-100 dark:bg-[#07090E]">
      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/60 dark:bg-[#0C111C]/80 border-r border-slate-200/50 dark:border-slate-800/50 backdrop-blur-lg">
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-emerald-500/20">
              T
            </div>
            <div>
              <h1 className="font-extrabold text-lg bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                TikTracker Pro
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Enterprise Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-500 border-l-4 border-emerald-500 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-emerald-500' : ''}`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-400">
              {user?.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.username}</p>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200/50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300/30 dark:border-slate-700/30">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* --- MOBILE DRAWER --- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/40 backdrop-blur-sm">
          <div className="w-64 bg-white dark:bg-[#0C111C] p-6 flex flex-col h-full border-r border-slate-200 dark:border-slate-800 animate-slide-in">
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
              <span className="font-extrabold text-lg text-emerald-500">TikTracker Pro</span>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 py-6 space-y-1">
              {filteredMenu.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-500 border-l-4 border-emerald-500 font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* --- HEADER --- */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/40 dark:bg-[#080B10]/40 border-b border-slate-200/30 dark:border-slate-900/30 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-bold text-lg">{currentRouteName}</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-500" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors relative"
              >
                <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 glow-green"></span>
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#162031] border border-slate-200 dark:border-slate-855 shadow-xl rounded-xl p-4 z-50 animate-fade-in text-sm">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold">Notifications</span>
                    <button className="text-[11px] text-emerald-500 hover:underline">Mark all read</button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <p className="font-semibold text-emerald-400 text-xs">Import Completed</p>
                      <p className="text-[11px] text-slate-400">Order spreadsheet upload successfully saved to logs.</p>
                    </div>
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <p className="font-semibold text-amber-400 text-xs">OCR Review Required</p>
                      <p className="text-[11px] text-slate-400">Waybill JX123 could not find matching order record.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* --- DYNAMIC BODY --- */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
export default Layout;
