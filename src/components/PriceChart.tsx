import React, { useMemo, useState } from 'react';
import { MarketAsset } from '../types/gold';
import { formatPercent, formatToman, toPersianDigits } from '../utils/format';
import { TrendingDown, TrendingUp } from 'lucide-react';

type Timeframe = '1H' | '1D' | '1W' | '1M';

interface PriceChartProps {
  asset: MarketAsset;
  compact?: boolean;
}

export const PriceChart: React.FC<PriceChartProps> = ({ asset, compact = false }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const series = useMemo(() => {
    switch (timeframe) {
      case '1H':
        return asset.history1H;
      case '1W':
        return asset.history1W;
      case '1M':
        return asset.history1M;
      default:
        return asset.history1D;
    }
  }, [asset, timeframe]);

  const width = 560;
  const height = compact ? 150 : 210;
  const padX = 12;
  const padY = 18;

  const { minPrice, maxPrice, points, linePath, areaPath } = useMemo(() => {
    const prices = series.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = Math.max(1, max - min);

    const pts = series.map((item, idx) => {
      const x =
        series.length === 1
          ? width / 2
          : padX + (idx / (series.length - 1)) * (width - padX * 2);
      const y = height - padY - ((item.price - min) / span) * (height - padY * 2);
      return { x, y, ...item };
    });

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area =
      pts.length > 0
        ? `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`
        : '';

    return { minPrice: min, maxPrice: max, points: pts, linePath: line, areaPath: area };
  }, [series, height]);

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];
  const isUp = asset.change24hPercent >= 0;

  return (
    <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span>{asset.name}</span>
            <span aria-hidden="true">·</span>
            <span>عیار {toPersianDigits(asset.karat)}</span>
            <span aria-hidden="true">·</span>
            <span>واحد: {asset.unit}</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
              {formatToman(activePoint ? activePoint.price : asset.sellPrice)}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
                isUp ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {formatPercent(asset.change24hPercent, true)}
            </span>
          </div>
          {hoverIndex !== null && activePoint && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 tabular-nums">
              زمان ثبت: {toPersianDigits(activePoint.time)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
          {(
            [
              ['1H', '۱ ساعته'],
              ['1D', 'روزانه'],
              ['1W', 'هفتگی'],
              ['1M', 'ماهانه'],
            ] as [Timeframe, string][]
          ).map(([tf, label]) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setTimeframe(tf);
                setHoverIndex(null);
              }}
              className={`px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                timeframe === tf
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none touch-pan-y"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`goldGrad-${asset.code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? '#C59322' : '#BE123C'} stopOpacity="0.24" />
              <stop offset="100%" stopColor={isUp ? '#C59322' : '#BE123C'} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={height * ratio}
              y2={height * ratio}
              stroke="currentColor"
              className="text-stone-200 dark:text-stone-800"
              strokeDasharray="3 4"
              strokeWidth="1"
            />
          ))}

          <path d={areaPath} fill={`url(#goldGrad-${asset.code})`} />
          <path
            d={linePath}
            fill="none"
            stroke={isUp ? '#B8860B' : '#BE123C'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={padY}
                y2={height - padY}
                stroke="#B8860B"
                strokeOpacity="0.35"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                fill={isUp ? '#B8860B' : '#BE123C'}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </>
          )}

          {points.map((pt, idx) => (
            <rect
              key={idx}
              x={Math.max(0, pt.x - width / (points.length * 2))}
              y={0}
              width={width / points.length}
              height={height}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIndex(idx)}
              onClick={() => setHoverIndex(idx)}
            />
          ))}
        </svg>
      </div>

      <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-stone-500 dark:text-stone-400 block">کمترین بازه</span>
          <span className="font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
            {formatToman(minPrice, false)}
          </span>
        </div>
        <div>
          <span className="text-stone-500 dark:text-stone-400 block">بیشترین بازه</span>
          <span className="font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
            {formatToman(maxPrice, false)}
          </span>
        </div>
        <div>
          <span className="text-stone-500 dark:text-stone-400 block">اختلاف خرید و فروش</span>
          <span className="font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
            {formatToman(asset.sellPrice - asset.buyPrice, false)}
          </span>
        </div>
      </div>
    </div>
  );
};
