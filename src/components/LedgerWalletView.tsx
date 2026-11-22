import React, { useMemo, useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  exportTransactionsToCsv,
  formatGrams,
  formatToman,
  toPersianDigits,
} from '../utils/format';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  Gift,
  ReceiptText,
  Search,
  Send,
} from 'lucide-react';

type FilterType = 'all' | 'gold' | 'pos' | 'banking';

export const LedgerWalletView: React.FC = () => {
  const {
    role,
    activeWallet,
    gold18Asset,
    transactions,
    customerBanks,
    merchantBanks,
    depositRial,
    withdrawOrSettleShaba,
    sendGoldGift,
    requestPosPayment,
    setActiveReceipt,
    pushToast,
  } = usePlatform();

  const isMerchant = role === 'merchant';
  const banks = isMerchant ? merchantBanks : customerBanks;

  // Action Forms State
  const [actionPanel, setActionPanel] = useState<'deposit' | 'withdraw' | 'gift'>(
    isMerchant ? 'withdraw' : 'deposit'
  );
  const [depositAmount, setDepositAmount] = useState<string>('10000000');
  const [depositViaPos, setDepositViaPos] = useState<boolean>(true);
  const [withdrawAmount, setWithdrawAmount] = useState<string>(
    isMerchant ? '50000000' : '5000000'
  );
  const [selectedShaba, setSelectedShaba] = useState<string>(banks[0]?.shaba || '');

  // P2P Gold Gift State (Customer)
  const [giftPhone, setGiftPhone] = useState<string>('۰۹۱۲۷۷۸۹۰۱۲');
  const [giftName, setGiftName] = useState<string>('مریم رضایی');
  const [giftGrams, setGiftGrams] = useState<string>('0.500');
  const [giftNote, setGiftNote] = useState<string>('تولدت مبارک عزیزم');

  // Ledger Filter & Search
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.roleVisibility !== 'both' && tx.roleVisibility !== role) return false;
      if (filterType === 'gold' && !['buy_gold', 'sell_gold', 'p2p_gift', 'physical_pickup'].includes(tx.type)) {
        return false;
      }
      if (filterType === 'pos' && !['pos_sale', 'pos_trade_in'].includes(tx.type)) {
        return false;
      }
      if (filterType === 'banking' && !['deposit', 'withdraw', 'settlement'].includes(tx.type)) {
        return false;
      }
      if (
        searchTerm.trim() &&
        !tx.title.includes(searchTerm.trim()) &&
        !tx.counterparty.includes(searchTerm.trim()) &&
        !tx.rrn.includes(searchTerm.trim())
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, role, filterType, searchTerm]);

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount) || 0;
    if (amount < 100000) {
      pushToast({ title: 'حداقل مبلغ شارژ ۱۰۰ هزار تومان است', tone: 'warning' });
      return;
    }
    if (depositViaPos) {
      requestPosPayment({
        amountToman: amount,
        title: 'شارژ کیف پول ریالی با کارتخوان پوز',
        customerName: isMerchant ? 'گالری طلای زمرد' : 'سارا رضایی',
        onSuccess: ({ rrn }) => {
          depositRial(amount, 'pos_card', rrn);
        },
      });
    } else {
      depositRial(amount, 'shaparak');
    }
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount) || 0;
    if (amount < 100000) {
      pushToast({ title: 'حداقل مبلغ تسویه ۱۰۰ هزار تومان است', tone: 'warning' });
      return;
    }
    withdrawOrSettleShaba(amount, selectedShaba || banks[0]?.shaba || 'IR42...8819', isMerchant);
  };

  const handleGiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const grams = parseFloat(giftGrams) || 0;
    if (grams < 0.05) {
      pushToast({ title: 'حداقل مقدار هدیه ۵۰ سوت (۰.۰۵ گرم) است', tone: 'warning' });
      return;
    }
    sendGoldGift({
      recipientPhone: giftPhone,
      recipientName: giftName || 'کاربر زرپوز',
      weightGrams: grams,
      note: giftNote,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Wallet Balance & Quick Operation Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Balances Summary */}
        <div className="lg:col-span-5 bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {isMerchant ? 'وضعیت صندوق مالی و تسویه شاپرک گالری' : 'کیف پول طلا و موجودی ریالی'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              نقدشوندگی آنی و تسویه مستقیم از طریق شبکه شبا (پایا / ساتنا)
            </p>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-sm">
            <div className="py-3 flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">موجودی طلا (۱۸ عیار)</span>
              <div className="text-left tabular-nums">
                <div className="font-bold text-amber-700 dark:text-amber-400">
                  {formatGrams(activeWallet.goldGrams)}
                </div>
                <div className="text-xs text-stone-500">
                  معادل {formatToman(Math.round(activeWallet.goldGrams * gold18Asset.buyPrice))}
                </div>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-stone-500 dark:text-stone-400">موجودی ریالی قابل برداشت</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                {formatToman(activeWallet.rialBalance)}
              </span>
            </div>

            {isMerchant && (
              <div className="py-3 flex items-center justify-between">
                <span className="text-stone-500 dark:text-stone-400">در انتظار تسویه پوز شاپرک</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatToman(activeWallet.pendingSettlementToman)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Operation Form */}
        <div className="lg:col-span-7 bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActionPanel('deposit')}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                actionPanel === 'deposit'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              شارژ ریالی
            </button>
            <button
              type="button"
              onClick={() => setActionPanel('withdraw')}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                actionPanel === 'withdraw'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              {isMerchant ? 'تسویه شبا گالری' : 'برداشت به شبا'}
            </button>
            {!isMerchant && (
              <button
                type="button"
                onClick={() => setActionPanel('gift')}
                className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  actionPanel === 'gift'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                هدیه و انتقال طلا
              </button>
            )}
          </div>

          {actionPanel === 'deposit' && (
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs text-stone-500 mb-1.5">مبلغ شارژ (تومان)</label>
                <input
                  type="number"
                  step="500000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold tabular-nums"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[2000000, 10000000, 25000000, 50000000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDepositAmount(String(v))}
                    className="min-h-[36px] px-3 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-semibold tabular-nums cursor-pointer"
                  >
                    {formatToman(v)}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={depositViaPos}
                    onChange={() => setDepositViaPos(true)}
                    className="accent-amber-600"
                  />
                  شارژ مستقیم با کارتخوان پوز اندروید
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!depositViaPos}
                    onChange={() => setDepositViaPos(false)}
                    className="accent-amber-600"
                  />
                  درگاه اینترنتی شاپرک (آنی)
                </label>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-bold cursor-pointer"
              >
                {depositViaPos ? 'ارسال به کارتخوان پوز جهت شارژ' : 'تایید و شارژ فوری کیف پول'}
              </button>
            </form>
          )}

          {actionPanel === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs text-stone-500 mb-1.5">
                    مبلغ {isMerchant ? 'تسویه شبا' : 'برداشت'} (تومان)
                  </label>
                  <input
                    type="number"
                    step="500000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1.5">حساب شبا مقصد</label>
                  <select
                    value={selectedShaba}
                    onChange={(e) => setSelectedShaba(e.target.value)}
                    className="w-full min-h-[46px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-medium"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.shaba}>
                        {b.bankName} — {b.shaba.slice(0, 12)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-bold cursor-pointer"
              >
                {isMerchant ? 'ثبت درخواست تسویه حساب گالری (پایا/ساتنا)' : 'ثبت درخواست برداشت به شبا'}
              </button>
            </form>
          )}

          {actionPanel === 'gift' && !isMerchant && (
            <form onSubmit={handleGiftSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">شماره موبایل گیرنده</label>
                  <input
                    type="tel"
                    value={giftPhone}
                    onChange={(e) => setGiftPhone(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">نام گیرنده</label>
                  <input
                    type="text"
                    value={giftName}
                    onChange={(e) => setGiftName(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">مقدار طلا (گرم)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    value={giftGrams}
                    onChange={(e) => setGiftGrams(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">متن کارت هدیه دیجیتال</label>
                <input
                  type="text"
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                ارسال آنی کارت هدیه طلا (بدون کارمزد)
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Full Searchable & Filterable Transaction Ledger */}
      <section className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
        <div className="p-4 sm:px-5 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              دفترکل تراکنش‌ها و آرشیو فاکتورها
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
              {toPersianDigits(filteredTransactions.length)} تراکنش ثبت‌شده
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
              {(
                [
                  ['all', 'همه'],
                  ['gold', 'طلا'],
                  ['pos', 'کارتخوان پوز'],
                  ['banking', 'بانکی و شبا'],
                ] as [FilterType, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilterType(id)}
                  className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    filterType === id
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:w-52">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجو یا کد پیگیری..."
                className="w-full min-h-[38px] pr-9 pl-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                exportTransactionsToCsv(filteredTransactions);
                pushToast({ title: 'خروجی اکسل (CSV) گزارش دانلود شد', tone: 'success' });
              }}
              className="min-h-[38px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              خروجی CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800 text-[11px] font-medium text-stone-500">
                <th className="py-3 px-4 sm:px-5">شرح عملیات</th>
                <th className="py-3 px-4">کد پیگیری (RRN)</th>
                <th className="py-3 px-4">وزن طلا</th>
                <th className="py-3 px-4">مبلغ (تومان)</th>
                <th className="py-3 px-4">وضعیت</th>
                <th className="py-3 px-4 sm:px-5 text-left">رسید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/70 text-xs sm:text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-500 text-xs">
                    تراکنشی با این جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50 dark:hover:bg-stone-900/40">
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="font-semibold text-stone-900 dark:text-stone-100">{tx.title}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                        {tx.counterparty} · {tx.timestamp}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-code text-xs text-stone-600 dark:text-stone-400">
                      {tx.rrn}
                    </td>
                    <td className="py-3.5 px-4 font-medium tabular-nums whitespace-nowrap">
                      {tx.weightGrams ? formatGrams(tx.weightGrams) : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100 tabular-nums whitespace-nowrap">
                      {formatToman(tx.amountToman, false)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${
                          tx.status === 'completed'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : tx.status === 'pending'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {tx.status === 'completed'
                          ? 'موفق'
                          : tx.status === 'pending'
                          ? 'در انتظار'
                          : 'ناموفق'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-left whitespace-nowrap">
                      {tx.receipt ? (
                        <button
                          type="button"
                          onClick={() => setActiveReceipt(tx.receipt!)}
                          className="min-h-[34px] px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold inline-flex items-center gap-1 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                        >
                          <ReceiptText className="w-3.5 h-3.5" />
                          چاپ
                        </button>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
