import React, { useEffect, useMemo, useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  formatGrams,
  formatRial,
  formatToman,
  generateInvoiceNo,
  generateRRN,
  getNowPersianTime,
  toEnglishDigits,
  toPersianDigits,
} from '../utils/format';
import {
  buildMoadianV79Payload,
  computeGoldLineV79,
  GoldInvoiceLineInput,
  MOADIAN_BUYER_TYPE_LABELS,
  MOADIAN_PAYMENT_METHOD_LABELS,
  MOADIAN_SETTLEMENT_LABELS,
  MOADIAN_SUBJECT_LABELS,
  OFFICIAL_GOLD_SSTIDS,
} from '../utils/moadian';
import {
  MoadianBuyerType,
  MoadianInvoiceRecord,
  MoadianInvoiceSubject,
  MoadianInvoiceType,
  MoadianPaymentMethodCode,
  MoadianSettlementMethod,
  PaymentMethod,
  SplitPaymentEntry,
  ThermalReceipt,
} from '../types/gold';
import { PosDigitalScaleWidget } from './PosDigitalScaleWidget';
import { PosCustomerDisplayModal } from './PosCustomerDisplayModal';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  Layers,
  Lock,
  MonitorSmartphone,
  PenLine,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Repeat,
  RotateCcw,
  Scale,
  ScanBarcode,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';

type PosTab = 'checkout' | 'handover' | 'zreport' | 'moadian';
type PosCashierMode = 'sale' | 'trade_in' | 'buyback';

function createDefaultGoldLine(gold18SellPrice: number): GoldInvoiceLineInput {
  return {
    id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sstid: OFFICIAL_GOLD_SSTIDS[0].sstid,
    sstt: 'زیورآلات طلای ۱۸ عیار',
    am: 5.25,
    mu: '164',
    cui: 750,
    feeToman: gold18SellPrice,
    wageMode: 'percent',
    wageInput: 8,
    profitPercent: 7,
    brokerageMode: 'percent',
    brokerageInput: 0,
    discountToman: 0,
    vra: 0,
    odt: '',
    odr: 0,
    olt: '',
    olr: 0,
    bsrn: '',
    assayCode: 'JW-750-309412',
  };
}

export const PosTerminalView: React.FC = () => {
  const {
    gold18Asset,
    catalog,
    activeMerchantShop,
    requestPosPayment,
    recordPosSale,
    recordPosBuyback,
    openQrScanner,
    redeemPickupByCode,
    pickupOrders,
    transactions,
    moadianInvoices,
    setActiveMoadianRecord,
    submitMoadianInvoice,
    issueQuickCancelInvoice,
    addMoadianInvoice,
    triggerThermalPrint,
    logBridgeCall,
    pushToast,
    customers,
    selectedPosCustomerId,
    setSelectedPosCustomerId,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<PosTab>('checkout');
  const [cashierMode, setCashierMode] = useState<PosCashierMode>('sale');

  // --- POS Hardware & Experience States ---
  const [showScale, setShowScale] = useState<boolean>(true);
  const [showCustomerDisplay, setShowCustomerDisplay] = useState<boolean>(false);
  const [showMoadianAdvanced, setShowMoadianAdvanced] = useState<boolean>(false);
  const [lockedSellRate18k, setLockedSellRate18k] = useState<number | null>(null);
  const [lockedBuyRate18k, setLockedBuyRate18k] = useState<number | null>(null);
  const [priceLockSeconds, setPriceLockSeconds] = useState<number>(0);

  // Split Payment (Multi-Card + Cash + Transfer for high gold totals)
  const [splitMode, setSplitMode] = useState<boolean>(false);
  const [splitPayments, setSplitPayments] = useState<SplitPaymentEntry[]>([]);
  const [splitAmountInput, setSplitAmountInput] = useState<string>('');
  const [splitMethod, setSplitMethod] = useState<PaymentMethod>('pos_card');

  // Direct Buyback (خرید طلای دست‌دوم / شکسته از مشتری)
  const [buybackWeight, setBuybackWeight] = useState<string>('4.325');
  const [buybackKarat, setBuybackKarat] = useState<number>(740);
  const [buybackDeductionGrams, setBuybackDeductionGrams] = useState<string>('0');
  const [buybackNote, setBuybackNote] = useState<string>('النگو و انگشتر شکسته بدون نگین');
  const [buybackPayoutMethod, setBuybackPayoutMethod] = useState<PaymentMethod>('shaba');
  const [buybackCustomerShaba, setBuybackCustomerShaba] = useState<string>('IR14 0560 0811 8000 2291 0041 01');

  // --- Moadian V7.9 Pattern 3 Invoice Header State (Tucked in Collapsible Section) ---
  const [inty, setInty] = useState<MoadianInvoiceType>(2);
  const [ins, setIns] = useState<MoadianInvoiceSubject>(1);
  const [irtaxid, setIrtaxid] = useState<string>('');
  const [isArticle9Delayed, setIsArticle9Delayed] = useState<boolean>(false);

  // Buyer Identity State
  const [customerName, setCustomerName] = useState<string>('مشتری حضوری گالری');
  const [customerPhone, setCustomerPhone] = useState<string>('۰۹۱۲۳۴۵۶۷۸۹');
  const [tob, setTob] = useState<MoadianBuyerType>(1);
  const [bid, setBid] = useState<string>('0084129031');
  const [tinb, setTinb] = useState<string>('');
  const [bpc, setBpc] = useState<string>('1161714811');
  const [bbc, setBbc] = useState<string>('0000');
  const [bpn, setBpn] = useState<string>('');

  // Multi-item Gold Lines State
  const [lines, setLines] = useState<GoldInvoiceLineInput[]>(() => [
    createDefaultGoldLine(gold18Asset.sellPrice),
  ]);
  const [expandedLineTaxId, setExpandedLineTaxId] = useState<string | null>(null);

  // Settlement & Notes (V7.9)
  const [setm, setSetm] = useState<MoadianSettlementMethod>(1);
  const [cashSplitToman, setCashSplitToman] = useState<string>('15000000');
  const [tax17Toman, setTax17Toman] = useState<string>('0');
  const [nti1, setNti1] = useState<string>('');
  const [nti2, setNti2] = useState<string>('');

  // Trade-in Old Gold (تعویض کهنه با نو)
  const [oldGoldGrams, setOldGoldGrams] = useState<string>('2.150');
  const [oldGoldKarat, setOldGoldKarat] = useState<number>(740);

  // Single Payment Method
  const [pmt, setPmt] = useState<MoadianPaymentMethodCode>(4);
  const [payerNationalId, setPayerNationalId] = useState<string>('0084129031');
  const [manualTrn, setManualTrn] = useState<string>('');

  // Moadian Workbench filter
  const [moadianFilter, setMoadianFilter] = useState<'all' | 'draft_local' | 'accepted' | 'cancelled_ref'>('all');

  // Handover & Assay Verification State
  const [pickupCodeInput, setPickupCodeInput] = useState<string>('');
  const [assayLookupInput, setAssayLookupInput] = useState<string>('AB-750-882190');
  const [assayResult, setAssayResult] = useState<{
    code: string;
    lab: string;
    karat: number;
    weight: string;
    valid: boolean;
  } | null>(null);

  // 90-second Price Lock Countdown
  useEffect(() => {
    if (priceLockSeconds <= 0) {
      setLockedSellRate18k(null);
      setLockedBuyRate18k(null);
      return;
    }
    const id = window.setInterval(() => {
      setPriceLockSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [priceLockSeconds]);

  // Sync CRM customer selection into POS checkout / buyback fields
  const applyCustomerProfile = (customerId: string) => {
    setSelectedPosCustomerId(customerId || null);
    if (!customerId) return;
    const found = customers.find((c) => c.id === customerId);
    if (!found) return;
    setCustomerName(found.name);
    setCustomerPhone(toPersianDigits(found.phone));
    if (found.nationalId) {
      setBid(found.nationalId);
      setPayerNationalId(found.nationalId);
    }
    if (found.shaba) {
      setBuybackCustomerShaba(found.shaba);
    }
    if (found.tier === 'colleague') {
      setInty(1);
    }
  };

  useEffect(() => {
    if (!selectedPosCustomerId) return;
    const found = customers.find((c) => c.id === selectedPosCustomerId);
    if (!found) return;
    setCustomerName(found.name);
    setCustomerPhone(toPersianDigits(found.phone));
    if (found.nationalId) {
      setBid(found.nationalId);
      setPayerNationalId(found.nationalId);
    }
    if (found.shaba) {
      setBuybackCustomerShaba(found.shaba);
    }
    if (found.tier === 'colleague') {
      setInty(1);
    }
  }, [selectedPosCustomerId, customers]);

  const selectedShopCustomer = useMemo(
    () => (selectedPosCustomerId ? customers.find((c) => c.id === selectedPosCustomerId) ?? null : null),
    [customers, selectedPosCustomerId]
  );

  const activeSellRate18k = lockedSellRate18k ?? gold18Asset.sellPrice;
  const activeBuyRate18k = lockedBuyRate18k ?? gold18Asset.buyPrice;

  const handleTogglePriceLock = () => {
    if (priceLockSeconds > 0) {
      setPriceLockSeconds(0);
      setLockedSellRate18k(null);
      setLockedBuyRate18k(null);
      pushToast({ title: 'قفل مظنه پوز آزاد شد', tone: 'info' });
    } else {
      setLockedSellRate18k(gold18Asset.sellPrice);
      setLockedBuyRate18k(gold18Asset.buyPrice);
      setPriceLockSeconds(90);
      // Sync lines to locked rate
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          feeToman: Math.round(gold18Asset.sellPrice * (l.cui / 750)),
        }))
      );
      logBridgeCall(
        'AndroidPOS.lockGoldRate',
        JSON.stringify({ sell18k: gold18Asset.sellPrice, buy18k: gold18Asset.buyPrice, ttlSec: 90 }),
        'LOCKED_90S'
      );
      pushToast({
        title: 'مظنه پوز به مدت ۹۰ ثانیه قفل شد',
        description: `نرخ فروش ۱۸ عیار: ${formatToman(gold18Asset.sellPrice)}`,
        tone: 'success',
      });
    }
  };

  const shopItems = useMemo(
    () => catalog.filter((i) => i.shopId === activeMerchantShop.id),
    [catalog, activeMerchantShop.id]
  );

  const isReferenceMode = ins !== 1;
  const isCancelMode = ins === 3;
  const enableTradeIn = cashierMode === 'trade_in';

  const updateLine = (id: string, patch: Partial<GoldInvoiceLineInput>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const handleSelectCatalogForLine = (lineId: string, catalogId: string) => {
    const found = shopItems.find((i) => i.id === catalogId) || catalog.find((i) => i.id === catalogId);
    if (!found) {
      updateLine(lineId, { catalogItemId: undefined });
      return;
    }
    const unitRateForKarat = Math.round(activeSellRate18k * (found.karat / 750));
    updateLine(lineId, {
      catalogItemId: found.id,
      sstid: found.sstid,
      sstt: found.title,
      am: found.weightGrams,
      mu: found.mu,
      cui: found.karat,
      feeToman: unitRateForKarat,
      wageMode: 'percent',
      wageInput: found.wagePercent,
      profitPercent: found.profitPercent,
      brokerageMode: 'percent',
      brokerageInput: found.brokeragePercent,
      vra: found.vatBaseRate,
      assayCode: found.assayCode,
    });
  };

  const handleScanJewelryTag = () => {
    openQrScanner((scannedCode) => {
      const normalized = scannedCode.trim().toUpperCase();
      const matched = catalog.find(
        (c) => c.assayCode.toUpperCase() === normalized || c.id.toUpperCase() === normalized
      );
      if (matched) {
        if (cashierMode === 'buyback') {
          setCashierMode('sale');
        }
        const unitRateForKarat = Math.round(activeSellRate18k * (matched.karat / 750));
        const newLine: GoldInvoiceLineInput = {
          id: `tag-${Date.now()}`,
          catalogItemId: matched.id,
          sstid: matched.sstid,
          sstt: matched.title,
          am: matched.weightGrams,
          mu: matched.mu,
          cui: matched.karat,
          feeToman: unitRateForKarat,
          wageMode: 'percent',
          wageInput: matched.wagePercent,
          profitPercent: matched.profitPercent,
          brokerageMode: 'percent',
          brokerageInput: matched.brokeragePercent,
          discountToman: 0,
          vra: matched.vatBaseRate,
          assayCode: matched.assayCode,
        };
        setLines((prev) => {
          // Replace default unmodified first line or append
          if (prev.length === 1 && !prev[0].catalogItemId) {
            return [newLine];
          }
          return [...prev, newLine];
        });
        pushToast({
          title: 'اتیکت طلا از دوربین پوز خوانده شد',
          description: `${matched.title} · ${formatGrams(matched.weightGrams)} (کد ${matched.assayCode})`,
          tone: 'success',
        });
      } else {
        // Also check if it's a customer pickup QR
        const redeemed = redeemPickupByCode(scannedCode);
        if (!redeemed) {
          pushToast({
            title: `کد ${scannedCode} در اتیکت‌های ویترین یافت نشد`,
            tone: 'warning',
          });
        }
      }
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [...prev, createDefaultGoldLine(activeSellRate18k)]);
  };

  const handleRemoveLine = (id: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  // Pre-fill checkout tab for اصلاحی (ins=2) or برگشت از فروش (ins=4)
  const loadReferenceInvoiceIntoForm = (refRec: MoadianInvoiceRecord, targetIns: 2 | 4) => {
    setCashierMode('sale');
    setInty(refRec.inty);
    setIns(targetIns);
    setIrtaxid(refRec.taxid);
    setCustomerName(refRec.buyerName);
    setShowMoadianAdvanced(true);
    if (refRec.payload.body.length > 0) {
      const mapped: GoldInvoiceLineInput[] = refRec.payload.body.map((b, idx) => {
        const feeToman = Math.round(b.fee / 10);
        const wagePercent = b.prdis > 0 ? Number(((b.consfee / b.prdis) * 100).toFixed(2)) : 0;
        const profitBase = b.prdis + b.consfee;
        const profitPercent = profitBase > 0 ? Number(((b.spro / profitBase) * 100).toFixed(2)) : 0;
        const brokerageToman = Math.round(b.bros / 10);
        return {
          id: `ref-${Date.now()}-${idx}`,
          sstid: b.sstid,
          sstt: b.sstt,
          am: targetIns === 4 ? Number(Math.max(0.1, b.am / 2).toFixed(3)) : b.am,
          mu: b.mu || '164',
          cui: b.cui || 750,
          feeToman,
          wageMode: 'percent',
          wageInput: wagePercent,
          profitPercent,
          brokerageMode: 'fixed_toman',
          brokerageInput: brokerageToman,
          discountToman: Math.round(b.dis / 10),
          vra: b.vra,
          odt: b.odt || '',
          odr: b.odr || 0,
          olt: b.olt || '',
          olr: b.olr || 0,
          bsrn: b.bsrn || '',
        };
      });
      setLines(mapped);
    }
    setActiveTab('checkout');
    pushToast({
      title:
        targetIns === 2
          ? 'فرم اصلاح فاکتور بارگذاری شد'
          : 'فرم برگشت از فروش بارگذاری شد',
      description: `مرجع: ${refRec.taxid}`,
      tone: 'info',
    });
  };

  // Compute trade-in old gold value (تعویض کهنه با نو)
  const parsedOldGrams = enableTradeIn && !isCancelMode ? Math.max(0, parseFloat(oldGoldGrams) || 0) : 0;
  const oldGoldEquiv18k = Number((parsedOldGrams * ((oldGoldKarat || 740) / 750)).toFixed(3));
  const oldGoldValueToman = Math.trunc(oldGoldEquiv18k * activeBuyRate18k);

  // Compute direct buyback (خرید طلای شکسته از مشتری)
  const parsedBuybackGrossGrams = Math.max(0, parseFloat(buybackWeight) || 0);
  const parsedBuybackDeductGrams = Math.min(
    parsedBuybackGrossGrams,
    Math.max(0, parseFloat(buybackDeductionGrams) || 0)
  );
  const buybackNetGrams = Number(Math.max(0, parsedBuybackGrossGrams - parsedBuybackDeductGrams).toFixed(3));
  const buybackEquiv18kGrams = Number((buybackNetGrams * ((buybackKarat || 740) / 750)).toFixed(3));
  const buybackTotalToman = Math.trunc(buybackEquiv18kGrams * activeBuyRate18k);

  // Live Moadian V7.9 Payload Preview (runs quietly in background)
  const liveBuilt = useMemo(() => {
    const computedLinesTemp = lines.map(computeGoldLineV79);
    const grossBillRial = computedLinesTemp.reduce((a, b) => a + b.bodyItem.tsstam, 0);
    const oldGoldRial = Math.trunc(oldGoldValueToman * 10);
    const cashPayableRial = Math.max(0, grossBillRial - oldGoldRial);

    const paymentRows: Array<{
      pmt: MoadianPaymentMethodCode;
      pvRial: number;
      trn?: string;
      pcn?: string;
      pid?: string;
    }> = [];

    if (oldGoldRial > 0 && !isCancelMode) {
      paymentRows.push({
        pmt: 2,
        pvRial: Math.min(oldGoldRial, grossBillRial),
        pid: payerNationalId || bid,
      });
    }
    if (splitMode && splitPayments.length > 0 && !isCancelMode) {
      splitPayments.forEach((sp) => {
        paymentRows.push({
          pmt: sp.method === 'pos_card' ? 4 : sp.method === 'cash' ? 3 : 7,
          pvRial: Math.trunc(sp.amountToman * 10),
          trn: sp.rrn,
          pcn: sp.rawCard16,
          pid: payerNationalId || bid,
        });
      });
    } else if (cashPayableRial > 0 && !isCancelMode) {
      paymentRows.push({
        pmt,
        pvRial: cashPayableRial,
        trn: manualTrn || undefined,
        pid: payerNationalId || bid,
      });
    }

    return buildMoadianV79Payload({
      shop: activeMerchantShop,
      inty,
      ins,
      irtaxid: isReferenceMode ? irtaxid : null,
      isArticle9Delayed,
      buyer: { tob, bid, tinb, bpc, bbc, bpn },
      lines,
      setm,
      cashPaidRial: Math.trunc((parseFloat(cashSplitToman) || 0) * 10),
      tax17Rial: Math.trunc((parseFloat(tax17Toman) || 0) * 10),
      nti1,
      nti2,
      payments: paymentRows,
    });
  }, [
    activeMerchantShop,
    bbc,
    bid,
    bpc,
    bpn,
    cashSplitToman,
    ins,
    inty,
    irtaxid,
    isArticle9Delayed,
    isCancelMode,
    isReferenceMode,
    lines,
    manualTrn,
    nti1,
    nti2,
    oldGoldValueToman,
    payerNationalId,
    pmt,
    setm,
    splitMode,
    splitPayments,
    tax17Toman,
    tinb,
    tob,
  ]);

  const blockingErrors = liveBuilt.issues.filter((i) => i.severity === 'error');
  const totalToman = Math.round(liveBuilt.summary.tbillRial / 10);
  const netPayableAfterTradeInToman = Math.max(0, totalToman - oldGoldValueToman);
  const tradeInSurplusToCustomerToman = Math.max(0, oldGoldValueToman - totalToman);
  const totalGrams = lines.reduce((acc, l) => acc + (Number(l.am) || 0), 0);

  // Split Payment Remaining Math
  const splitPaidTotalToman = splitPayments.reduce((acc, s) => acc + s.amountToman, 0);
  const splitRemainingToman = Math.max(0, netPayableAfterTradeInToman - splitPaidTotalToman);

  const mapPmtToLegacyPaymentMethod = (code: MoadianPaymentMethodCode): PaymentMethod => {
    if (code === 4) return 'pos_card';
    if (code === 5) return 'shaparak';
    if (code === 6 || code === 7) return 'shaba';
    return 'cash';
  };

  const handleOpenLiveJsonPreview = () => {
    setActiveMoadianRecord({
      id: `preview-${Date.now()}`,
      taxid: liveBuilt.payload.header.taxid,
      inno: liveBuilt.payload.header.inno,
      irtaxid: liveBuilt.payload.header.irtaxid,
      inty,
      ins,
      buyerName: customerName.trim() || 'مشتری حضوری',
      buyerNationalOrEcoId: tinb || bid || undefined,
      totalRial: liveBuilt.summary.tbillRial,
      totalToman,
      totalVatRial: liveBuilt.summary.tvamRial,
      totalGoldGrams: totalGrams,
      createdAtPersian: getNowPersianTime(),
      status: 'draft_local',
      payload: liveBuilt.payload,
    });
  };

  const handleAddSplitPayment = () => {
    const requested = Math.round(parseFloat(splitAmountInput) || splitRemainingToman);
    const chargeAmount = Math.min(requested, splitRemainingToman);
    if (chargeAmount <= 0) {
      pushToast({ title: 'کل مبلغ فاکتور تسویه شده است', tone: 'info' });
      return;
    }

    if (splitMethod === 'pos_card') {
      requestPosPayment({
        amountToman: chargeAmount,
        title: `قسط کارتخوان شماره ${toPersianDigits(splitPayments.length + 1)} (${customerName})`,
        customerName,
        onSuccess: ({ rrn, cardMask, rawCard16 }) => {
          setSplitPayments((prev) => [
            ...prev,
            {
              id: `sp-${Date.now()}`,
              method: 'pos_card',
              methodLabel: 'کارتخوان پوز',
              amountToman: chargeAmount,
              rrn,
              cardMask,
              rawCard16,
            },
          ]);
          setSplitAmountInput('');
          pushToast({
            title: `پرداخت کارت شماره ${toPersianDigits(splitPayments.length + 1)} تایید شد`,
            description: `${formatToman(chargeAmount)} · کارت ${cardMask}`,
            tone: 'success',
          });
        },
      });
    } else {
      const label =
        splitMethod === 'cash'
          ? 'وجه نقد صندوق'
          : splitMethod === 'shaba'
          ? 'انتقال کارت‌به‌کارت / شبا'
          : 'کیف پول زرپوز مشتری';
      setSplitPayments((prev) => [
        ...prev,
        {
          id: `sp-${Date.now()}`,
          method: splitMethod,
          methodLabel: label,
          amountToman: chargeAmount,
          rrn: generateRRN(),
        },
      ]);
      setSplitAmountInput('');
      pushToast({
        title: `${label} به مبلغ ${formatToman(chargeAmount)} ثبت شد`,
        tone: 'success',
      });
    }
  };

  const finalizeSale = (
    rrn: string,
    cardMask?: string,
    rawCard16?: string,
    finalSplits?: SplitPaymentEntry[]
  ) => {
    const oldGoldRial = Math.trunc(oldGoldValueToman * 10);
    const grossBillRial = liveBuilt.summary.tbillRial;
    const cashPayableRial = Math.max(0, grossBillRial - oldGoldRial);

    const finalPaymentRows: Array<{
      pmt: MoadianPaymentMethodCode;
      pvRial: number;
      trn?: string;
      pcn?: string;
      pid?: string;
    }> = [];

    if (oldGoldRial > 0 && !isCancelMode) {
      finalPaymentRows.push({
        pmt: 2,
        pvRial: Math.min(oldGoldRial, grossBillRial),
        pid: payerNationalId || bid,
      });
    }
    if (finalSplits && finalSplits.length > 0 && !isCancelMode) {
      finalSplits.forEach((sp) => {
        finalPaymentRows.push({
          pmt: sp.method === 'pos_card' ? 4 : sp.method === 'cash' ? 3 : 7,
          pvRial: Math.trunc(sp.amountToman * 10),
          trn: sp.rrn,
          pcn: sp.rawCard16,
          pid: payerNationalId || bid,
        });
      });
    } else if (cashPayableRial > 0 && !isCancelMode) {
      finalPaymentRows.push({
        pmt,
        pvRial: cashPayableRial,
        trn: rrn,
        pcn: rawCard16,
        pid: payerNationalId || bid,
      });
    }

    const finalBuilt = buildMoadianV79Payload({
      shop: activeMerchantShop,
      inty,
      ins,
      irtaxid: isReferenceMode ? irtaxid : null,
      isArticle9Delayed,
      buyer: { tob, bid, tinb, bpc, bbc, bpn },
      lines,
      setm,
      cashPaidRial: Math.trunc((parseFloat(cashSplitToman) || 0) * 10),
      tax17Rial: Math.trunc((parseFloat(tax17Toman) || 0) * 10),
      nti1,
      nti2,
      payments: finalPaymentRows,
    });

    const moadianRecord: MoadianInvoiceRecord = {
      id: `md-${Date.now()}`,
      taxid: finalBuilt.payload.header.taxid,
      inno: finalBuilt.payload.header.inno,
      irtaxid: finalBuilt.payload.header.irtaxid,
      inty,
      ins,
      buyerName: customerName.trim() || 'مشتری حضوری',
      buyerNationalOrEcoId: toEnglishDigits(tinb || bid).replace(/\D/g, '') || undefined,
      totalRial: finalBuilt.summary.tbillRial,
      totalToman: Math.round(finalBuilt.summary.tbillRial / 10),
      totalVatRial: finalBuilt.summary.tvamRial,
      totalGoldGrams: totalGrams,
      createdAtPersian: getNowPersianTime(),
      status: 'draft_local',
      payload: finalBuilt.payload,
    };

    if (isCancelMode) {
      addMoadianInvoice(moadianRecord);
      setActiveMoadianRecord(moadianRecord);
      pushToast({
        title: 'صورتحساب ابطالی تولید شد',
        description: `شماره مالیاتی: ${moadianRecord.taxid}`,
        tone: 'warning',
      });
      return;
    }

    const receipt: ThermalReceipt = {
      invoiceNo: generateInvoiceNo(),
      rrn: finalSplits && finalSplits.length > 0 ? finalSplits[0].rrn : rrn,
      terminalId: activeMerchantShop.terminalId,
      merchantName: activeMerchantShop.name,
      merchantLicense: activeMerchantShop.licenseNo,
      merchantEconomicCode: activeMerchantShop.economicCode,
      merchantAddress: activeMerchantShop.district,
      customerName: customerName.trim() || 'مشتری حضوری',
      customerPhone: customerPhone.trim() || '-',
      customerNationalId: toEnglishDigits(tinb || bid).replace(/\D/g, '') || undefined,
      dateTime: getNowPersianTime(),
      receiptKind: enableTradeIn ? 'trade_in' : 'sale',
      items: lines.map((l) => {
        const c = computeGoldLineV79(l);
        return {
          title: l.sstt.trim() || 'قطعه طلا',
          sstid: c.bodyItem.sstid,
          weightGrams: l.am,
          karat: l.cui,
          unitPrice: l.feeToman,
          totalToman: c.prdisToman,
        };
      }),
      oldGoldDeduction:
        parsedOldGrams > 0
          ? {
              weightGrams: parsedOldGrams,
              karat: oldGoldKarat,
              valueToman: oldGoldValueToman,
            }
          : undefined,
      goldBaseToman: Math.round(finalBuilt.summary.tprdisRial / 10),
      wageToman: Math.round(finalBuilt.summary.totalWageRial / 10),
      profitToman: Math.round(finalBuilt.summary.totalProfitRial / 10),
      brokerageToman: Math.round(finalBuilt.summary.totalBrokerageRial / 10),
      discountToman: Math.round(finalBuilt.summary.tdisRial / 10),
      otherDutiesToman: Math.round(finalBuilt.summary.todamRial / 10),
      taxToman: Math.round(finalBuilt.summary.tvamRial / 10),
      totalToman: netPayableAfterTradeInToman,
      paymentMethodLabel:
        finalSplits && finalSplits.length > 0
          ? `پرداخت ترکیبی (${toPersianDigits(finalSplits.length)} بخش)`
          : MOADIAN_PAYMENT_METHOD_LABELS[pmt],
      cardMask: finalSplits && finalSplits.length > 0 ? finalSplits.find((s) => s.cardMask)?.cardMask : cardMask,
      splitPayments: finalSplits && finalSplits.length > 0 ? finalSplits : undefined,
      assayCode: lines[0]?.assayCode?.trim() || undefined,
      taxid: finalBuilt.payload.header.taxid,
      irtaxid: finalBuilt.payload.header.irtaxid,
      inty,
      ins,
      moadianPayload: finalBuilt.payload,
    };

    const catalogIds = lines.map((l) => l.catalogItemId).filter(Boolean) as string[];

    recordPosSale({
      receipt,
      weightGrams: totalGrams,
      karat: lines[0]?.cui || 750,
      oldGoldGrams: oldGoldEquiv18k,
      paymentMethod:
        finalSplits && finalSplits.some((s) => s.method === 'pos_card')
          ? 'pos_card'
          : mapPmtToLegacyPaymentMethod(pmt),
      catalogItemIds: catalogIds,
      moadianRecord,
    });

    // Clear split state after successful checkout
    setSplitPayments([]);
    setSplitAmountInput('');
  };

  const handleChargePos = () => {
    if (cashierMode === 'buyback') {
      if (buybackNetGrams <= 0) {
        pushToast({ title: 'وزن طلای دریافتی باید بیشتر از صفر باشد', tone: 'warning' });
        return;
      }
      const payoutLabel =
        buybackPayoutMethod === 'shaba'
          ? `انتقال آنی شبا (${buybackCustomerShaba.slice(-6)})`
          : buybackPayoutMethod === 'rial_wallet'
          ? 'واریز آنی به کیف پول زرپوز مشتری'
          : 'پرداخت وجه نقد از صندوق';
      const rrn = generateRRN();
      const buybackReceipt: ThermalReceipt = {
        invoiceNo: `BUY-${Math.floor(100000 + Math.random() * 899999)}`,
        rrn,
        terminalId: activeMerchantShop.terminalId,
        merchantName: activeMerchantShop.name,
        merchantLicense: activeMerchantShop.licenseNo,
        merchantAddress: activeMerchantShop.district,
        customerName: customerName.trim() || 'مشتری حضوری',
        customerPhone: customerPhone.trim() || '-',
        dateTime: getNowPersianTime(),
        receiptKind: 'buyback',
        items: [
          {
            title: buybackNote.trim() || 'طلای دست‌دوم / شکسته',
            weightGrams: buybackNetGrams,
            karat: buybackKarat,
            unitPrice: Math.round(activeBuyRate18k * (buybackKarat / 750)),
            totalToman: buybackTotalToman,
          },
        ],
        goldBaseToman: buybackTotalToman,
        wageToman: 0,
        profitToman: 0,
        taxToman: 0,
        totalToman: buybackTotalToman,
        paymentMethodLabel: payoutLabel,
        note: `معادل ۱۸ عیار: ${formatGrams(buybackEquiv18kGrams)} · کسر نگین/کثیفی: ${formatGrams(parsedBuybackDeductGrams)}`,
      };
      recordPosBuyback({
        receipt: buybackReceipt,
        weightGrams: buybackNetGrams,
        karat: buybackKarat,
        equiv18kGrams: buybackEquiv18kGrams,
        payoutToman: buybackTotalToman,
        payoutMethod: buybackPayoutMethod,
      });
      return;
    }

    if (blockingErrors.length > 0) {
      setShowMoadianAdvanced(true);
      pushToast({
        title: 'نقص در اطلاعات فاکتور رسمی',
        description: blockingErrors[0].message,
        tone: 'error',
      });
      return;
    }

    if (isCancelMode) {
      finalizeSale(generateRRN());
      return;
    }

    if (splitMode) {
      if (splitRemainingToman > 0) {
        pushToast({
          title: 'مبلغ مانده هنوز تسویه نشده است',
          description: `لطفاً ${formatToman(splitRemainingToman)} باقی‌مانده را ثبت یا روی کارتخوان بکشید.`,
          tone: 'warning',
        });
        return;
      }
      finalizeSale(splitPayments[0]?.rrn || generateRRN(), undefined, undefined, splitPayments);
      return;
    }

    if (pmt === 4 && netPayableAfterTradeInToman > 0 && !(inty === 1 && setm === 2)) {
      requestPosPayment({
        amountToman:
          inty === 1 && setm === 3
            ? Math.min(netPayableAfterTradeInToman, parseFloat(cashSplitToman) || netPayableAfterTradeInToman)
            : netPayableAfterTradeInToman,
        title: `${lines[0]?.sstt || 'فروش طلا'} (${formatGrams(totalGrams)})`,
        customerName,
        onSuccess: ({ rrn, cardMask, rawCard16 }) => {
          finalizeSale(rrn, cardMask, rawCard16);
        },
      });
    } else {
      finalizeSale(manualTrn.trim() || generateRRN());
    }
  };

  const handleLookupAssay = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = assayLookupInput.trim().toUpperCase();
    if (!cleaned) return;
    const matchedItem = catalog.find((c) => c.assayCode.toUpperCase() === cleaned);
    setAssayResult({
      code: cleaned,
      lab: 'آزمایشگاه ری‌گیری مرکزی اتحادیه طلا تهران',
      karat: matchedItem ? matchedItem.karat : cleaned.includes('995') ? 995 : 750,
      weight: matchedItem ? formatGrams(matchedItem.weightGrams) : 'وزن تاییدشده روی انگ قطعه',
      valid: cleaned.length >= 6,
    });
  };

  // Filtered Moadian invoices for Workbench
  const filteredMoadianInvoices = useMemo(() => {
    if (moadianFilter === 'all') return moadianInvoices;
    return moadianInvoices.filter((inv) => inv.status === moadianFilter);
  }, [moadianFilter, moadianInvoices]);

  const draftMoadianCount = useMemo(
    () => moadianInvoices.filter((inv) => inv.status === 'draft_local').length,
    [moadianInvoices]
  );

  // Daily Z-Report calculations (including net gold grams sold vs bought back!)
  const todayPosTxs = useMemo(
    () =>
      transactions.filter(
        (t) => t.type === 'pos_sale' || t.type === 'pos_trade_in' || t.type === 'physical_pickup'
      ),
    [transactions]
  );
  const zReportCardTotal = todayPosTxs
    .filter((t) => t.paymentMethod === 'pos_card')
    .reduce((acc, t) => acc + t.amountToman, 0);
  const zReportOtherTotal = todayPosTxs
    .filter((t) => t.paymentMethod !== 'pos_card' && t.receipt?.receiptKind !== 'buyback')
    .reduce((acc, t) => acc + t.amountToman, 0);
  const zReportSoldGrams = todayPosTxs
    .filter((t) => t.receipt?.receiptKind !== 'buyback')
    .reduce((acc, t) => acc + (t.weightGrams || 0), 0);
  const zReportBoughtBackGrams = todayPosTxs
    .filter((t) => t.receipt?.receiptKind === 'buyback')
    .reduce((acc, t) => acc + (t.weightGrams || 0), 0);

  const handlePrintZReport = () => {
    const zReceipt: ThermalReceipt = {
      invoiceNo: `ZREP-${Math.floor(1000 + Math.random() * 8999)}`,
      rrn: generateRRN(),
      terminalId: activeMerchantShop.terminalId,
      merchantName: activeMerchantShop.name,
      merchantLicense: activeMerchantShop.licenseNo,
      merchantEconomicCode: activeMerchantShop.economicCode,
      merchantAddress: activeMerchantShop.district,
      customerName: 'گزارش بستن صندوق پایان روز (Z-Report)',
      customerPhone: activeMerchantShop.phone,
      dateTime: getNowPersianTime(),
      items: [
        {
          title: `جمع فروش کارتخوان (${toPersianDigits(todayPosTxs.length)} تراکنش)`,
          weightGrams: zReportSoldGrams,
          karat: 750,
          unitPrice: activeSellRate18k,
          totalToman: zReportCardTotal,
        },
      ],
      goldBaseToman: zReportCardTotal,
      wageToman: 0,
      profitToman: 0,
      taxToman: 0,
      totalToman: zReportCardTotal + zReportOtherTotal,
      paymentMethodLabel: 'تسویه دسته شاپرک (Batch Settlement)',
      note: `فروش طلا: ${formatGrams(zReportSoldGrams)} · بازخرید: ${formatGrams(zReportBoughtBackGrams)}`,
    };
    triggerThermalPrint(zReceipt);
  };

  return (
    <div className="space-y-5">
      {/* Top POS Module Tabs + Quick Rate Lock */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-stone-200/70 dark:bg-stone-900 rounded-xl overflow-x-auto max-w-full">
          {(
            [
              ['checkout', 'صندوق فروش و خرید پوز', CreditCard],
              ['handover', 'تحویل QR و ری‌گیری', ScanLine],
              ['zreport', 'بستن صندوق (Z-Report)', FileCheck2],
              ['moadian', `کارپوشه مودیان (${toPersianDigits(moadianInvoices.length)})`, FileSpreadsheet],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`min-h-[42px] px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === id
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
          <span className="text-stone-500 dark:text-stone-400">
            مظنه ۱۸ عیار:{' '}
            <strong className="text-stone-900 dark:text-stone-100">{formatToman(activeSellRate18k)}</strong>
          </span>
          <button
            type="button"
            onClick={handleTogglePriceLock}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              priceLockSeconds > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
                : 'border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {priceLockSeconds > 0 ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {priceLockSeconds > 0
              ? `مظنه قفل شد (${toPersianDigits(priceLockSeconds)} ثانیه)`
              : 'قفل مظنه (۹۰ ثانیه)'}
          </button>
        </div>
      </div>

      {/* TAB 1: Fast Gold POS Checkout (Sale / Trade-In / Buyback) */}
      {activeTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Main POS Operation Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* 3-Mode Gold Cashier Bar + POS Hardware Quick Triggers */}
            <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
                {(
                  [
                    ['sale', 'فروش طلا', ArrowUpRight],
                    ['trade_in', 'تعویض (کهنه با نو)', Repeat],
                    ['buyback', 'خرید از مشتری', ArrowDownLeft],
                  ] as const
                ).map(([mId, label, Icon]) => (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => {
                      setCashierMode(mId);
                      setSplitPayments([]);
                    }}
                    className={`min-h-[44px] px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      cashierMode === mId
                        ? mId === 'buyback'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-stone-900 dark:bg-amber-600 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>

              {/* POS Hardware Quick Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowScale((v) => !v)}
                    className={`min-h-[40px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      showScale
                        ? 'border-amber-600/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    {showScale ? 'مخفی کردن ترازوی بلوتوثی' : 'باز کردن ترازوی بلوتوثی'}
                  </button>

                  {cashierMode !== 'buyback' && (
                    <button
                      type="button"
                      onClick={handleScanJewelryTag}
                      className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ScanBarcode className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      اسکن اتیکت ویترین (دوربین پوز)
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowCustomerDisplay(true)}
                  className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <MonitorSmartphone className="w-4 h-4" />
                  نمای مشتری
                </button>
              </div>
            </div>

            {/* Integrated Bluetooth Digital Gold Scale */}
            {showScale && (
              <PosDigitalScaleWidget
                onApplyToSale={(grams) => {
                  if (cashierMode === 'buyback') {
                    setBuybackWeight(grams.toFixed(3));
                  } else {
                    const lastLine = lines[lines.length - 1];
                    if (lastLine) updateLine(lastLine.id, { am: grams });
                  }
                }}
                onApplyToTradeInOrBuyback={
                  cashierMode === 'buyback'
                    ? undefined
                    : (grams) => {
                        setCashierMode('trade_in');
                        setOldGoldGrams(grams.toFixed(3));
                      }
                }
                primaryTargetLabel={
                  cashierMode === 'buyback' ? 'ثبت وزن خرید از مشتری' : 'انتقال به وزن فروش'
                }
                secondaryTargetLabel="ثبت در طلای تعویضی"
              />
            )}

            {/* DIRECT BUYBACK FORM (خرید طلای دست‌دوم / شکسته از مشتری) */}
            {cashierMode === 'buyback' ? (
              <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
                <div className="pb-3 border-b border-stone-100 dark:border-stone-800">
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    خرید طلای دست‌دوم، شکسته یا متفرقه از مشتری
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    تبدیل خودکار هر عیار به معادل ۱۸ عیار (۷۵۰) و محاسبه مبلغ پرداختی بر اساس نرخ خرید لحظه‌ای
                  </p>
                </div>

                {/* Karat Quick Presets */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
                    عیار طلای دریافتی از مشتری
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { k: 740, label: '۷۴۰ (متفرقه)' },
                      { k: 750, label: '۷۵۰ (۱۸ عیار)' },
                      { k: 900, label: '۹۰۰ (۲۱ عیار)' },
                      { k: 995, label: '۹۹۵ (شمش ۲۴)' },
                    ].map((opt) => (
                      <button
                        key={opt.k}
                        type="button"
                        onClick={() => setBuybackKarat(opt.k)}
                        className={`min-h-[42px] px-2.5 rounded-xl border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                          buybackKarat === opt.k
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">وزن روی ترازو (گرم)</label>
                    <input
                      type="number"
                      step="0.005"
                      min="0"
                      value={buybackWeight}
                      onChange={(e) => setBuybackWeight(e.target.value)}
                      dir="ltr"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">کسر نگین / کثیفی (گرم)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={buybackDeductionGrams}
                      onChange={(e) => setBuybackDeductionGrams(e.target.value)}
                      dir="ltr"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">عیار دقیق (دستی)</label>
                    <input
                      type="number"
                      min="300"
                      max="1000"
                      value={buybackKarat}
                      onChange={(e) => setBuybackKarat(Math.min(1000, Math.max(1, Number(e.target.value) || 740)))}
                      dir="ltr"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-base font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                  <span className="text-emerald-900 dark:text-emerald-300">
                    وزن خالص: <strong>{formatGrams(buybackNetGrams)}</strong> · معادل ۱۸ عیار (۷۵۰):{' '}
                    <strong>{formatGrams(buybackEquiv18kGrams)}</strong>
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    نرخ خرید ۱۸ عیار: {formatToman(activeBuyRate18k)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
                      <Users className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      انتخاب سریع از پرونده مشتریان گالری (پرکردن خودکار نام و شبا)
                    </label>
                    <select
                      value={selectedPosCustomerId || ''}
                      onChange={(e) => applyCustomerProfile(e.target.value)}
                      className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-medium"
                    >
                      <option value="">مشتری حضوری جدید (ورود دستی)</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {toPersianDigits(c.phone)}
                          {c.tier === 'vip' ? ' (ویژه VIP)' : c.tier === 'colleague' ? ' (همکار)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">شرح قطعه دریافتی</label>
                      <input
                        type="text"
                        value={buybackNote}
                        onChange={(e) => setBuybackNote(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">نام فروشنده (مشتری)</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400">
                    نحوه تسویه و پرداخت وجه به مشتری
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['shaba', 'واریز آنی شبا'],
                        ['rial_wallet', 'کیف پول زرپوز'],
                        ['cash', 'پرداخت نقدی'],
                      ] as const
                    ).map(([pm, label]) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setBuybackPayoutMethod(pm)}
                        className={`min-h-[42px] rounded-xl border text-xs font-semibold cursor-pointer ${
                          buybackPayoutMethod === pm
                            ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                            : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {buybackPayoutMethod === 'shaba' && (
                    <input
                      type="text"
                      value={buybackCustomerShaba}
                      onChange={(e) => setBuybackCustomerShaba(e.target.value)}
                      placeholder="شماره شبا مشتری (IR...)"
                      dir="ltr"
                      className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* SALE / TRADE-IN ITEMS CARD */}
                {!isCancelMode && (
                  <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                      <div>
                        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                          اقلام سبد فروش طلا ({toPersianDigits(lines.length)} قطعه)
                        </h2>
                        <p className="text-xs text-stone-500 mt-0.5">
                          انتخاب از ویترین، اسکن اتیکت یا وزن‌کشی مستقیم با ترازو
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddLine}
                        className="min-h-[40px] px-3 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-800 dark:hover:bg-amber-500 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        افزودن قطعه
                      </button>
                    </div>

                    <div className="space-y-5">
                      {lines.map((line, index) => {
                        const computed = computeGoldLineV79(line);
                        const isExtraOpen = expandedLineTaxId === line.id;
                        return (
                          <div
                            key={line.id}
                            className="pt-4 first:pt-0 border-t first:border-t-0 border-stone-200 dark:border-stone-800 space-y-3.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                                قطعه {toPersianDigits(index + 1)} · {formatToman(computed.tsstamToman)}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateLine(line.id, {
                                      feeToman: Math.round(activeSellRate18k * (line.cui / 750)),
                                    })
                                  }
                                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                                >
                                  همگام با مظنه
                                </button>
                                {lines.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(line.id)}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                    aria-label="حذف قطعه"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-stone-500 mb-1">
                                  انتخاب سریع از ویترین گالری
                                </label>
                                <select
                                  value={line.catalogItemId || ''}
                                  onChange={(e) => handleSelectCatalogForLine(line.id, e.target.value)}
                                  className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                                >
                                  <option value="">ورود دستی قطعه طلا</option>
                                  {shopItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.title} ({formatGrams(item.weightGrams)})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs text-stone-500 mb-1">شرح قطعه</label>
                                <input
                                  type="text"
                                  value={line.sstt}
                                  onChange={(e) => updateLine(line.id, { sstt: e.target.value })}
                                  className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-medium"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div>
                                <label className="block text-xs text-stone-500 mb-1">وزن (گرم)</label>
                                <input
                                  type="number"
                                  step="0.005"
                                  min="0.001"
                                  value={line.am}
                                  onChange={(e) =>
                                    updateLine(line.id, { am: Math.max(0.001, parseFloat(e.target.value) || 0) })
                                  }
                                  dir="ltr"
                                  className="w-full min-h-[42px] px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-stone-500 mb-1">عیار</label>
                                <select
                                  value={line.cui}
                                  onChange={(e) => {
                                    const nextKarat = Number(e.target.value) || 750;
                                    updateLine(line.id, {
                                      cui: nextKarat,
                                      feeToman: Math.round(activeSellRate18k * (nextKarat / 750)),
                                    });
                                  }}
                                  className="w-full min-h-[42px] px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold tabular-nums"
                                >
                                  <option value={750}>۷۵۰ (۱۸ عیار)</option>
                                  <option value={995}>۹۹۵ (۲۴ عیار)</option>
                                  <option value={900}>۹۰۰ (۲۱ عیار)</option>
                                  <option value={740}>۷۴۰ (متفرقه)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-stone-500 mb-1">اجرت (٪)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={line.wageInput}
                                  onChange={(e) =>
                                    updateLine(line.id, {
                                      wageMode: 'percent',
                                      wageInput: Math.max(0, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                  dir="ltr"
                                  className="w-full min-h-[42px] px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-stone-500 mb-1">سود فروشنده (٪)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={line.profitPercent}
                                  onChange={(e) =>
                                    updateLine(line.id, {
                                      profitPercent: Math.max(0, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                  dir="ltr"
                                  className="w-full min-h-[42px] px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                                />
                              </div>
                            </div>

                            {/* Optional Per-Item Extras (Discount, Assay Code, Unit Price Override) */}
                            <button
                              type="button"
                              onClick={() => setExpandedLineTaxId(isExtraOpen ? null : line.id)}
                              className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 inline-flex items-center gap-1 cursor-pointer"
                            >
                              {isExtraOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              تخفیف، کد ری‌گیری، نرخ دستی و جزئیات ردیف
                            </button>

                            {isExtraOpen && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                                <div>
                                  <label className="block text-[11px] text-stone-500 mb-1">نرخ واحد (تومان)</label>
                                  <input
                                    type="number"
                                    step="10000"
                                    value={line.feeToman}
                                    onChange={(e) =>
                                      updateLine(line.id, { feeToman: Math.max(0, Number(e.target.value) || 0) })
                                    }
                                    dir="ltr"
                                    className="w-full min-h-[38px] px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold tabular-nums"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-stone-500 mb-1">تخفیف ردیف (تومان)</label>
                                  <input
                                    type="number"
                                    step="50000"
                                    min="0"
                                    value={line.discountToman}
                                    onChange={(e) =>
                                      updateLine(line.id, { discountToman: Math.max(0, Number(e.target.value) || 0) })
                                    }
                                    dir="ltr"
                                    className="w-full min-h-[38px] px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold tabular-nums"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-stone-500 mb-1">کد ری‌گیری / اتیکت</label>
                                  <input
                                    type="text"
                                    value={line.assayCode || ''}
                                    onChange={(e) => updateLine(line.id, { assayCode: e.target.value })}
                                    dir="ltr"
                                    className="w-full min-h-[38px] px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TRADE-IN OLD GOLD PANEL (When cashierMode === 'trade_in') */}
                {enableTradeIn && !isCancelMode && (
                  <div className="bg-white dark:bg-[#15171C] border border-emerald-300/70 dark:border-emerald-900/60 rounded-2xl p-5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          طلای تعویضی / دست‌دوم تحویلی مشتری
                        </h3>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          وزن را روی ترازو بگذارید تا ارزش آن خودکار از فاکتور کسر شود
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        - {formatToman(oldGoldValueToman)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">وزن طلای کهنه (گرم)</label>
                        <input
                          type="number"
                          step="0.005"
                          min="0"
                          value={oldGoldGrams}
                          onChange={(e) => setOldGoldGrams(e.target.value)}
                          dir="ltr"
                          className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">عیار طلای کهنه</label>
                        <select
                          value={oldGoldKarat}
                          onChange={(e) => setOldGoldKarat(Number(e.target.value) || 740)}
                          className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                        >
                          <option value={740}>۷۴۰ (متفرقه)</option>
                          <option value={750}>۷۵۰ (۱۸ عیار)</option>
                          <option value={900}>۹۰۰ (۲۱ عیار)</option>
                          <option value={995}>۹۹۵ (شمش ۲۴)</option>
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex flex-col justify-center text-xs tabular-nums">
                        <span className="text-[11px] text-stone-500">معادل ۱۸ عیار (۷۵۰)</span>
                        <strong className="text-stone-900 dark:text-stone-100 mt-0.5">
                          {formatGrams(oldGoldEquiv18k)}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Quick Info Card */}
                <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
                      <Users className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      انتخاب مشتری از دفتر مشتریان گالری
                    </label>
                    {selectedShopCustomer && (
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 tabular-nums">
                        {selectedShopCustomer.tier === 'vip'
                          ? 'مشتری ویژه VIP'
                          : selectedShopCustomer.tier === 'colleague'
                          ? 'همکار صنفی'
                          : 'مشتری عادی'}
                        {selectedShopCustomer.rialAccountBalanceToman !== 0
                          ? ` · مانده ریالی: ${formatToman(selectedShopCustomer.rialAccountBalanceToman)}`
                          : ''}
                        {selectedShopCustomer.goldAccountBalanceGrams !== 0
                          ? ` · مانده طلا: ${formatGrams(selectedShopCustomer.goldAccountBalanceGrams)}`
                          : ''}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedPosCustomerId || ''}
                    onChange={(e) => applyCustomerProfile(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs font-medium"
                  >
                    <option value="">مشتری حضوری جدید (ورود دستی نام و شماره)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {toPersianDigits(c.phone)}
                        {c.tier === 'vip' ? ' (VIP)' : c.tier === 'colleague' ? ' (همکار)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">نام مشتری (درج روی رسید)</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">شماره همراه (ارسال پیامک رسید)</label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        dir="ltr"
                        className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Advanced Moadian Official Settings (Tucked away cleanly!) */}
                <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMoadianAdvanced((v) => !v)}
                    className="w-full min-h-[48px] px-5 py-3 flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/50 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-stone-500" />
                      تنظیمات پیشرفته فاکتور رسمی و سامانه مودیان (نوع اول/دوم، اصلاحی، نسیه)
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-stone-500 shrink-0">
                      <span>نوع {inty === 1 ? 'اول' : 'دوم'} · {MOADIAN_SUBJECT_LABELS[ins]}</span>
                      {showMoadianAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {showMoadianAdvanced && (
                    <div className="p-5 pt-2 border-t border-stone-100 dark:border-stone-800 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setInty(2)}
                          className={`min-h-[40px] rounded-xl border text-xs font-semibold cursor-pointer ${
                            inty === 2
                              ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                              : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          نوع دوم (مصرف‌کننده نهایی)
                        </button>
                        <button
                          type="button"
                          onClick={() => setInty(1)}
                          className={`min-h-[40px] rounded-xl border text-xs font-semibold cursor-pointer ${
                            inty === 1
                              ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                              : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          نوع اول (خریدار با کد ملی/اقتصادی)
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([1, 2, 3, 4] as MoadianInvoiceSubject[]).map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setIns(sub)}
                            className={`min-h-[38px] px-2 rounded-xl border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                              ins === sub
                                ? 'border-stone-900 dark:border-amber-500 bg-stone-900/5 dark:bg-amber-950/30 text-stone-900 dark:text-amber-300'
                                : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            {MOADIAN_SUBJECT_LABELS[sub]}
                          </button>
                        ))}
                      </div>

                      {isReferenceMode && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <select
                            value={irtaxid}
                            onChange={(e) => {
                              const selected = moadianInvoices.find((m) => m.taxid === e.target.value);
                              setIrtaxid(e.target.value);
                              if (selected && (ins === 2 || ins === 4)) {
                                loadReferenceInvoiceIntoForm(selected, ins);
                              }
                            }}
                            className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                          >
                            <option value="">انتخاب صورتحساب مرجع (irtaxid)...</option>
                            {moadianInvoices
                              .filter((inv) => inv.ins === 1)
                              .map((inv) => (
                                <option key={inv.id} value={inv.taxid}>
                                  {inv.taxid} ({inv.buyerName})
                                </option>
                              ))}
                          </select>
                          <input
                            type="text"
                            maxLength={22}
                            value={irtaxid}
                            onChange={(e) => setIrtaxid(e.target.value.toUpperCase())}
                            placeholder="ورود دستی irtaxid"
                            dir="ltr"
                            className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                          />
                        </div>
                      )}

                      {!isReferenceMode && inty === 1 && (
                        <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([1, 2, 3, 4] as MoadianBuyerType[]).map((bt) => (
                              <button
                                key={bt}
                                type="button"
                                onClick={() => setTob(bt)}
                                className={`min-h-[38px] px-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                                  tob === bt
                                    ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                                }`}
                              >
                                {MOADIAN_BUYER_TYPE_LABELS[bt]}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              maxLength={12}
                              value={bid}
                              onChange={(e) => setBid(e.target.value)}
                              placeholder="کد ملی / شناسه ملی خریدار (bid)"
                              dir="ltr"
                              className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                            />
                            <input
                              type="text"
                              maxLength={14}
                              value={tinb}
                              onChange={(e) => setTinb(e.target.value)}
                              placeholder="شماره اقتصادی خریدار (tinb)"
                              dir="ltr"
                              className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                            />
                            <input
                              type="text"
                              maxLength={10}
                              value={bpc}
                              onChange={(e) => setBpc(e.target.value)}
                              placeholder="کد پستی خریدار (bpc)"
                              dir="ltr"
                              className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                            />
                            {tob === 4 ? (
                              <input
                                type="text"
                                maxLength={9}
                                value={bpn}
                                onChange={(e) => setBpn(e.target.value.toUpperCase())}
                                placeholder="گذرنامه (bpn)"
                                dir="ltr"
                                className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                              />
                            ) : (
                              <input
                                type="text"
                                maxLength={4}
                                value={bbc}
                                onChange={(e) => setBbc(e.target.value)}
                                placeholder="کد شعبه (bbc)"
                                dir="ltr"
                                className="min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                              />
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {([1, 2, 3] as MoadianSettlementMethod[]).map((sm) => (
                              <button
                                key={sm}
                                type="button"
                                onClick={() => setSetm(sm)}
                                className={`min-h-[38px] rounded-xl border text-xs font-semibold cursor-pointer ${
                                  setm === sm
                                    ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                                }`}
                              >
                                {MOADIAN_SETTLEMENT_LABELS[sm]}
                              </button>
                            ))}
                          </div>
                          {setm === 3 && (
                            <input
                              type="number"
                              value={cashSplitToman}
                              onChange={(e) => setCashSplitToman(e.target.value)}
                              placeholder="بخش نقدی (تومان)"
                              dir="ltr"
                              className="w-full min-h-[40px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs tabular-nums"
                            />
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          maxLength={30}
                          value={nti1}
                          onChange={(e) => setNti1(e.target.value)}
                          placeholder="یادداشت ۱ روی فاکتور (حداکثر ۳۰ کاراکتر)"
                          className="min-h-[38px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                        />
                        <input
                          type="text"
                          maxLength={30}
                          value={nti2}
                          onChange={(e) => setNti2(e.target.value)}
                          placeholder="یادداشت ۲ روی فاکتور (حداکثر ۳۰ کاراکتر)"
                          className="min-h-[38px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                        <label className="inline-flex items-center gap-2 cursor-pointer text-stone-600 dark:text-stone-400">
                          <input
                            type="checkbox"
                            checked={isArticle9Delayed}
                            onChange={(e) => setIsArticle9Delayed(e.target.checked)}
                            className="w-4 h-4 accent-amber-600 cursor-pointer"
                          />
                          مشمول ارسال با تاخیر ماده ۹ (insr=1)
                        </label>
                        <button
                          type="button"
                          onClick={handleOpenLiveJsonPreview}
                          className="text-amber-700 dark:text-amber-400 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          مشاهده JSON مودیان
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Sticky POS Payment & Split Settlement Column */}
          <div className="lg:col-span-5 bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4 sticky top-20">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {cashierMode === 'buyback'
                    ? 'خلاصه خرید طلا از مشتری'
                    : cashierMode === 'trade_in'
                    ? 'تسویه تعویض طلا روی پوز'
                    : 'صندوق پرداخت پوز'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                  {cashierMode === 'buyback'
                    ? `${formatGrams(buybackNetGrams)} · عیار ${toPersianDigits(buybackKarat)}`
                    : `${toPersianDigits(lines.length)} قطعه · جمع وزن ${formatGrams(totalGrams)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerDisplay(true)}
                className="min-h-[34px] px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-semibold flex items-center gap-1 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
                نمای مشتری
              </button>
            </div>

            {cashierMode === 'buyback' ? (
              <div className="space-y-2.5 text-xs tabular-nums border-y border-stone-100 dark:border-stone-800 py-3.5">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>وزن خالص دریافتی (عیار {toPersianDigits(buybackKarat)})</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {formatGrams(buybackNetGrams)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>معادل طلای ۱۸ عیار (۷۵۰)</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatGrams(buybackEquiv18kGrams)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>نرخ خرید هر گرم ۱۸ عیار</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {formatToman(activeBuyRate18k)}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-stone-200 dark:border-stone-700 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    مبلغ پرداختی به مشتری
                  </span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    {formatToman(buybackTotalToman)}
                  </span>
                </div>
              </div>
            ) : !isCancelMode ? (
              <div className="space-y-2 text-xs tabular-nums border-y border-stone-100 dark:border-stone-800 py-3.5">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>بهای طلای خام</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {formatToman(Math.round(liveBuilt.summary.tprdisRial / 10))}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>اجرت ساخت</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {formatToman(Math.round(liveBuilt.summary.totalWageRial / 10))}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>سود فروشنده</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {formatToman(Math.round(liveBuilt.summary.totalProfitRial / 10))}
                  </span>
                </div>
                {liveBuilt.summary.tdisRial > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>تخفیف</span>
                    <span>- {formatToman(Math.round(liveBuilt.summary.tdisRial / 10))}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>مالیات بر اجرت و سود (۱۰٪)</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {formatToman(Math.round(liveBuilt.summary.tvamRial / 10))}
                  </span>
                </div>
                {oldGoldValueToman > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>کسر طلای تعویضی ({formatGrams(parsedOldGrams)})</span>
                    <span>- {formatToman(oldGoldValueToman)}</span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-stone-200 dark:border-stone-700 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {tradeInSurplusToCustomerToman > 0 ? 'بستانکاری مشتری' : 'مبلغ قابل پرداخت'}
                  </span>
                  <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                    {formatToman(
                      tradeInSurplusToCustomerToman > 0
                        ? tradeInSurplusToCustomerToman
                        : netPayableAfterTradeInToman
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500">
                  <span>معادل ریالی</span>
                  <span className="font-mono-code">
                    {formatRial(
                      (tradeInSurplusToCustomerToman > 0
                        ? tradeInSurplusToCustomerToman
                        : netPayableAfterTradeInToman) * 10
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
                حالت ابطال فاکتور مرجع فعال است.
              </div>
            )}

            {/* Payment Mode: Single vs Multi-Card Split Payment (Iran Card Limit Solver!) */}
            {cashierMode !== 'buyback' && !isCancelMode && !(inty === 1 && setm === 2) && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSplitMode(false);
                      setSplitPayments([]);
                    }}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold cursor-pointer ${
                      !splitMode
                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-500'
                    }`}
                  >
                    پرداخت یکجا
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode(true)}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                      splitMode
                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-500'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    پرداخت ترکیبی (چند کارت)
                  </button>
                </div>

                {!splitMode ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        [4, 'کارتخوان پوز'],
                        [3, 'وجه نقد'],
                        [6, 'کارت‌به‌کارت'],
                      ] as const
                    ).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setPmt(code)}
                        className={`min-h-[42px] px-2 rounded-xl border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                          pmt === code
                            ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                            : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-3">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="text-stone-500">مانده تسویه‌نشده</span>
                      <strong
                        className={
                          splitRemainingToman === 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }
                      >
                        {formatToman(splitRemainingToman)}
                      </strong>
                    </div>

                    {/* Recorded Split Payments List */}
                    {splitPayments.length > 0 && (
                      <div className="space-y-1.5 border-y border-stone-200 dark:border-stone-800 py-2">
                        {splitPayments.map((sp, idx) => (
                          <div key={sp.id} className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                            <span className="text-stone-700 dark:text-stone-300 truncate">
                              {toPersianDigits(idx + 1)}. {sp.methodLabel} {sp.cardMask ? `(${sp.cardMask.slice(-4)})` : ''}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <strong className="text-stone-900 dark:text-stone-100">
                                {formatToman(sp.amountToman)}
                              </strong>
                              <button
                                type="button"
                                onClick={() => setSplitPayments((prev) => prev.filter((x) => x.id !== sp.id))}
                                className="text-rose-600 hover:text-rose-700 p-0.5 cursor-pointer"
                                aria-label="حذف بخش پرداخت"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {splitRemainingToman > 0 && (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: '۵۰ میلیون', val: Math.min(50000000, splitRemainingToman) },
                            { label: 'نصف مانده', val: Math.round(splitRemainingToman / 2) },
                            { label: 'کل مانده', val: splitRemainingToman },
                          ].map((q) => (
                            <button
                              key={q.label}
                              type="button"
                              onClick={() => setSplitAmountInput(String(q.val))}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
                            >
                              {q.label}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="100000"
                            min="0"
                            value={splitAmountInput}
                            onChange={(e) => setSplitAmountInput(e.target.value)}
                            placeholder={String(splitRemainingToman)}
                            dir="ltr"
                            className="min-h-[40px] px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold tabular-nums"
                          />
                          <select
                            value={splitMethod}
                            onChange={(e) => setSplitMethod(e.target.value as PaymentMethod)}
                            className="min-h-[40px] px-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold"
                          >
                            <option value="pos_card">کارتخوان پوز</option>
                            <option value="cash">وجه نقد</option>
                            <option value="shaba">کارت‌به‌کارت / شبا</option>
                            <option value="rial_wallet">کیف پول زرپوز</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddSplitPayment}
                          className="w-full min-h-[42px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          {splitMethod === 'pos_card' ? 'کشیدن این بخش روی کارتخوان' : 'ثبت این بخش پرداخت'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {blockingErrors.length > 0 && cashierMode !== 'buyback' && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{blockingErrors[0].message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleChargePos}
              className={`w-full min-h-[52px] px-5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                cashierMode === 'buyback'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              {cashierMode === 'buyback'
                ? 'ثبت خرید طلا و چاپ رسید مشتری'
                : isCancelMode
                ? 'صدور فاکتور ابطالی'
                : splitMode
                ? splitRemainingToman === 0
                  ? 'تکمیل تسویه ترکیبی و چاپ رسید نهایی'
                  : `مانده تسویه‌نشده: ${formatToman(splitRemainingToman)}`
                : pmt === 4 && !(inty === 1 && setm === 2)
                ? 'ارسال مبلغ به کارتخوان پوز و چاپ رسید'
                : 'ثبت فروش و چاپ رسید حرارتی'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Physical Delivery QR Handover & Assay Verification */}
      {activeTab === 'handover' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pickup Code Verification */}
          <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                تحویل فیزیکی سفارش آنلاین با اسکنر پوز
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                کد تحویل ۶ رقمی مشتری را اسکن یا وارد کنید تا سفارش تطبیق داده شده و رسید تحویل چاپ شود
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                openQrScanner((code) => {
                  setPickupCodeInput(code);
                  redeemPickupByCode(code);
                })
              }
              className="w-full min-h-[52px] rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-amber-500 transition-colors cursor-pointer"
            >
              <QrCode className="w-5 h-5" />
              باز کردن اسکنر دوربین پوز (QR)
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pickupCodeInput.trim()) {
                  redeemPickupByCode(pickupCodeInput.trim());
                  setPickupCodeInput('');
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={pickupCodeInput}
                onChange={(e) => setPickupCodeInput(e.target.value)}
                placeholder="ورود دستی کد تحویل (مثلاً ZP-482910)"
                dir="ltr"
                className="flex-1 min-h-[46px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code"
              />
              <button
                type="submit"
                className="min-h-[46px] px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
              >
                بررسی و تحویل
              </button>
            </form>

            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
              <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                سفارش‌های منتظر مراجعه در {activeMerchantShop.name}:
              </div>
              {pickupOrders
                .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
                .map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {ord.customerName} · {ord.itemTitle}
                      </div>
                      <div className="text-[11px] text-stone-500 tabular-nums mt-0.5">
                        {formatGrams(ord.weightGrams)} · کد:{' '}
                        <span className="font-mono-code font-bold text-amber-700 dark:text-amber-400">
                          {ord.code}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => redeemPickupByCode(ord.code)}
                      className="min-h-[38px] px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      تحویل شد
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Assay Code (کد ری‌گیری) Verification */}
          <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                استعلام آنلاین کد ری‌گیری (اصالت آب‌شده و شمش)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                استعلام آنی شماره انگ آزمایشگاه ری‌گیری برای اطمینان خریدار و طلافروش قبل از معامله
              </p>
            </div>

            <form onSubmit={handleLookupAssay} className="flex items-center gap-2">
              <input
                type="text"
                value={assayLookupInput}
                onChange={(e) => setAssayLookupInput(e.target.value)}
                placeholder="مثلاً AB-750-882190 یا RY-995-441082"
                dir="ltr"
                className="flex-1 min-h-[46px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code"
              />
              <button
                type="submit"
                className="min-h-[46px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                استعلام
              </button>
            </form>

            {assayResult ? (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  انگ و کد ری‌گیری معتبر است
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
                  <span className="text-stone-500">شماره کد ری‌گیری</span>
                  <span className="font-mono-code font-bold text-stone-900 dark:text-stone-100">
                    {assayResult.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">آزمایشگاه صادرکننده</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">{assayResult.lab}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">عیار ثبت‌شده</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    {toPersianDigits(assayResult.karat)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">وزن ثبت‌شده</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                    {assayResult.weight}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500">
                کد ری‌گیری حک‌شده روی طلای آب‌شده یا بسته پلمپ شمش را وارد کنید (نمونه: AB-750-882190)
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Daily POS Z-Report & Gold Weight Balance */}
      {activeTab === 'zreport' && (
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                گزارش بستن صندوق پایان روز و تراز طلای پوز (Z-Report)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                پایانه {activeMerchantShop.terminalId} · {activeMerchantShop.name}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrintZReport}
              className="min-h-[44px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-xs font-semibold flex items-center gap-2 hover:bg-stone-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              چاپ گزارش Z-Report روی پرینتر پوز
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <div className="text-xs text-stone-500">جمع فروش کارتخوان شاپرک</div>
              <div className="mt-1.5 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {formatToman(zReportCardTotal)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <div className="text-xs text-stone-500">جمع نقدی و کارت‌به‌کارت</div>
              <div className="mt-1.5 text-lg font-bold text-stone-900 dark:text-stone-100">
                {formatToman(zReportOtherTotal)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <div className="text-xs text-stone-500">طلای خارج‌شده (فروش)</div>
              <div className="mt-1.5 text-lg font-bold text-amber-700 dark:text-amber-400">
                {formatGrams(zReportSoldGrams)}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              <div className="text-xs text-stone-500">طلای ورودی (بازخرید)</div>
              <div className="mt-1.5 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {formatGrams(zReportBoughtBackGrams)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              تطبیق دسته شاپرک و تراز وزنی پایان روز: بدون مغایرت ({toPersianDigits(todayPosTxs.length)} تراکنش)
            </div>
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: 'بسته تراکنش‌های پوز با شاپرک همگام‌سازی شد',
                  tone: 'success',
                })
              }
              className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300 font-semibold hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تطبیق مجدد
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Moadian Workbench (Kept Complete & Separate from Daily POS Flow) */}
      {activeTab === 'moadian' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 tabular-nums">
            <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
              <div className="text-xs text-stone-500">کل صورتحساب‌های الگوی ۳</div>
              <div className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-100">
                {toPersianDigits(moadianInvoices.length)} فقره
              </div>
            </div>
            <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
              <div className="text-xs text-stone-500">آماده ارسال به بک‌اند</div>
              <div className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">
                {toPersianDigits(draftMoadianCount)} فقره
              </div>
            </div>
            <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
              <div className="text-xs text-stone-500">ثبت‌شده در کارپوشه</div>
              <div className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {toPersianDigits(moadianInvoices.filter((i) => i.status === 'accepted').length)} فقره
              </div>
            </div>
            <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
              <div className="text-xs text-stone-500">جمع مالیات ارزش افزوده</div>
              <div className="mt-1 text-lg font-bold text-stone-900 dark:text-stone-100">
                {formatToman(
                  Math.round(
                    moadianInvoices
                      .filter((i) => i.ins !== 3 && i.status !== 'cancelled_ref')
                      .reduce((a, b) => a + b.totalVatRial, 0) / 10
                  )
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  کارپوشه صورتحساب‌های الکترونیکی طلا (نسخه ۷.۹)
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  مشاهده JSON استاندارد، ارسال آزمایشی و صدور اصلاحی، برگشت و ابطال
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl">
                {(
                  [
                    ['all', 'همه'],
                    ['draft_local', 'آماده ارسال'],
                    ['accepted', 'تاییدشده'],
                    ['cancelled_ref', 'ابطال‌شده'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMoadianFilter(key)}
                    className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      moadianFilter === key
                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredMoadianInvoices.length === 0 ? (
              <div className="py-10 text-center text-xs text-stone-500">
                صورتحسابی با این وضعیت وجود ندارد.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {filteredMoadianInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                        <span className="font-bold text-stone-900 dark:text-stone-100">{inv.buyerName}</span>
                        <span className="text-stone-400">·</span>
                        <span className="text-stone-600 dark:text-stone-400">
                          نوع {inv.inty === 1 ? 'اول' : 'دوم'} · {MOADIAN_SUBJECT_LABELS[inv.ins]}
                        </span>
                        <span className="text-stone-400">·</span>
                        <span
                          className={`font-semibold ${
                            inv.status === 'accepted'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : inv.status === 'cancelled_ref'
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {inv.status === 'accepted'
                            ? 'تاییدشده'
                            : inv.status === 'cancelled_ref'
                            ? 'ابطال‌شده'
                            : 'آماده ارسال'}
                        </span>
                      </div>

                      <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono-code" dir="ltr">
                        taxid: {inv.taxid}
                      </div>

                      <div className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">
                        {inv.createdAtPersian} · {formatGrams(inv.totalGoldGrams)} ·{' '}
                        <strong className="text-stone-900 dark:text-stone-100">
                          {formatToman(inv.totalToman)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveMoadianRecord(inv)}
                        className="min-h-[38px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
                      >
                        <Code2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        JSON
                      </button>

                      {inv.status === 'draft_local' && (
                        <button
                          type="button"
                          onClick={() => submitMoadianInvoice(inv.id)}
                          className="min-h-[38px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" />
                          ارسال
                        </button>
                      )}

                      {inv.ins === 1 && inv.status !== 'cancelled_ref' && (
                        <>
                          <button
                            type="button"
                            onClick={() => loadReferenceInvoiceIntoForm(inv, 2)}
                            className="min-h-[38px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                            اصلاحی
                          </button>
                          <button
                            type="button"
                            onClick={() => loadReferenceInvoiceIntoForm(inv, 4)}
                            className="min-h-[38px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer whitespace-nowrap"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            برگشت
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const cancelRec = issueQuickCancelInvoice(inv);
                              setActiveMoadianRecord(cancelRec);
                            }}
                            className="min-h-[38px] px-3 rounded-xl border border-rose-300 dark:border-rose-900/70 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer whitespace-nowrap"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            ابطال
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer-Facing Dual Display / Flip Mode Modal */}
      <PosCustomerDisplayModal
        open={showCustomerDisplay}
        onClose={() => setShowCustomerDisplay(false)}
        onConfirmAndPay={handleChargePos}
        mode={cashierMode}
        shopName={activeMerchantShop.name}
        customerName={customerName}
        gold18RateToman={cashierMode === 'buyback' ? activeBuyRate18k : activeSellRate18k}
        priceLockSecondsLeft={priceLockSeconds}
        items={
          cashierMode === 'buyback'
            ? [
                {
                  title: buybackNote.trim() || 'طلای دست‌دوم / شکسته',
                  weightGrams: buybackNetGrams,
                  karat: buybackKarat,
                  totalToman: buybackTotalToman,
                },
              ]
            : lines.map((l) => {
                const c = computeGoldLineV79(l);
                return {
                  title: l.sstt,
                  weightGrams: l.am,
                  karat: l.cui,
                  totalToman: c.tsstamToman,
                };
              })
        }
        oldGoldSummary={
          enableTradeIn && parsedOldGrams > 0
            ? {
                weightGrams: parsedOldGrams,
                karat: oldGoldKarat,
                equiv18kGrams: oldGoldEquiv18k,
                valueToman: oldGoldValueToman,
              }
            : null
        }
        vatToman={cashierMode === 'buyback' ? 0 : Math.round(liveBuilt.summary.tvamRial / 10)}
        finalAmountToman={
          cashierMode === 'buyback' ? buybackTotalToman : netPayableAfterTradeInToman
        }
        paidSoFarToman={splitMode ? splitPaidTotalToman : 0}
      />
    </div>
  );
};
