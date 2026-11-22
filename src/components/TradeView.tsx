import React, { useEffect, useMemo, useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { AssetCode, PaymentMethod } from '../types/gold';
import {
  formatGrams,
  formatRial,
  formatToman,
  getNowPersianTime,
  toPersianDigits,
} from '../utils/format';
import { buildMoadianV79Payload, computeGoldLineV79 } from '../utils/moadian';
import { GoldTaxCalculator } from './GoldTaxCalculator';
import {
  ArrowLeftRight,
  Bell,
  Calculator,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  FileText,
  Lock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Trash2,
  Unlock,
} from 'lucide-react';

type TradeTab = 'instant' | 'limit' | 'physical';

export const TradeView: React.FC = () => {
  const {
    role,
    marketAssets,
    selectedAssetCode,
    setSelectedAssetCode,
    activeWallet,
    shops,
    executeInstantTrade,
    requestPosPayment,
    placeLimitOrder,
    cancelLimitOrder,
    limitOrders,
    priceAlerts,
    addPriceAlert,
    togglePriceAlert,
    deletePriceAlert,
    createPhysicalPickup,
    pickupOrders,
    updatePickupStatus,
    redeemPickupByCode,
    setActiveMoadianRecord,
    pushToast,
  } = usePlatform();

  const [tab, setTab] = useState<TradeTab>('instant');

  // Instant Trade State
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [inputMode, setInputMode] = useState<'toman' | 'gram'>('gram');
  const [tomanInput, setTomanInput] = useState<string>('5000000');
  const [gramInput, setGramInput] = useState<string>('2.000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('rial_wallet');
  const [fulfillment, setFulfillment] = useState<'wallet' | 'pickup'>('wallet');
  const [selectedShopId, setSelectedShopId] = useState<string>(shops[0].id);

  // Gold Tax Calculator State (Collapsible, Moadian V7.9 Pattern 3)
  const [showTaxCalc, setShowTaxCalc] = useState<boolean>(false);
  const [lockedRateToman, setLockedRateToman] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState<number>(0);
  const [customRawGoldRate, setCustomRawGoldRate] = useState<number | null>(null);
  const [wageMode, setWageMode] = useState<'percent' | 'fixed_toman_per_unit'>('percent');
  const [wageInput, setWageInput] = useState<number>(8);
  const [profitPercent, setProfitPercent] = useState<number>(7);
  const [brokeragePercent, setBrokeragePercent] = useState<number>(0);
  const [vra, setVra] = useState<number>(0);

  // Limit Order & Alert State
  const [limitSide, setLimitSide] = useState<'buy' | 'sell'>('buy');
  const [limitTargetPrice, setLimitTargetPrice] = useState<string>('4800000');
  const [limitGrams, setLimitGrams] = useState<string>('2.000');
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('below');
  const [alertPrice, setAlertPrice] = useState<string>('4780000');

  // Physical Delivery Request State (Customer)
  const [pickupShopId, setPickupShopId] = useState<string>(shops[0].id);
  const [pickupWeight, setPickupWeight] = useState<string>('2.500');
  const [pickupFormType, setPickupFormType] = useState<string>('قطعه آب‌شده ۱۸ عیار (کد ری‌گیری)');
  const [pickupMethod, setPickupMethod] = useState<'in_person_pos' | 'insured_courier'>('in_person_pos');

  useEffect(() => {
    if (lockSecondsLeft <= 0) {
      setLockedRateToman(null);
      return;
    }
    const id = window.setInterval(() => {
      setLockSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [lockSecondsLeft]);

  const asset = useMemo(
    () => marketAssets.find((a) => a.code === selectedAssetCode) || marketAssets[0],
    [marketAssets, selectedAssetCode]
  );

  const liveUnitPrice = side === 'buy' ? asset.sellPrice : asset.buyPrice;
  const activeUnitPrice =
    customRawGoldRate !== null
      ? customRawGoldRate
      : lockedRateToman !== null
      ? lockedRateToman
      : liveUnitPrice;
  const pricePerGramApprox =
    asset.code === 'abshodeh' ? Math.round(activeUnitPrice / 4.3318) : activeUnitPrice;

  const handleTogglePriceLock = () => {
    if (lockSecondsLeft > 0) {
      setLockSecondsLeft(0);
      setLockedRateToman(null);
      pushToast({ title: 'قفل مظنه آزاد شد', tone: 'info' });
    } else {
      setLockedRateToman(liveUnitPrice);
      setLockSecondsLeft(90);
      pushToast({
        title: 'مظنه طلا به مدت ۹۰ ثانیه قفل شد',
        description: `نرخ ثابت‌شده: ${formatToman(liveUnitPrice)}`,
        tone: 'success',
      });
    }
  };

  const computedGrams = useMemo(() => {
    if (inputMode === 'gram') return Math.max(0, parseFloat(gramInput) || 0);
    const toman = Math.max(0, parseFloat(tomanInput) || 0);
    return Number((toman / Math.max(1, pricePerGramApprox)).toFixed(3));
  }, [inputMode, gramInput, tomanInput, pricePerGramApprox]);

  const computedGrossToman = useMemo(() => {
    if (inputMode === 'toman') return Math.max(0, Math.round(parseFloat(tomanInput) || 0));
    return Math.round(computedGrams * pricePerGramApprox);
  }, [inputMode, tomanInput, computedGrams, pricePerGramApprox]);

  const tradeUnits = useMemo(
    () => (asset.code === 'abshodeh' ? computedGrams / 4.3318 : computedGrams),
    [asset.code, computedGrams]
  );

  const tradeSstid =
    asset.code === 'bullion24'
      ? '2720000114587'
      : asset.code === 'emami' || asset.code === 'nim' || asset.code === 'rob'
      ? '2720000114594'
      : wageInput > 0 || profitPercent > 0
      ? '2720000114563'
      : '2720000114570';

  const taxCalc = useMemo(
    () =>
      computeGoldLineV79({
        id: 'trade-calc-line',
        sstid: tradeSstid,
        sstt: `${side === 'buy' ? 'خرید' : 'فروش'} ${asset.name}`,
        am: Number(tradeUnits.toFixed(6)),
        mu: asset.unit === 'مثقال' ? '168' : asset.unit === 'قطعه' ? '1627' : '164',
        cui: asset.karat,
        feeToman: activeUnitPrice,
        wageMode,
        wageInput: side === 'buy' ? wageInput : 0,
        profitPercent: side === 'buy' ? profitPercent : 0,
        brokerageMode: 'percent',
        brokerageInput: brokeragePercent,
        discountToman: 0,
        vra: side === 'buy' ? vra : 0,
      }),
    [
      activeUnitPrice,
      asset.karat,
      asset.name,
      asset.unit,
      brokeragePercent,
      profitPercent,
      side,
      tradeSstid,
      tradeUnits,
      vra,
      wageInput,
      wageMode,
    ]
  );

  const finalToman =
    side === 'buy'
      ? taxCalc.tsstamToman
      : Math.max(0, taxCalc.prdisToman - taxCalc.brosToman - taxCalc.vamToman);

  const selectedShop = useMemo(
    () => shops.find((s) => s.id === selectedShopId) || shops[0],
    [selectedShopId, shops]
  );

  const handleOpenTradeMoadianPreview = () => {
    const built = buildMoadianV79Payload({
      shop: selectedShop,
      inty: 2,
      ins: 1,
      lines: [
        {
          id: 'preview-trade-1',
          sstid: tradeSstid,
          sstt: `${side === 'buy' ? 'فروش آنلاین' : 'بازخرید آنلاین'} ${asset.name}`,
          am: Number(tradeUnits.toFixed(6)),
          mu: asset.unit === 'مثقال' ? '168' : asset.unit === 'قطعه' ? '1627' : '164',
          cui: asset.karat,
          feeToman: activeUnitPrice,
          wageMode,
          wageInput: side === 'buy' ? wageInput : 0,
          profitPercent: side === 'buy' ? profitPercent : 0,
          brokerageMode: 'percent',
          brokerageInput: brokeragePercent,
          discountToman: 0,
          vra: side === 'buy' ? vra : 0,
        },
      ],
      setm: 1,
      nti1: 'پیش‌نمایش ماشین‌حساب مالیاتی زرپوز',
      payments: [
        {
          pmt: paymentMethod === 'pos_card' ? 4 : paymentMethod === 'rial_wallet' ? 7 : 5,
          pvRial: Math.trunc(finalToman * 10),
          pid: '0084129031',
        },
      ],
    });

    setActiveMoadianRecord({
      id: `preview-trade-${Date.now()}`,
      taxid: built.payload.header.taxid,
      inno: built.payload.header.inno,
      irtaxid: null,
      inty: 2,
      ins: 1,
      buyerName: role === 'customer' ? 'سارا رضایی' : 'گالری طلای زمرد (همکار)',
      buyerNationalOrEcoId: '0084129031',
      totalRial: built.summary.tbillRial,
      totalToman: finalToman,
      totalVatRial: built.summary.tvamRial,
      totalGoldGrams: computedGrams,
      createdAtPersian: getNowPersianTime(),
      status: 'draft_local',
      payload: built.payload,
    });
  };

  const handleSubmitInstantTrade = () => {
    if (computedGrams <= 0 || computedGrossToman < 100000) {
      pushToast({
        title: 'حداقل مبلغ معامله ۱۰۰ هزار تومان است',
        tone: 'warning',
      });
      return;
    }

    if (side === 'buy' && taxCalc.bodyItem.prdis > 0 && taxCalc.bodyItem.consfee >= taxCalc.bodyItem.prdis) {
      pushToast({
        title: 'اجرت ساخت نامعتبر (قانون مودیان)',
        description: 'مبلغ اجرت ساخت باید کمتر از بهای طلای خام باشد.',
        tone: 'error',
      });
      return;
    }

    if (side === 'buy' && paymentMethod === 'pos_card') {
      requestPosPayment({
        amountToman: finalToman,
        title: `خرید آنی ${formatGrams(computedGrams)} ${asset.shortName}`,
        customerName: role === 'customer' ? 'سارا رضایی' : 'گالری طلای زمرد',
        onSuccess: ({ rrn, cardMask, rawCard16 }) => {
          executeInstantTrade({
            side,
            assetCode: asset.code,
            weightGrams: computedGrams,
            paymentMethod: 'pos_card',
            shopId: selectedShopId,
            requestPhysicalPickup: fulfillment === 'pickup',
            rrnOverride: rrn,
            cardMask,
            rawCard16,
            customUnitPriceToman: activeUnitPrice,
            wageMode,
            wageInput,
            profitPercent,
            brokeragePercent,
            vra,
          });
        },
      });
      return;
    }

    executeInstantTrade({
      side,
      assetCode: asset.code,
      weightGrams: computedGrams,
      paymentMethod,
      shopId: selectedShopId,
      requestPhysicalPickup: side === 'buy' && fulfillment === 'pickup',
      customUnitPriceToman: activeUnitPrice,
      wageMode,
      wageInput,
      profitPercent,
      brokeragePercent,
      vra,
    });
  };

  const handleCreatePickup = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(pickupWeight) || 0;
    if (w < 0.5) {
      pushToast({ title: 'حداقل وزن تحویل فیزیکی ۰.۵ گرم است', tone: 'warning' });
      return;
    }
    const gold18 = marketAssets.find((a) => a.code === 'gold18') || marketAssets[0];
    createPhysicalPickup({
      shopId: pickupShopId,
      itemTitle: `${pickupFormType} (${formatGrams(w)})`,
      weightGrams: w,
      karat: pickupFormType.includes('۲۴') ? 995 : 750,
      totalToman: Math.round(w * gold18.sellPrice),
      deliveryMethod: pickupMethod,
      deductFromGoldWallet: true,
    });
  };

  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-stone-200/70 dark:bg-stone-900 rounded-xl w-fit max-w-full overflow-x-auto">
        {(
          [
            ['instant', 'خرید و فروش آنی', ArrowLeftRight],
            ['limit', 'سفارش محدود و هشدار قیمت', Clock],
            [
              'physical',
              role === 'merchant' ? 'صف سفارشات آنلاین مشتریان' : 'درخواست تحویل فیزیکی',
              PackageCheck,
            ],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-[42px] px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === id
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: INSTANT BUY / SELL */}
      {tab === 'instant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-5">
            {/* Buy / Sell Segmented Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={`min-h-[44px] rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  side === 'buy'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                خرید طلا
              </button>
              <button
                type="button"
                onClick={() => {
                  setSide('sell');
                  setCustomRawGoldRate(null);
                  if (brokeragePercent === 0) setBrokeragePercent(0.5);
                }}
                className={`min-h-[44px] rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  side === 'sell'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                فروش طلا (نقد کردن)
              </button>
            </div>

            {/* Asset Selector + 90s Live Price Lock */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
                  انتخاب نوع طلا / سکه
                </label>
                <button
                  type="button"
                  onClick={handleTogglePriceLock}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    lockSecondsLeft > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {lockSecondsLeft > 0 ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  {lockSecondsLeft > 0
                    ? `مظنه قفل شد (${toPersianDigits(lockSecondsLeft)} ثانیه)`
                    : 'قفل مظنه (۹۰ ثانیه)'}
                </button>
              </div>
              <select
                value={selectedAssetCode}
                onChange={(e) => {
                  const nextCode = e.target.value as AssetCode;
                  setSelectedAssetCode(nextCode);
                  setCustomRawGoldRate(null);
                  setLockSecondsLeft(0);
                  setLockedRateToman(null);
                  if (nextCode === 'abshodeh' || nextCode === 'emami' || nextCode === 'nim' || nextCode === 'rob') {
                    setWageInput(0);
                    setProfitPercent(0);
                    setBrokeragePercent(0.5);
                  } else if (nextCode === 'bullion24') {
                    setWageInput(2);
                    setProfitPercent(2);
                    setBrokeragePercent(0);
                  } else {
                    setWageInput(8);
                    setProfitPercent(7);
                    setBrokeragePercent(0);
                  }
                }}
                className="w-full min-h-[46px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-semibold text-stone-900 dark:text-stone-100"
              >
                {marketAssets.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} — {side === 'buy' ? 'فروش' : 'خرید'}: {formatToman(side === 'buy' ? m.sellPrice : m.buyPrice)}
                  </option>
                ))}
              </select>
            </div>

            {/* Bidirectional Toman / Gram Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  مبلغ به تومان (از ۱۰۰ هزار تومان)
                </label>
                <input
                  type="number"
                  step="100000"
                  min="0"
                  value={inputMode === 'toman' ? tomanInput : String(computedGrossToman)}
                  onChange={(e) => {
                    setInputMode('toman');
                    setTomanInput(e.target.value);
                  }}
                  dir="ltr"
                  className="w-full min-h-[48px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold tabular-nums focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  وزن معادل (گرم / سوت)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={inputMode === 'gram' ? gramInput : computedGrams.toFixed(3)}
                  onChange={(e) => {
                    setInputMode('gram');
                    setGramInput(e.target.value);
                  }}
                  dir="ltr"
                  className="w-full min-h-[48px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold tabular-nums focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {/* Quick Preset Amount Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: '۱ میلیون', toman: 1000000 },
                { label: '۵ میلیون', toman: 5000000 },
                { label: '۱۰ میلیون', toman: 10000000 },
                { label: '۱ گرم', gram: 1 },
                { label: '۵ گرم', gram: 5 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    if (preset.toman) {
                      setInputMode('toman');
                      setTomanInput(String(preset.toman));
                    } else if (preset.gram) {
                      setInputMode('gram');
                      setGramInput(String(preset.gram));
                    }
                  }}
                  className="min-h-[38px] px-3 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Collapsible Wage, Profit & VAT Calculator Strip */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
              <button
                type="button"
                onClick={() => setShowTaxCalc((v) => !v)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-stone-300 dark:hover:border-stone-700 cursor-pointer"
              >
                <span className="flex items-center gap-2 truncate">
                  <Calculator className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="truncate">
                    تنظیم اجرت، سود و ماشین‌حساب مالیاتی (VAT: {formatToman(taxCalc.vamToman)})
                  </span>
                </span>
                {showTaxCalc ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              </button>

              {showTaxCalc && (
                <GoldTaxCalculator
                  side={side}
                  assetName={asset.shortName}
                  weightGrams={computedGrams}
                  karat={asset.karat}
                  liveMarketRateToman={liveUnitPrice}
                  rawGoldRateToman={activeUnitPrice}
                  isCustomRate={customRawGoldRate !== null}
                  onRawGoldRateChange={setCustomRawGoldRate}
                  wageMode={wageMode}
                  onWageModeChange={setWageMode}
                  wageInput={side === 'buy' ? wageInput : 0}
                  onWageInputChange={setWageInput}
                  profitPercent={side === 'buy' ? profitPercent : 0}
                  onProfitPercentChange={setProfitPercent}
                  brokeragePercent={brokeragePercent}
                  onBrokeragePercentChange={setBrokeragePercent}
                  vra={side === 'buy' ? vra : 0}
                  onVraChange={setVra}
                  computed={taxCalc}
                />
              )}
            </div>

            {/* Fulfillment & Payment Method (For Buy) */}
            {side === 'buy' && (
              <div className="space-y-4 pt-3 border-t border-stone-100 dark:border-stone-800">
                <div>
                  <div className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">
                    نحوه نگهداری / دریافت طلا
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setFulfillment('wallet')}
                      className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-right transition-colors cursor-pointer ${
                        fulfillment === 'wallet'
                          ? 'border-stone-900 dark:border-amber-500 bg-stone-900/5 dark:bg-amber-950/30'
                          : 'border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        ذخیره در کیف طلای امن
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        نقدشوندگی ۲۴ ساعته · بدون کارمزد نگهداری
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillment('pickup')}
                      className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-right transition-colors cursor-pointer ${
                        fulfillment === 'pickup'
                          ? 'border-stone-900 dark:border-amber-500 bg-stone-900/5 dark:bg-amber-950/30'
                          : 'border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        صدور کد تحویل فیزیکی در طلافروشی
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        دریافت حضوری از گالری با اسکن روی پوز
                      </div>
                    </button>
                  </div>
                </div>

                {fulfillment === 'pickup' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                      انتخاب طلافروشی جهت تحویل حضوری
                    </label>
                    <select
                      value={selectedShopId}
                      onChange={(e) => setSelectedShopId(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                    >
                      {shops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.city} — {s.district})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">
                    روش پرداخت
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        ['rial_wallet', 'کیف پول ریالی'],
                        ['pos_card', 'کارتخوان پوز (حضوری)'],
                        ['shaparak', 'درگاه آنلاین شاپرک'],
                      ] as [PaymentMethod, string][]
                    ).map(([pm, label]) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setPaymentMethod(pm)}
                        className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          paymentMethod === pm
                            ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                            : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Live Official Invoice Preview Card (Moadian V7.9 Pattern 3) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4 sticky top-20">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    پیش‌نمایش فاکتور معامله طلا
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                  {selectedShop.name} · {asset.shortName}
                  {lockSecondsLeft > 0 ? ` · نرخ قفل‌شده (${toPersianDigits(lockSecondsLeft)} ثانیه)` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenTradeMoadianPreview}
                className="min-h-[34px] px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-[11px] font-semibold flex items-center gap-1 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Code2 className="w-3.5 h-3.5" />
                جزئیات مودیان
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>موجودی فعلی شما</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
                {side === 'buy' ? formatToman(activeWallet.rialBalance) : formatGrams(activeWallet.goldGrams)}
              </span>
            </div>

            {/* Itemized Gold Invoice Preview Breakdown */}
            <div className="border-y border-stone-100 dark:border-stone-800 py-3.5 space-y-2.5 text-xs sm:text-sm tabular-nums">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>نرخ طلای خام (عیار {toPersianDigits(asset.karat)})</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatToman(activeUnitPrice)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>وزن / مقدار معامله</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {formatGrams(computedGrams, true)}
                </span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>بهای اصل طلا</span>
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {formatToman(taxCalc.prdisToman)}
                </span>
              </div>

              {side === 'buy' && taxCalc.consfeeToman > 0 && (
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>
                    اجرت ساخت ({wageMode === 'percent' ? `${toPersianDigits(wageInput)}٪` : 'ثابت/گرم'})
                  </span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {formatToman(taxCalc.consfeeToman)}
                  </span>
                </div>
              )}

              {side === 'buy' && taxCalc.sproToman > 0 && (
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>سود فروشنده ({toPersianDigits(profitPercent)}٪)</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {formatToman(taxCalc.sproToman)}
                  </span>
                </div>
              )}

              {taxCalc.brosToman > 0 && (
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>کارمزد / حق‌العمل ({toPersianDigits(brokeragePercent)}٪)</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {side === 'sell' ? '- ' : ''}
                    {formatToman(taxCalc.brosToman)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>مالیات بر ارزش افزوده (۱۰٪ اجرت و سود)</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {formatToman(taxCalc.vamToman)}
                </span>
              </div>

              <div className="pt-2.5 border-t border-stone-200 dark:border-stone-700 space-y-1">
                <div className="flex justify-between font-bold text-base">
                  <span>{side === 'buy' ? 'مبلغ نهایی قابل پرداخت' : 'خالص واریزی به کیف پول'}</span>
                  <span className="text-stone-900 dark:text-stone-100">{formatToman(finalToman)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500">
                  <span>معادل ریالی</span>
                  <span className="font-mono-code">{formatRial(finalToman * 10)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitInstantTrade}
              className={`w-full min-h-[52px] rounded-xl text-white text-sm font-bold transition-colors cursor-pointer ${
                side === 'buy'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {side === 'buy'
                ? paymentMethod === 'pos_card'
                  ? 'تایید و پرداخت با کارتخوان پوز'
                  : 'تایید و صدور فاکتور خرید طلا'
                : 'تایید و صدور فاکتور فروش طلا'}
            </button>

            <div className="flex items-start gap-2 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                بلافاصله پس از تایید، رسید حرارتی ۵۸ میلی‌متری و بسته JSON استاندارد سامانه مودیان (نسخه ۷.۹ · الگوی ۳) تولید می‌شود.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIMIT ORDERS & PRICE ALERTS */}
      {tab === 'limit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Limit Order Form & Active List */}
          <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                ثبت سفارش محدود (خرید/فروش خودکار در قیمت هدف)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                با دکمه‌های شبیه‌سازی نوسان بازار در صفحه خانه می‌توانید اجرای خودکار سفارش را تست کنید
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLimitSide('buy')}
                className={`min-h-[42px] rounded-xl text-xs font-bold cursor-pointer ${
                  limitSide === 'buy'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                سفارش خرید محدود
              </button>
              <button
                type="button"
                onClick={() => setLimitSide('sell')}
                className={`min-h-[42px] rounded-xl text-xs font-bold cursor-pointer ${
                  limitSide === 'sell'
                    ? 'bg-rose-700 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                سفارش فروش محدود
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">قیمت هدف (تومان)</label>
                <input
                  type="number"
                  step="10000"
                  value={limitTargetPrice}
                  onChange={(e) => setLimitTargetPrice(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">مقدار (گرم)</label>
                <input
                  type="number"
                  step="0.1"
                  value={limitGrams}
                  onChange={(e) => setLimitGrams(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                placeLimitOrder({
                  side: limitSide,
                  assetCode: selectedAssetCode,
                  targetPrice: Number(limitTargetPrice) || asset.sellPrice,
                  weightGrams: Number(limitGrams) || 1,
                })
              }
              className="w-full min-h-[46px] rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-semibold cursor-pointer"
            >
              ثبت سفارش محدود
            </button>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
              <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                سفارش‌های محدود ثبت‌شده
              </div>
              {limitOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-stone-900 dark:text-stone-100">
                      {ord.side === 'buy' ? 'خرید' : 'فروش'} {formatGrams(ord.weightGrams)} · {ord.assetName}
                    </div>
                    <div className="text-stone-500 mt-0.5 tabular-nums">
                      هدف: {formatToman(ord.targetPrice)} · وضعیت:{' '}
                      <strong
                        className={
                          ord.status === 'filled'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : ord.status === 'cancelled'
                            ? 'text-stone-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }
                      >
                        {ord.status === 'open' ? 'باز' : ord.status === 'filled' ? 'تکمیل‌شده' : 'لغوشده'}
                      </strong>
                    </div>
                  </div>
                  {ord.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => cancelLimitOrder(ord.id)}
                      className="min-h-[36px] px-3 rounded-lg text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold cursor-pointer"
                    >
                      لغو
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Price Alerts Panel */}
          <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                هشدار لحظه‌ای قیمت (گوش‌به‌زنگ بازار)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                دریافت اعلان روی دستگاه پوز یا موبایل به محض رسیدن نرخ به سقف یا کف دلخواه
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">شرط هشدار</label>
                <select
                  value={alertCondition}
                  onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold"
                >
                  <option value="below">افت قیمت به زیر</option>
                  <option value="above">عبور قیمت از بالای</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">نرخ هدف (تومان)</label>
                <input
                  type="number"
                  step="10000"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                addPriceAlert({
                  assetCode: selectedAssetCode,
                  condition: alertCondition,
                  targetPrice: Number(alertPrice) || asset.sellPrice,
                })
              }
              className="w-full min-h-[46px] rounded-xl border border-stone-900 dark:border-amber-500 text-stone-900 dark:text-amber-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-900 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              افزودن هشدار قیمت
            </button>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
              {priceAlerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100">{al.assetName}</div>
                    <div className="text-stone-500 tabular-nums mt-0.5">
                      {al.condition === 'above' ? 'بالاتر از' : 'پایین‌تر از'} {formatToman(al.targetPrice)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => togglePriceAlert(al.id)}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        al.active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                      }`}
                    >
                      {al.active ? 'فعال' : 'خاموش'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePriceAlert(al.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 cursor-pointer"
                      aria-label="حذف هشدار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PHYSICAL DELIVERY (Customer) OR INCOMING QUEUE (Merchant) */}
      {tab === 'physical' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {role === 'customer' && (
            <form
              onSubmit={handleCreatePickup}
              className="lg:col-span-5 bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  تبدیل موجودی کیف طلا به طلای فیزیکی
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  موجودی قابل تحویل شما: <strong className="tabular-nums">{formatGrams(activeWallet.goldGrams)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  نوع قطعه فیزیکی
                </label>
                <select
                  value={pickupFormType}
                  onChange={(e) => setPickupFormType(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                >
                  <option value="قطعه آب‌شده ۱۸ عیار (کد ری‌گیری)">قطعه آب‌شده ۱۸ عیار (کد ری‌گیری)</option>
                  <option value="شمش طلای ۲۴ عیار پلمپ بانکی">شمش طلای ۲۴ عیار پلمپ بانکی</option>
                  <option value="سکه پارسیان / بانکی">سکه پارسیان / بانکی</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  وزن درخواستی (گرم)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={pickupWeight}
                  onChange={(e) => setPickupWeight(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
                  انتخاب طلافروشی معتبر جهت تحویل
                </label>
                <select
                  value={pickupShopId}
                  onChange={(e) => setPickupShopId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.city} ({s.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPickupMethod('in_person_pos')}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                    pickupMethod === 'in_person_pos'
                      ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  تحویل حضوری با کد QR
                </button>
                <button
                  type="button"
                  onClick={() => setPickupMethod('insured_courier')}
                  className={`min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                    pickupMethod === 'insured_courier'
                      ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  ارسال پیک بیمه‌شده
                </button>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-bold cursor-pointer"
              >
                ثبت درخواست و صدور کد تحویل فیزیکی
              </button>
            </form>
          )}

          {/* Pickup Orders Table / List */}
          <div
            className={`${
              role === 'customer' ? 'lg:col-span-7' : 'lg:col-span-12'
            } bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden`}
          >
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {role === 'merchant'
                  ? 'صف سفارش‌های تحویل فیزیکی مشتریان متصل به گالری'
                  : 'تاریخچه و کدهای تحویل فیزیکی شما'}
              </h3>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {pickupOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {ord.itemTitle}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                      <span>{role === 'merchant' ? `${ord.customerName} (${toPersianDigits(ord.customerPhone)})` : ord.shopName}</span>
                      <span>·</span>
                      <span>{formatGrams(ord.weightGrams)}</span>
                      <span>·</span>
                      <span className="font-mono-code font-bold text-amber-700 dark:text-amber-400">
                        کد: {ord.code}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ord.deliveryMethod === 'in_person_pos' ? 'حضوری روی پوز' : 'پیک بیمه‌شده'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        ord.status === 'delivered'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : ord.status === 'ready'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-stone-500'
                      }`}
                    >
                      {ord.status === 'delivered'
                        ? 'تحویل‌شده'
                        : ord.status === 'ready'
                        ? 'آماده تحویل'
                        : ord.status === 'pending'
                        ? 'در انتظار تایید گالری'
                        : 'لغوشده'}
                    </span>

                    {role === 'merchant' && ord.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => updatePickupStatus(ord.id, 'ready')}
                        className="min-h-[38px] px-3 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold cursor-pointer"
                      >
                        اعلام آماده تحویل
                      </button>
                    )}

                    {role === 'merchant' && ord.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => redeemPickupByCode(ord.code)}
                        className="min-h-[38px] px-3 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        ثبت تحویل و چاپ رسید
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
