import React from 'react';
import { usePlatform } from '../context/PlatformContext';
import { PriceChart } from './PriceChart';
import {
  formatGrams,
  formatPercent,
  formatToman,
  toPersianDigits,
} from '../utils/format';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  Gift,
  Pause,
  Play,
  QrCode,
  ReceiptText,
  Scale,
  ScanLine,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    role,
    setActiveNav,
    marketAssets,
    selectedAssetCode,
    setSelectedAssetCode,
    liveFeedEnabled,
    setLiveFeedEnabled,
    nudgeMarketPrice,
    gold18Asset,
    customerWallet,
    merchantWallet,
    pickupOrders,
    transactions,
    setActiveReceipt,
    openQrScanner,
    redeemPickupByCode,
    activeMerchantShop,
  } = usePlatform();

  const selectedAsset =
    marketAssets.find((a) => a.code === selectedAssetCode) || gold18Asset;

  const isMerchant = role === 'merchant';
  const wallet = isMerchant ? merchantWallet : customerWallet;
  const goldValueToman = Math.round(wallet.goldGrams * gold18Asset.buyPrice);
  const totalAssetsToman = goldValueToman + wallet.rialBalance + wallet.pendingSettlementToman;
  const pnlPercent =
    wallet.avgBuyPrice18k > 0
      ? ((gold18Asset.buyPrice - wallet.avgBuyPrice18k) / wallet.avgBuyPrice18k) * 100
      : 0;

  const relevantPickups = pickupOrders.filter((o) =>
    isMerchant ? o.status === 'pending' || o.status === 'ready' : o.customerPhone === '۰۹۱۲۳۴۵۶۷۸۹'
  );

  const recentTxs = transactions
    .filter((tx) => tx.roleVisibility === 'both' || tx.roleVisibility === role)
    .slice(0, 5);

  const handleQuickScanHandover = () => {
    openQrScanner((code) => {
      redeemPickupByCode(code);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Primary Portfolio / Merchant Vault Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Dominant Focal Anchor Card */}
        <div className="lg:col-span-7 bg-stone-900 dark:bg-[#171A21] text-white rounded-2xl p-5 sm:p-6 border border-stone-800 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
              <span>
                {isMerchant
                  ? `${activeMerchantShop.name} · پایانه ${activeMerchantShop.terminalId}`
                  : 'کیف طلا و دارایی سارا رضایی · احراز هویت تاییدشده'}
              </span>
              <span className="tabular-nums text-amber-400 font-medium">
                سود بازده دارایی: {formatPercent(pnlPercent, true)}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-xs text-stone-400">
                {isMerchant ? 'ارزش کل صندوق طلا و گردش تسویه گالری' : 'ارزش کل دارایی (طلا + ریال)'}
              </div>
              <div className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
                {formatToman(totalAssetsToman)}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-stone-800 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-[11px] text-stone-400">موجودی طلا (معادل ۱۸ عیار)</div>
                <div className="mt-1 text-base font-bold text-amber-400 tabular-nums">
                  {formatGrams(wallet.goldGrams)}
                </div>
                <div className="text-[11px] text-stone-400 tabular-nums mt-0.5">
                  {formatToman(goldValueToman)}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-stone-400">
                  {isMerchant ? 'موجودی ریالی آزاد' : 'موجودی کیف پول ریالی'}
                </div>
                <div className="mt-1 text-base font-bold text-white tabular-nums">
                  {formatToman(wallet.rialBalance, false)}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">تومان</div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <div className="text-[11px] text-stone-400">
                  {isMerchant ? 'در انتظار تسویه شاپرک' : 'میانگین خرید هر گرم'}
                </div>
                <div className="mt-1 text-base font-bold text-stone-200 tabular-nums">
                  {isMerchant
                    ? formatToman(wallet.pendingSettlementToman, false)
                    : formatToman(wallet.avgBuyPrice18k, false)}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {isMerchant ? 'تسویه خودکار شبا' : 'تومان / ۱۸ عیار'}
                </div>
              </div>
            </div>
          </div>

          {/* Ergonomic Quick Action Bar */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {isMerchant ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveNav('pos')}
                  className="min-h-[48px] px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  فروش با پوز
                </button>
                <button
                  type="button"
                  onClick={handleQuickScanHandover}
                  className="min-h-[48px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ScanLine className="w-4 h-4 shrink-0 text-amber-400" />
                  تحویل QR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNav('trade')}
                  className="min-h-[48px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0" />
                  معامله آب‌شده
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNav('ledger')}
                  className="min-h-[48px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  تسویه شبا
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveNav('trade')}
                  className="min-h-[48px] px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowDownLeft className="w-4 h-4 shrink-0" />
                  خرید فوری
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNav('trade')}
                  className="min-h-[48px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowUpRight className="w-4 h-4 shrink-0" />
                  فروش آنی
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNav('marketplace')}
                  className="min-h-[48px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Store className="w-4 h-4 shrink-0 text-amber-400" />
                  طلافروشی‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNav('ledger')}
                  className="min-h-[48px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Gift className="w-4 h-4 shrink-0" />
                  هدیه طلا
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Interactive Chart */}
        <div className="lg:col-span-5 flex flex-col">
          <PriceChart asset={selectedAsset} compact />
        </div>
      </section>

      {/* Live Market Board & Demo Price Simulator Controls */}
      <section className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              تابلو مظنه لحظه‌ای بازار طلا و سکه
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              برای مشاهده نمودار روی هر ردیف لمس کنید · نرخ‌های دمو به‌صورت لحظه‌ای نوسان دارند
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => nudgeMarketPrice(1.5)}
              className="min-h-[38px] px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              شبیه‌سازی رشد +۱.۵٪
            </button>
            <button
              type="button"
              onClick={() => nudgeMarketPrice(-1.5)}
              className="min-h-[38px] px-3 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              شبیه‌سازی افت -۱.۵٪
            </button>
            <button
              type="button"
              onClick={() => setLiveFeedEnabled(!liveFeedEnabled)}
              className="min-h-[38px] px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {liveFeedEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {liveFeedEnabled ? 'توقف نوسان خودکار' : 'شروع نوسان خودکار'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                <th className="py-3 px-4 sm:px-5">نماد / عیار</th>
                <th className="py-3 px-4">نرخ خرید از شما</th>
                <th className="py-3 px-4">نرخ فروش به شما</th>
                <th className="py-3 px-4">تغییر ۲۴ ساعته</th>
                <th className="py-3 px-4 sm:px-5 text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/70 text-sm">
              {marketAssets.map((asset) => {
                const isSelected = asset.code === selectedAssetCode;
                const isUp = asset.change24hPercent >= 0;
                return (
                  <tr
                    key={asset.code}
                    onClick={() => setSelectedAssetCode(asset.code)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70 dark:bg-amber-950/20'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-900/50'
                    }`}
                  >
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="font-semibold text-stone-900 dark:text-stone-100">
                        {asset.name}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                        عیار {toPersianDigits(asset.karat)} · واحد {asset.unit}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-stone-800 dark:text-stone-200 tabular-nums whitespace-nowrap">
                      {formatToman(asset.buyPrice, false)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100 tabular-nums whitespace-nowrap">
                      {formatToman(asset.sellPrice, false)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
                          isUp
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {isUp ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {formatPercent(asset.change24hPercent, true)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-left whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssetCode(asset.code);
                          setActiveNav('trade');
                        }}
                        className="min-h-[38px] px-3.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-900 hover:text-white dark:hover:bg-amber-600 dark:hover:border-amber-600 transition-colors cursor-pointer"
                      >
                        معامله
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom 2-Column Operational Split: Active Pickups & Recent Ledger */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Physical Delivery / Pickup Queue */}
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {isMerchant ? 'سفارش‌های تحویل فیزیکی مشتریان' : 'کدهای تحویل فیزیکی فعال شما'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {isMerchant
                  ? 'کد تحویل مشتری را روی پوز اسکن کرده و قطعه را تحویل دهید'
                  : 'با ارائه کد تحویل به طلافروشی، طلای فیزیکی خود را دریافت کنید'}
              </p>
            </div>
            {isMerchant ? (
              <button
                type="button"
                onClick={handleQuickScanHandover}
                className="min-h-[40px] px-3 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <QrCode className="w-3.5 h-3.5" />
                اسکن کد
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveNav('trade')}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                درخواست جدید
              </button>
            )}
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {relevantPickups.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
                در حال حاضر سفارش تحویل فیزیکی فعالی ثبت نشده است.
              </div>
            ) : (
              relevantPickups.slice(0, 4).map((ord) => (
                <div
                  key={ord.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {ord.itemTitle}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                      {isMerchant ? ord.customerName : ord.shopName} · {formatGrams(ord.weightGrams)} ·{' '}
                      <span className="font-mono-code font-semibold text-amber-700 dark:text-amber-400">
                        {ord.code}
                      </span>
                    </div>
                  </div>

                  {isMerchant ? (
                    <button
                      type="button"
                      onClick={() => redeemPickupByCode(ord.code)}
                      className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-900 hover:text-white dark:hover:bg-amber-600 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      تایید تحویل
                    </button>
                  ) : (
                    <div className="text-left shrink-0">
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {ord.status === 'delivered'
                          ? 'تحویل‌شده'
                          : ord.status === 'ready'
                          ? 'آماده تحویل'
                          : 'در حال آماده‌سازی'}
                      </div>
                      <div className="text-[11px] text-stone-500 tabular-nums mt-0.5">{ord.createdAt}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                آخرین تراکنش‌ها و فاکتورها
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                گزارش لحظه‌ای عملیات خرید، فروش، کارتخوان پوز و تسویه
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveNav('ledger')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer whitespace-nowrap"
            >
              مشاهده همه
            </button>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {recentTxs.map((tx) => (
              <div
                key={tx.id}
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300 shrink-0 mt-0.5">
                    {tx.weightGrams ? (
                      <Scale className="w-4 h-4" />
                    ) : (
                      <ReceiptText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {tx.title}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                      {tx.counterparty} · {tx.timestamp}
                    </div>
                  </div>
                </div>

                <div className="text-left shrink-0 flex items-center gap-2.5">
                  <div>
                    <div className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                      {formatToman(tx.amountToman, false)}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                      {tx.weightGrams ? formatGrams(tx.weightGrams) : 'تومان'}
                    </div>
                  </div>
                  {tx.receipt && (
                    <button
                      type="button"
                      onClick={() => setActiveReceipt(tx.receipt!)}
                      className="min-w-[36px] min-h-[36px] rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      title="مشاهده رسید حرارتی"
                    >
                      <ReceiptText className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
