import React, { useEffect, useRef, useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { toPersianDigits } from '../utils/format';
import {
  ArrowDownLeft,
  Bluetooth,
  Lock,
  RotateCcw,
  Scale,
  Unlock,
} from 'lucide-react';

interface PosDigitalScaleWidgetProps {
  onApplyToSale: (grams: number) => void;
  onApplyToTradeInOrBuyback?: (grams: number) => void;
  primaryTargetLabel?: string;
  secondaryTargetLabel?: string;
}

const DEMO_GOLD_PIECES = [
  { label: 'انگشتر ۳.۴۲۰ گرم', grams: 3.42 },
  { label: 'النگو ۷.۸۵۰ گرم', grams: 7.85 },
  { label: 'سکه ۸.۱۳۳ گرم', grams: 8.133 },
  { label: 'شکسته ۲.۱۶۵ گرم', grams: 2.165 },
  { label: 'شمش ۱۰.۰۰۰ گرم', grams: 10.0 },
];

export const PosDigitalScaleWidget: React.FC<PosDigitalScaleWidgetProps> = ({
  onApplyToSale,
  onApplyToTradeInOrBuyback,
  primaryTargetLabel = 'انتقال به وزن فروش',
  secondaryTargetLabel = 'ثبت در طلای تعویضی',
}) => {
  const { posHardware, logBridgeCall, pushToast } = usePlatform();
  const [liveGrams, setLiveGrams] = useState<number>(4.325);
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const simulateWeighing = (targetGrams: number, label: string) => {
    setIsLocked(false);
    setIsSettling(true);
    const jitter = Number((targetGrams + (Math.random() * 0.08 - 0.04)).toFixed(3));
    setLiveGrams(Math.max(0, jitter));

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setLiveGrams(targetGrams);
      setIsSettling(false);
      setIsLocked(true);
      logBridgeCall(
        'AndroidPOS.readBluetoothScale',
        JSON.stringify({ piece: label, grams: targetGrams, stable: true }),
        `WEIGHT_LOCKED (${targetGrams.toFixed(3)}g)`
      );
    }, 380);
  };

  const handleTare = () => {
    setLiveGrams(0);
    setIsLocked(false);
    setIsSettling(false);
    logBridgeCall('AndroidPOS.tareScale', '{}', 'ZEROED (0.000g)');
  };

  const handleApplyPrimary = () => {
    if (liveGrams <= 0) {
      pushToast({ title: 'ابتدا قطعه طلا را روی ترازو قرار دهید', tone: 'warning' });
      return;
    }
    onApplyToSale(liveGrams);
    pushToast({
      title: `وزن ${toPersianDigits(liveGrams.toFixed(3))} گرم از ترازو منتقل شد`,
      tone: 'success',
    });
  };

  const handleApplySecondary = () => {
    if (!onApplyToTradeInOrBuyback) return;
    if (liveGrams <= 0) {
      pushToast({ title: 'ابتدا قطعه طلا را روی ترازو قرار دهید', tone: 'warning' });
      return;
    }
    onApplyToTradeInOrBuyback(liveGrams);
    pushToast({
      title: `وزن ${toPersianDigits(liveGrams.toFixed(3))} گرم برای طلای دست‌دوم ثبت شد`,
      tone: 'success',
    });
  };

  const soot = Math.round(liveGrams * 1000);
  const mesghal = (liveGrams / 4.6083).toFixed(3);

  return (
    <div className="bg-stone-950 text-stone-100 rounded-2xl p-4 sm:p-5 border border-stone-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-stone-100">
            ترازوی زرگری متصل به پوز (دقت ۰.۰۰۱ گرم)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-400">
          <Bluetooth className="w-3.5 h-3.5 text-emerald-400" />
          <span>{posHardware.scaleConnected ? 'متصل · بلوتوث' : 'قطع'}</span>
          <span>·</span>
          <span className={isSettling ? 'text-amber-400' : isLocked ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
            {isSettling ? 'در حال پایدار شدن...' : isLocked ? 'وزن قفل‌شده' : 'آماده وزن‌کشی'}
          </span>
        </div>
      </div>

      {/* Digital LCD Readout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 rounded-xl bg-black/50 border border-stone-800">
        <div>
          <div className="flex items-baseline gap-2" dir="ltr">
            <span className="text-3xl sm:text-4xl font-bold font-mono-code tracking-tight text-amber-400 tabular-nums">
              {liveGrams.toFixed(3)}
            </span>
            <span className="text-xs font-semibold text-stone-400">g</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1 tabular-nums">
            معادل {toPersianDigits(soot.toLocaleString('en-US'))} سوت · {toPersianDigits(mesghal)} مثقال
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTare}
            className="min-h-[40px] px-3 rounded-xl border border-stone-700 text-xs font-semibold text-stone-200 hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            صفر (Tare)
          </button>
          <button
            type="button"
            onClick={() => setIsLocked((v) => !v)}
            className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              isLocked
                ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
                : 'border-stone-700 text-stone-200 hover:bg-stone-800'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {isLocked ? 'قفل' : 'آزاد'}
          </button>
        </div>
      </div>

      {/* Quick Demo Pieces + Manual Adjustment */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-stone-400 ml-1">شبیه‌سازی قرار دادن طلا روی کفه:</span>
          {DEMO_GOLD_PIECES.map((piece) => (
            <button
              key={piece.label}
              type="button"
              onClick={() => simulateWeighing(piece.grams, piece.label)}
              className="min-h-[34px] px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] font-medium text-stone-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              {piece.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <span className="text-[11px] text-stone-400 whitespace-nowrap">ورود دقیق:</span>
            <input
              type="number"
              step="0.005"
              min="0"
              value={liveGrams}
              onChange={(e) => {
                setLiveGrams(Math.max(0, parseFloat(e.target.value) || 0));
                setIsLocked(true);
              }}
              dir="ltr"
              className="w-full max-w-[120px] min-h-[38px] px-2.5 rounded-lg bg-stone-900 border border-stone-700 text-xs font-mono-code font-bold text-amber-300 tabular-nums"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleApplyPrimary}
              className="min-h-[40px] px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              {primaryTargetLabel}
            </button>
            {onApplyToTradeInOrBuyback && (
              <button
                type="button"
                onClick={handleApplySecondary}
                className="min-h-[40px] px-3.5 rounded-xl border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                {secondaryTargetLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
