import React from 'react';
import { usePlatform } from '../context/PlatformContext';
import { NavSection } from '../types/gold';
import { formatToman } from '../utils/format';
import {
  ArrowLeftRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  ReceiptText,
  Settings,
  Smartphone,
  Store,
  Sun,
  User,
  Users,
  Wallet,
} from 'lucide-react';

interface NavItem {
  id: NavSection;
  label: string;
  mobileLabel: string;
  icon: React.FC<{ className?: string }>;
}

const MERCHANT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'میز کار و مظنه', mobileLabel: 'خانه', icon: LayoutDashboard },
  { id: 'pos', label: 'صندوق پوز و فاکتور', mobileLabel: 'پوز', icon: CreditCard },
  { id: 'customers', label: 'مدیریت مشتریان', mobileLabel: 'مشتریان', icon: Users },
  { id: 'trade', label: 'معاملات آنلاین', mobileLabel: 'معامله', icon: ArrowLeftRight },
  { id: 'marketplace', label: 'ویترین و انبار', mobileLabel: 'ویترین', icon: Store },
  { id: 'ledger', label: 'تراکنش و تسویه', mobileLabel: 'دفترکل', icon: ReceiptText },
  { id: 'settings', label: 'سخت‌افزار پوز و گالری', mobileLabel: 'تنظیمات', icon: Settings },
];

const CUSTOMER_NAV: NavItem[] = [
  { id: 'dashboard', label: 'خانه و دارایی', mobileLabel: 'خانه', icon: LayoutDashboard },
  { id: 'trade', label: 'خرید و فروش طلا', mobileLabel: 'معامله', icon: ArrowLeftRight },
  { id: 'marketplace', label: 'طلافروشی‌ها و ویترین', mobileLabel: 'بازار', icon: Store },
  { id: 'ledger', label: 'کیف پول و هدیه', mobileLabel: 'کیف پول', icon: Wallet },
  { id: 'settings', label: 'حساب و امنیت', mobileLabel: 'حساب', icon: Settings },
];

export const LayoutShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    authUser,
    logout,
    role,
    setRole,
    activeNav,
    setActiveNav,
    darkMode,
    toggleDarkMode,
    posFrameMode,
    togglePosFrameMode,
    gold18Asset,
    pickupOrders,
    customers,
  } = usePlatform();

  const navItems = role === 'merchant' ? MERCHANT_NAV : CUSTOMER_NAV;
  const mobileTabs = navItems.slice(0, 5);
  const currentTitle = navItems.find((n) => n.id === activeNav)?.label || 'زرپوز';
  const pendingPickupsCount = pickupOrders.filter((o) => o.status === 'pending' || o.status === 'ready').length;

  const primaryCtaLabel = role === 'merchant' ? 'فاکتور جدید پوز' : 'خرید سریع طلا';
  const handlePrimaryCta = () => {
    setActiveNav(role === 'merchant' ? 'pos' : 'trade');
  };

  // Optional Android POS WebView Frame Preview Mode on Desktop
  if (posFrameMode) {
    return (
      <div className="min-h-screen bg-stone-200 dark:bg-[#07080A] py-6 px-4 flex flex-col items-center">
        <div className="w-full max-w-[420px] flex items-center justify-between mb-3 text-xs text-stone-700 dark:text-stone-300">
          <span className="font-semibold">شبیه‌ساز نمایشگر پوز اندرویدی (WebView 390px)</span>
          <button
            type="button"
            onClick={togglePosFrameMode}
            className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium cursor-pointer whitespace-nowrap"
          >
            بازگشت به نمای تمام‌صفحه
          </button>
        </div>

        {/* Simulated Android POS Hardware Shell */}
        <div className="w-full max-w-[400px] h-[780px] bg-[#FAF9F6] dark:bg-[#0C0D10] rounded-[32px] border-[8px] border-stone-900 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col relative">
          {/* POS Compact Sticky Header */}
          <header className="h-[52px] shrink-0 px-3.5 bg-white/95 dark:bg-[#15171C]/95 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
              زرپوز · {currentTitle}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setRole(role === 'merchant' ? 'customer' : 'merchant')}
                className="px-2.5 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-800 dark:text-stone-200 cursor-pointer whitespace-nowrap"
              >
                {role === 'merchant' ? 'پنل طلافروش' : 'پنل کاربر'}
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('settings')}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                aria-label="تنظیمات"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                aria-label="خروج از حساب"
                title="خروج از حساب"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Scrollable WebView Content */}
          <main className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4">{children}</main>

          {/* POS Touch Bottom Navigation */}
          <nav className="h-16 shrink-0 bg-white dark:bg-[#15171C] border-t border-stone-200 dark:border-stone-800 grid grid-cols-5 items-center px-1">
            {mobileTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer ${
                    isActive
                      ? 'text-amber-700 dark:text-amber-400 font-semibold'
                      : 'text-stone-500 dark:text-stone-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] whitespace-nowrap">{item.mobileLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FAF9F6] dark:bg-[#0C0D10] text-stone-900 dark:text-stone-100">
      {/* Desktop RTL Right Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-[#121419] sticky top-0 h-screen">
        {/* Brand Zone */}
        <div className="h-16 px-5 flex items-center border-b border-stone-200 dark:border-stone-800">
          <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap">
            زرپوز
          </span>
        </div>

        {/* Role Switcher */}
        <div className="p-4 border-b border-stone-100 dark:border-stone-800/80">
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-2">
            حالت نمایش دمو
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
            <button
              type="button"
              onClick={() => setRole('merchant')}
              className={`min-h-[38px] px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                role === 'merchant'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              طلافروشی
            </button>
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`min-h-[38px] px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                role === 'customer'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              کاربر عادی
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-stone-900 dark:bg-amber-600/20 text-white dark:text-amber-300 font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-stone-100 font-medium'
                }`}
              >
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </span>
                {item.id === 'pos' && role === 'merchant' && pendingPickupsCount > 0 && (
                  <span className="text-xs font-bold tabular-nums opacity-80">
                    {pendingPickupsCount}
                  </span>
                )}
                {item.id === 'customers' && role === 'merchant' && (
                  <span className="text-xs font-bold tabular-nums opacity-75">
                    {customers.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Workspace Controls */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
          {authUser && (
            <div className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                  {authUser.name}
                </div>
                <div className="text-[11px] text-stone-500 tabular-nums" dir="ltr">
                  {authUser.phone}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-8 h-8 shrink-0 rounded-lg text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 flex items-center justify-center cursor-pointer"
                aria-label="خروج از حساب"
                title="خروج از حساب"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={togglePosFrameMode}
            className="w-full min-h-[40px] px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Smartphone className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            نمای شبیه‌ساز پوز (390px)
          </button>
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full min-h-[40px] px-3 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'تم روشن (روز)' : 'تم تیره (شب)'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean Single-Row Top Bar (Desktop & Mobile POS) */}
        <header className="sticky top-0 z-30 h-[54px] lg:h-16 px-4 lg:px-8 bg-white/95 dark:bg-[#121419]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="lg:hidden text-base font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0">
              زرپوز
            </span>
            <span className="hidden lg:inline text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
              {currentTitle}
            </span>
          </div>

          {/* Center / Quiet Live 18K Reference Rate */}
          <div className="hidden md:flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
            <span>نرخ لحظه‌ای طلای ۱۸ عیار:</span>
            <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
              {formatToman(gold18Asset.sellPrice)}
            </span>
          </div>

          {/* Single Primary Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Role Quick Switch */}
            <button
              type="button"
              onClick={() => setRole(role === 'merchant' ? 'customer' : 'merchant')}
              className="lg:hidden min-h-[40px] px-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {role === 'merchant' ? 'طلافروشی' : 'کاربر'}
            </button>

            <button
              type="button"
              onClick={() => setActiveNav('settings')}
              className="lg:hidden w-10 h-10 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="تنظیمات"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handlePrimaryCta}
              className="min-h-[40px] px-3.5 sm:px-4 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {primaryCtaLabel}
            </button>
          </div>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-5 lg:py-7 pb-24 lg:pb-10">
          {children}
        </main>

        {/* Mobile / Android POS WebView Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 pb-safe bg-white/95 dark:bg-[#121419]/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 grid grid-cols-5 items-center px-1">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-amber-700 dark:text-amber-400 font-semibold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-none whitespace-nowrap">{item.mobileLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
