import React, { useMemo, useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { CustomerTier, ShopCustomer } from '../types/gold';
import { formatGrams, formatToman, toEnglishDigits, toPersianDigits } from '../utils/format';
import {
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Plus,
  Receipt,
  Save,
  Search,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';

type CustomerFilter = 'all' | 'vip' | 'colleague' | 'has_balance';

const TIER_LABELS: Record<CustomerTier, string> = {
  vip: 'مشتری ویژه (VIP)',
  colleague: 'همکار / بنکدار',
  regular: 'مشتری عادی',
};

export const CustomersView: React.FC = () => {
  const {
    customers,
    transactions,
    addShopCustomer,
    updateShopCustomer,
    adjustCustomerLedger,
    startPosCheckoutForCustomer,
    setActiveReceipt,
    gold18Asset,
    pushToast,
  } = usePlatform();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const [selectedId, setSelectedId] = useState<string>(customers[0]?.id || '');

  // Add Customer Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newNationalId, setNewNationalId] = useState<string>('');
  const [newTier, setNewTier] = useState<CustomerTier>('regular');
  const [newShaba, setNewShaba] = useState<string>('');
  const [newBirthDate, setNewBirthDate] = useState<string>('');
  const [newDepositToman, setNewDepositToman] = useState<string>('0');
  const [newNote, setNewNote] = useState<string>('');

  // Quick Ledger Adjustment State (بیعانه / تسویه حساب دفتری)
  const [ledgerKind, setLedgerKind] = useState<'rial_deposit' | 'rial_debt' | 'gold_credit' | 'gold_debt'>('rial_deposit');
  const [ledgerValue, setLedgerValue] = useState<string>('');
  const [ledgerReason, setLedgerReason] = useState<string>('');

  // Inline Edit Note / Tier
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = toEnglishDigits(searchQuery.trim()).toLowerCase();
    return customers.filter((c) => {
      if (filter === 'vip' && c.tier !== 'vip') return false;
      if (filter === 'colleague' && c.tier !== 'colleague') return false;
      if (
        filter === 'has_balance' &&
        c.rialAccountBalanceToman === 0 &&
        c.goldAccountBalanceGrams === 0
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        toEnglishDigits(c.phone).includes(q) ||
        (c.nationalId && toEnglishDigits(c.nationalId).includes(q))
      );
    });
  }, [customers, filter, searchQuery]);

  const selectedCustomer: ShopCustomer | null = useMemo(
    () => customers.find((c) => c.id === selectedId) || filteredCustomers[0] || null,
    [customers, filteredCustomers, selectedId]
  );

  // Linked transactions for selected customer
  const customerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    const targetName = selectedCustomer.name.trim();
    const firstPart = targetName.split(' (')[0];
    return transactions.filter(
      (t) =>
        t.counterparty.includes(firstPart) ||
        (t.receipt && t.receipt.customerName.includes(firstPart))
    );
  }, [selectedCustomer, transactions]);

  // Top KPI Aggregates
  const totalVipAndColleagues = customers.filter((c) => c.tier === 'vip' || c.tier === 'colleague').length;
  const totalCustomerCreditsToman = customers
    .filter((c) => c.rialAccountBalanceToman > 0)
    .reduce((acc, c) => acc + c.rialAccountBalanceToman, 0);
  const totalCustomerDebtsToman = customers
    .filter((c) => c.rialAccountBalanceToman < 0)
    .reduce((acc, c) => acc + Math.abs(c.rialAccountBalanceToman), 0);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      pushToast({ title: 'نام و شماره موبایل مشتری الزامی است', tone: 'warning' });
      return;
    }
    const created = addShopCustomer({
      name: newName.trim(),
      phone: toPersianDigits(toEnglishDigits(newPhone).replace(/\D/g, '') || newPhone.trim()),
      nationalId: toEnglishDigits(newNationalId).replace(/\D/g, '') || undefined,
      tier: newTier,
      kycVerified: toEnglishDigits(newNationalId).replace(/\D/g, '').length === 10,
      rialAccountBalanceToman: Math.round(parseFloat(newDepositToman) || 0),
      goldAccountBalanceGrams: 0,
      shaba: newShaba.trim() || undefined,
      birthDatePersian: newBirthDate.trim() || undefined,
      preferencesNote: newNote.trim() || undefined,
    });
    setSelectedId(created.id);
    setShowAddModal(false);
    setNewName('');
    setNewPhone('');
    setNewNationalId('');
    setNewTier('regular');
    setNewShaba('');
    setNewBirthDate('');
    setNewDepositToman('0');
    setNewNote('');
  };

  const handleApplyLedgerAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const numericVal = parseFloat(ledgerValue) || 0;
    if (numericVal <= 0) {
      pushToast({ title: 'مبلغ یا وزن معتبر وارد کنید', tone: 'warning' });
      return;
    }

    if (ledgerKind === 'rial_deposit') {
      adjustCustomerLedger({
        customerId: selectedCustomer.id,
        rialDeltaToman: Math.round(numericVal),
        reason: ledgerReason.trim() || `ثبت بیعانه / واریز ${formatToman(numericVal)}`,
      });
    } else if (ledgerKind === 'rial_debt') {
      adjustCustomerLedger({
        customerId: selectedCustomer.id,
        rialDeltaToman: -Math.round(numericVal),
        reason: ledgerReason.trim() || `ثبت نسیه / کسر حساب ${formatToman(numericVal)}`,
      });
    } else if (ledgerKind === 'gold_credit') {
      adjustCustomerLedger({
        customerId: selectedCustomer.id,
        goldDeltaGrams: Number(numericVal.toFixed(3)),
        reason: ledgerReason.trim() || `ثبت امانت / طلب طلایی ${formatGrams(numericVal)}`,
      });
    } else {
      adjustCustomerLedger({
        customerId: selectedCustomer.id,
        goldDeltaGrams: -Number(numericVal.toFixed(3)),
        reason: ledgerReason.trim() || `ثبت بدهی طلایی ${formatGrams(numericVal)}`,
      });
    }

    setLedgerValue('');
    setLedgerReason('');
  };

  const handleSendRateSms = (cust: ShopCustomer) => {
    pushToast({
      title: `پیامک نرخ لحظه‌ای برای ${cust.name} ارسال شد`,
      description: `مظنه ۱۸ عیار: ${formatToman(gold18Asset.sellPrice)} · شماره ${cust.phone}`,
      tone: 'success',
    });
  };

  return (
    <div className="space-y-5">
      {/* Top 4-KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 tabular-nums">
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
          <div className="text-xs text-stone-500 dark:text-stone-400">کل پرونده مشتریان</div>
          <div className="mt-1.5 text-xl font-bold text-stone-900 dark:text-stone-100">
            {toPersianDigits(customers.length)} مشتری
          </div>
        </div>
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
          <div className="text-xs text-stone-500 dark:text-stone-400">مشتریان VIP و همکاران</div>
          <div className="mt-1.5 text-xl font-bold text-amber-700 dark:text-amber-400">
            {toPersianDigits(totalVipAndColleagues)} نفر
          </div>
        </div>
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
          <div className="text-xs text-stone-500 dark:text-stone-400">جمع بیعانه و بستانکاری</div>
          <div className="mt-1.5 text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {formatToman(totalCustomerCreditsToman)}
          </div>
        </div>
        <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4">
          <div className="text-xs text-stone-500 dark:text-stone-400">جمع مطالبات (نسیه مشتریان)</div>
          <div className="mt-1.5 text-lg font-bold text-rose-700 dark:text-rose-400">
            {formatToman(totalCustomerDebtsToman)}
          </div>
        </div>
      </div>

      {/* Main 2-Column Customer Directory + Profile Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Master List Column */}
        <div className="lg:col-span-5 bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                فهرست مشتریان گالری
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="min-h-[38px] px-3 rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              مشتری جدید
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با نام، شماره موبایل یا کد ملی..."
              className="w-full min-h-[42px] pr-9 pl-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-900 rounded-xl overflow-x-auto">
            {(
              [
                ['all', 'همه'],
                ['vip', 'ویژه (VIP)'],
                ['colleague', 'همکاران'],
                ['has_balance', 'دارای مانده'],
              ] as const
            ).map(([fId, label]) => (
              <button
                key={fId}
                type="button"
                onClick={() => setFilter(fId)}
                className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex-1 ${
                  filter === fId
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Customer List */}
          <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-[540px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="py-10 text-center text-xs text-stone-500">
                مشتری با این مشخصات یافت نشد.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setEditingNote(null);
                    }}
                    className={`w-full py-3 px-3 text-right rounded-xl transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-stone-100 dark:bg-stone-800/80'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-900/50'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                          {c.name}
                        </span>
                        {c.kycVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                        {c.phone} · {TIER_LABELS[c.tier]}
                      </div>
                      <div className="text-[11px] text-stone-500 tabular-nums">
                        خرید کل: {formatGrams(c.totalGoldGrams)} · {toPersianDigits(c.visitCount)} مراجعه
                      </div>
                    </div>

                    <div className="text-left shrink-0 space-y-0.5 tabular-nums">
                      {c.rialAccountBalanceToman !== 0 && (
                        <div
                          className={`text-xs font-bold ${
                            c.rialAccountBalanceToman > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {c.rialAccountBalanceToman > 0 ? 'بیعانه ' : 'بدهکار '}
                          {formatToman(Math.abs(c.rialAccountBalanceToman))}
                        </div>
                      )}
                      {c.goldAccountBalanceGrams !== 0 && (
                        <div
                          className={`text-[11px] font-semibold ${
                            c.goldAccountBalanceGrams > 0
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {c.goldAccountBalanceGrams > 0 ? 'امانت طلا ' : 'بدهی طلا '}
                          {formatGrams(Math.abs(c.goldAccountBalanceGrams))}
                        </div>
                      )}
                      {c.rialAccountBalanceToman === 0 && c.goldAccountBalanceGrams === 0 && (
                        <span className="text-[11px] text-stone-400">تسویه</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Profile & Ledger Column */}
        <div className="lg:col-span-7 space-y-5">
          {selectedCustomer ? (
            <>
              {/* Customer Header & Quick Actions */}
              <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                        {selectedCustomer.name}
                      </h2>
                      {selectedCustomer.kycVerified && (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          احراز شاهکار
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 tabular-nums">
                      {selectedCustomer.phone}
                      {selectedCustomer.nationalId ? ` · کد ملی/اقتصادی: ${selectedCustomer.nationalId}` : ''}
                      {' · '}آخرین مراجعه: {selectedCustomer.lastVisitPersian}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendRateSms(selectedCustomer)}
                      className="min-h-[42px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <MessageSquare className="w-4 h-4" />
                      پیامک نرخ روز
                    </button>
                    <button
                      type="button"
                      onClick={() => startPosCheckoutForCustomer(selectedCustomer.id)}
                      className="min-h-[42px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <CreditCard className="w-4 h-4" />
                      شروع فروش / خرید در پوز
                    </button>
                  </div>
                </div>

                {/* Customer Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                    <div className="text-stone-500">مجموع معاملات</div>
                    <div className="font-bold text-stone-900 dark:text-stone-100 mt-1">
                      {formatToman(selectedCustomer.totalSpentToman)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                    <div className="text-stone-500">وزن کل معامله‌شده</div>
                    <div className="font-bold text-amber-700 dark:text-amber-400 mt-1">
                      {formatGrams(selectedCustomer.totalGoldGrams)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                    <div className="text-stone-500">مانده حساب ریالی</div>
                    <div
                      className={`font-bold mt-1 ${
                        selectedCustomer.rialAccountBalanceToman > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : selectedCustomer.rialAccountBalanceToman < 0
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {selectedCustomer.rialAccountBalanceToman === 0
                        ? 'تسویه (۰ تومان)'
                        : `${selectedCustomer.rialAccountBalanceToman > 0 ? 'بستانکار ' : 'بدهکار '}${formatToman(
                            Math.abs(selectedCustomer.rialAccountBalanceToman)
                          )}`}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                    <div className="text-stone-500">مانده حساب طلایی</div>
                    <div
                      className={`font-bold mt-1 ${
                        selectedCustomer.goldAccountBalanceGrams > 0
                          ? 'text-amber-700 dark:text-amber-400'
                          : selectedCustomer.goldAccountBalanceGrams < 0
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {selectedCustomer.goldAccountBalanceGrams === 0
                        ? '۰ گرم'
                        : `${selectedCustomer.goldAccountBalanceGrams > 0 ? 'امانت ' : 'بدهی '}${formatGrams(
                            Math.abs(selectedCustomer.goldAccountBalanceGrams)
                          )}`}
                    </div>
                  </div>
                </div>

                {/* Tier Switcher & Customer Preferences Note */}
                <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                      رده‌بندی مشتری در گالری
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(['regular', 'vip', 'colleague'] as CustomerTier[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateShopCustomer(selectedCustomer.id, { tier: t })}
                          className={`min-h-[34px] px-3 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
                            selectedCustomer.tier === t
                              ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                              : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          {TIER_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedCustomer.shaba && (
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>شماره شبا (جهت بازخرید طلا)</span>
                      <span className="font-mono-code text-stone-800 dark:text-stone-200" dir="ltr">
                        {selectedCustomer.shaba}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs text-stone-500">
                      یادداشت سلیقه، سفارش خاص یا وضعیت بیعانه
                    </label>
                    <div className="flex items-start gap-2">
                      <textarea
                        rows={2}
                        value={
                          editingNote !== null
                            ? editingNote
                            : selectedCustomer.preferencesNote || ''
                        }
                        onChange={(e) => setEditingNote(e.target.value)}
                        placeholder="مثلاً علاقه‌مند به شمش ۲۴ عیار یا دستبند کم‌اجرت..."
                        className="flex-1 p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs leading-relaxed"
                      />
                      {editingNote !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            updateShopCustomer(selectedCustomer.id, { preferencesNote: editingNote });
                            setEditingNote(null);
                          }}
                          className="min-h-[42px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" />
                          ذخیره
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gold & Rial Ledger Adjustment Card (حساب دفتری و بیعانه) */}
              <form
                onSubmit={handleApplyLedgerAdjustment}
                className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    ثبت بیعانه، نسیه یا حساب دفتری طلایی
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      ['rial_deposit', 'دریافت بیعانه (تومان)'],
                      ['rial_debt', 'ثبت نسیه (تومان)'],
                      ['gold_credit', 'امانت طلا (گرم)'],
                      ['gold_debt', 'بدهی طلا (گرم)'],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setLedgerKind(k)}
                      className={`min-h-[40px] px-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                        ledgerKind === k
                          ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                          : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="number"
                    step={ledgerKind.startsWith('gold') ? '0.01' : '100000'}
                    min="0"
                    value={ledgerValue}
                    onChange={(e) => setLedgerValue(e.target.value)}
                    placeholder={ledgerKind.startsWith('gold') ? 'وزن به گرم (مثلاً 1.5)' : 'مبلغ به تومان'}
                    dir="ltr"
                    className="min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                  />
                  <input
                    type="text"
                    value={ledgerReason}
                    onChange={(e) => setLedgerReason(e.target.value)}
                    placeholder="بابت (مثلاً بیعانه سفارش سرویس)"
                    className="min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    ثبت در پرونده
                  </button>
                </div>
              </form>

              {/* Customer Transaction History */}
              <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    سوابق خرید و تعویض اخیر ({toPersianDigits(customerTransactions.length)})
                  </h3>
                </div>

                {customerTransactions.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4 text-center">
                    هنوز تراکنش مستقیمی در این نشست برای این مشتری ثبت نشده است. از دکمه «شروع فروش در پوز» می‌توانید فاکتور جدید صادر کنید.
                  </p>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {customerTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {tx.title}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                            {tx.timestamp}
                            {tx.weightGrams ? ` · ${formatGrams(tx.weightGrams)}` : ''}
                            {' · '}کد پیگیری: <span className="font-mono-code">{tx.rrn}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                            {formatToman(tx.amountToman)}
                          </span>
                          {tx.receipt && (
                            <button
                              type="button"
                              onClick={() => setActiveReceipt(tx.receipt!)}
                              className="min-h-[34px] px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-[11px] font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              رسید
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-10 text-center text-xs text-stone-500">
              یک مشتری را از فهرست انتخاب کنید یا مشتری جدید ثبت نمایید.
            </div>
          )}
        </div>
      </div>

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="w-full sm:max-w-lg bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  ثبت پرونده مشتری جدید
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-w-[40px] min-h-[40px] rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">نام و نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثلاً فرهاد نادری"
                    className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">شماره موبایل *</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="09121234567"
                    dir="ltr"
                    className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">کد ملی / شناسه اقتصادی</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={newNationalId}
                    onChange={(e) => setNewNationalId(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">رده مشتری</label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as CustomerTier)}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold"
                  >
                    <option value="regular">مشتری عادی</option>
                    <option value="vip">مشتری ویژه (VIP)</option>
                    <option value="colleague">همکار / بنکدار</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">بیعانه اولیه (تومان — اختیاری)</label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    value={newDepositToman}
                    onChange={(e) => setNewDepositToman(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">تاریخ تولد (اختیاری)</label>
                  <input
                    type="text"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    placeholder="۱۳۷۰/۰۵/۱۲"
                    dir="ltr"
                    className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">شماره شبا (اختیاری — جهت بازخرید طلا)</label>
                <input
                  type="text"
                  value={newShaba}
                  onChange={(e) => setNewShaba(e.target.value)}
                  placeholder="IR..."
                  dir="ltr"
                  className="w-full min-h-[42px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono-code"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">یادداشت سلیقه و توضیحات</label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                />
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
              <button
                type="submit"
                className="flex-1 min-h-[46px] rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-white text-sm font-bold cursor-pointer"
              >
                ثبت مشتری جدید
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[46px] px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-medium text-stone-700 dark:text-stone-300 cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
