import { Transaction } from '../types/gold';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function formatNumber(num: number, decimals = 0): string {
  const fixed = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const combined = decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  return toPersianDigits(combined);
}

export function formatToman(amount: number, showUnit = true): string {
  const formatted = formatNumber(Math.round(amount));
  return showUnit ? `${formatted} تومان` : formatted;
}

export function formatRial(amountRial: number, showUnit = true): string {
  const formatted = formatNumber(Math.trunc(amountRial));
  return showUnit ? `${formatted} ریال` : formatted;
}

export function formatGrams(grams: number, detailed = false): string {
  const safe = Math.max(0, grams);
  if (!detailed) {
    return `${toPersianDigits(safe.toFixed(3))} گرم`;
  }
  const wholeGrams = Math.floor(safe);
  const soot = Math.round((safe - wholeGrams) * 1000);
  if (wholeGrams === 0) {
    return `${toPersianDigits(soot)} سوت`;
  }
  if (soot === 0) {
    return `${toPersianDigits(wholeGrams)} گرم`;
  }
  return `${toPersianDigits(wholeGrams)} گرم و ${toPersianDigits(soot)} سوت`;
}

export function formatPercent(val: number, showSign = false): string {
  const sign = showSign && val > 0 ? '+' : '';
  return `${sign}${toPersianDigits(val.toFixed(2))}٪`;
}

export interface IranGoldInvoiceInput {
  weightGrams: number;
  karat: number; // e.g., 750, 900, 995
  gold18SellPrice: number;
  gold18BuyPrice: number;
  wageType: 'percent' | 'fixed_per_gram';
  wageValue: number;
  profitPercent: number;
  brokeragePercent?: number; // حق‌العمل (bros)
  discountToman?: number; // تخفیف (dis)
  baseVatRate?: number; // vra (0 for exempt raw gold, 10 for taxable jewelry stones)
  includeVat: boolean; // 10% on wage + brokerage + profit (RC_IITP.IS_V7.9 Table 44 Row 4)
  oldGoldGrams?: number;
  oldGoldKarat?: number;
}

export interface IranGoldInvoiceResult {
  goldBaseToman: number;
  wageToman: number;
  brokerageToman: number;
  profitToman: number;
  tcpbsToman: number;
  discountToman: number;
  taxToman: number;
  grossTotalToman: number;
  oldGoldValueToman: number;
  netPayableToman: number;
}

/**
 * Official Iranian Gold & Jewelry Moadian V7.9 Pattern 3 calculation:
 * Gold base (prdis) = weight * (karat / 750) * 18K rate
 * Wage (consfee) = percent of gold base OR fixed amount per gram
 * Brokerage (bros) = brokeragePercent of gold base
 * Profit (spro) = profitPercent of (gold base + wage)
 * tcpbs = consfee + bros + spro
 * adis = prdis + tcpbs - dis
 * VAT (10%) = applied to tcpbs (consfee + bros + spro), plus optional vra% on prdis.
 */
export function calculateIranGoldInvoice(
  input: IranGoldInvoiceInput
): IranGoldInvoiceResult {
  const weight = Math.max(0, input.weightGrams);
  const karatFactor = input.karat / 750;
  const goldBaseToman = Math.trunc(weight * karatFactor * input.gold18SellPrice);

  const wageToman =
    input.wageType === 'percent'
      ? Math.trunc((goldBaseToman * Math.max(0, input.wageValue)) / 100)
      : Math.trunc(weight * Math.max(0, input.wageValue));

  const brokerageToman = Math.trunc(
    (goldBaseToman * Math.max(0, input.brokeragePercent || 0)) / 100
  );

  const profitToman = Math.trunc(
    ((goldBaseToman + wageToman) * Math.max(0, input.profitPercent)) / 100
  );

  const tcpbsToman = wageToman + brokerageToman + profitToman;
  const discountToman = Math.min(Math.trunc(Math.max(0, input.discountToman || 0)), goldBaseToman);

  const baseVat = Math.trunc((goldBaseToman * Math.max(0, input.baseVatRate || 0)) / 100);
  const taxToman = input.includeVat
    ? Math.trunc((tcpbsToman * 10) / 100) + baseVat
    : baseVat;

  const grossTotalToman = Math.max(0, goldBaseToman + tcpbsToman - discountToman) + taxToman;

  const oldWeight = Math.max(0, input.oldGoldGrams || 0);
  const oldKarat = input.oldGoldKarat || 750;
  const oldGoldValueToman = Math.trunc(
    oldWeight * (oldKarat / 750) * input.gold18BuyPrice
  );

  const netPayableToman = Math.max(0, grossTotalToman - oldGoldValueToman);

  return {
    goldBaseToman,
    wageToman,
    brokerageToman,
    profitToman,
    tcpbsToman,
    discountToman,
    taxToman,
    grossTotalToman,
    oldGoldValueToman,
    netPayableToman,
  };
}

export function generateRRN(): string {
  const base = Math.floor(100000000000 + Math.random() * 899999999999);
  return String(base);
}

export function generateInvoiceNo(): string {
  const num = Math.floor(104000 + Math.random() * 895000);
  return `INV-${num}`;
}

export function generatePickupCode(): string {
  const num = Math.floor(100000 + Math.random() * 899999);
  return `ZP-${num}`;
}

export function getNowPersianTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return toPersianDigits(`۱۴۰۵/۰۹/۰۱ - ${hh}:${mm}`);
}

export function exportTransactionsToCsv(transactions: Transaction[]): void {
  const headers = [
    'شناسه',
    'کد پیگیری',
    'نوع عملیات',
    'شرح',
    'طرف حساب',
    'وزن (گرم)',
    'مبلغ (تومان)',
    'کارمزد (تومان)',
    'وضعیت',
    'تاریخ و ساعت',
  ];

  const rows = transactions.map((tx) => [
    tx.id,
    tx.rrn,
    tx.type,
    tx.title,
    tx.counterparty,
    tx.weightGrams !== undefined ? tx.weightGrams.toFixed(3) : '-',
    tx.amountToman,
    tx.feeToman,
    tx.status,
    tx.timestamp,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `zarpos-ledger-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
