export type UserRole = 'merchant' | 'customer';

export type NavSection =
  | 'dashboard'
  | 'trade'
  | 'pos'
  | 'customers'
  | 'marketplace'
  | 'ledger'
  | 'settings';

export type AssetCode =
  | 'gold18'
  | 'abshodeh'
  | 'emami'
  | 'nim'
  | 'rob'
  | 'bullion24';

export interface PricePoint {
  time: string;
  price: number;
}

export interface MarketAsset {
  code: AssetCode;
  name: string;
  shortName: string;
  karat: number;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  history1H: PricePoint[];
  history1D: PricePoint[];
  history1W: PricePoint[];
  history1M: PricePoint[];
}

export interface GoldShop {
  id: string;
  name: string;
  ownerName: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  licenseNo: string;
  terminalId: string;
  // Official Moadian V7.9 Merchant Tax Profile
  economicCode: string; // tins (11 or 14 digits)
  branchCode: string; // sbc (4 digits, default '0000')
  fiscalMemoryId: string; // 6-char memory ID for taxid generation
  paymentSwitchCode: string; // iinn (9 digits)
  acceptorCode: string; // acn (14 digits)
  posTerminalNumericId: string; // trmn (8 digits)
  defaultThirdPartyContractNo: string; // bsrn (max 12 digits)
  spreadPercent: number;
  rating: number;
  reviewCount: number;
  openHours: string;
  verified: boolean;
  supportsPhysicalDelivery: boolean;
  supportsOldGoldBuyback: boolean;
  distanceKm: number;
}

export type CatalogCategory = 'bullion' | 'coin' | 'abshodeh' | 'jewelry';

export interface CatalogItem {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  category: CatalogCategory;
  weightGrams: number;
  karat: number;
  wagePercent: number;
  profitPercent: number;
  brokeragePercent: number; // حق‌العمل (bros)
  sstid: string; // شناسه ۱۳ رقمی کالا/خدمت سامانه مودیان
  mu: string; // کد واحد اندازه‌گیری (164=گرم، 1627=عدد، 168=مثقال)
  vatBaseRate: number; // vra (معمولاً 0 برای اصل طلای معاف)
  assayCode: string;
  stock: number;
  imageUrl: string;
  activeOnline: boolean;
  description: string;
}

export type PickupStatus = 'pending' | 'ready' | 'delivered' | 'cancelled';

export interface PickupOrder {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  shopName: string;
  itemTitle: string;
  weightGrams: number;
  karat: number;
  totalToman: number;
  deliveryMethod: 'in_person_pos' | 'insured_courier';
  status: PickupStatus;
  createdAt: string;
  assayCode?: string;
}

export interface LimitOrder {
  id: string;
  role: UserRole;
  side: 'buy' | 'sell';
  assetCode: AssetCode;
  assetName: string;
  targetPrice: number;
  weightGrams: number;
  totalToman: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
}

export interface PriceAlert {
  id: string;
  assetCode: AssetCode;
  assetName: string;
  condition: 'above' | 'below';
  targetPrice: number;
  active: boolean;
  createdAt: string;
}

export type TransactionType =
  | 'buy_gold'
  | 'sell_gold'
  | 'pos_sale'
  | 'pos_trade_in'
  | 'physical_pickup'
  | 'p2p_gift'
  | 'deposit'
  | 'withdraw'
  | 'settlement';

export type PaymentMethod =
  | 'pos_card'
  | 'rial_wallet'
  | 'gold_wallet'
  | 'shaparak'
  | 'shaba'
  | 'cash';

// --- Official Moadian Electronic Invoice V7.9 (RC_IITP.IS_V7.9) Types ---

export type MoadianInvoiceType = 1 | 2; // 1 = نوع اول (با خریدار), 2 = نوع دوم (مصرف‌کننده نهایی)
export type MoadianInvoiceSubject = 1 | 2 | 3 | 4; // 1=اصلی, 2=اصلاحی, 3=ابطالی, 4=برگشت از فروش
export type MoadianBuyerType = 1 | 2 | 3 | 4; // 1=حقیقی, 2=حقوقی, 3=مشارکت مدنی, 4=اتباع غیرایرانی
export type MoadianSettlementMethod = 1 | 2 | 3; // 1=نقدی, 2=نسیه, 3=نقدی/نسیه
export type MoadianPaymentMethodCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 1=چک, 2=تهاتر, 3=نقد, 4=POS, 5=درگاه اینترنتی, 6=کارت به کارت, 7=انتقال به حساب, 8=سایر
export type MoadianSubmissionStatus = 'draft_local' | 'sent_pending' | 'accepted' | 'cancelled_ref';

export interface MoadianHeaderJson {
  taxid: string; // 22 chars
  indatim: number; // Unix timestamp ms (13 digits)
  indati2m?: number | null; // Unix timestamp ms (Article 9 delayed registration)
  inty: MoadianInvoiceType;
  inno: string; // 10-char hex serial
  irtaxid?: string | null; // 22-char reference taxid for ins=2,3,4
  inp: 3; // الگوی سوم: صورتحساب طلا، جواهر و پلاتین
  ins: MoadianInvoiceSubject;
  tins: string; // شماره اقتصادی فروشنده (11 or 14)
  sbc?: string | null; // کد شعبه فروشنده (4)
  tob?: MoadianBuyerType | null;
  bid?: string | null; // کد ملی/شناسه ملی/مشارکت/فراگیر خریدار
  tinb?: string | null; // شماره اقتصادی خریدار
  bpc?: string | null; // کد پستی خریدار (10)
  bbc?: string | null; // کد شعبه خریدار (4)
  bpn?: string | null; // شماره گذرنامه اتباع (9)
  tprdis: number; // مجموع مبلغ قبل از تخفیف (ریال)
  tdis: number; // مجموع تخفیفات (ریال)
  tadis: number; // مجموع مبلغ پس از کسر تخفیف (ریال)
  tvam: number; // مجموع مالیات بر ارزش افزوده (ریال)
  todam: number; // مجموع سایر مالیات، عوارض و وجوه قانونی (ریال)
  tbill: number; // مجموع صورتحساب (ریال)
  setm?: MoadianSettlementMethod | null; // روش تسویه (نوع اول)
  cap?: number | null; // مبلغ پرداختی نقدی (ریال)
  insp?: number | null; // مبلغ نسیه (ریال)
  tvop?: number | null; // مجموع سهم مالیات بر ارزش افزوده از پرداخت (ریال)
  tax17?: number | null; // مالیات موضوع ماده 17 (ریال)
  insr?: 1 | null; // قاعده ارسال موضوع ماده 9 (V7.9)
  nti1?: string | null; // یادداشت 1 حداکثر 30 کاراکتر (V7.9)
  nti2?: string | null; // یادداشت 2 حداکثر 30 کاراکتر (V7.9)
}

export interface MoadianBodyItemJson {
  sstid: string; // 13-digit numeric string
  sstt: string; // شرح کالا/خدمت (max 400)
  am: number; // تعداد/مقدار (وزن به گرم یا تعداد)
  mu: string; // کد واحد اندازه‌گیری (164=گرم، 1627=عدد)
  fee: number; // مبلغ واحد (ریال)
  cui: number; // عیار طلا (0 < cui <= 1000)
  prdis: number; // مبلغ قبل از تخفیف (ریال) = trunc(am * fee)
  dis: number; // مبلغ تخفیف (ریال)
  adis: number; // مبلغ بعد از تخفیف (الگوی طلا: prdis + tcpbs - dis)
  vra: number; // نرخ مالیات ارزش افزوده اصل کالا (معمولاً 0 برای طلا)
  vam: number; // مبلغ مالیات ارزش افزوده = trunc(tcpbs * 10 / 100) + trunc(prdis * vra / 100)
  odt?: string | null; // موضوع سایر مالیات و عوارض
  odr?: number | null; // نرخ سایر مالیات و عوارض
  odam: number; // مبلغ سایر مالیات و عوارض (الگوی طلا: trunc(tcpbs * odr / 100))
  olt?: string | null; // موضوع سایر وجوه قانونی
  olr?: number | null; // نرخ سایر وجوه قانونی
  olam: number; // مبلغ سایر وجوه قانونی (الگوی طلا: trunc(tcpbs * olr / 100))
  consfee: number; // اجرت ساخت (ریال)
  spro: number; // سود فروشنده (ریال)
  bros: number; // حق‌العمل (ریال)
  tcpbs: number; // جمع کل اجرت، حق‌العمل و سود (ریال)
  cop?: number | null; // سهم نقدی از پرداخت
  vop?: number | null; // سهم مالیات بر ارزش افزوده از پرداخت
  bsrn?: string | null; // شماره قرارداد معامله از طریق شخص ثالث (max 12, V7.9)
  tsstam: number; // مبلغ کل کالا/خدمت = adis + vam + odam + olam
}

export interface MoadianPaymentJson {
  iinn?: string | null; // شماره سوییچ پرداخت (9 digits)
  acn?: string | null; // شماره پذیرنده فروشگاهی (14 digits)
  trmn?: string | null; // شماره پایانه (8 digits)
  pmt: MoadianPaymentMethodCode; // روش پرداخت (1..8)
  trn?: string | null; // شماره پیگیری/مرجع (max 14)
  pcn?: string | null; // شماره کارت پرداخت‌کننده (16 digits)
  pid?: string | null; // شماره/شناسه ملی پرداخت‌کننده (max 12)
  pdt: number; // تاریخ و زمان پرداخت (Unix ms)
  pv: number; // مبلغ پرداختی (ریال)
}

export interface MoadianInvoicePayload {
  header: MoadianHeaderJson;
  body: MoadianBodyItemJson[];
  payments: MoadianPaymentJson[];
  extension: Array<Record<string, unknown>>;
}

export interface MoadianInvoiceRecord {
  id: string;
  taxid: string;
  inno: string;
  irtaxid?: string | null;
  inty: MoadianInvoiceType;
  ins: MoadianInvoiceSubject;
  buyerName: string;
  buyerNationalOrEcoId?: string;
  totalRial: number;
  totalToman: number;
  totalVatRial: number;
  totalGoldGrams: number;
  createdAtPersian: string;
  status: MoadianSubmissionStatus;
  referenceUid?: string;
  payload: MoadianInvoicePayload;
}

export interface ThermalReceiptItem {
  title: string;
  sstid?: string;
  weightGrams: number;
  karat: number;
  unitPrice: number;
  totalToman: number;
}

export interface SplitPaymentEntry {
  id: string;
  method: PaymentMethod;
  methodLabel: string;
  amountToman: number;
  rrn: string;
  cardMask?: string;
  rawCard16?: string;
}

export interface ThermalReceipt {
  invoiceNo: string;
  rrn: string;
  terminalId: string;
  merchantName: string;
  merchantLicense: string;
  merchantEconomicCode?: string;
  merchantAddress: string;
  customerName: string;
  customerPhone: string;
  customerNationalId?: string;
  dateTime: string;
  receiptKind?: 'sale' | 'buyback' | 'trade_in';
  items: ThermalReceiptItem[];
  oldGoldDeduction?: {
    weightGrams: number;
    karat: number;
    valueToman: number;
  };
  goldBaseToman: number;
  wageToman: number;
  profitToman: number;
  brokerageToman?: number;
  discountToman?: number;
  otherDutiesToman?: number;
  taxToman: number;
  totalToman: number;
  paymentMethodLabel: string;
  cardMask?: string;
  splitPayments?: SplitPaymentEntry[];
  assayCode?: string;
  pickupCode?: string;
  note?: string;
  // Moadian V7.9 Metadata attached to receipt
  taxid?: string;
  irtaxid?: string | null;
  inty?: MoadianInvoiceType;
  ins?: MoadianInvoiceSubject;
  moadianPayload?: MoadianInvoicePayload;
}

export interface Transaction {
  id: string;
  rrn: string;
  roleVisibility: 'both' | 'merchant' | 'customer';
  type: TransactionType;
  title: string;
  counterparty: string;
  weightGrams?: number;
  karat?: number;
  amountToman: number;
  feeToman: number;
  taxToman: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  receipt?: ThermalReceipt;
}

export interface BankAccount {
  id: string;
  bankName: string;
  cardNumber: string;
  shaba: string;
  ownerName: string;
  isDefault: boolean;
  verified: boolean;
}

export interface PosHardwareStatus {
  deviceModel: string;
  androidWebViewVersion: string;
  terminalId: string;
  merchantId: string;
  printerConnected: boolean;
  printerPaperPercent: number;
  cardReaderReady: boolean;
  nfcEnabled: boolean;
  scannerReady: boolean;
  scaleConnected: boolean;
  scaleModel: string;
  batteryPercent: number;
  autoPrintReceipts: boolean;
  printDuplicateCopy: boolean;
  bridgeLog: Array<{
    id: string;
    time: string;
    method: string;
    payload: string;
    result: string;
  }>;
}

export interface PosPaymentRequest {
  amountToman: number;
  title: string;
  customerName: string;
  onSuccess: (details: { rrn: string; cardMask: string; rawCard16: string }) => void;
}

export type CustomerTier = 'vip' | 'regular' | 'colleague';

export interface ShopCustomer {
  id: string;
  name: string;
  phone: string;
  nationalId?: string;
  tier: CustomerTier;
  kycVerified: boolean;
  totalSpentToman: number;
  totalGoldGrams: number;
  visitCount: number;
  lastVisitPersian: string;
  /** Positive = customer deposit/credit (بیعانه/بستانکار), Negative = customer debt (بدهکار/نسیه) */
  rialAccountBalanceToman: number;
  /** Positive = gold held in trust for customer (امانت/طلب طلایی), Negative = gold owed by customer */
  goldAccountBalanceGrams: number;
  shaba?: string;
  birthDatePersian?: string;
  preferencesNote?: string;
  createdAtPersian: string;
}
