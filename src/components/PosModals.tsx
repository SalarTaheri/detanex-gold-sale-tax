import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { formatGrams, formatRial, formatToman, generateRRN, toPersianDigits } from '../utils/format';
import { MOADIAN_SUBJECT_LABELS, validateMoadianV79Payload } from '../utils/moadian';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  CreditCard,
  Delete,
  Download,
  Printer,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Wifi,
  X,
} from 'lucide-react';

export const PosCardPaymentModal: React.FC = () => {
  const { pendingPosPayment, closePosPayment, posHardware, logBridgeCall } = usePlatform();
  const [step, setStep] = useState<'tap' | 'pin' | 'processing' | 'approved'>('tap');
  const [pin, setPin] = useState<string>('');
  const [cardMask, setCardMask] = useState<string>('۶۲۱۹-۸۶**-****-۴۸۱۲');
  const [rawCard16, setRawCard16] = useState<string>('6219861044104812');
  const [rrn, setRrn] = useState<string>('');

  if (!pendingPosPayment) return null;

  const resetAndClose = () => {
    setStep('tap');
    setPin('');
    closePosPayment();
  };

  const handleCardDetect = (methodLabel: string, mask: string, raw16: string) => {
    setCardMask(mask);
    setRawCard16(raw16);
    logBridgeCall('AndroidPOS.onCardDetected', JSON.stringify({ reader: methodLabel, cardMask: mask }), 'PIN_REQUIRED');
    setStep('pin');
  };

  const handleDigit = (d: string) => {
    if (pin.length < 4) {
      setPin((p) => p + d);
    }
  };

  const handleConfirmPin = () => {
    if (pin.length < 4) return;
    setStep('processing');
    const generated = generateRRN();
    setRrn(generated);
    setTimeout(() => {
      logBridgeCall(
        'AndroidPOS.onShaparakResponse',
        JSON.stringify({ rrn: generated, responseCode: '00' }),
        'APPROVED'
      );
      setStep('approved');
      setTimeout(() => {
        const cb = pendingPosPayment.onSuccess;
        const finalCardMask = cardMask;
        const finalRaw16 = rawCard16;
        setStep('tap');
        setPin('');
        closePosPayment();
        cb({ rrn: generated, cardMask: finalCardMask, rawCard16: finalRaw16 });
      }, 950);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        {/* Sheet Handle */}
        <div className="sm:hidden w-10 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              پرداخت کارتخوان پوز اندروید
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-mono-code">
              {posHardware.terminalId} · شاپرک
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Summary */}
        <div className="px-5 py-4 bg-stone-50 dark:bg-stone-900/60 border-b border-stone-100 dark:border-stone-800">
          <div className="text-xs text-stone-500 dark:text-stone-400">{pendingPosPayment.title}</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
              {formatToman(pendingPosPayment.amountToman)}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
              {toPersianDigits((pendingPosPayment.amountToman * 10).toLocaleString('en-US'))} ریال
            </span>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-5">
          {step === 'tap' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400 mb-3">
                  <CreditCard className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  کارت بانکی را بکشید یا روی NFC نزدیک کنید
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  شبیه‌ساز سخت‌افزار کارتخوان {posHardware.deviceModel}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCardDetect('NFC_CONTACTLESS', '۶۲۱۹-۸۶**-****-۴۸۱۲', '6219861044104812')}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-amber-500 transition-colors cursor-pointer"
                >
                  <Wifi className="w-4 h-4 rotate-90" />
                  شبیه‌سازی تماس کارت (NFC — بانک سامان)
                </button>
                <button
                  type="button"
                  onClick={() => handleCardDetect('EMV_CHIP', '۶۱۰۴-۳۳**-****-۹۲۱۱', '6104337891209211')}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-sm font-medium flex items-center justify-center gap-2 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  شبیه‌سازی کشیدن/تراشه کارت (بانک ملت)
                </button>
              </div>
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>شماره کارت شناسایی‌شده</span>
                <span className="font-mono-code text-stone-800 dark:text-stone-200" dir="ltr">
                  {cardMask}
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl font-bold ${
                      pin.length > idx
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-300'
                    }`}
                  >
                    {pin.length > idx ? '●' : ''}
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-stone-500 dark:text-stone-400">
                رمز چهاررقمی کارت را وارد کنید (دمو: هر ۴ رقم دلخواه)
              </p>

              <div className="grid grid-cols-3 gap-2" dir="ltr">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigit(digit)}
                    className="min-h-[48px] rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold text-lg hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-[0.98] transition-all cursor-pointer tabular-nums"
                  >
                    {toPersianDigits(digit)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin('')}
                  className="min-h-[48px] rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-semibold cursor-pointer"
                >
                  پاک
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="min-h-[48px] rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold text-lg hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer tabular-nums"
                >
                  ۰
                </button>
                <button
                  type="button"
                  onClick={() => setPin((p) => p.slice(0, -1))}
                  className="min-h-[48px] rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center cursor-pointer"
                  aria-label="حذف رقم"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              <button
                type="button"
                disabled={pin.length < 4}
                onClick={handleConfirmPin}
                className="w-full min-h-[48px] rounded-xl bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                تایید رمز و ارسال به شبکه شاپرک
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full border-3 border-amber-600 border-t-transparent animate-spin mb-4" />
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                در حال ارتباط امن با سوئیچ شاپرک...
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                لطفاً کارت را تا دریافت پاسخ جدا نکنید
              </p>
            </div>
          )}

          {step === 'approved' && (
            <div className="py-8 flex flex-col items-center text-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 mb-3" />
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                تراکنش با موفقیت تایید شد
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-mono-code">
                شماره مرجع (RRN): {rrn}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ThermalReceiptModal: React.FC = () => {
  const {
    activeReceipt,
    setActiveReceipt,
    triggerThermalPrint,
    moadianInvoices,
    setActiveMoadianRecord,
  } = usePlatform();

  if (!activeReceipt) return null;

  const handleOpenMoadianJson = () => {
    if (!activeReceipt.moadianPayload) return;
    const matched = moadianInvoices.find(
      (inv) => inv.taxid === activeReceipt.taxid
    );
    if (matched) {
      setActiveMoadianRecord(matched);
    } else {
      const p = activeReceipt.moadianPayload;
      setActiveMoadianRecord({
        id: `preview-${Date.now()}`,
        taxid: p.header.taxid,
        inno: p.header.inno,
        irtaxid: p.header.irtaxid,
        inty: p.header.inty,
        ins: p.header.ins,
        buyerName: activeReceipt.customerName,
        buyerNationalOrEcoId: activeReceipt.customerNationalId,
        totalRial: p.header.tbill,
        totalToman: Math.round(p.header.tbill / 10),
        totalVatRial: p.header.tvam,
        totalGoldGrams: activeReceipt.items.reduce((a, b) => a + b.weightGrams, 0),
        createdAtPersian: activeReceipt.dateTime,
        status: 'draft_local',
        payload: p,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {activeReceipt.receiptKind === 'buyback'
                ? 'رسید حرارتی ۵۸mm · خرید طلا از مشتری'
                : 'رسید حرارتی ۵۸mm · فاکتور طلا'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveReceipt(null)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            aria-label="بستن رسید"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Paper Body */}
        <div className="overflow-y-auto p-4 bg-stone-100 dark:bg-stone-950">
          <div className="bg-[#FFFDF9] text-stone-900 p-4 rounded-t-lg shadow-sm border border-stone-200 thermal-edge pb-6 space-y-3 text-xs">
            <div className="text-center border-b border-dashed border-stone-300 pb-3">
              <div className="text-base font-bold tracking-tight">زرپوز · {activeReceipt.merchantName}</div>
              <div className="text-[11px] text-stone-600 mt-0.5">{activeReceipt.merchantAddress}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                جواز اتحادیه: {activeReceipt.merchantLicense}
              </div>
              {activeReceipt.merchantEconomicCode && (
                <div className="text-[11px] text-stone-600 font-mono-code mt-0.5">
                  شماره اقتصادی (tins): {activeReceipt.merchantEconomicCode}
                </div>
              )}
              <div className="text-[11px] text-stone-500 font-mono-code mt-0.5">
                TID: {activeReceipt.terminalId} · {activeReceipt.invoiceNo}
              </div>
              {activeReceipt.taxid && (
                <div className="mt-1.5 pt-1.5 border-t border-dotted border-stone-300 text-[10px] text-stone-700">
                  <div>
                    صورتحساب الکترونیکی نوع {activeReceipt.inty === 1 ? 'اول' : 'دوم'} · الگوی ۳ (طلا) ·{' '}
                    {activeReceipt.ins ? MOADIAN_SUBJECT_LABELS[activeReceipt.ins] : 'اصلی'}
                  </div>
                  <div className="font-mono-code font-bold text-stone-900 mt-0.5 tracking-tight" dir="ltr">
                    TaxID: {activeReceipt.taxid}
                  </div>
                  {activeReceipt.irtaxid && (
                    <div className="font-mono-code text-[9px] text-stone-600 mt-0.5" dir="ltr">
                      RefTaxID: {activeReceipt.irtaxid}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3">
              <div className="flex justify-between">
                <span className="text-stone-500">تاریخ و ساعت</span>
                <span className="font-medium tabular-nums">{activeReceipt.dateTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">مشتری</span>
                <span className="font-medium">{activeReceipt.customerName}</span>
              </div>
              {activeReceipt.customerNationalId && (
                <div className="flex justify-between">
                  <span className="text-stone-500">کد ملی / اقتصادی خریدار</span>
                  <span className="font-mono-code font-medium">{activeReceipt.customerNationalId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500">تلفن همراه</span>
                <span className="font-medium tabular-nums">{toPersianDigits(activeReceipt.customerPhone)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">کد پیگیری (RRN)</span>
                <span className="font-mono-code font-semibold">{activeReceipt.rrn}</span>
              </div>
            </div>

            <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
              {activeReceipt.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold text-stone-900">{item.title}</div>
                  {item.sstid && (
                    <div className="text-[10px] text-stone-500 font-mono-code" dir="ltr">
                      SSTID: {item.sstid}
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] text-stone-600 tabular-nums">
                    <span>
                      وزن: {formatGrams(item.weightGrams)} · عیار {toPersianDigits(item.karat)}
                    </span>
                    <span>{formatToman(item.totalToman)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3 tabular-nums">
              <div className="flex justify-between text-stone-600">
                <span>بهای اصل طلا (معاف از مالیات)</span>
                <span>{formatToman(activeReceipt.goldBaseToman)}</span>
              </div>
              {activeReceipt.wageToman > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>اجرت ساخت (consfee)</span>
                  <span>{formatToman(activeReceipt.wageToman)}</span>
                </div>
              )}
              {activeReceipt.brokerageToman !== undefined && activeReceipt.brokerageToman > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>حق‌العمل (bros)</span>
                  <span>{formatToman(activeReceipt.brokerageToman)}</span>
                </div>
              )}
              {activeReceipt.profitToman > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>سود فروشنده (spro)</span>
                  <span>{formatToman(activeReceipt.profitToman)}</span>
                </div>
              )}
              {activeReceipt.discountToman !== undefined && activeReceipt.discountToman > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>تخفیف (dis)</span>
                  <span>- {formatToman(activeReceipt.discountToman)}</span>
                </div>
              )}
              {activeReceipt.taxToman > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>مالیات ۱۰٪ (اجرت، حق‌العمل و سود)</span>
                  <span>{formatToman(activeReceipt.taxToman)}</span>
                </div>
              )}
              {activeReceipt.otherDutiesToman !== undefined && activeReceipt.otherDutiesToman > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>سایر عوارض و وجوه قانونی</span>
                  <span>{formatToman(activeReceipt.otherDutiesToman)}</span>
                </div>
              )}
              {activeReceipt.oldGoldDeduction && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>
                    تهاتر طلای تعویضی ({formatGrams(activeReceipt.oldGoldDeduction.weightGrams)})
                  </span>
                  <span>- {formatToman(activeReceipt.oldGoldDeduction.valueToman)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                <span>مبلغ قابل پرداخت</span>
                <span>{formatToman(activeReceipt.totalToman)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-500">
                <span>معادل ریالی (سامانه مودیان)</span>
                <span>{formatRial(activeReceipt.totalToman * 10)}</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] text-stone-600">
              <div className="flex justify-between">
                <span>{activeReceipt.receiptKind === 'buyback' ? 'روش واریز به مشتری' : 'روش تسویه'}</span>
                <span className="font-medium text-stone-900">{activeReceipt.paymentMethodLabel}</span>
              </div>
              {activeReceipt.cardMask && !activeReceipt.splitPayments?.length && (
                <div className="flex justify-between">
                  <span>کارت بانکی</span>
                  <span className="font-mono-code" dir="ltr">
                    {activeReceipt.cardMask}
                  </span>
                </div>
              )}
              {activeReceipt.splitPayments && activeReceipt.splitPayments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-dotted border-stone-300 space-y-1">
                  <div className="text-[10px] font-bold text-stone-800">
                    جزئیات پرداخت ترکیبی ({toPersianDigits(activeReceipt.splitPayments.length)} فقره):
                  </div>
                  {activeReceipt.splitPayments.map((sp, i) => (
                    <div key={sp.id} className="flex justify-between text-[10px] tabular-nums">
                      <span className="truncate max-w-[160px]">
                        {toPersianDigits(i + 1)}. {sp.methodLabel} {sp.cardMask ? `(${sp.cardMask.slice(-4)})` : ''}
                      </span>
                      <span className="font-semibold text-stone-900">{formatToman(sp.amountToman)}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeReceipt.assayCode && (
                <div className="flex justify-between">
                  <span>کد ری‌گیری / اصالت</span>
                  <span className="font-mono-code font-semibold text-stone-900">{activeReceipt.assayCode}</span>
                </div>
              )}
              {activeReceipt.pickupCode && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <div className="text-[10px] text-amber-800">کد تحویل فیزیکی در طلافروشی</div>
                  <div className="text-base font-bold font-mono-code tracking-wider text-stone-900 mt-0.5">
                    {activeReceipt.pickupCode}
                  </div>
                </div>
              )}
            </div>

            {/* Minimalist Verification QR Block */}
            <div className="pt-2 flex flex-col items-center text-center">
              <div className="p-2 bg-white border border-stone-300 rounded-lg inline-flex">
                <QrCode className="w-14 h-14 text-stone-900" strokeWidth={1.5} />
              </div>
              <p className="text-[10px] text-stone-500 mt-1.5">
                اصالت صورتحساب الکترونیکی طلا در سامانه مودیان و زرپوز قابل استعلام است
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-2 bg-white dark:bg-[#15171C]">
          {activeReceipt.moadianPayload && (
            <button
              type="button"
              onClick={handleOpenMoadianJson}
              className="w-full min-h-[44px] px-4 rounded-xl border border-amber-600/50 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-amber-100/70 dark:hover:bg-amber-950/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Code2 className="w-4 h-4" />
              مشاهده و دانلود JSON سامانه مودیان (V7.9)
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => triggerThermalPrint(activeReceipt)}
              className="flex-1 min-h-[46px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-amber-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              چاپ روی پرینتر پوز
            </button>
            <button
              type="button"
              onClick={() => setActiveReceipt(null)}
              className="min-h-[46px] px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MoadianJsonModal: React.FC = () => {
  const { activeMoadianRecord, setActiveMoadianRecord, submitMoadianInvoice, pushToast } = usePlatform();
  const [copied, setCopied] = useState(false);

  if (!activeMoadianRecord) return null;

  const { payload } = activeMoadianRecord;
  const formattedJson = JSON.stringify(payload, null, 2);
  const issues = validateMoadianV79Payload(payload);
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      pushToast({ title: 'ساختار JSON مودیان در حافظه کپی شد', tone: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast({ title: 'کپی خودکار توسط مرورگر مسدود شد', tone: 'warning' });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([formattedJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moadian-v79-inp3-${payload.header.taxid}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                ساختار رسمی JSON سامانه مودیان (نسخه ۷.۹ · الگوی ۳ طلا)
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-mono-code" dir="ltr">
              taxid: {payload.header.taxid} · inp: 3 · inty: {payload.header.inty} · ins: {payload.header.ins}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveMoadianRecord(null)}
            className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            aria-label="بستن پنجره JSON"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Key Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
              <div className="text-stone-500">نوع / موضوع</div>
              <div className="font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                نوع {payload.header.inty === 1 ? 'اول' : 'دوم'} · {MOADIAN_SUBJECT_LABELS[payload.header.ins]}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
              <div className="text-stone-500">مجموع صورتحساب (tbill)</div>
              <div className="font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                {formatRial(payload.header.tbill)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
              <div className="text-stone-500">مالیات ارزش افزوده (tvam)</div>
              <div className="font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                {formatRial(payload.header.tvam)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800">
              <div className="text-stone-500">وضعیت کارپوشه</div>
              <div
                className={`font-bold mt-0.5 ${
                  activeMoadianRecord.status === 'accepted'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : activeMoadianRecord.status === 'cancelled_ref'
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {activeMoadianRecord.status === 'accepted'
                  ? 'ثبت‌شده (تایید شبیه‌سازی)'
                  : activeMoadianRecord.status === 'cancelled_ref'
                  ? 'ابطال‌شده با مرجع'
                  : 'آماده ارسال به بک‌اند'}
              </div>
            </div>
          </div>

          {/* Live RC_IITP.IS_V7.9 Validation Panel */}
          <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-stone-900 dark:text-stone-100">
                {errors.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                نتیجه کنترل‌های منطقی دستورالعمل RC_IITP.IS_V7.9
              </span>
              <span className="text-stone-500 tabular-nums">
                {toPersianDigits(errors.length)} خطا · {toPersianDigits(warnings.length)} هشدار
              </span>
            </div>

            {issues.length === 0 ? (
              <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed">
                تمامی فیلدهای اجباری، فرمول‌های الگوی سوم طلا (adis، vam ده درصدی روی tcpbs، tsstam) و قواعد خریدار بدون خطا و آماده ارسال از طریق API بک‌اند هستند.
              </p>
            ) : (
              <ul className="space-y-1.5 pt-1">
                {issues.map((issue, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-2 leading-relaxed ${
                      issue.severity === 'error'
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    <span className="font-mono-code font-bold shrink-0" dir="ltr">
                      [{issue.field}]
                    </span>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* JSON Code Block */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>بسته استاندارد ارسالی (Header + Body + Payments + Extension) — تمامی مبالغ به ریال</span>
              <span className="font-mono-code">RC_IITP.IS_V7.9</span>
            </div>
            <pre
              dir="ltr"
              className="p-4 rounded-xl bg-stone-950 text-stone-200 font-mono-code text-[11px] leading-relaxed overflow-x-auto max-h-[300px] border border-stone-800"
            >
              {formattedJson}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#15171C]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[44px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'کپی شد' : 'کپی JSON'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="min-h-[44px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              دانلود فایل .json
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeMoadianRecord.status === 'draft_local' && !activeMoadianRecord.id.startsWith('preview-') && (
              <button
                type="button"
                disabled={errors.length > 0}
                onClick={() => submitMoadianInvoice(activeMoadianRecord.id)}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                ارسال شبیه‌سازی‌شده به مودیان
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveMoadianRecord(null)}
              className="min-h-[44px] px-4 rounded-xl bg-stone-900 dark:bg-stone-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PosQrScannerModal: React.FC = () => {
  const { qrScannerOpen, closeQrScanner, handleQrScanned, pickupOrders, catalog, activeMerchantShop } = usePlatform();
  const [manualCode, setManualCode] = useState('');

  if (!qrScannerOpen) return null;

  const activePickups = pickupOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const shopTags = catalog.filter((c) => c.shopId === activeMerchantShop.id).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              اسکنر دوربین / بارکد اتیکت دستگاه پوز
            </h3>
          </div>
          <button
            type="button"
            onClick={closeQrScanner}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            aria-label="بستن اسکنر"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Simulated Viewfinder */}
          <div className="relative h-40 rounded-2xl bg-stone-950 flex flex-col items-center justify-center overflow-hidden border border-stone-800">
            <div className="w-36 h-32 border-2 border-amber-500/80 rounded-2xl relative flex items-center justify-center">
              <div className="w-full h-0.5 bg-amber-400 shadow-[0_0_12px_#F59E0B]" />
            </div>
            <span className="mt-2 text-[11px] text-stone-400">
              اتیکت بارکد ویترین، کد ری‌گیری یا QR تحویل مشتری را مقابل دوربین بگیرید
            </span>
          </div>

          {/* Quick Demo Showcase Jewelry Tags */}
          {shopTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
                اسکن سریع اتیکت طلای ویترین (بارکد کالا):
              </div>
              <div className="space-y-1.5">
                {shopTags.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleQrScanned(item.assayCode)}
                    className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 bg-stone-50 dark:bg-stone-900 flex items-center justify-between text-right transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-stone-500 tabular-nums">
                        {formatGrams(item.weightGrams)} · عیار {toPersianDigits(item.karat)} · اجرت {toPersianDigits(item.wagePercent)}٪
                      </div>
                    </div>
                    <span className="font-mono-code text-[11px] font-bold text-amber-700 dark:text-amber-400 shrink-0 mr-2">
                      {item.assayCode}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Demo Pickups */}
          {activePickups.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-stone-500 dark:text-stone-400">
                اسکن کد QR سفارش‌های آماده تحویل:
              </div>
              <div className="space-y-1.5">
                {activePickups.slice(0, 2).map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => handleQrScanned(ord.code)}
                    className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 bg-stone-50 dark:bg-stone-900 flex items-center justify-between text-right transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                        {ord.customerName} · {formatGrams(ord.weightGrams)}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-[200px]">
                        {ord.itemTitle}
                      </div>
                    </div>
                    <span className="font-mono-code text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                      {ord.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Entry */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) {
                handleQrScanned(manualCode.trim());
                setManualCode('');
              }
            }}
            className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800"
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="یا ورود دستی کد (مثلاً ZP-482910)"
              dir="ltr"
              className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-600"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-semibold hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              تایید
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const ToastStack: React.FC = () => {
  const { toasts, dismissToast } = usePlatform();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:right-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl px-4 py-3 shadow-xl border border-stone-700 dark:border-stone-300 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <ShieldCheck
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                t.tone === 'success'
                  ? 'text-emerald-400 dark:text-emerald-700'
                  : t.tone === 'error'
                  ? 'text-rose-400 dark:text-rose-700'
                  : 'text-amber-400 dark:text-amber-700'
              }`}
            />
            <div>
              <div className="text-xs font-semibold">{t.title}</div>
              {t.description && (
                <div className="text-[11px] text-stone-300 dark:text-stone-600 mt-0.5 leading-relaxed">
                  {t.description}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="text-stone-400 hover:text-white dark:hover:text-stone-900 p-1 cursor-pointer"
            aria-label="بستن پیام"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
