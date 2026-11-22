import React from 'react';
import {
  formatGrams,
  formatRial,
  formatToman,
  toPersianDigits,
} from '../utils/format';
import { ComputedGoldLineRial } from '../utils/moadian';
import {
  AlertTriangle,
  Calculator,
  Info,
  RefreshCw,
} from 'lucide-react';

export interface GoldTaxCalculatorProps {
  side: 'buy' | 'sell';
  assetName: string;
  weightGrams: number;
  karat: number;
  liveMarketRateToman: number;
  rawGoldRateToman: number;
  isCustomRate: boolean;
  onRawGoldRateChange: (nextRate: number | null) => void;
  wageMode: 'percent' | 'fixed_toman_per_unit';
  onWageModeChange: (mode: 'percent' | 'fixed_toman_per_unit') => void;
  wageInput: number;
  onWageInputChange: (val: number) => void;
  profitPercent: number;
  onProfitPercentChange: (val: number) => void;
  brokeragePercent: number;
  onBrokeragePercentChange: (val: number) => void;
  vra: number;
  onVraChange: (val: number) => void;
  computed: ComputedGoldLineRial;
}

const GOLD_TAX_PRESETS = [
  {
    id: 'jewelry',
    label: 'زیورآلات ۱۸ عیار',
    wageMode: 'percent' as const,
    wageInput: 8,
    profitPercent: 7,
    brokeragePercent: 0,
    vra: 0,
  },
  {
    id: 'bullion',
    label: 'شمش بانکی',
    wageMode: 'percent' as const,
    wageInput: 2,
    profitPercent: 2,
    brokeragePercent: 0,
    vra: 0,
  },
  {
    id: 'abshodeh',
    label: 'آب‌شده / آنلاین',
    wageMode: 'percent' as const,
    wageInput: 0,
    profitPercent: 0,
    brokeragePercent: 0.5,
    vra: 0,
  },
  {
    id: 'gem_jewelry',
    label: 'جواهر با سنگ قیمتی',
    wageMode: 'percent' as const,
    wageInput: 12,
    profitPercent: 7,
    brokeragePercent: 0,
    vra: 10,
  },
];

export const GoldTaxCalculator: React.FC<GoldTaxCalculatorProps> = ({
  side,
  assetName,
  weightGrams,
  karat,
  liveMarketRateToman,
  rawGoldRateToman,
  isCustomRate,
  onRawGoldRateChange,
  wageMode,
  onWageModeChange,
  wageInput,
  onWageInputChange,
  profitPercent,
  onProfitPercentChange,
  brokeragePercent,
  onBrokeragePercentChange,
  vra,
  onVraChange,
  computed,
}) => {
  const { bodyItem } = computed;
  const wageExceedsPrincipal = bodyItem.prdis > 0 && bodyItem.consfee >= bodyItem.prdis;
  const tcpbsVatRial = Math.trunc((bodyItem.tcpbs * 10) / 100);
  const principalVatRial = Math.trunc((bodyItem.prdis * bodyItem.vra) / 100);

  return (
    <section className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4">
      {/* Header + Presets */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              ماشین‌حساب مالیاتی طلا (ضوابط سامانه مودیان V7.9)
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              محاسبه دقیق ارزش افزوده ۱۰٪ بر مجموع اجرت ساخت، سود فروشنده و حق‌العمل ({side === 'buy' ? 'خرید' : 'فروش'} {assetName})
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono-code text-stone-500 dark:text-stone-400 shrink-0">
          الگوی ۳ · inp=3
        </span>
      </div>

      {/* Quick Presets (Buy) or Sell-Side Tax Rule Note */}
      {side === 'buy' ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {GOLD_TAX_PRESETS.map((preset) => {
            const isActive =
              wageMode === preset.wageMode &&
              wageInput === preset.wageInput &&
              profitPercent === preset.profitPercent &&
              brokeragePercent === preset.brokeragePercent &&
              vra === preset.vra;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onWageModeChange(preset.wageMode);
                  onWageInputChange(preset.wageInput);
                  onProfitPercentChange(preset.profitPercent);
                  onBrokeragePercentChange(preset.brokeragePercent);
                  onVraChange(preset.vra);
                }}
                className={`min-h-[36px] px-3 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-stone-900 dark:border-amber-500 bg-stone-900 dark:bg-amber-600 text-white'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70 text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-600'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
          در فروش (بازخرید) طلا از مشتری، اجرت ساخت و سود فروشنده صفر است و مالیات بر ارزش افزوده ۱۰٪ صرفاً بر مبلغ حق‌العمل / کارمزد (bros) محاسبه می‌شود.
        </div>
      )}

      {/* Interactive Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Raw Gold Rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
              نرخ طلای خام (تومان / واحد)
            </label>
            {isCustomRate && (
              <button
                type="button"
                onClick={() => onRawGoldRateChange(null)}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                مظنه زنده
              </button>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="10000"
            value={rawGoldRateToman}
            onChange={(e) => {
              const val = Math.max(0, Number(e.target.value) || 0);
              onRawGoldRateChange(val === liveMarketRateToman ? null : val);
            }}
            dir="ltr"
            className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-600"
          />
          <div className="text-[11px] text-stone-500 mt-1 tabular-nums">
            {isCustomRate
              ? `نرخ دستی (مظنه بازار: ${formatToman(liveMarketRateToman)})`
              : `همگام با مظنه زنده · عیار ${toPersianDigits(karat)}`}
          </div>
        </div>

        {/* Wage (اجرت ساخت - consfee) */}
        <div className={side === 'sell' ? 'opacity-60' : ''}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
              اجرت ساخت (consfee)
            </label>
            {side === 'buy' && (
              <button
                type="button"
                onClick={() => {
                  if (wageMode === 'percent') {
                    onWageModeChange('fixed_toman_per_unit');
                    onWageInputChange(350000);
                  } else {
                    onWageModeChange('percent');
                    onWageInputChange(8);
                  }
                }}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                {wageMode === 'percent' ? 'تغییر به تومان/گرم' : 'تغییر به درصدی'}
              </button>
            )}
          </div>
          <input
            type="number"
            min="0"
            step={wageMode === 'percent' ? '0.5' : '50000'}
            value={wageInput}
            disabled={side === 'sell'}
            onChange={(e) => onWageInputChange(Math.max(0, parseFloat(e.target.value) || 0))}
            dir="ltr"
            className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 disabled:bg-stone-100 dark:disabled:bg-stone-900/50 text-sm font-bold tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-600 disabled:cursor-not-allowed"
          />
          <div className="text-[11px] text-stone-500 mt-1 tabular-nums">
            {side === 'sell' ? (
              'در فروش طلا اجرت ساخت صفر است'
            ) : (
              <>
                مبلغ اجرت: <strong className="text-stone-800 dark:text-stone-200">{formatToman(computed.consfeeToman)}</strong>
              </>
            )}
          </div>
        </div>

        {/* Seller Profit (سود فروشنده - spro) */}
        <div className={side === 'sell' ? 'opacity-60' : ''}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
              سود فروشنده (٪ — spro)
            </label>
            {side === 'buy' && (
              <div className="flex items-center gap-1.5 text-[11px]">
                {[0, 3, 7].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onProfitPercentChange(p)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer font-semibold tabular-nums ${
                      profitPercent === p
                        ? 'bg-stone-900 dark:bg-amber-600 text-white'
                        : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    {toPersianDigits(p)}٪
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="number"
            min="0"
            max="25"
            step="0.5"
            value={profitPercent}
            disabled={side === 'sell'}
            onChange={(e) => onProfitPercentChange(Math.max(0, parseFloat(e.target.value) || 0))}
            dir="ltr"
            className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 disabled:bg-stone-100 dark:disabled:bg-stone-900/50 text-sm font-bold tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-600 disabled:cursor-not-allowed"
          />
          <div className="text-[11px] text-stone-500 mt-1 tabular-nums">
            {side === 'sell' ? (
              'در فروش طلا سود فروشنده صفر است'
            ) : (
              <>
                مبلغ سود: <strong className="text-stone-800 dark:text-stone-200">{formatToman(computed.sproToman)}</strong>
              </>
            )}
          </div>
        </div>

        {/* Brokerage (حق‌العمل - bros) & Base VAT rate (vra) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
              حق‌العمل (٪ — bros)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={brokeragePercent}
              onChange={(e) => onBrokeragePercentChange(Math.max(0, parseFloat(e.target.value) || 0))}
              dir="ltr"
              className="w-full min-h-[44px] px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-600"
            />
            <div className="text-[11px] text-stone-500 mt-1 tabular-nums truncate">
              {formatToman(computed.brosToman)}
            </div>
          </div>

          <div className={side === 'sell' ? 'opacity-60' : ''}>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
              نرخ اصل کالا (vra)
            </label>
            <select
              value={vra}
              disabled={side === 'sell'}
              onChange={(e) => onVraChange(Number(e.target.value) || 0)}
              className="w-full min-h-[44px] px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 disabled:bg-stone-100 dark:disabled:bg-stone-900/50 text-xs font-semibold text-stone-900 dark:text-stone-100 disabled:cursor-not-allowed"
            >
              <option value={0}>۰٪ (اصل طلا معاف)</option>
              <option value={10}>۱۰٪ (سنگ/جواهر)</option>
            </select>
            <div className="text-[11px] text-stone-500 mt-1 truncate">
              {vra === 0 ? 'معافیت اصل طلا' : 'مشمول کامل'}
            </div>
          </div>
        </div>
      </div>

      {/* Moadian Rule Warning if consfee >= prdis */}
      {wageExceedsPrincipal && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            مطابق جدول ۴۶ ردیف ۱ دستورالعمل سامانه مودیان، مبلغ اجرت ساخت (consfee) باید کمتر از بهای طلای خام (prdis) باشد.
          </span>
        </div>
      )}

      {/* Live Moadian VAT Breakdown Strip */}
      <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-2 text-xs tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-stone-500 dark:text-stone-400">
            جمع مشمول مالیات (اجرت + سود + حق‌العمل / tcpbs)
          </span>
          <span className="font-semibold text-stone-900 dark:text-stone-100">
            {formatToman(computed.tcpbsToman)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
          <div>
            <span className="font-bold text-amber-800 dark:text-amber-400">
              مالیات بر ارزش افزوده دقیق (VAT — ۱۰٪)
            </span>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              {vra > 0
                ? `۱۰٪ روی tcpbs (${formatRial(tcpbsVatRial)}) + ${toPersianDigits(vra)}٪ روی اصل (${formatRial(principalVatRial)})`
                : `فقط ۱۰٪ روی اجرت، سود و حق‌العمل (بهای ${formatGrams(weightGrams)} طلای خام معاف است)`}
            </div>
          </div>
          <div className="text-left shrink-0">
            <div className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {formatToman(computed.vamToman)}
            </div>
            <div className="text-[11px] text-stone-500 font-mono-code">
              {formatRial(bodyItem.vam)}
            </div>
          </div>
        </div>

        <div className="pt-1.5 flex items-start gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-stone-400" />
          <span>
            فرمول رسمی جدول ۴۴ (V7.9):{' '}
            <code className="font-mono-code text-stone-700 dark:text-stone-300" dir="ltr">
              vam = trunc(tcpbs × 10%) + trunc(prdis × vra%)
            </code>
          </span>
        </div>
      </div>
    </section>
  );
};
