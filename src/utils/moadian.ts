import {
  GoldShop,
  MoadianBodyItemJson,
  MoadianBuyerType,
  MoadianInvoicePayload,
  MoadianInvoiceSubject,
  MoadianInvoiceType,
  MoadianPaymentJson,
  MoadianPaymentMethodCode,
  MoadianSettlementMethod,
} from '../types/gold';
import { toEnglishDigits } from './format';

/**
 * Official Iranian Tax Administration (stuffid.tax.gov.ir) sample 13-digit SSTIDs for Gold Pattern 3
 */
export const OFFICIAL_GOLD_SSTIDS = [
  {
    sstid: '2720000114563',
    label: 'مصنوعات طلا و زیورآلات (۱۸ عیار)',
    defaultMu: '164',
    defaultVra: 0,
    defaultKarat: 750,
  },
  {
    sstid: '2720000114570',
    label: 'طلای آب‌شده (با کد ری‌گیری)',
    defaultMu: '164',
    defaultVra: 0,
    defaultKarat: 750,
  },
  {
    sstid: '2720000114587',
    label: 'شمش طلای استاندارد (۲۴ عیار / ۹۹۵)',
    defaultMu: '164',
    defaultVra: 0,
    defaultKarat: 995,
  },
  {
    sstid: '2720000114594',
    label: 'مسکوکات و سکه طلا (تمام / نیم / ربع)',
    defaultMu: '1627',
    defaultVra: 0,
    defaultKarat: 900,
  },
  {
    sstid: '2720000114600',
    label: 'طلای حق‌العمل‌کاری / معامله از طریق شخص ثالث',
    defaultMu: '164',
    defaultVra: 0,
    defaultKarat: 750,
  },
  {
    sstid: '2720000114617',
    label: 'جواهرات و سنگ‌های قیمتی نصب‌شده (مشمول نرخ پایه)',
    defaultMu: '164',
    defaultVra: 10,
    defaultKarat: 750,
  },
];

/**
 * Official Measurement Units from RC_UMGS.ST
 */
export const OFFICIAL_GOLD_UNITS = [
  { code: '164', label: 'گرم' },
  { code: '1627', label: 'عدد / قطعه' },
  { code: '168', label: 'مثقال' },
  { code: '163', label: 'کیلوگرم' },
];

export const MOADIAN_SUBJECT_LABELS: Record<MoadianInvoiceSubject, string> = {
  1: 'اصلی (فروش)',
  2: 'اصلاحی',
  3: 'ابطالی',
  4: 'برگشت از فروش',
};

export const MOADIAN_BUYER_TYPE_LABELS: Record<MoadianBuyerType, string> = {
  1: 'حقیقی (۱)',
  2: 'حقوقی (۲)',
  3: 'مشارکت مدنی (۳)',
  4: 'اتباع غیرایرانی (۴)',
};

export const MOADIAN_SETTLEMENT_LABELS: Record<MoadianSettlementMethod, string> = {
  1: 'نقدی (۱)',
  2: 'نسیه (۲)',
  3: 'نقدی / نسیه (۳)',
};

export const MOADIAN_PAYMENT_METHOD_LABELS: Record<MoadianPaymentMethodCode, string> = {
  1: 'چک (۱)',
  2: 'تهاتر / طلای تعویضی (۲)',
  3: 'وجه نقد (۳)',
  4: 'دستگاه کارتخوان POS (۴)',
  5: 'درگاه پرداخت اینترنتی (۵)',
  6: 'کارت به کارت (۶)',
  7: 'انتقال به حساب / شبا (۷)',
  8: 'سایر (۸)',
};

/**
 * Generates a realistic 10-character uppercase hex internal serial (inno)
 */
export function generateFiscalInno(counterSeed?: number): string {
  const num = counterSeed ?? Math.floor(Date.now() / 100) % 0xffffffffff;
  return num.toString(16).toUpperCase().padStart(10, '0').slice(-10);
}

/**
 * Generates a 22-character official-format Tax ID (taxid) per RC_DCPS.SN:
 * 6 chars Fiscal Memory ID + 5 chars Hex Days Since Epoch + 10 chars Hex Serial + 1 Check Digit
 */
export function generateMoadianTaxId(
  fiscalMemoryId: string,
  issueTimestampMs: number,
  innoHex: string
): string {
  const mem = (fiscalMemoryId || 'A1B2C3').toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(6, '0').slice(0, 6);
  const daysSinceEpoch = Math.floor(issueTimestampMs / 86400000);
  const dateHex = daysSinceEpoch.toString(16).toUpperCase().padStart(5, '0').slice(-5);
  const serialHex = innoHex.toUpperCase().padStart(10, '0').slice(-10);
  const raw21 = `${mem}${dateHex}${serialHex}`;
  // Simple deterministic Verhoeff-style check digit for demo fidelity
  let sum = 0;
  for (let i = 0; i < raw21.length; i++) {
    sum += raw21.charCodeAt(i) * (i + 3);
  }
  const checkDigit = String(sum % 10);
  return `${raw21}${checkDigit}`;
}

export interface GoldInvoiceLineInput {
  id: string;
  catalogItemId?: string;
  sstid: string;
  sstt: string;
  am: number; // weight in grams or count
  mu: string; // 164 = gram, 1627 = piece
  cui: number; // karat 0 < cui <= 1000
  feeToman: number; // unit price in Toman (converted to Rial x10)
  wageMode: 'percent' | 'fixed_toman_per_unit';
  wageInput: number;
  profitPercent: number;
  brokerageMode: 'percent' | 'fixed_toman';
  brokerageInput: number;
  discountToman: number;
  vra: number; // base VAT rate on raw gold (0% for exempt gold, 10% for taxable jewelry stones)
  odt?: string; // موضوع سایر مالیات و عوارض
  odr?: number; // نرخ سایر مالیات و عوارض
  olt?: string; // موضوع سایر وجوه قانونی
  olr?: number; // نرخ سایر وجوه قانونی
  bsrn?: string; // شماره قرارداد معامله از طریق شخص ثالث (V7.9)
  assayCode?: string;
}

export interface ComputedGoldLineRial {
  bodyItem: MoadianBodyItemJson;
  prdisToman: number;
  consfeeToman: number;
  sproToman: number;
  brosToman: number;
  tcpbsToman: number;
  disToman: number;
  adisToman: number;
  vamToman: number;
  otherDutiesToman: number;
  tsstamToman: number;
}

/**
 * Computes a single Gold Pattern 3 line strictly following RC_IITP.IS_V7.9 rules (in RIAL, using truncation):
 * - prdis (Es) = trunc(am * feeRial)
 * - consfee (TA), spro (TA3), bros (TA2)
 * - tcpbs (TAs) = consfee + bros + spro
 * - adis (Is) = prdis + tcpbs - dis           [Page 60, Table 42, Row 4]
 * - vam (Ks) = trunc((tcpbs * 10) / 100) + trunc((prdis * vra) / 100)   [Page 62, Table 44, Row 4]
 * - odam (Ks2) = trunc((tcpbs * odr) / 100)   [Page 65, Table 45, Row 12]
 * - olam (Ks3) = trunc((tcpbs * olr) / 100)   [Page 65, Table 45, Row 13]
 * - tsstam (Os) = adis + vam + odam + olam    [Page 73, Table 53, Row 1]
 */
export function computeGoldLineV79(line: GoldInvoiceLineInput): ComputedGoldLineRial {
  const am = Math.max(0, Number(line.am) || 0);
  const feeRial = Math.trunc(Math.max(0, Number(line.feeToman) || 0) * 10);
  const prdis = Math.trunc(am * feeRial);

  const consfee =
    line.wageMode === 'percent'
      ? Math.trunc((prdis * Math.max(0, Number(line.wageInput) || 0)) / 100)
      : Math.trunc(am * Math.max(0, Number(line.wageInput) || 0) * 10);

  const bros =
    line.brokerageMode === 'percent'
      ? Math.trunc((prdis * Math.max(0, Number(line.brokerageInput) || 0)) / 100)
      : Math.trunc(Math.max(0, Number(line.brokerageInput) || 0) * 10);

  const spro = Math.trunc(((prdis + consfee) * Math.max(0, Number(line.profitPercent) || 0)) / 100);

  const tcpbs = consfee + bros + spro;

  const rawDis = Math.trunc(Math.max(0, Number(line.discountToman) || 0) * 10);
  // Rule (Page 59, Row 3): dis <= prdis
  const dis = Math.min(rawDis, prdis);

  // Rule (Page 60, Row 4): Gold Pattern 3 adis = prdis + tcpbs - dis
  const adis = Math.max(0, prdis + tcpbs - dis);

  const vra = Math.max(0, Number(line.vra) || 0);
  // Rule (Page 62, Row 4): Gold Pattern 3 vam = ((tcpbs * 10) / 100) + ((prdis * vra) / 100)
  const vam = Math.trunc((tcpbs * 10) / 100) + Math.trunc((prdis * vra) / 100);

  const odr = Math.max(0, Number(line.odr) || 0);
  const odam = odr > 0 ? Math.trunc((tcpbs * odr) / 100) : 0;

  const olr = Math.max(0, Number(line.olr) || 0);
  const olam = olr > 0 ? Math.trunc((tcpbs * olr) / 100) : 0;

  // Rule (Page 73, Row 1): tsstam = adis + vam + odam + olam
  const tsstam = adis + vam + odam + olam;

  const bodyItem: MoadianBodyItemJson = {
    sstid: toEnglishDigits(line.sstid || '').replace(/\D/g, ''),
    sstt: (line.sstt || '').slice(0, 400),
    am: Number(am.toFixed(6)),
    mu: line.mu || '164',
    fee: feeRial,
    cui: Number((Number(line.cui) || 750).toFixed(2)),
    prdis,
    dis,
    adis,
    vra,
    vam,
    odt: line.odt?.trim() ? line.odt.trim().slice(0, 255) : null,
    odr: odr > 0 ? odr : null,
    odam,
    olt: line.olt?.trim() ? line.olt.trim().slice(0, 255) : null,
    olr: olr > 0 ? olr : null,
    olam,
    consfee,
    spro,
    bros,
    tcpbs,
    bsrn: line.bsrn?.trim() ? toEnglishDigits(line.bsrn).replace(/\D/g, '').slice(0, 12) : null,
    tsstam,
  };

  return {
    bodyItem,
    prdisToman: Math.round(prdis / 10),
    consfeeToman: Math.round(consfee / 10),
    sproToman: Math.round(spro / 10),
    brosToman: Math.round(bros / 10),
    tcpbsToman: Math.round(tcpbs / 10),
    disToman: Math.round(dis / 10),
    adisToman: Math.round(adis / 10),
    vamToman: Math.round(vam / 10),
    otherDutiesToman: Math.round((odam + olam) / 10),
    tsstamToman: Math.round(tsstam / 10),
  };
}

export interface BuildMoadianInvoiceParams {
  shop: GoldShop;
  inty: MoadianInvoiceType;
  ins: MoadianInvoiceSubject;
  irtaxid?: string | null;
  issueTimestampMs?: number;
  isArticle9Delayed?: boolean;
  buyer?: {
    tob: MoadianBuyerType;
    bid: string;
    tinb: string;
    bpc: string;
    bbc: string;
    bpn: string;
  };
  lines: GoldInvoiceLineInput[];
  setm: MoadianSettlementMethod;
  cashPaidRial?: number; // For setm=3 (نقدی/نسیه)
  tax17Rial?: number;
  nti1?: string;
  nti2?: string;
  payments: Array<{
    pmt: MoadianPaymentMethodCode;
    pvRial: number;
    trn?: string;
    pcn?: string;
    pid?: string;
  }>;
}

export interface MoadianValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export function buildMoadianV79Payload(params: BuildMoadianInvoiceParams): {
  payload: MoadianInvoicePayload;
  issues: MoadianValidationIssue[];
  summary: {
    tprdisRial: number;
    tdisRial: number;
    tadisRial: number;
    tvamRial: number;
    todamRial: number;
    tbillRial: number;
    totalWageRial: number;
    totalProfitRial: number;
    totalBrokerageRial: number;
    totalTcpbsRial: number;
  };
} {
  const nowMs = params.issueTimestampMs ?? Date.now();
  const inno = generateFiscalInno();
  const taxid = generateMoadianTaxId(params.shop.fiscalMemoryId, nowMs, inno);

  const computedLines = params.lines.map(computeGoldLineV79);

  const tprdis = computedLines.reduce((acc, l) => acc + l.bodyItem.prdis, 0);
  const tdis = computedLines.reduce((acc, l) => acc + l.bodyItem.dis, 0);
  const tadis = computedLines.reduce((acc, l) => acc + l.bodyItem.adis, 0);
  const tvam = computedLines.reduce((acc, l) => acc + l.bodyItem.vam, 0);
  const todam = computedLines.reduce((acc, l) => acc + l.bodyItem.odam + l.bodyItem.olam, 0);
  const tbill = computedLines.reduce((acc, l) => acc + l.bodyItem.tsstam, 0);
  const totalWageRial = computedLines.reduce((acc, l) => acc + l.bodyItem.consfee, 0);
  const totalProfitRial = computedLines.reduce((acc, l) => acc + l.bodyItem.spro, 0);
  const totalBrokerageRial = computedLines.reduce((acc, l) => acc + l.bodyItem.bros, 0);
  const totalTcpbsRial = computedLines.reduce((acc, l) => acc + l.bodyItem.tcpbs, 0);

  // Settlement calculation (Pages 45-48, 70-71)
  // Type 2 invoices always ignore setm/cap/insp/tvop/cop/vop per Table 1 (Page 14) & Table 6 Row 2
  const isType1 = params.inty === 1;
  const maxCashCap = Math.max(0, tbill - todam - tvam);
  let cap: number | null = null;
  let insp: number | null = null;
  let tvop: number | null = null;

  if (isType1) {
    if (params.setm === 1) {
      cap = maxCashCap;
      insp = 0;
    } else if (params.setm === 2) {
      cap = 0;
      insp = maxCashCap;
    } else {
      const requestedCash = Math.trunc(params.cashPaidRial ?? Math.floor(maxCashCap / 2));
      cap = Math.min(Math.max(0, requestedCash), maxCashCap);
      insp = Math.max(0, maxCashCap - cap);
    }
  }

  // Compute cop & vop per body item for Type 1 (Pages 70-71)
  const finalBody: MoadianBodyItemJson[] = computedLines.map(({ bodyItem }) => {
    if (!isType1 || cap === null || tadis <= 0) {
      return { ...bodyItem, cop: null, vop: null };
    }
    const cop = Math.trunc((bodyItem.tsstam * cap) / tadis);
    const vop = bodyItem.vam > 0 ? Math.trunc((bodyItem.vam * cap) / tadis) : 0;
    return { ...bodyItem, cop, vop };
  });

  if (isType1) {
    tvop = finalBody.reduce((acc, b) => acc + (b.vop || 0), 0);
  }

  // Buyer fields: for ins=2,3,4 buyer info is out-of-pattern (Page 32 Row 4), and for Type 2 optional
  const cleanDigits = (v?: string) => toEnglishDigits(v || '').replace(/\D/g, '');
  const includeBuyer = params.ins === 1 && (params.inty === 1 || Boolean(params.buyer?.bid || params.buyer?.tinb));

  const headerBuyer = includeBuyer && params.buyer
    ? {
        tob: params.buyer.tob,
        bid: cleanDigits(params.buyer.bid) || null,
        tinb: cleanDigits(params.buyer.tinb) || null,
        bpc: cleanDigits(params.buyer.bpc) || null,
        bbc: cleanDigits(params.buyer.bbc) || null,
        bpn: params.buyer.tob === 4 && params.buyer.bpn.trim() ? params.buyer.bpn.trim().slice(0, 9) : null,
      }
    : {
        tob: null,
        bid: null,
        tinb: null,
        bpc: null,
        bbc: null,
        bpn: null,
      };

  const payments: MoadianPaymentJson[] =
    params.ins === 3 || (isType1 && params.setm === 2)
      ? []
      : params.payments
          .filter((p) => p.pvRial > 0)
          .map((p) => ({
            iinn: p.pmt === 4 || p.pmt === 5 ? params.shop.paymentSwitchCode : null,
            acn: p.pmt === 4 || p.pmt === 5 ? params.shop.acceptorCode : null,
            trmn: p.pmt === 4 ? params.shop.posTerminalNumericId : null,
            pmt: p.pmt,
            trn: p.trn ? cleanDigits(p.trn).slice(0, 14) : null,
            pcn: p.pcn ? cleanDigits(p.pcn).slice(0, 16) : null,
            pid: p.pid ? cleanDigits(p.pid).slice(0, 12) : null,
            pdt: nowMs,
            pv: Math.min(Math.trunc(p.pvRial), tbill),
          }));

  const payload: MoadianInvoicePayload = {
    header: {
      taxid,
      indatim: nowMs,
      indati2m: params.isArticle9Delayed ? Date.now() : null,
      inty: params.inty,
      inno,
      irtaxid: params.ins !== 1 ? (params.irtaxid || '').trim().toUpperCase() || null : null,
      inp: 3,
      ins: params.ins,
      tins: cleanDigits(params.shop.economicCode),
      sbc: cleanDigits(params.shop.branchCode) || '0000',
      ...headerBuyer,
      tprdis,
      tdis,
      tadis,
      tvam,
      todam,
      tbill,
      setm: isType1 ? params.setm : null,
      cap,
      insp,
      tvop,
      tax17:
        params.tax17Rial && params.tax17Rial > 0
          ? Math.min(Math.trunc(params.tax17Rial), tvam)
          : null,
      insr: params.isArticle9Delayed ? 1 : null,
      nti1: params.nti1?.trim() ? params.nti1.trim().slice(0, 30) : null,
      nti2: params.nti2?.trim() ? params.nti2.trim().slice(0, 30) : null,
    },
    // Page 17: Cancellation invoice (ins=3) fetches body from reference invoice in Moadian; keep body empty or minimal
    body: params.ins === 3 ? [] : finalBody,
    payments,
    extension: [],
  };

  // Run Official RC_IITP.IS_V7.9 Validation Rules
  const issues = validateMoadianV79Payload(payload);

  return {
    payload,
    issues,
    summary: {
      tprdisRial: tprdis,
      tdisRial: tdis,
      tadisRial: tadis,
      tvamRial: tvam,
      todamRial: todam,
      tbillRial: tbill,
      totalWageRial,
      totalProfitRial,
      totalBrokerageRial,
      totalTcpbsRial,
    },
  };
}

/**
 * Validates a Moadian Gold Pattern 3 JSON payload against key RC_IITP.IS_V7.9 control tables
 */
export function validateMoadianV79Payload(payload: MoadianInvoicePayload): MoadianValidationIssue[] {
  const issues: MoadianValidationIssue[] = [];
  const { header, body } = payload;

  // Table 3: taxid 22 chars
  if (header.taxid.length !== 22) {
    issues.push({ field: 'taxid', severity: 'error', message: 'شماره منحصر به فرد مالیاتی باید دقیقاً ۲۲ کاراکتر باشد.' });
  }

  // Table 11 Row 1: Seller tins (11 or 14 digits)
  if (header.tins.length !== 11 && header.tins.length !== 14) {
    issues.push({
      field: 'tins',
      severity: 'error',
      message: 'شماره اقتصادی فروشنده (tins) باید ۱۱ یا ۱۴ رقم عددی باشد.',
    });
  }

  // Table 8: Reference taxid required for ins=2,3,4
  if (header.ins !== 1 && (!header.irtaxid || header.irtaxid.length !== 22)) {
    issues.push({
      field: 'irtaxid',
      severity: 'error',
      message: 'برای صورتحساب اصلاحی، ابطالی یا برگشت از فروش، درج شماره مالیاتی مرجع ۲۲ کاراکتری (irtaxid) الزامی است.',
    });
  }

  // Table 11 Rows 4 & 5: Buyer checks for Type 1 Main Invoice
  if (header.inty === 1 && header.ins === 1) {
    if (!header.tob) {
      issues.push({ field: 'tob', severity: 'error', message: 'در صورتحساب نوع اول، انتخاب نوع شخص خریدار الزامی است.' });
    } else if (header.tob === 1 || header.tob === 4) {
      const hasEco = header.tinb && (header.tinb.length === 11 || header.tinb.length === 14);
      const validBidLen = header.tob === 1 ? header.bid?.length === 10 : header.bid?.length === 12;
      const validBpc = header.bpc?.length === 10;
      if (!hasEco && !(validBidLen && validBpc)) {
        issues.push({
          field: 'bid/bpc',
          severity: 'error',
          message:
            header.tob === 1
              ? 'در صورتحساب نوع اول برای خریدار حقیقی، ثبت «شماره اقتصادی» یا «کد ملی ۱۰ رقمی + کد پستی ۱۰ رقمی» الزامی است (جدول ۱۱ ردیف ۴).'
              : 'برای اتباع غیرایرانی در نوع اول، ثبت شماره اقتصادی یا کد فراگیر ۱۲ رقمی به همراه کد پستی ۱۰ رقمی الزامی است.',
        });
      }
    } else if (header.tob === 2 || header.tob === 3) {
      if (!header.tinb || (header.tinb.length !== 11 && header.tinb.length !== 14)) {
        issues.push({
          field: 'tinb',
          severity: 'error',
          message: 'برای خریدار حقوقی یا مشارکت مدنی در نوع اول، ثبت شماره اقتصادی خریدار (۱۱ یا ۱۴ رقمی) الزامی است (جدول ۱۱ ردیف ۵).',
        });
      }
    }
  }

  // Table 24-26: Settlement checks for setm = 3 (نقدی/نسیه)
  if (header.inty === 1 && header.setm === 3) {
    if (!header.cap || header.cap <= 0 || !header.insp || header.insp <= 0) {
      issues.push({
        field: 'cap/insp',
        severity: 'error',
        message: 'در روش تسویه نقدی/نسیه (۳)، هر دو مبلغ پرداختی نقدی (cap) و مبلغ نسیه (insp) باید بزرگ‌تر از صفر باشند.',
      });
    }
  }

  // Body item checks (not required for ins=3 cancellation)
  if (header.ins !== 3) {
    if (body.length === 0) {
      issues.push({ field: 'body', severity: 'error', message: 'صورتحساب باید حداقل دارای یک ردیف کالا باشد.' });
    }
    body.forEach((item, idx) => {
      const rowLabel = `ردیف ${idx + 1}`;
      if (item.sstid.length !== 13) {
        issues.push({
          field: `body[${idx}].sstid`,
          severity: 'error',
          message: `${rowLabel}: شناسه کالا/خدمت (sstid) باید دقیقاً ۱۳ رقم عددی باشد (جدول ۲۹).`,
        });
      }
      if (item.am <= 0) {
        issues.push({ field: `body[${idx}].am`, severity: 'error', message: `${rowLabel}: وزن/مقدار (am) باید بزرگ‌تر از صفر باشد.` });
      }
      if (item.fee <= 0) {
        issues.push({ field: `body[${idx}].fee`, severity: 'error', message: `${rowLabel}: مبلغ واحد (fee) باید بزرگ‌تر از صفر باشد.` });
      }
      if (item.cui <= 0 || item.cui > 1000) {
        issues.push({
          field: `body[${idx}].cui`,
          severity: 'error',
          message: `${rowLabel}: عیار طلا (cui) باید بزرگ‌تر از ۰ و حداکثر ۱۰۰۰ باشد (جدول ۶۳).`,
        });
      }
      if (item.consfee >= item.prdis && item.prdis > 0) {
        issues.push({
          field: `body[${idx}].consfee`,
          severity: 'error',
          message: `${rowLabel}: اجرت ساخت (consfee) باید کمتر از بهای خام طلا (prdis) باشد (جدول ۴۶ ردیف ۱).`,
        });
      }
      if (item.bros > 0 && !item.bsrn) {
        issues.push({
          field: `body[${idx}].bsrn`,
          severity: 'warning',
          message: `${rowLabel}: در صورت دریافت حق‌العمل، ثبت «شماره قرارداد معامله از طریق شخص ثالث» (bsrn) در کارپوشه توصیه می‌شود.`,
        });
      }
    });
  }

  // Article 9 delayed rule check (Table 86)
  if (header.insr === 1 && !header.indati2m) {
    issues.push({
      field: 'indati2m',
      severity: 'error',
      message: 'در صورتحساب موضوع ماده ۹ (insr=1)، درج تاریخ و زمان ثبت صورتحساب (indati2m) الزامی است.',
    });
  }

  return issues;
}
