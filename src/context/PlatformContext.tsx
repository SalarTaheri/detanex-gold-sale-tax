import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AssetCode,
  BankAccount,
  CatalogItem,
  GoldShop,
  LimitOrder,
  MarketAsset,
  MoadianInvoiceRecord,
  NavSection,
  PaymentMethod,
  PickupOrder,
  PosHardwareStatus,
  PosPaymentRequest,
  PriceAlert,
  ShopCustomer,
  ThermalReceipt,
  Transaction,
  UserRole,
} from '../types/gold';
import {
  INITIAL_CATALOG_ITEMS,
  INITIAL_CUSTOMER_BANKS,
  INITIAL_GOLD_SHOPS,
  INITIAL_LIMIT_ORDERS,
  INITIAL_MARKET_ASSETS,
  INITIAL_MERCHANT_BANKS,
  INITIAL_MOADIAN_INVOICES,
  INITIAL_PICKUP_ORDERS,
  INITIAL_POS_HARDWARE,
  INITIAL_PRICE_ALERTS,
  INITIAL_SHOP_CUSTOMERS,
  INITIAL_TRANSACTIONS,
} from '../data/mockData';
import {
  formatGrams,
  formatToman,
  generateInvoiceNo,
  generatePickupCode,
  generateRRN,
  getNowPersianTime,
  toEnglishDigits,
  toPersianDigits,
} from '../utils/format';
import {
  buildMoadianV79Payload,
  validateMoadianV79Payload,
} from '../utils/moadian';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'info' | 'warning' | 'error';
}

interface WalletState {
  goldGrams: number;
  rialBalance: number;
  pendingSettlementToman: number;
  avgBuyPrice18k: number;
}

export interface AuthUser {
  phone: string;
  name: string;
  role: UserRole;
  shopName?: string;
  loggedInAt: string;
}

interface PlatformContextValue {
  authUser: AuthUser | null;
  loginWithSmsOtp: (params: { phone: string; role: UserRole; name?: string }) => void;
  logout: () => void;

  role: UserRole;
  setRole: (r: UserRole) => void;
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  posFrameMode: boolean;
  togglePosFrameMode: () => void;

  // Live Market
  marketAssets: MarketAsset[];
  selectedAssetCode: AssetCode;
  setSelectedAssetCode: (code: AssetCode) => void;
  liveFeedEnabled: boolean;
  setLiveFeedEnabled: (val: boolean) => void;
  nudgeMarketPrice: (percentDelta: number) => void;
  gold18Asset: MarketAsset;

  // Wallets
  customerWallet: WalletState;
  merchantWallet: WalletState;
  activeWallet: WalletState;

  // Domain Data
  shops: GoldShop[];
  activeMerchantShop: GoldShop;
  catalog: CatalogItem[];
  pickupOrders: PickupOrder[];
  limitOrders: LimitOrder[];
  priceAlerts: PriceAlert[];
  transactions: Transaction[];
  moadianInvoices: MoadianInvoiceRecord[];
  customers: ShopCustomer[];
  selectedPosCustomerId: string | null;
  setSelectedPosCustomerId: (id: string | null) => void;
  customerBanks: BankAccount[];
  merchantBanks: BankAccount[];
  posHardware: PosHardwareStatus;

  // Actions
  executeInstantTrade: (params: {
    side: 'buy' | 'sell';
    assetCode: AssetCode;
    weightGrams: number;
    paymentMethod: PaymentMethod;
    shopId?: string;
    requestPhysicalPickup?: boolean;
    rrnOverride?: string;
    cardMask?: string;
    rawCard16?: string;
    customUnitPriceToman?: number;
    wageMode?: 'percent' | 'fixed_toman_per_unit';
    wageInput?: number;
    profitPercent?: number;
    brokeragePercent?: number;
    vra?: number;
  }) => boolean;
  placeLimitOrder: (params: {
    side: 'buy' | 'sell';
    assetCode: AssetCode;
    targetPrice: number;
    weightGrams: number;
  }) => void;
  cancelLimitOrder: (id: string) => void;
  addPriceAlert: (params: {
    assetCode: AssetCode;
    condition: 'above' | 'below';
    targetPrice: number;
  }) => void;
  togglePriceAlert: (id: string) => void;
  deletePriceAlert: (id: string) => void;
  createPhysicalPickup: (params: {
    shopId: string;
    itemTitle: string;
    weightGrams: number;
    karat: number;
    totalToman: number;
    deliveryMethod: 'in_person_pos' | 'insured_courier';
    deductFromGoldWallet: boolean;
    assayCode?: string;
  }) => PickupOrder | null;
  updatePickupStatus: (orderId: string, nextStatus: PickupOrder['status']) => void;
  redeemPickupByCode: (code: string) => PickupOrder | null;
  recordPosSale: (params: {
    receipt: ThermalReceipt;
    weightGrams: number;
    karat: number;
    oldGoldGrams?: number;
    paymentMethod: PaymentMethod;
    catalogItemId?: string;
    catalogItemIds?: string[];
    moadianRecord?: MoadianInvoiceRecord;
  }) => void;
  recordPosBuyback: (params: {
    receipt: ThermalReceipt;
    weightGrams: number;
    karat: number;
    equiv18kGrams: number;
    payoutToman: number;
    payoutMethod: PaymentMethod;
  }) => void;
  addMoadianInvoice: (record: MoadianInvoiceRecord) => void;
  submitMoadianInvoice: (id: string) => boolean;
  issueQuickCancelInvoice: (refRecord: MoadianInvoiceRecord) => MoadianInvoiceRecord;
  updateMerchantTaxProfile: (
    patch: Partial<
      Pick<
        GoldShop,
        | 'economicCode'
        | 'branchCode'
        | 'fiscalMemoryId'
        | 'paymentSwitchCode'
        | 'acceptorCode'
        | 'posTerminalNumericId'
        | 'defaultThirdPartyContractNo'
      >
    >
  ) => void;
  sendGoldGift: (params: {
    recipientPhone: string;
    recipientName: string;
    weightGrams: number;
    note: string;
  }) => boolean;
  depositRial: (amountToman: number, method: PaymentMethod, rrn?: string) => void;
  withdrawOrSettleShaba: (amountToman: number, shaba: string, isMerchantSettlement: boolean) => boolean;
  addCatalogItem: (item: Omit<CatalogItem, 'id' | 'shopId' | 'shopName'>) => void;
  toggleCatalogVisibility: (id: string) => void;
  updateCatalogStock: (id: string, delta: number) => void;
  addBankAccount: (bank: Omit<BankAccount, 'id' | 'verified'>) => void;
  addShopCustomer: (
    customer: Omit<
      ShopCustomer,
      'id' | 'totalSpentToman' | 'totalGoldGrams' | 'visitCount' | 'lastVisitPersian' | 'createdAtPersian'
    >
  ) => ShopCustomer;
  updateShopCustomer: (id: string, patch: Partial<ShopCustomer>) => void;
  adjustCustomerLedger: (params: {
    customerId: string;
    rialDeltaToman?: number;
    goldDeltaGrams?: number;
    reason: string;
  }) => void;
  startPosCheckoutForCustomer: (customerId: string) => void;
  updatePosHardware: (patch: Partial<PosHardwareStatus>) => void;
  logBridgeCall: (method: string, payload: string, result: string) => void;
  triggerThermalPrint: (receipt: ThermalReceipt) => void;

  // Modals & Toasts
  activeReceipt: ThermalReceipt | null;
  setActiveReceipt: (r: ThermalReceipt | null) => void;
  activeMoadianRecord: MoadianInvoiceRecord | null;
  setActiveMoadianRecord: (rec: MoadianInvoiceRecord | null) => void;
  pendingPosPayment: PosPaymentRequest | null;
  requestPosPayment: (req: PosPaymentRequest) => void;
  closePosPayment: () => void;
  qrScannerOpen: boolean;
  openQrScanner: (onScan: (code: string) => void) => void;
  closeQrScanner: () => void;
  handleQrScanned: (code: string) => void;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [role, setRoleState] = useState<UserRole>('merchant');
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [posFrameMode, setPosFrameMode] = useState<boolean>(false);

  const [marketAssets, setMarketAssets] = useState<MarketAsset[]>(INITIAL_MARKET_ASSETS);
  const [selectedAssetCode, setSelectedAssetCode] = useState<AssetCode>('gold18');
  const [liveFeedEnabled, setLiveFeedEnabled] = useState<boolean>(true);

  const [customerWallet, setCustomerWallet] = useState<WalletState>({
    goldGrams: 14.825,
    rialBalance: 38450000,
    pendingSettlementToman: 0,
    avgBuyPrice18k: 4510000,
  });

  const [merchantWallet, setMerchantWallet] = useState<WalletState>({
    goldGrams: 482.65,
    rialBalance: 312900000,
    pendingSettlementToman: 64200000,
    avgBuyPrice18k: 4620000,
  });

  const [shops, setShops] = useState<GoldShop[]>(INITIAL_GOLD_SHOPS);
  const [catalog, setCatalog] = useState<CatalogItem[]>(INITIAL_CATALOG_ITEMS);
  const [pickupOrders, setPickupOrders] = useState<PickupOrder[]>(INITIAL_PICKUP_ORDERS);
  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>(INITIAL_LIMIT_ORDERS);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(INITIAL_PRICE_ALERTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [moadianInvoices, setMoadianInvoices] = useState<MoadianInvoiceRecord[]>(INITIAL_MOADIAN_INVOICES);
  const [customers, setCustomers] = useState<ShopCustomer[]>(INITIAL_SHOP_CUSTOMERS);
  const [selectedPosCustomerId, setSelectedPosCustomerId] = useState<string | null>(null);
  const [customerBanks, setCustomerBanks] = useState<BankAccount[]>(INITIAL_CUSTOMER_BANKS);
  const [merchantBanks, setMerchantBanks] = useState<BankAccount[]>(INITIAL_MERCHANT_BANKS);
  const [posHardware, setPosHardware] = useState<PosHardwareStatus>(INITIAL_POS_HARDWARE);

  const [activeReceipt, setActiveReceipt] = useState<ThermalReceipt | null>(null);
  const [activeMoadianRecord, setActiveMoadianRecord] = useState<MoadianInvoiceRecord | null>(null);
  const [pendingPosPayment, setPendingPosPayment] = useState<PosPaymentRequest | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState<boolean>(false);
  const [qrScanCallback, setQrScanCallback] = useState<((code: string) => void) | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const activeMerchantShop = shops[0];

  const gold18Asset = useMemo(
    () => marketAssets.find((a) => a.code === 'gold18') || marketAssets[0],
    [marketAssets]
  );

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const setRole = useCallback(
    (nextRole: UserRole) => {
      setRoleState(nextRole);
      if (nextRole === 'customer' && activeNav === 'pos') {
        setActiveNav('trade');
      }
      pushToast({
        title:
          nextRole === 'merchant'
            ? 'حالت طلافروشی (پذیرنده پوز) فعال شد'
            : 'حالت کاربر عادی (خریدار و سرمایه‌گذار) فعال شد',
        description:
          nextRole === 'merchant'
            ? 'گالری طلای زمرد · پایانه ZP-POS-98412'
            : 'سارا رضایی · کیف پول طلا و خرید آنلاین',
        tone: 'info',
      });
    },
    [activeNav, pushToast]
  );

  const logBridgeCall = useCallback((method: string, payload: string, result: string) => {
    const now = new Date();
    const time = toPersianDigits(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
        now.getSeconds()
      ).padStart(2, '0')}`
    );
    setPosHardware((prev) => ({
      ...prev,
      bridgeLog: [
        { id: `log-${Date.now()}`, time, method, payload, result },
        ...prev.bridgeLog.slice(0, 14),
      ],
    }));
  }, []);

  // Apply price update & check open limit orders
  const applyPriceShift = useCallback((factorDelta: number) => {
    setMarketAssets((prev) =>
      prev.map((asset) => {
        const multiplier = 1 + factorDelta * (0.85 + Math.random() * 0.3);
        const nextSell = Math.max(100000, Math.round((asset.sellPrice * multiplier) / 1000) * 1000);
        const spreadRatio = asset.buyPrice / asset.sellPrice;
        const nextBuy = Math.round((nextSell * spreadRatio) / 1000) * 1000;
        const nextChange = Number((asset.change24hPercent + factorDelta * 100).toFixed(2));
        const now = new Date();
        const label = toPersianDigits(
          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        );
        return {
          ...asset,
          buyPrice: nextBuy,
          sellPrice: nextSell,
          change24hPercent: nextChange,
          high24h: Math.max(asset.high24h, nextSell),
          low24h: Math.min(asset.low24h, nextBuy),
          history1H: [...asset.history1H.slice(1), { time: label, price: nextSell }],
        };
      })
    );
  }, []);

  // Live subtle market ticks
  useEffect(() => {
    if (!liveFeedEnabled) return;
    const interval = setInterval(() => {
      const microDelta = (Math.random() - 0.485) * 0.0022;
      applyPriceShift(microDelta);
    }, 4500);
    return () => clearInterval(interval);
  }, [liveFeedEnabled, applyPriceShift]);

  // Check limit orders when market moves
  useEffect(() => {
    setLimitOrders((prev) => {
      let changed = false;
      const next = prev.map((ord) => {
        if (ord.status !== 'open') return ord;
        const asset = marketAssets.find((a) => a.code === ord.assetCode);
        if (!asset) return ord;
        const triggered =
          (ord.side === 'buy' && asset.sellPrice <= ord.targetPrice) ||
          (ord.side === 'sell' && asset.buyPrice >= ord.targetPrice);
        if (triggered) {
          changed = true;
          pushToast({
            title: 'سفارش محدود تکمیل شد',
            description: `${ord.side === 'buy' ? 'خرید' : 'فروش'} ${formatGrams(ord.weightGrams)} ${ord.assetName} در نرخ ${formatToman(ord.targetPrice)}`,
            tone: 'success',
          });
          return { ...ord, status: 'filled' as const };
        }
        return ord;
      });
      return changed ? next : prev;
    });
  }, [marketAssets, pushToast]);

  const nudgeMarketPrice = useCallback(
    (percentDelta: number) => {
      applyPriceShift(percentDelta / 100);
      pushToast({
        title: percentDelta > 0 ? 'شبیه‌سازی رشد نرخ بازار' : 'شبیه‌سازی افت نرخ بازار',
        description: `تغییر ${percentDelta > 0 ? '+' : ''}${toPersianDigits(percentDelta)}٪ روی مظنه لحظه‌ای اعمال شد`,
        tone: 'info',
      });
    },
    [applyPriceShift, pushToast]
  );

  const triggerThermalPrint = useCallback(
    (receipt: ThermalReceipt) => {
      logBridgeCall(
        'AndroidPOS.printThermalReceipt',
        JSON.stringify({ invoiceNo: receipt.invoiceNo, widthMm: 58, copies: posHardware.printDuplicateCopy ? 2 : 1 }),
        posHardware.printerConnected ? 'OK (PRINTER_SUCCESS)' : 'ERR_PRINTER_OFFLINE'
      );
      if (!posHardware.printerConnected) {
        pushToast({
          title: 'پرینتر حرارتی متصل نیست',
          description: 'از بخش تنظیمات سخت‌افزار پوز وضعیت پرینتر را بررسی کنید.',
          tone: 'error',
        });
        return;
      }
      setPosHardware((prev) => ({
        ...prev,
        printerPaperPercent: Math.max(5, prev.printerPaperPercent - 1),
      }));
      pushToast({
        title: 'رسید حرارتی ۵۸ میلی‌متری چاپ شد',
        description: `شماره فاکتور ${receipt.invoiceNo} به پرینتر دستگاه پوز ارسال گردید.`,
        tone: 'success',
      });
    },
    [logBridgeCall, posHardware.printDuplicateCopy, posHardware.printerConnected, pushToast]
  );

  const executeInstantTrade: PlatformContextValue['executeInstantTrade'] = useCallback(
    ({
      side,
      assetCode,
      weightGrams,
      paymentMethod,
      shopId,
      requestPhysicalPickup,
      rrnOverride,
      cardMask,
      rawCard16,
      customUnitPriceToman,
      wageMode = 'percent',
      wageInput = 0,
      profitPercent = 0,
      brokeragePercent = 0.5,
      vra = 0,
    }) => {
      const asset = marketAssets.find((a) => a.code === assetCode) || gold18Asset;
      const defaultUnitPrice = side === 'buy' ? asset.sellPrice : asset.buyPrice;
      const unitPrice =
        customUnitPriceToman !== undefined && customUnitPriceToman > 0
          ? customUnitPriceToman
          : defaultUnitPrice;
      const karatFactor = asset.code === 'abshodeh' ? 1 / 4.3318 : 1; // If abshodeh, weightGrams is converted to mesghal
      const units = asset.code === 'abshodeh' ? weightGrams * karatFactor : weightGrams;

      const rrn = rrnOverride || generateRRN();
      const targetShop = shops.find((s) => s.id === shopId) || activeMerchantShop;

      // Build Moadian V7.9 Gold Pattern 3 payload using exact raw gold rate, wage, profit, brokerage & VAT rules
      const tradeSstid =
        asset.code === 'bullion24'
          ? '2720000114587'
          : asset.code === 'emami' || asset.code === 'nim' || asset.code === 'rob'
          ? '2720000114594'
          : wageInput > 0 || profitPercent > 0
          ? '2720000114563'
          : '2720000114570';

      const tradeBuilt = buildMoadianV79Payload({
        shop: targetShop,
        inty: 2,
        ins: 1,
        lines: [
          {
            id: `tr-${Date.now()}`,
            sstid: tradeSstid,
            sstt: `${side === 'buy' ? 'فروش آنلاین' : 'بازخرید آنلاین'} ${asset.name}`,
            am: Number(units.toFixed(6)),
            mu: asset.unit === 'مثقال' ? '168' : asset.unit === 'قطعه' ? '1627' : '164',
            cui: asset.karat,
            feeToman: unitPrice,
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
        nti1: 'معامله آنلاین پلتفرم زرپوز',
        payments: [
          {
            pmt: paymentMethod === 'pos_card' ? 4 : paymentMethod === 'rial_wallet' ? 7 : 5,
            pvRial: 0, // updated below after summary is known
            trn: rrn,
            pcn: rawCard16,
            pid: '0084129031',
          },
        ],
      });

      const grossAmount = Math.round(tradeBuilt.summary.tprdisRial / 10);
      const wageToman = Math.round(tradeBuilt.summary.totalWageRial / 10);
      const profitToman = Math.round(tradeBuilt.summary.totalProfitRial / 10);
      const brokerageToman = Math.round(tradeBuilt.summary.totalBrokerageRial / 10);
      const taxToman = Math.round(tradeBuilt.summary.tvamRial / 10);
      const totalAmount =
        side === 'buy'
          ? Math.round(tradeBuilt.summary.tbillRial / 10)
          : Math.max(0, grossAmount - brokerageToman - taxToman);

      // Keep payment row pv aligned with final Rial total
      const finalPayload = {
        ...tradeBuilt.payload,
        payments: [
          {
            iinn: paymentMethod === 'pos_card' || paymentMethod === 'shaparak' ? targetShop.paymentSwitchCode : null,
            acn: paymentMethod === 'pos_card' || paymentMethod === 'shaparak' ? targetShop.acceptorCode : null,
            trmn: paymentMethod === 'pos_card' ? targetShop.posTerminalNumericId : null,
            pmt: (paymentMethod === 'pos_card' ? 4 : paymentMethod === 'rial_wallet' ? 7 : 5) as 4 | 5 | 7,
            trn: rrn,
            pcn: rawCard16 || null,
            pid: '0084129031',
            pdt: tradeBuilt.payload.header.indatim,
            pv: Math.min(Math.trunc(totalAmount * 10), tradeBuilt.summary.tbillRial),
          },
        ],
      };

      const setter = role === 'customer' ? setCustomerWallet : setMerchantWallet;
      const currentWallet = role === 'customer' ? customerWallet : merchantWallet;

      if (side === 'buy' && paymentMethod === 'rial_wallet' && currentWallet.rialBalance < totalAmount) {
        pushToast({
          title: 'موجودی کیف پول ریالی کافی نیست',
          description: 'ابتدا کیف پول خود را شارژ کنید یا روش پرداخت کارتخوان پوز را انتخاب نمایید.',
          tone: 'error',
        });
        return false;
      }

      if (side === 'sell' && currentWallet.goldGrams < weightGrams) {
        pushToast({
          title: 'موجودی طلا کافی نیست',
          description: `موجودی فعلی شما ${formatGrams(currentWallet.goldGrams)} است.`,
          tone: 'error',
        });
        return false;
      }

      const equivalent18kGrams = Number((weightGrams * (asset.karat / 750)).toFixed(3));

      setter((prev) => {
        if (side === 'buy') {
          return {
            ...prev,
            goldGrams: requestPhysicalPickup ? prev.goldGrams : Number((prev.goldGrams + equivalent18kGrams).toFixed(3)),
            rialBalance: paymentMethod === 'rial_wallet' ? prev.rialBalance - totalAmount : prev.rialBalance,
          };
        }
        return {
          ...prev,
          goldGrams: Number(Math.max(0, prev.goldGrams - equivalent18kGrams).toFixed(3)),
          rialBalance: prev.rialBalance + totalAmount,
        };
      });

      let createdPickupCode: string | undefined;

      if (side === 'buy' && requestPhysicalPickup) {
        const code = generatePickupCode();
        createdPickupCode = code;
        const newPickup: PickupOrder = {
          id: `pk-${Date.now()}`,
          code,
          customerName: role === 'customer' ? 'سارا رضایی' : 'مشتری گالری',
          customerPhone: '۰۹۱۲۳۴۵۶۷۸۹',
          shopId: targetShop.id,
          shopName: targetShop.name,
          itemTitle: `${asset.name} — خرید آنلاین تحویل حضوری`,
          weightGrams,
          karat: asset.karat,
          totalToman: totalAmount,
          deliveryMethod: 'in_person_pos',
          status: 'ready',
          createdAt: getNowPersianTime(),
          assayCode: `AB-${asset.karat}-${Math.floor(100000 + Math.random() * 899999)}`,
        };
        setPickupOrders((prev) => [newPickup, ...prev]);
      }

      const tradeMoadianRecord: MoadianInvoiceRecord = {
        id: `md-${Date.now()}`,
        taxid: finalPayload.header.taxid,
        inno: finalPayload.header.inno,
        irtaxid: null,
        inty: 2,
        ins: 1,
        buyerName: role === 'customer' ? 'سارا رضایی' : 'گالری طلای زمرد (همکار)',
        buyerNationalOrEcoId: '0084129031',
        totalRial: tradeBuilt.summary.tbillRial,
        totalToman: totalAmount,
        totalVatRial: tradeBuilt.summary.tvamRial,
        totalGoldGrams: weightGrams,
        createdAtPersian: getNowPersianTime(),
        status: 'draft_local',
        payload: finalPayload,
      };
      setMoadianInvoices((prev) => [tradeMoadianRecord, ...prev]);

      const receipt: ThermalReceipt = {
        invoiceNo: generateInvoiceNo(),
        rrn,
        terminalId: targetShop.terminalId,
        merchantName: targetShop.name,
        merchantLicense: targetShop.licenseNo,
        merchantEconomicCode: targetShop.economicCode,
        merchantAddress: targetShop.district,
        customerName: role === 'customer' ? 'سارا رضایی' : 'گالری طلای زمرد (همکار)',
        customerPhone: '۰۹۱۲۳۴۵۶۷۸۹',
        customerNationalId: '0084129031',
        dateTime: getNowPersianTime(),
        items: [
          {
            title: `${side === 'buy' ? 'خرید' : 'فروش'} ${asset.name}`,
            sstid: tradeSstid,
            weightGrams,
            karat: asset.karat,
            unitPrice,
            totalToman: grossAmount,
          },
        ],
        goldBaseToman: grossAmount,
        wageToman,
        profitToman,
        brokerageToman,
        taxToman,
        totalToman: totalAmount,
        paymentMethodLabel:
          paymentMethod === 'pos_card'
            ? 'کارتخوان پوز شاپرک'
            : paymentMethod === 'rial_wallet'
            ? 'کیف پول ریالی زرپوز'
            : 'درگاه اینترنتی شاپرک',
        cardMask,
        pickupCode: createdPickupCode,
        taxid: finalPayload.header.taxid,
        irtaxid: null,
        inty: 2,
        ins: 1,
        moadianPayload: finalPayload,
      };

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        rrn,
        roleVisibility: role === 'customer' ? 'both' : 'merchant',
        type: side === 'buy' ? 'buy_gold' : 'sell_gold',
        title: `${side === 'buy' ? 'خرید آنی' : 'فروش آنی'} ${asset.shortName}${requestPhysicalPickup ? ' (تحویل فیزیکی)' : ''}`,
        counterparty: targetShop.name,
        weightGrams,
        karat: asset.karat,
        amountToman: totalAmount,
        feeToman: brokerageToman,
        taxToman,
        paymentMethod,
        status: 'completed',
        timestamp: getNowPersianTime(),
        receipt,
      };

      setTransactions((prev) => [newTx, ...prev]);
      setActiveReceipt(receipt);
      pushToast({
        title: side === 'buy' ? 'خرید طلا با موفقیت ثبت شد' : 'فروش طلا و واریز ریالی انجام شد',
        description: createdPickupCode
          ? `کد تحویل فیزیکی شما: ${createdPickupCode} (در پنل طلافروشی قابل اسکن است)`
          : `${formatGrams(weightGrams)} · مبلغ ${formatToman(totalAmount)}`,
        tone: 'success',
      });
      return true;
    },
    [activeMerchantShop, customerWallet, gold18Asset, marketAssets, merchantWallet, pushToast, role, shops]
  );

  const placeLimitOrder: PlatformContextValue['placeLimitOrder'] = useCallback(
    ({ side, assetCode, targetPrice, weightGrams }) => {
      const asset = marketAssets.find((a) => a.code === assetCode) || gold18Asset;
      const newOrder: LimitOrder = {
        id: `ord-${Date.now()}`,
        role,
        side,
        assetCode,
        assetName: asset.name,
        targetPrice,
        weightGrams,
        totalToman: Math.round(targetPrice * weightGrams),
        status: 'open',
        createdAt: getNowPersianTime(),
      };
      setLimitOrders((prev) => [newOrder, ...prev]);
      pushToast({
        title: 'سفارش محدود ثبت شد',
        description: `${side === 'buy' ? 'خرید' : 'فروش'} ${formatGrams(weightGrams)} در قیمت هدف ${formatToman(targetPrice)}`,
        tone: 'success',
      });
    },
    [gold18Asset, marketAssets, pushToast, role]
  );

  const cancelLimitOrder = useCallback(
    (id: string) => {
      setLimitOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)));
      pushToast({ title: 'سفارش محدود لغو شد', tone: 'info' });
    },
    [pushToast]
  );

  const addPriceAlert: PlatformContextValue['addPriceAlert'] = useCallback(
    ({ assetCode, condition, targetPrice }) => {
      const asset = marketAssets.find((a) => a.code === assetCode) || gold18Asset;
      setPriceAlerts((prev) => [
        {
          id: `al-${Date.now()}`,
          assetCode,
          assetName: asset.name,
          condition,
          targetPrice,
          active: true,
          createdAt: '۱۴۰۵/۰۹/۰۱',
        },
        ...prev,
      ]);
      pushToast({
        title: 'هشدار قیمت فعال شد',
        description: `اطلاع‌رسانی هنگام ${condition === 'above' ? 'عبور از' : 'رسیدن به زیر'} ${formatToman(targetPrice)}`,
        tone: 'success',
      });
    },
    [gold18Asset, marketAssets, pushToast]
  );

  const togglePriceAlert = useCallback((id: string) => {
    setPriceAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  }, []);

  const deletePriceAlert = useCallback((id: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const createPhysicalPickup: PlatformContextValue['createPhysicalPickup'] = useCallback(
    ({ shopId, itemTitle, weightGrams, karat, totalToman, deliveryMethod, deductFromGoldWallet, assayCode }) => {
      const targetShop = shops.find((s) => s.id === shopId) || activeMerchantShop;
      const equiv18k = Number((weightGrams * (karat / 750)).toFixed(3));
      if (deductFromGoldWallet && customerWallet.goldGrams < equiv18k) {
        pushToast({
          title: 'موجودی طلای دیجیتال کافی نیست',
          description: `برای تحویل این مورد حداقل ${formatGrams(equiv18k)} معادل ۱۸ عیار لازم است.`,
          tone: 'error',
        });
        return null;
      }

      if (deductFromGoldWallet) {
        setCustomerWallet((prev) => ({
          ...prev,
          goldGrams: Number(Math.max(0, prev.goldGrams - equiv18k).toFixed(3)),
        }));
      }

      const code = generatePickupCode();
      const order: PickupOrder = {
        id: `pk-${Date.now()}`,
        code,
        customerName: 'سارا رضایی',
        customerPhone: '۰۹۱۲۳۴۵۶۷۸۹',
        shopId: targetShop.id,
        shopName: targetShop.name,
        itemTitle,
        weightGrams,
        karat,
        totalToman,
        deliveryMethod,
        status: 'ready',
        createdAt: getNowPersianTime(),
        assayCode: assayCode || `RY-${karat}-${Math.floor(100000 + Math.random() * 899999)}`,
      };

      setPickupOrders((prev) => [order, ...prev]);
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          rrn: generateRRN(),
          roleVisibility: 'both',
          type: 'physical_pickup',
          title: `درخواست تحویل فیزیکی: ${itemTitle}`,
          counterparty: targetShop.name,
          weightGrams,
          karat,
          amountToman: totalToman,
          feeToman: 0,
          taxToman: 0,
          paymentMethod: deductFromGoldWallet ? 'gold_wallet' : 'pos_card',
          status: 'pending',
          timestamp: getNowPersianTime(),
        },
        ...prev,
      ]);

      pushToast({
        title: `کد تحویل فیزیکی صادر شد: ${code}`,
        description: `در ${targetShop.name} روی دستگاه پوز اسکن و تحویل بگیرید.`,
        tone: 'success',
      });
      return order;
    },
    [activeMerchantShop, customerWallet.goldGrams, pushToast, shops]
  );

  const updatePickupStatus = useCallback(
    (orderId: string, nextStatus: PickupOrder['status']) => {
      setPickupOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      pushToast({
        title:
          nextStatus === 'ready'
            ? 'سفارش آماده تحویل حضوری شد'
            : nextStatus === 'delivered'
            ? 'تحویل فیزیکی نهایی شد'
            : 'وضعیت سفارش به‌روزرسانی شد',
        tone: 'success',
      });
    },
    [pushToast]
  );

  const redeemPickupByCode = useCallback(
    (rawCode: string): PickupOrder | null => {
      const normalized = rawCode.trim().toUpperCase();
      const found = pickupOrders.find((o) => o.code.toUpperCase() === normalized);
      if (!found) {
        pushToast({
          title: 'کد تحویل یافت نشد',
          description: `کد ${rawCode} در صف تحویل گالری موجود نیست.`,
          tone: 'error',
        });
        return null;
      }
      if (found.status === 'delivered') {
        pushToast({
          title: 'این سفارش قبلاً تحویل داده شده است',
          description: `کد ${found.code} متعلق به ${found.customerName}`,
          tone: 'warning',
        });
        return found;
      }

      setPickupOrders((prev) =>
        prev.map((o) => (o.id === found.id ? { ...o, status: 'delivered' } : o))
      );
      setMerchantWallet((prev) => ({
        ...prev,
        goldGrams: Number(Math.max(0, prev.goldGrams - found.weightGrams * (found.karat / 750)).toFixed(3)),
      }));

      const receipt: ThermalReceipt = {
        invoiceNo: generateInvoiceNo(),
        rrn: generateRRN(),
        terminalId: activeMerchantShop.terminalId,
        merchantName: activeMerchantShop.name,
        merchantLicense: activeMerchantShop.licenseNo,
        merchantAddress: activeMerchantShop.district,
        customerName: found.customerName,
        customerPhone: found.customerPhone,
        dateTime: getNowPersianTime(),
        items: [
          {
            title: found.itemTitle,
            weightGrams: found.weightGrams,
            karat: found.karat,
            unitPrice: Math.round(found.totalToman / Math.max(0.001, found.weightGrams)),
            totalToman: found.totalToman,
          },
        ],
        goldBaseToman: found.totalToman,
        wageToman: 0,
        profitToman: 0,
        taxToman: 0,
        totalToman: found.totalToman,
        paymentMethodLabel: 'تحویل فیزیکی از موجودی آنلاین (تسویه‌شده)',
        assayCode: found.assayCode,
        pickupCode: found.code,
        note: 'اصالت قطعه و تطابق کد ملی تحویل‌گیرنده تایید شد.',
      };

      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          rrn: receipt.rrn,
          roleVisibility: 'both',
          type: 'physical_pickup',
          title: `تحویل فیزیکی موفق (${found.code})`,
          counterparty: found.customerName,
          weightGrams: found.weightGrams,
          karat: found.karat,
          amountToman: found.totalToman,
          feeToman: 0,
          taxToman: 0,
          paymentMethod: 'gold_wallet',
          status: 'completed',
          timestamp: getNowPersianTime(),
          receipt,
        },
        ...prev,
      ]);

      logBridgeCall(
        'AndroidPOS.verifyPickupQr',
        JSON.stringify({ pickupCode: found.code, weightGrams: found.weightGrams }),
        'VERIFIED_AND_HANDED_OVER'
      );

      setActiveReceipt(receipt);
      pushToast({
        title: 'تحویل فیزیکی تایید و ثبت شد',
        description: `${found.itemTitle} به ${found.customerName} تحویل گردید.`,
        tone: 'success',
      });
      return { ...found, status: 'delivered' };
    },
    [activeMerchantShop, logBridgeCall, pickupOrders, pushToast]
  );

  const addMoadianInvoice = useCallback((record: MoadianInvoiceRecord) => {
    setMoadianInvoices((prev) => [record, ...prev]);
  }, []);

  const submitMoadianInvoice = useCallback(
    (id: string): boolean => {
      const target = moadianInvoices.find((inv) => inv.id === id);
      if (!target) return false;
      const issues = validateMoadianV79Payload(target.payload);
      const blockingErrors = issues.filter((i) => i.severity === 'error');
      if (blockingErrors.length > 0) {
        pushToast({
          title: 'خطای اعتبارسنجی سامانه مودیان (V7.9)',
          description: blockingErrors[0].message,
          tone: 'error',
        });
        return false;
      }
      const refUid = `uid-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
      setMoadianInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? { ...inv, status: 'accepted', referenceUid: refUid }
            : inv
        )
      );
      setActiveMoadianRecord((curr) =>
        curr && curr.id === id ? { ...curr, status: 'accepted', referenceUid: refUid } : curr
      );
      logBridgeCall(
        'MoadianAPI.sendPattern3Invoice',
        JSON.stringify({ taxid: target.taxid, inp: 3, inty: target.inty, ins: target.ins }),
        `ACCEPTED (UID: ${refUid})`
      );
      pushToast({
        title: 'صورتحساب در کارپوشه سامانه مودیان ثبت شد (شبیه‌سازی)',
        description: `شماره مالیاتی: ${target.taxid} · کد رهگیری: ${refUid}`,
        tone: 'success',
      });
      return true;
    },
    [logBridgeCall, moadianInvoices, pushToast]
  );

  const issueQuickCancelInvoice = useCallback(
    (refRecord: MoadianInvoiceRecord): MoadianInvoiceRecord => {
      const built = buildMoadianV79Payload({
        shop: activeMerchantShop,
        inty: refRecord.inty,
        ins: 3,
        irtaxid: refRecord.taxid,
        lines: [],
        setm: 1,
        nti1: 'ابطال صورتحساب مرجع',
        payments: [],
      });
      // Mirror summary figures from reference header on cancellation record display
      const cancelRecord: MoadianInvoiceRecord = {
        id: `md-cancel-${Date.now()}`,
        taxid: built.payload.header.taxid,
        inno: built.payload.header.inno,
        irtaxid: refRecord.taxid,
        inty: refRecord.inty,
        ins: 3,
        buyerName: refRecord.buyerName,
        buyerNationalOrEcoId: refRecord.buyerNationalOrEcoId,
        totalRial: refRecord.totalRial,
        totalToman: refRecord.totalToman,
        totalVatRial: refRecord.totalVatRial,
        totalGoldGrams: refRecord.totalGoldGrams,
        createdAtPersian: getNowPersianTime(),
        status: 'accepted',
        referenceUid: `cancel-${Date.now().toString(16)}`,
        payload: built.payload,
      };
      setMoadianInvoices((prev) => [
        cancelRecord,
        ...prev.map((inv) =>
          inv.id === refRecord.id ? { ...inv, status: 'cancelled_ref' as const } : inv
        ),
      ]);
      logBridgeCall(
        'MoadianAPI.sendCancelInvoice',
        JSON.stringify({ taxid: cancelRecord.taxid, irtaxid: refRecord.taxid, ins: 3 }),
        'CANCELLED_OK'
      );
      pushToast({
        title: 'صورتحساب ابطالی (ins=3) صادر شد',
        description: `مرجع ابطال‌شده: ${refRecord.taxid}`,
        tone: 'warning',
      });
      return cancelRecord;
    },
    [activeMerchantShop, logBridgeCall, pushToast]
  );

  const updateMerchantTaxProfile: PlatformContextValue['updateMerchantTaxProfile'] = useCallback(
    (patch) => {
      setShops((prev) =>
        prev.map((s, idx) => (idx === 0 ? { ...s, ...patch } : s))
      );
      pushToast({
        title: 'پروفایل مالیاتی سامانه مودیان ذخیره شد',
        description: 'اطلاعات حافظه مالیاتی، کد اقتصادی و پایانه در صورتحساب‌های جدید اعمال می‌شود.',
        tone: 'success',
      });
    },
    [pushToast]
  );

  const recordPosSale: PlatformContextValue['recordPosSale'] = useCallback(
    ({ receipt, weightGrams, karat, oldGoldGrams, paymentMethod, catalogItemId, catalogItemIds, moadianRecord }) => {
      const netGoldOut = Number(
        (weightGrams * (karat / 750) - (oldGoldGrams || 0)).toFixed(3)
      );

      const posCardPortion = receipt.splitPayments && receipt.splitPayments.length > 0
        ? receipt.splitPayments
            .filter((sp) => sp.method === 'pos_card')
            .reduce((acc, sp) => acc + sp.amountToman, 0)
        : paymentMethod === 'pos_card'
        ? receipt.totalToman
        : 0;
      const nonPosPortion = Math.max(0, receipt.totalToman - posCardPortion);

      setMerchantWallet((prev) => ({
        ...prev,
        goldGrams: Number(Math.max(0, prev.goldGrams - netGoldOut).toFixed(3)),
        pendingSettlementToman: prev.pendingSettlementToman + posCardPortion,
        rialBalance: prev.rialBalance + nonPosPortion,
      }));

      const idsToDecrement = [
        ...(catalogItemId ? [catalogItemId] : []),
        ...(catalogItemIds || []),
      ];
      if (idsToDecrement.length > 0) {
        setCatalog((prev) =>
          prev.map((item) =>
            idsToDecrement.includes(item.id) ? { ...item, stock: Math.max(0, item.stock - 1) } : item
          )
        );
      }

      if (moadianRecord) {
        setMoadianInvoices((prev) => [moadianRecord, ...prev]);
      }

      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          rrn: receipt.rrn,
          roleVisibility: 'merchant',
          type: oldGoldGrams && oldGoldGrams > 0 ? 'pos_trade_in' : 'pos_sale',
          title:
            oldGoldGrams && oldGoldGrams > 0
              ? `تعویض و فروش طلا در پوز (${receipt.items[0]?.title || 'فاکتور طلا'})`
              : `فروش حضوری پوز (${receipt.items[0]?.title || 'فاکتور طلا'})`,
          counterparty: receipt.customerName,
          weightGrams,
          karat,
          amountToman: receipt.totalToman,
          feeToman: 0,
          taxToman: receipt.taxToman,
          paymentMethod,
          status: 'completed',
          timestamp: receipt.dateTime,
          receipt,
        },
        ...prev,
      ]);

      setActiveReceipt(receipt);
      // Sync customer CRM statistics if customer matches by phone or name
      const normalizedPhone = toEnglishDigits(receipt.customerPhone).replace(/\D/g, '');
      setCustomers((prev) =>
        prev.map((c) => {
          const cPhone = toEnglishDigits(c.phone).replace(/\D/g, '');
          const matched =
            (normalizedPhone.length >= 10 && cPhone === normalizedPhone) ||
            c.name.trim() === receipt.customerName.trim();
          if (!matched) return c;
          return {
            ...c,
            totalSpentToman: c.totalSpentToman + receipt.totalToman,
            totalGoldGrams: Number((c.totalGoldGrams + weightGrams).toFixed(3)),
            visitCount: c.visitCount + 1,
            lastVisitPersian: receipt.dateTime,
          };
        })
      );

      if (posHardware.autoPrintReceipts) {
        logBridgeCall(
          'AndroidPOS.printThermalReceipt',
          JSON.stringify({
            invoiceNo: receipt.invoiceNo,
            splitCount: receipt.splitPayments?.length || 1,
            autoPrint: true,
          }),
          'OK (PRINTER_SUCCESS)'
        );
      }
      pushToast({
        title: 'فروش پوز ثبت و رسید صادر شد',
        description: `کد پیگیری ${receipt.rrn} · مبلغ ${formatToman(receipt.totalToman)}`,
        tone: 'success',
      });
    },
    [logBridgeCall, posHardware.autoPrintReceipts, pushToast]
  );

  const recordPosBuyback: PlatformContextValue['recordPosBuyback'] = useCallback(
    ({ receipt, weightGrams, karat, equiv18kGrams, payoutToman, payoutMethod }) => {
      setMerchantWallet((prev) => ({
        ...prev,
        goldGrams: Number((prev.goldGrams + equiv18kGrams).toFixed(3)),
        rialBalance: Math.max(0, prev.rialBalance - payoutToman),
      }));

      setTransactions((prev) => [
        {
          id: `tx-bb-${Date.now()}`,
          rrn: receipt.rrn,
          roleVisibility: 'merchant',
          type: 'pos_trade_in',
          title: `خرید طلای دست‌دوم از مشتری (${formatGrams(weightGrams)} · عیار ${toPersianDigits(karat)})`,
          counterparty: receipt.customerName,
          weightGrams,
          karat,
          amountToman: payoutToman,
          feeToman: 0,
          taxToman: 0,
          paymentMethod: payoutMethod,
          status: 'completed',
          timestamp: receipt.dateTime,
          receipt,
        },
        ...prev,
      ]);

      // Sync customer CRM statistics on buyback too
      const normalizedPhone = toEnglishDigits(receipt.customerPhone).replace(/\D/g, '');
      setCustomers((prev) =>
        prev.map((c) => {
          const cPhone = toEnglishDigits(c.phone).replace(/\D/g, '');
          const matched =
            (normalizedPhone.length >= 10 && cPhone === normalizedPhone) ||
            c.name.trim() === receipt.customerName.trim();
          if (!matched) return c;
          return {
            ...c,
            totalGoldGrams: Number((c.totalGoldGrams + weightGrams).toFixed(3)),
            visitCount: c.visitCount + 1,
            lastVisitPersian: receipt.dateTime,
          };
        })
      );

      setActiveReceipt(receipt);
      if (posHardware.autoPrintReceipts) {
        logBridgeCall(
          'AndroidPOS.printBuybackVoucher',
          JSON.stringify({ invoiceNo: receipt.invoiceNo, weightGrams, karat, payoutToman }),
          'OK (PRINTER_SUCCESS)'
        );
      }
      pushToast({
        title: 'خرید طلای دست‌دوم ثبت شد',
        description: `${formatGrams(equiv18kGrams)} معادل ۱۸ عیار به موجودی اضافه شد · تسویه ${formatToman(payoutToman)}`,
        tone: 'success',
      });
    },
    [logBridgeCall, posHardware.autoPrintReceipts, pushToast]
  );

  const loginWithSmsOtp: PlatformContextValue['loginWithSmsOtp'] = useCallback(
    ({ phone, role: nextRole, name }) => {
      const cleanDigits = toEnglishDigits(phone).replace(/\D/g, '');
      const matchedCustomer = customers.find(
        (c) => toEnglishDigits(c.phone).replace(/\D/g, '') === cleanDigits
      );
      const displayName =
        name?.trim() ||
        (nextRole === 'merchant'
          ? activeMerchantShop.ownerName
          : matchedCustomer?.name || 'کاربر زرپوز');

      setRoleState(nextRole);
      setActiveNav('dashboard');
      setAuthUser({
        phone: toPersianDigits(cleanDigits),
        name: displayName,
        role: nextRole,
        shopName: nextRole === 'merchant' ? activeMerchantShop.name : undefined,
        loggedInAt: getNowPersianTime(),
      });
      logBridgeCall(
        'AndroidPOS.onSmsOtpAuthenticated',
        JSON.stringify({ phone: cleanDigits, role: nextRole }),
        'SESSION_ACTIVE'
      );
      pushToast({
        title: `خوش آمدید، ${displayName}`,
        description:
          nextRole === 'merchant'
            ? `ورود موفق به پنل مدیریت ${activeMerchantShop.name}`
            : 'ورود موفق با کد تایید پیامکی',
        tone: 'success',
      });
    },
    [activeMerchantShop.name, activeMerchantShop.ownerName, customers, logBridgeCall, pushToast]
  );

  const logout = useCallback(() => {
    setAuthUser(null);
    setActiveNav('dashboard');
    pushToast({ title: 'با موفقیت از حساب کاربری خارج شدید', tone: 'info' });
  }, [pushToast]);

  const addShopCustomer: PlatformContextValue['addShopCustomer'] = useCallback(
    (input) => {
      const created: ShopCustomer = {
        ...input,
        id: `cust-${Date.now()}`,
        totalSpentToman: 0,
        totalGoldGrams: 0,
        visitCount: 0,
        lastVisitPersian: 'بدون خرید ثبت‌شده',
        createdAtPersian: getNowPersianTime().split(' - ')[0],
      };
      setCustomers((prev) => [created, ...prev]);
      pushToast({
        title: 'مشتری جدید با موفقیت ثبت شد',
        description: `${created.name} · ${created.phone}`,
        tone: 'success',
      });
      return created;
    },
    [pushToast]
  );

  const updateShopCustomer: PlatformContextValue['updateShopCustomer'] = useCallback(
    (id, patch) => {
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      pushToast({ title: 'اطلاعات پرونده مشتری ذخیره شد', tone: 'success' });
    },
    [pushToast]
  );

  const adjustCustomerLedger: PlatformContextValue['adjustCustomerLedger'] = useCallback(
    ({ customerId, rialDeltaToman = 0, goldDeltaGrams = 0, reason }) => {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                rialAccountBalanceToman: c.rialAccountBalanceToman + rialDeltaToman,
                goldAccountBalanceGrams: Number((c.goldAccountBalanceGrams + goldDeltaGrams).toFixed(3)),
                lastVisitPersian: getNowPersianTime(),
              }
            : c
        )
      );
      pushToast({
        title: 'تراکنش حساب دفتری مشتری ثبت شد',
        description: reason,
        tone: 'success',
      });
    },
    [pushToast]
  );

  const startPosCheckoutForCustomer = useCallback(
    (customerId: string) => {
      setSelectedPosCustomerId(customerId);
      setRoleState('merchant');
      setActiveNav('pos');
      const target = customers.find((c) => c.id === customerId);
      if (target) {
        pushToast({
          title: `مشتری ${target.name} در صندوق پوز انتخاب شد`,
          description: 'اطلاعات تماس، کد ملی و شبا آماده صدور فاکتور است.',
          tone: 'info',
        });
      }
    },
    [customers, pushToast]
  );

  const sendGoldGift: PlatformContextValue['sendGoldGift'] = useCallback(
    ({ recipientPhone, recipientName, weightGrams, note }) => {
      if (customerWallet.goldGrams < weightGrams) {
        pushToast({
          title: 'موجودی طلا برای ارسال هدیه کافی نیست',
          tone: 'error',
        });
        return false;
      }
      const valueToman = Math.round(weightGrams * gold18Asset.sellPrice);
      setCustomerWallet((prev) => ({
        ...prev,
        goldGrams: Number((prev.goldGrams - weightGrams).toFixed(3)),
      }));
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          rrn: generateRRN(),
          roleVisibility: 'customer',
          type: 'p2p_gift',
          title: `انتقال / کارت هدیه طلا به ${recipientName}`,
          counterparty: `${recipientPhone}${note ? ` — ${note}` : ''}`,
          weightGrams,
          karat: 750,
          amountToman: valueToman,
          feeToman: 0,
          taxToman: 0,
          paymentMethod: 'gold_wallet',
          status: 'completed',
          timestamp: getNowPersianTime(),
        },
        ...prev,
      ]);
      pushToast({
        title: 'کارت هدیه طلا با موفقیت ارسال شد',
        description: `${formatGrams(weightGrams)} طلا به شماره ${toPersianDigits(recipientPhone)} منتقل شد.`,
        tone: 'success',
      });
      return true;
    },
    [customerWallet.goldGrams, gold18Asset.sellPrice, pushToast]
  );

  const depositRial = useCallback(
    (amountToman: number, method: PaymentMethod, rrn?: string) => {
      const setter = role === 'customer' ? setCustomerWallet : setMerchantWallet;
      setter((prev) => ({ ...prev, rialBalance: prev.rialBalance + amountToman }));
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          rrn: rrn || generateRRN(),
          roleVisibility: role,
          type: 'deposit',
          title: method === 'pos_card' ? 'شارژ حساب از طریق کارتخوان پوز' : 'شارژ کیف پول ریالی (شاپرک)',
          counterparty: role === 'customer' ? 'کیف پول سارا رضایی' : 'حساب گالری طلای زمرد',
          amountToman,
          feeToman: 0,
          taxToman: 0,
          paymentMethod: method,
          status: 'completed',
          timestamp: getNowPersianTime(),
        },
        ...prev,
      ]);
      pushToast({
        title: 'حساب ریالی شارژ شد',
        description: `مبلغ ${formatToman(amountToman)} به موجودی اضافه گردید.`,
        tone: 'success',
      });
    },
    [pushToast, role]
  );

  const withdrawOrSettleShaba = useCallback(
    (amountToman: number, shaba: string, isMerchantSettlement: boolean): boolean => {
      if (isMerchantSettlement) {
        if (merchantWallet.pendingSettlementToman + merchantWallet.rialBalance < amountToman) {
          pushToast({ title: 'مبلغ درخواستی از موجودی قابل تسویه بیشتر است', tone: 'error' });
          return false;
        }
        setMerchantWallet((prev) => {
          const fromPending = Math.min(prev.pendingSettlementToman, amountToman);
          const fromRial = amountToman - fromPending;
          return {
            ...prev,
            pendingSettlementToman: prev.pendingSettlementToman - fromPending,
            rialBalance: Math.max(0, prev.rialBalance - fromRial),
          };
        });
      } else {
        if (customerWallet.rialBalance < amountToman) {
          pushToast({ title: 'موجودی کیف پول ریالی کافی نیست', tone: 'error' });
          return false;
        }
        setCustomerWallet((prev) => ({
          ...prev,
          rialBalance: prev.rialBalance - amountToman,
        }));
      }

      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          rrn: generateRRN(),
          roleVisibility: isMerchantSettlement ? 'merchant' : 'customer',
          type: isMerchantSettlement ? 'settlement' : 'withdraw',
          title: isMerchantSettlement ? 'درخواست تسویه شبا گالری (پایا/ساتنا)' : 'برداشت وجه به شماره شبا',
          counterparty: shaba,
          amountToman,
          feeToman: 0,
          taxToman: 0,
          paymentMethod: 'shaba',
          status: 'completed',
          timestamp: getNowPersianTime(),
        },
        ...prev,
      ]);

      pushToast({
        title: isMerchantSettlement ? 'تسویه شبا ثبت شد' : 'درخواست برداشت به شبا ثبت شد',
        description: `مبلغ ${formatToman(amountToman)} در سیکل بعدی شاپرک واریز می‌شود.`,
        tone: 'success',
      });
      return true;
    },
    [customerWallet.rialBalance, merchantWallet.pendingSettlementToman, merchantWallet.rialBalance, pushToast]
  );

  const addCatalogItem: PlatformContextValue['addCatalogItem'] = useCallback(
    (item) => {
      const next: CatalogItem = {
        ...item,
        id: `item-${Date.now()}`,
        shopId: activeMerchantShop.id,
        shopName: activeMerchantShop.name,
      };
      setCatalog((prev) => [next, ...prev]);
      pushToast({
        title: 'محصول جدید به ویترین اضافه شد',
        description: `${item.title} (${formatGrams(item.weightGrams)})`,
        tone: 'success',
      });
    },
    [activeMerchantShop.id, activeMerchantShop.name, pushToast]
  );

  const toggleCatalogVisibility = useCallback((id: string) => {
    setCatalog((prev) =>
      prev.map((item) => (item.id === id ? { ...item, activeOnline: !item.activeOnline } : item))
    );
  }, []);

  const updateCatalogStock = useCallback((id: string, delta: number) => {
    setCatalog((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item))
    );
  }, []);

  const addBankAccount: PlatformContextValue['addBankAccount'] = useCallback(
    (bank) => {
      const newAcc: BankAccount = {
        ...bank,
        id: `bk-${Date.now()}`,
        verified: true,
      };
      if (role === 'customer') {
        setCustomerBanks((prev) => [...prev, newAcc]);
      } else {
        setMerchantBanks((prev) => [...prev, newAcc]);
      }
      pushToast({ title: 'حساب بانکی و شبا جدید ثبت و تایید شد', tone: 'success' });
    },
    [pushToast, role]
  );

  const updatePosHardware = useCallback((patch: Partial<PosHardwareStatus>) => {
    setPosHardware((prev) => ({ ...prev, ...patch }));
  }, []);

  const requestPosPayment = useCallback(
    (req: PosPaymentRequest) => {
      logBridgeCall(
        'AndroidPOS.startCardPayment',
        JSON.stringify({ amountRial: req.amountToman * 10, terminalId: posHardware.terminalId }),
        'WAITING_FOR_CARD_TAP'
      );
      setPendingPosPayment(req);
    },
    [logBridgeCall, posHardware.terminalId]
  );

  const closePosPayment = useCallback(() => {
    setPendingPosPayment(null);
  }, []);

  const openQrScanner = useCallback(
    (onScan: (code: string) => void) => {
      logBridgeCall('AndroidPOS.openBarcodeScanner', '{"mode":"QR_AND_ASSAY"}', 'CAMERA_ACTIVE');
      setQrScanCallback(() => onScan);
      setQrScannerOpen(true);
    },
    [logBridgeCall]
  );

  const closeQrScanner = useCallback(() => {
    setQrScannerOpen(false);
    setQrScanCallback(null);
  }, []);

  const handleQrScanned = useCallback(
    (code: string) => {
      logBridgeCall('AndroidPOS.onBarcodeResult', JSON.stringify({ code }), 'OK');
      setQrScannerOpen(false);
      if (qrScanCallback) {
        qrScanCallback(code);
        setQrScanCallback(null);
      }
    },
    [logBridgeCall, qrScanCallback]
  );

  const value: PlatformContextValue = {
    authUser,
    loginWithSmsOtp,
    logout,
    role,
    setRole,
    activeNav,
    setActiveNav,
    darkMode,
    toggleDarkMode: () => setDarkMode((d) => !d),
    posFrameMode,
    togglePosFrameMode: () => setPosFrameMode((p) => !p),
    marketAssets,
    selectedAssetCode,
    setSelectedAssetCode,
    liveFeedEnabled,
    setLiveFeedEnabled,
    nudgeMarketPrice,
    gold18Asset,
    customerWallet,
    merchantWallet,
    activeWallet: role === 'customer' ? customerWallet : merchantWallet,
    shops,
    activeMerchantShop,
    catalog,
    pickupOrders,
    limitOrders,
    priceAlerts,
    transactions,
    moadianInvoices,
    customers,
    selectedPosCustomerId,
    setSelectedPosCustomerId,
    customerBanks,
    merchantBanks,
    posHardware,
    executeInstantTrade,
    placeLimitOrder,
    cancelLimitOrder,
    addPriceAlert,
    togglePriceAlert,
    deletePriceAlert,
    createPhysicalPickup,
    updatePickupStatus,
    redeemPickupByCode,
    recordPosSale,
    recordPosBuyback,
    addMoadianInvoice,
    submitMoadianInvoice,
    issueQuickCancelInvoice,
    updateMerchantTaxProfile,
    sendGoldGift,
    depositRial,
    withdrawOrSettleShaba,
    addCatalogItem,
    toggleCatalogVisibility,
    updateCatalogStock,
    addBankAccount,
    addShopCustomer,
    updateShopCustomer,
    adjustCustomerLedger,
    startPosCheckoutForCustomer,
    updatePosHardware,
    logBridgeCall,
    triggerThermalPrint,
    activeReceipt,
    setActiveReceipt,
    activeMoadianRecord,
    setActiveMoadianRecord,
    pendingPosPayment,
    requestPosPayment,
    closePosPayment,
    qrScannerOpen,
    openQrScanner,
    closeQrScanner,
    handleQrScanned,
    toasts,
    pushToast,
    dismissToast,
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
