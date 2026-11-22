import React, { useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { generateInvoiceNo, generateRRN, getNowPersianTime, toPersianDigits } from '../utils/format';
import {
  CheckCircle2,
  Cpu,
  CreditCard,
  FileText,
  Landmark,
  LogOut,
  Plus,
  Printer,
  Save,
  Scale,
  ScanLine,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export const SettingsPosBridgeView: React.FC = () => {
  const {
    authUser,
    logout,
    role,
    activeMerchantShop,
    updateMerchantTaxProfile,
    customerBanks,
    merchantBanks,
    addBankAccount,
    posHardware,
    updatePosHardware,
    logBridgeCall,
    triggerThermalPrint,
    requestPosPayment,
    openQrScanner,
    pushToast,
    darkMode,
    toggleDarkMode,
    posFrameMode,
    togglePosFrameMode,
  } = usePlatform();

  const isMerchant = role === 'merchant';
  const banks = isMerchant ? merchantBanks : customerBanks;

  const [bankName, setBankName] = useState('بانک پاسارگاد');
  const [cardNumber, setCardNumber] = useState('');
  const [shaba, setShaba] = useState('');
  const [twoStepPin, setTwoStepPin] = useState(true);
  const [biometricLock, setBiometricLock] = useState(true);

  // Moadian V7.9 Tax Profile Form (Merchant)
  const [fiscalMemoryId, setFiscalMemoryId] = useState(activeMerchantShop.fiscalMemoryId);
  const [economicCode, setEconomicCode] = useState(activeMerchantShop.economicCode);
  const [branchCode, setBranchCode] = useState(activeMerchantShop.branchCode);
  const [paymentSwitchCode, setPaymentSwitchCode] = useState(activeMerchantShop.paymentSwitchCode);
  const [acceptorCode, setAcceptorCode] = useState(activeMerchantShop.acceptorCode);
  const [posTerminalNumericId, setPosTerminalNumericId] = useState(
    activeMerchantShop.posTerminalNumericId
  );
  const [defaultThirdPartyContractNo, setDefaultThirdPartyContractNo] = useState(
    activeMerchantShop.defaultThirdPartyContractNo
  );

  const handleSaveMoadianProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMerchantTaxProfile({
      fiscalMemoryId: fiscalMemoryId.trim().toUpperCase().slice(0, 6),
      economicCode: economicCode.replace(/\D/g, '').slice(0, 14),
      branchCode: branchCode.replace(/\D/g, '').slice(0, 4).padStart(4, '0'),
      paymentSwitchCode: paymentSwitchCode.replace(/\D/g, '').slice(0, 9),
      acceptorCode: acceptorCode.replace(/\D/g, '').slice(0, 14),
      posTerminalNumericId: posTerminalNumericId.replace(/\D/g, '').slice(0, 8),
      defaultThirdPartyContractNo: defaultThirdPartyContractNo.replace(/\D/g, '').slice(0, 12),
    });
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber.trim() || !shaba.trim()) {
      pushToast({ title: 'شماره کارت و شبا را کامل وارد کنید', tone: 'warning' });
      return;
    }
    addBankAccount({
      bankName,
      cardNumber: cardNumber.trim(),
      shaba: shaba.trim().toUpperCase(),
      ownerName: isMerchant ? activeMerchantShop.ownerName : 'سارا رضایی',
      isDefault: false,
    });
    setCardNumber('');
    setShaba('');
  };

  const handleTestPrinter = () => {
    triggerThermalPrint({
      invoiceNo: generateInvoiceNo(),
      rrn: generateRRN(),
      terminalId: posHardware.terminalId,
      merchantName: activeMerchantShop.name,
      merchantLicense: activeMerchantShop.licenseNo,
      merchantAddress: activeMerchantShop.district,
      customerName: 'برگه تست پرینتر حرارتی پوز',
      customerPhone: activeMerchantShop.phone,
      dateTime: getNowPersianTime(),
      items: [
        {
          title: 'تست فونت فارسی و عرض ۵۸ میلی‌متر WebView',
          weightGrams: 1.0,
          karat: 750,
          unitPrice: 0,
          totalToman: 0,
        },
      ],
      goldBaseToman: 0,
      wageToman: 0,
      profitToman: 0,
      taxToman: 0,
      totalToman: 0,
      paymentMethodLabel: 'تست سخت‌افزار پرینتر (AndroidPOS Bridge)',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top 2-Column Account / KYC + Display Preferences */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Identity & KYC / Gold Union License */}
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isMerchant ? 'مشخصات گالری و جواز اتحادیه طلا' : 'احراز هویت و امنیت حساب کاربری'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {isMerchant
                  ? 'اطلاعات پذیرنده رسمی روی فاکتور و رسید حرارتی پوز درج می‌شود'
                  : 'تطبیق کد ملی و شماره موبایل از طریق سامانه شاهکار تایید شده است'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              تاییدشده
            </span>
          </div>

          <div className="space-y-2.5 text-sm">
            {isMerchant ? (
              <>
                <div className="flex justify-between">
                  <span className="text-stone-500">نام گالری / پذیرنده</span>
                  <span className="font-semibold">{activeMerchantShop.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">صاحب جواز کسب</span>
                  <span className="font-semibold">{activeMerchantShop.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">شماره جواز اتحادیه</span>
                  <span className="font-semibold tabular-nums">{activeMerchantShop.licenseNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">شماره پایانه (TID)</span>
                  <span className="font-mono-code font-semibold">{posHardware.terminalId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">کد پذیرنده (MID)</span>
                  <span className="font-mono-code font-semibold">{posHardware.merchantId}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-stone-500">نام و نام خانوادگی</span>
                  <span className="font-semibold">سارا رضایی</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">کد ملی (تایید ثبت احوال)</span>
                  <span className="font-semibold tabular-nums">۰۰۸۴۱۲۹۰۳۱</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">شماره همراه (شاهکار)</span>
                  <span className="font-semibold tabular-nums">۰۹۱۲۳۴۵۶۷۸۹</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">سقف روزانه خرید و تحویل فیزیکی</span>
                  <span className="font-semibold tabular-nums">۲۰۰ میلیون تومان / ۱۰۰ گرم</span>
                </div>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5 text-xs">
            <label className="flex items-center justify-between cursor-pointer min-h-[36px]">
              <span className="font-medium text-stone-700 dark:text-stone-300">
                تایید رمز دوم / پین امنیتی هنگام فروش و برداشت
              </span>
              <input
                type="checkbox"
                checked={twoStepPin}
                onChange={(e) => setTwoStepPin(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer min-h-[36px]">
              <span className="font-medium text-stone-700 dark:text-stone-300">
                ورود سریع با اثرانگشت / قفل دستگاه اندروید
              </span>
              <input
                type="checkbox"
                checked={biometricLock}
                onChange={(e) => setBiometricLock(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
            </label>
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800">
              <div className="text-[11px] text-stone-500">
                نشست فعال: <strong className="text-stone-800 dark:text-stone-200">{authUser?.name || (isMerchant ? activeMerchantShop.ownerName : 'سارا رضایی')}</strong>
                {authUser?.phone ? ` · ${toPersianDigits(authUser.phone)}` : ''}
              </div>
              <button
                type="button"
                onClick={logout}
                className="min-h-[38px] px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                خروج از حساب کاربری
              </button>
            </div>
          </div>
        </div>

        {/* Registered Bank Cards & Shaba */}
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                حساب‌های بانکی و شماره شبا تاییدشده
              </h2>
            </div>
          </div>

          <div className="space-y-2.5">
            {banks.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                  <span>{b.bankName}</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {b.isDefault ? 'حساب اصلی تسویه' : 'تاییدشده'}
                  </span>
                </div>
                <div className="text-stone-600 dark:text-stone-400 font-mono-code" dir="ltr">
                  {b.shaba}
                </div>
                <div className="text-stone-500 tabular-nums">کارت: {b.cardNumber}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddBank} className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
            <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              افزودن کارت / شبا جدید (به نام صاحب حساب)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="نام بانک"
                className="min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              />
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="شماره کارت ۱۶ رقمی"
                dir="ltr"
                className="min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs tabular-nums"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shaba}
                onChange={(e) => setShaba(e.target.value)}
                placeholder="IR00 0000 0000 0000 0000 0000 00"
                dir="ltr"
                className="flex-1 min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                ثبت
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Merchant Moadian V7.9 Tax Profile & Fiscal Memory Section */}
      {isMerchant && (
        <section className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  پروفایل مالیاتی و حافظه مالیاتی سامانه مودیان (دستورالعمل V7.9)
                </h2>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                این شناسه‌ها هنگام تولید شماره منحصر به فرد مالیاتی (taxid) و ارسال صورتحساب الکترونیکی الگوی سوم طلا (inp=3) استفاده می‌شوند
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              آماده اتصال به بک‌اند مودیان
            </span>
          </div>

          <form onSubmit={handleSaveMoadianProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  شناسه یکتای حافظه مالیاتی (۶ کاراکتر)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={fiscalMemoryId}
                  onChange={(e) => setFiscalMemoryId(e.target.value.toUpperCase())}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  شماره اقتصادی فروشنده (tins — ۱۱/۱۴ رقم)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={economicCode}
                  onChange={(e) => setEconomicCode(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  کد شعبه فروشنده (sbc — ۴ رقم)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  شماره قرارداد معامله شخص ثالث (bsrn)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={defaultThirdPartyContractNo}
                  onChange={(e) => setDefaultThirdPartyContractNo(e.target.value)}
                  dir="ltr"
                  placeholder="حداکثر ۱۲ رقم"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  شماره سوییچ پرداخت (iinn — ۹ رقم)
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={paymentSwitchCode}
                  onChange={(e) => setPaymentSwitchCode(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  شماره پذیرنده فروشگاهی (acn — ۱۴ رقم)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={acceptorCode}
                  onChange={(e) => setAcceptorCode(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  شماره پایانه عددی پوز (trmn — ۸ رقم)
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={posTerminalNumericId}
                  onChange={(e) => setPosTerminalNumericId(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code tabular-nums"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full min-h-[44px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Save className="w-4 h-4" />
                  ذخیره پروفایل مالیاتی
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* Android POS WebView Native Hardware Bridge Inspector */}
      <section className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                ارتباط WebView با سخت‌افزار دستگاه پوز اندرویدی (JavaScript Bridge)
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              مدل شبیه‌سازی‌شده: {posHardware.deviceModel} · {posHardware.androidWebViewVersion}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePosFrameMode}
              className="min-h-[40px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              {posFrameMode ? 'خروج از قاب پوز' : 'پیش‌نمایش قاب پوز 390px'}
            </button>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="min-h-[40px] px-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {darkMode ? 'تم روشن' : 'تم تیره'}
            </button>
          </div>
        </div>

        {/* Hardware Status & Settings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1">
            <div className="text-stone-500">ترازوی زرگری بلوتوثی</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-400">
              {posHardware.scaleConnected ? 'متصل · دقت ۰.۰۰۱ گرم' : 'قطع ارتباط'}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1">
            <div className="text-stone-500">پرینتر حرارتی ۵۸mm</div>
            <div className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
              {posHardware.printerConnected
                ? `آماده · رول کاغذ ${toPersianDigits(posHardware.printerPaperPercent)}٪`
                : 'قطع ارتباط'}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1">
            <div className="text-stone-500">کارتخوان EMV / NFC</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-400">
              متصل · سوئیچ شاپرک فعال
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1">
            <div className="text-stone-500">دوربین اسکنر اتیکت و QR</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-400">آماده اسکن</div>
          </div>
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-1">
            <div className="text-stone-500">باتری دستگاه پوز</div>
            <div className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
              {toPersianDigits(posHardware.batteryPercent)}٪ · وای‌فای و 4G
            </div>
          </div>
        </div>

        {/* POS Print Options + Interactive Hardware Test Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-5 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={posHardware.autoPrintReceipts}
                onChange={(e) => updatePosHardware({ autoPrintReceipts: e.target.checked })}
                className="w-4 h-4 accent-amber-600"
              />
              چاپ خودکار رسید بلافاصله پس از تایید شاپرک
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={posHardware.printDuplicateCopy}
                onChange={(e) => updatePosHardware({ printDuplicateCopy: e.target.checked })}
                className="w-4 h-4 accent-amber-600"
              />
              چاپ نسخه دوم (بایگانی پذیرنده)
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestPrinter}
              className="min-h-[42px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              تست پرینتر حرارتی
            </button>
            <button
              type="button"
              onClick={() =>
                requestPosPayment({
                  amountToman: 100000,
                  title: 'تست ارتباط کارتخوان شاپرک',
                  customerName: 'تست دستگاه',
                  onSuccess: () =>
                    pushToast({ title: 'تست کارتخوان پوز با موفقیت انجام شد', tone: 'success' }),
                })
              }
              className="min-h-[42px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              تست کارتخوان
            </button>
            <button
              type="button"
              onClick={() => {
                logBridgeCall('AndroidPOS.calibrateBluetoothScale', '{"tare":true}', 'OK (0.000g READY)');
                pushToast({
                  title: 'کالیبراسیون و صفر کردن ترازو انجام شد',
                  description: posHardware.scaleModel,
                  tone: 'success',
                });
              }}
              className="min-h-[42px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              تست و صفر کردن ترازو
            </button>
            <button
              type="button"
              onClick={() =>
                openQrScanner((code) =>
                  pushToast({ title: `کد اسکن شد: ${code}`, tone: 'success' })
                )
              }
              className="min-h-[42px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              تست اسکنر اتیکت / QR
            </button>
          </div>
        </div>

        {/* Live Android WebView Bridge Call Log */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              گزارش فراخوانی‌های شبیه‌سازی‌شده window.AndroidPOS (برای تیم فنی و یکپارچه‌سازی اندروید)
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="rounded-xl bg-stone-950 text-stone-200 p-3.5 font-mono-code text-[11px] space-y-1.5 overflow-x-auto" dir="ltr">
            {posHardware.bridgeLog.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 whitespace-nowrap">
                <span className="text-stone-500">[{entry.time}]</span>
                <span className="text-amber-400">{entry.method}</span>
                <span className="text-stone-400 truncate max-w-[340px]">{entry.payload}</span>
                <span className="text-emerald-400 ml-auto">{entry.result}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
