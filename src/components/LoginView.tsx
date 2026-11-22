import React, { useEffect, useRef, useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { UserRole } from '../types/gold';
import { formatToman, toEnglishDigits, toPersianDigits } from '../utils/format';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  MessageSquareText,
  Moon,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Store,
  Sun,
  User,
} from 'lucide-react';

const DEMO_ACCOUNTS: Array<{
  role: UserRole;
  name: string;
  subtitle: string;
  phone: string;
}> = [
  {
    role: 'merchant',
    name: 'علی محمدی (مدیر گالری زمرد)',
    subtitle: 'پنل طلافروشی · صندوق پوز و مشتریان',
    phone: '09121045588',
  },
  {
    role: 'customer',
    name: 'سارا رضایی (کاربر عادی)',
    subtitle: 'خرید و فروش آنلاین طلا و کیف پول',
    phone: '09123456789',
  },
];

function generateOtpCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export const LoginView: React.FC = () => {
  const {
    loginWithSmsOtp,
    gold18Asset,
    posHardware,
    darkMode,
    toggleDarkMode,
    posFrameMode,
    togglePosFrameMode,
    pushToast,
  } = usePlatform();

  const [selectedRole, setSelectedRole] = useState<UserRole>('merchant');
  const [phoneInput, setPhoneInput] = useState<string>('09121045588');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '']);
  const [resendSeconds, setResendSeconds] = useState<number>(0);
  const [otpError, setOtpError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  const normalizedPhone = toEnglishDigits(phoneInput).replace(/\D/g, '');
  const isValidIranMobile = /^09\d{9}$/.test(normalizedPhone);

  const sendOtp = (targetPhone: string, targetRole: UserRole) => {
    const clean = toEnglishDigits(targetPhone).replace(/\D/g, '');
    if (!/^09\d{9}$/.test(clean)) {
      pushToast({
        title: 'شماره موبایل معتبر نیست',
        description: 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.',
        tone: 'warning',
      });
      return;
    }

    const code = generateOtpCode();
    setSelectedRole(targetRole);
    setPhoneInput(clean);
    setGeneratedOtp(code);
    setOtpDigits(['', '', '', '', '']);
    setOtpError('');
    setResendSeconds(60);
    setStep('otp');

    pushToast({
      title: `پیامک زرپوز ارسال شد: کد ${toPersianDigits(code)}`,
      description: `کد تایید ۵ رقمی به شماره ${toPersianDigits(clean)} پیامک شد (نسخه دمو).`,
      tone: 'info',
    });

    window.setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 80);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp(phoneInput, selectedRole);
  };

  const verifyOtpCode = (codeStr: string) => {
    const clean = toEnglishDigits(codeStr).replace(/\D/g, '');
    if (clean.length < 5) {
      setOtpError('لطفاً هر ۵ رقم کد پیامک‌شده را وارد کنید.');
      return;
    }
    if (clean !== generatedOtp) {
      setOtpError('کد تایید واردشده صحیح نیست. کد پیامک‌شده را مجدد بررسی کنید.');
      return;
    }

    setOtpError('');
    setIsVerifying(true);
    const matchedDemo = DEMO_ACCOUNTS.find((a) => a.phone === normalizedPhone && a.role === selectedRole);
    window.setTimeout(() => {
      setIsVerifying(false);
      loginWithSmsOtp({
        phone: normalizedPhone,
        role: selectedRole,
        name: matchedDemo?.name.split(' (')[0],
      });
    }, 350);
  };

  const handleOtpDigitChange = (idx: number, rawVal: string) => {
    const digitsOnly = toEnglishDigits(rawVal).replace(/\D/g, '');
    setOtpError('');

    if (digitsOnly.length > 1) {
      const sliced = digitsOnly.slice(0, 5).split('');
      const next = ['', '', '', '', ''];
      sliced.forEach((ch, i) => {
        next[i] = ch;
      });
      setOtpDigits(next);
      if (sliced.length === 5) {
        verifyOtpCode(next.join(''));
      } else {
        inputRefs.current[Math.min(4, sliced.length)]?.focus();
      }
      return;
    }

    const next = [...otpDigits];
    next[idx] = digitsOnly;
    setOtpDigits(next);

    if (digitsOnly && idx < 4) {
      inputRefs.current[idx + 1]?.focus();
    }

    const joined = next.join('');
    if (joined.length === 5) {
      verifyOtpCode(joined);
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleAutoFillSms = () => {
    const split = generatedOtp.split('');
    setOtpDigits(split);
    setOtpError('');
    verifyOtpCode(generatedOtp);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${toPersianDigits(m)}:${toPersianDigits(String(s).padStart(2, '0'))}`;
  };

  const formContent = (
    <div className="w-full space-y-5">
      {/* Brand Title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            زرپوز
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
            ۱۸ عیار: <strong className="text-stone-900 dark:text-stone-100">{formatToman(gold18Asset.sellPrice)}</strong>
          </span>
        </div>
        <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100 pt-1">
          {step === 'phone' ? 'ورود با کد تایید پیامکی' : 'تایید کد ۵ رقمی پیامک'}
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
          {step === 'phone'
            ? 'شماره موبایل خود را وارد کنید تا کد تایید یک‌بارمصرف پیامک شود.'
            : `کد تایید ۵ رقمی به شماره ${toPersianDigits(normalizedPhone)} ارسال شد.`}
        </p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('merchant');
                if (phoneInput === '09123456789') setPhoneInput('09121045588');
              }}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                selectedRole === 'merchant'
                  ? 'bg-stone-900 dark:bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Store className="w-4 h-4 shrink-0" />
              مدیر طلافروشی (پوز)
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('customer');
                if (phoneInput === '09121045588') setPhoneInput('09123456789');
              }}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                selectedRole === 'customer'
                  ? 'bg-stone-900 dark:bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              کاربر عادی
            </button>
          </div>

          {/* Mobile Input */}
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
              شماره تلفن همراه
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="09121234567"
              dir="ltr"
              className="w-full min-h-[50px] px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold font-mono-code tracking-wider text-center text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-600 tabular-nums"
            />
          </div>

          <button
            type="submit"
            disabled={!isValidIranMobile}
            className="w-full min-h-[50px] rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <MessageSquareText className="w-4 h-4" />
            دریافت کد تایید پیامکی
          </button>

          {/* Fast Demo Account Pickers */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
            <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
              انتخاب سریع حساب‌های دمو:
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.phone}
                  type="button"
                  onClick={() => sendOtp(acc.phone, acc.role)}
                  className="w-full min-h-[52px] px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-600/60 bg-stone-50 dark:bg-stone-900/60 flex items-center justify-between gap-2 text-right transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {acc.name}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {acc.subtitle}
                    </div>
                  </div>
                  <span className="font-mono-code text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0" dir="ltr">
                    {toPersianDigits(acc.phone)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Simulated Incoming SMS Preview Strip (Android SMS Retriever) */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5 shrink-0" />
                پیامک دریافتی روی دستگاه (دمو)
              </div>
              <div className="text-xs text-stone-700 dark:text-stone-300 mt-1 tabular-nums">
                کد ورود زرپوز:{' '}
                <strong className="font-mono-code text-sm text-stone-900 dark:text-stone-100 tracking-widest" dir="ltr">
                  {toPersianDigits(generatedOtp)}
                </strong>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoFillSms}
              className="min-h-[38px] px-3 rounded-lg bg-stone-900 dark:bg-amber-600 text-white text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-500 cursor-pointer whitespace-nowrap shrink-0"
            >
              خواندن خودکار
            </button>
          </div>

          {/* 5-Digit OTP Input Boxes */}
          <div className="flex items-center justify-center gap-2.5 py-2" dir="ltr">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={digit ? toPersianDigits(digit) : ''}
                onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                aria-label={`رقم ${idx + 1} کد تایید`}
                className={`w-12 h-14 rounded-xl border text-center text-xl font-bold font-mono-code tabular-nums focus:outline-none transition-colors ${
                  otpError
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                    : digit
                    ? 'border-amber-600 bg-amber-50/40 dark:bg-amber-950/25 text-stone-900 dark:text-stone-100'
                    : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:border-amber-600'
                }`}
              />
            ))}
          </div>

          {otpError && (
            <p className="text-center text-xs font-medium text-rose-700 dark:text-rose-400">
              {otpError}
            </p>
          )}

          <button
            type="button"
            disabled={isVerifying || otpDigits.join('').length < 5}
            onClick={() => verifyOtpCode(otpDigits.join(''))}
            className="w-full min-h-[50px] rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            {isVerifying ? 'در حال ورود...' : 'تایید کد و ورود به زرپوز'}
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtpError('');
              }}
              className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 inline-flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              ویرایش شماره موبایل
            </button>

            {resendSeconds > 0 ? (
              <span className="text-stone-500 tabular-nums">
                ارسال مجدد تا {formatTimer(resendSeconds)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => sendOtp(normalizedPhone, selectedRole)}
                className="text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ارسال مجدد پیامک
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subtle Footer Controls */}
      <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
        <span className="font-mono-code">TID: {posHardware.terminalId}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePosFrameMode}
            className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            {posFrameMode ? 'تمام‌صفحه' : 'نمای پوز'}
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-200 cursor-pointer"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {darkMode ? 'روشن' : 'تیره'}
          </button>
        </div>
      </div>
    </div>
  );

  // Android POS WebView 390px Frame Mode
  if (posFrameMode) {
    return (
      <div className="min-h-screen bg-stone-200 dark:bg-[#07080A] py-6 px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-[400px] h-[760px] bg-[#FAF9F6] dark:bg-[#0C0D10] rounded-[32px] border-[8px] border-stone-900 dark:border-stone-800 shadow-2xl overflow-y-auto p-5 flex items-center">
          <div className="w-full bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0C0D10] text-stone-900 dark:text-stone-100 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Right Editorial / POS Platform Overview Column (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between bg-stone-950 text-stone-100 rounded-3xl p-8 border border-stone-800">
          <div className="space-y-4">
            <div className="text-sm font-semibold text-amber-400">
              پلتفرم جامع خرید و فروش طلا · سازگار با پوز اندرویدی
            </div>
            <h2 className="text-3xl font-bold leading-snug text-balance">
              صندوق هوشمند طلافروشی، ترازوی بلوتوثی و معامله آنلاین طلا در یک سامانه
            </h2>
            <p className="text-sm text-stone-400 leading-relaxed">
              طراحی‌شده برای اجرای روان در WebView دستگاه‌های کارتخوان اندرویدی با پشتیبانی از پرداخت ترکیبی چندکارته، تعویض طلای کهنه با نو، مدیریت مشتریان و تحویل فیزیکی با QR.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-stone-800 text-xs text-stone-300">
            {[
              'اتصال مستقیم به ترازوی زرگری (دقت ۰.۰۰۱ گرم) و اسکنر بارکد اتیکت ویترین',
              'پرداخت ترکیبی چندکارته جهت عبور از محدودیت سقف روزانه کارت بانکی',
              'پرونده مشتریان، ثبت بیعانه، حساب دفتری طلایی و سوابق خرید هر مشتری',
              'احراز هویت امن پیامکی و تفکیک کامل پنل طلافروشی از پنل کاربر عادی',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between text-xs text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              اتصال امن شاپرک · نسخه دمو
            </span>
            <span className="font-mono-code">{posHardware.deviceModel}</span>
          </div>
        </div>

        {/* Left SMS OTP Login Card */}
        <div className="lg:col-span-6 bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 flex items-center">
          {formContent}
        </div>
      </div>
    </div>
  );
};
