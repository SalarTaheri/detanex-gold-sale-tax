import React from 'react';
import { formatGrams, formatRial, formatToman, toPersianDigits } from '../utils/format';
import { CreditCard, Lock, MonitorSmartphone, ShieldCheck, X } from 'lucide-react';

export interface CustomerDisplayLine {
  title: string;
  weightGrams: number;
  karat: number;
  totalToman: number;
}

interface PosCustomerDisplayModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmAndPay: () => void;
  mode: 'sale' | 'trade_in' | 'buyback';
  shopName: string;
  customerName: string;
  gold18RateToman: number;
  priceLockSecondsLeft: number;
  items: CustomerDisplayLine[];
  oldGoldSummary?: {
    weightGrams: number;
    karat: number;
    equiv18kGrams: number;
    valueToman: number;
  } | null;
  vatToman: number;
  finalAmountToman: number;
  paidSoFarToman?: number;
}

export const PosCustomerDisplayModal: React.FC<PosCustomerDisplayModalProps> = ({
  open,
  onClose,
  onConfirmAndPay,
  mode,
  shopName,
  customerName,
  gold18RateToman,
  priceLockSecondsLeft,
  items,
  oldGoldSummary,
  vatToman,
  finalAmountToman,
  paidSoFarToman = 0,
}) => {
  if (!open) return null;

  const remainingToman = Math.max(0, finalAmountToman - paidSoFarToman);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6">
      <div className="w-full max-w-lg bg-[#111318] text-stone-100 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-stone-300">
              نمای مشتری (نمایشگر دوم پوز) · {shopName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl text-stone-400 hover:bg-stone-800 flex items-center justify-center cursor-pointer"
            aria-label="بستن نمای مشتری"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* High-Contrast Customer Summary Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          <div className="text-center space-y-1">
            <div className="text-xs text-stone-400">
              {mode === 'buyback'
                ? 'خلاصه فروش طلای شما به گالری'
                : mode === 'trade_in'
                ? 'خلاصه تعویض طلای شما'
                : 'خلاصه خرید طلای شما'}{' '}
              · {customerName}
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-amber-400 tabular-nums pt-1">
              {formatToman(remainingToman)}
            </div>
            <div className="text-xs text-stone-400 font-mono-code tabular-nums">
              {formatRial(remainingToman * 10)}
            </div>
            <div className="text-xs text-stone-300 pt-1">
              {mode === 'buyback'
                ? 'مبلغ قابل واریز به حساب / کیف پول شما'
                : paidSoFarToman > 0
                ? `مانده قابل پرداخت (پرداخت‌شده: ${formatToman(paidSoFarToman)})`
                : 'مبلغ نهایی قابل پرداخت روی کارتخوان'}
            </div>
          </div>

          {/* Locked Rate Strip */}
          <div className="px-4 py-3 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs tabular-nums">
            <span className="text-stone-400">نرخ مبنای هر گرم طلای ۱۸ عیار</span>
            <div className="flex items-center gap-2">
              <strong className="text-stone-100">{formatToman(gold18RateToman)}</strong>
              {priceLockSecondsLeft > 0 && (
                <span className="text-emerald-400 inline-flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3" />
                  قفل ({toPersianDigits(priceLockSecondsLeft)} ثانیه)
                </span>
              )}
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="space-y-2.5 border-y border-stone-800 py-4 text-sm tabular-nums">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-stone-100 truncate">{item.title}</div>
                  <div className="text-xs text-stone-400">
                    وزن: {formatGrams(item.weightGrams, true)} · عیار {toPersianDigits(item.karat)}
                  </div>
                </div>
                <span className="font-bold text-stone-200 shrink-0">{formatToman(item.totalToman)}</span>
              </div>
            ))}

            {mode !== 'buyback' && vatToman > 0 && (
              <div className="flex justify-between text-xs text-stone-400 pt-2 border-t border-stone-800/70">
                <span>مالیات قانونی بر اجرت و سود (۱۰٪)</span>
                <span>{formatToman(vatToman)}</span>
              </div>
            )}

            {oldGoldSummary && oldGoldSummary.valueToman > 0 && (
              <div className="flex justify-between text-xs text-emerald-400 font-semibold pt-2 border-t border-stone-800/70">
                <span>
                  کسر طلای تعویضی ({formatGrams(oldGoldSummary.weightGrams)} · عیار{' '}
                  {toPersianDigits(oldGoldSummary.karat)})
                </span>
                <span>- {formatToman(oldGoldSummary.valueToman)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>با تایید مشتری، رسید رسمی و کد اصالت بلافاصله چاپ می‌شود</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-stone-800 flex items-center gap-2.5 bg-[#0C0D10]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirmAndPay();
            }}
            className="flex-1 min-h-[52px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            {mode === 'buyback' ? 'تایید مشتری و ثبت خرید طلا' : 'تایید مشتری و پرداخت با کارتخوان'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[52px] px-4 rounded-xl border border-stone-700 text-stone-300 text-sm font-semibold hover:bg-stone-800 cursor-pointer"
          >
            بازگشت
          </button>
        </div>
      </div>
    </div>
  );
};
