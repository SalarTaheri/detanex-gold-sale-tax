import React, { useMemo, useState } from 'react';
import { usePlatform } from '../context/PlatformContext';
import { CatalogCategory, CatalogItem } from '../types/gold';
import { PRODUCT_IMAGES } from '../data/mockData';
import {
  calculateIranGoldInvoice,
  formatGrams,
  formatToman,
  toPersianDigits,
} from '../utils/format';
import { OFFICIAL_GOLD_SSTIDS, OFFICIAL_GOLD_UNITS } from '../utils/moadian';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Store,
  X,
} from 'lucide-react';

const CATEGORY_LABELS: Record<'all' | CatalogCategory, string> = {
  all: 'همه محصولات',
  bullion: 'شمش ۲۴ عیار',
  abshodeh: 'طلای آب‌شده',
  coin: 'سکه بانکی',
  jewelry: 'زیورآلات ۱۸ عیار',
};

export const MarketplaceView: React.FC = () => {
  const {
    role,
    shops,
    activeMerchantShop,
    catalog,
    gold18Asset,
    createPhysicalPickup,
    requestPosPayment,
    addCatalogItem,
    toggleCatalogVisibility,
    updateCatalogStock,
    pushToast,
  } = usePlatform();

  const isMerchant = role === 'merchant';

  const [category, setCategory] = useState<'all' | CatalogCategory>('all');
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);
  const [buyMode, setBuyMode] = useState<'pos_card' | 'gold_wallet'>('pos_card');
  const [deliveryMethod, setDeliveryMethod] = useState<'in_person_pos' | 'insured_courier'>(
    'in_person_pos'
  );

  // Add Product Modal (Merchant)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CatalogCategory>('jewelry');
  const [newWeight, setNewWeight] = useState('3.50');
  const [newKarat, setNewKarat] = useState(750);
  const [newWage, setNewWage] = useState('8');
  const [newProfit, setNewProfit] = useState('7');
  const [newBrokerage, setNewBrokerage] = useState('0');
  const [newSstid, setNewSstid] = useState(OFFICIAL_GOLD_SSTIDS[0].sstid);
  const [newMu, setNewMu] = useState('164');
  const [newVatBaseRate, setNewVatBaseRate] = useState(0);
  const [newStock, setNewStock] = useState('2');
  const [newAssay, setNewAssay] = useState('JW-750-901244');

  const computeLivePrice = (item: CatalogItem) => {
    const res = calculateIranGoldInvoice({
      weightGrams: item.weightGrams,
      karat: item.karat,
      gold18SellPrice: gold18Asset.sellPrice,
      gold18BuyPrice: gold18Asset.buyPrice,
      wageType: 'percent',
      wageValue: item.wagePercent,
      profitPercent: item.profitPercent,
      brokeragePercent: item.brokeragePercent,
      baseVatRate: item.vatBaseRate,
      includeVat: true,
    });
    return res;
  };

  const filteredItems = useMemo(() => {
    return catalog.filter((item) => {
      if (isMerchant && item.shopId !== activeMerchantShop.id) return false;
      if (!isMerchant && !item.activeOnline) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (!isMerchant && selectedShopFilter !== 'all' && item.shopId !== selectedShopFilter) {
        return false;
      }
      if (
        searchQuery.trim() &&
        !item.title.includes(searchQuery.trim()) &&
        !item.shopName.includes(searchQuery.trim()) &&
        !item.assayCode.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [catalog, isMerchant, activeMerchantShop.id, category, selectedShopFilter, searchQuery]);

  const handleConfirmPurchase = () => {
    if (!selectedProduct) return;
    const pricing = computeLivePrice(selectedProduct);

    if (buyMode === 'pos_card') {
      const target = selectedProduct;
      setSelectedProduct(null);
      requestPosPayment({
        amountToman: pricing.netPayableToman,
        title: target.title,
        customerName: 'سارا رضایی',
        onSuccess: () => {
          createPhysicalPickup({
            shopId: target.shopId,
            itemTitle: target.title,
            weightGrams: target.weightGrams,
            karat: target.karat,
            totalToman: pricing.netPayableToman,
            deliveryMethod,
            deductFromGoldWallet: false,
            assayCode: target.assayCode,
          });
        },
      });
    } else {
      const created = createPhysicalPickup({
        shopId: selectedProduct.shopId,
        itemTitle: selectedProduct.title,
        weightGrams: selectedProduct.weightGrams,
        karat: selectedProduct.karat,
        totalToman: pricing.netPayableToman,
        deliveryMethod,
        deductFromGoldWallet: true,
        assayCode: selectedProduct.assayCode,
      });
      if (created) {
        setSelectedProduct(null);
      }
    }
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      pushToast({ title: 'عنوان محصول را وارد کنید', tone: 'warning' });
      return;
    }
    const imgMap: Record<CatalogCategory, string> = {
      bullion: PRODUCT_IMAGES.bullion,
      coin: PRODUCT_IMAGES.coin,
      abshodeh: PRODUCT_IMAGES.abshodeh,
      jewelry: PRODUCT_IMAGES.ring,
    };
    addCatalogItem({
      title: newTitle.trim(),
      category: newCategory,
      weightGrams: parseFloat(newWeight) || 1,
      karat: newKarat,
      wagePercent: parseFloat(newWage) || 0,
      profitPercent: parseFloat(newProfit) || 0,
      brokeragePercent: parseFloat(newBrokerage) || 0,
      sstid: newSstid.replace(/\D/g, '').slice(0, 13) || OFFICIAL_GOLD_SSTIDS[0].sstid,
      mu: newMu || '164',
      vatBaseRate: newVatBaseRate,
      assayCode: newAssay.trim() || `ZP-${Date.now().toString().slice(-6)}`,
      stock: parseInt(newStock, 10) || 1,
      imageUrl: imgMap[newCategory],
      activeOnline: true,
      description: 'ثبت‌شده توسط مدیریت گالری با شناسه کالا سامانه مودیان و فاکتور رسمی الگوی سوم.',
    });
    setNewTitle('');
    setAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Customer Mode: Verified Gold Shops Directory */}
      {!isMerchant && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                طلافروشی‌های مجاز و متصل به شبکه پوز زرپوز
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                با انتخاب هر گالری، ویترین آنلاین و تحویل حضوری همان طلافروشی را مشاهده کنید
              </p>
            </div>
            {selectedShopFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedShopFilter('all')}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                نمایش همه گالری‌ها
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {shops.map((shop) => {
              const active = selectedShopFilter === shop.id;
              return (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => setSelectedShopFilter(active ? 'all' : shop.id)}
                  className={`text-right p-4 rounded-2xl border transition-colors cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'bg-stone-900 dark:bg-amber-950/30 text-white dark:text-stone-100 border-stone-900 dark:border-amber-500'
                      : 'bg-white dark:bg-[#15171C] border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold truncate">{shop.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {toPersianDigits(shop.rating)}
                      </span>
                    </div>
                    <div
                      className={`mt-1.5 text-xs flex items-center gap-1 ${
                        active ? 'text-stone-300' : 'text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {shop.city} · {shop.district}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`mt-3 pt-2.5 border-t text-[11px] flex items-center justify-between tabular-nums ${
                      active
                        ? 'border-stone-700 text-stone-300'
                        : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      جواز تاییدشده
                    </span>
                    <span>کارمزد: {toPersianDigits(shop.spreadPercent)}٪</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Catalog Toolbar: Search, Category Filters, and Merchant Add Action */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 dark:bg-stone-900 rounded-xl overflow-x-auto max-w-full">
            {(Object.keys(CATEGORY_LABELS) as Array<'all' | CatalogCategory>).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === cat
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام محصول یا کد ری‌گیری..."
                className="w-full min-h-[42px] pr-9 pl-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              />
            </div>

            {isMerchant && (
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="min-h-[42px] px-4 rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                افزودن محصول
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl p-10 text-center space-y-2">
            <Store className="w-8 h-8 text-stone-400 mx-auto" />
            <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              محصولی با این فیلتر یافت نشد
            </div>
            <button
              type="button"
              onClick={() => {
                setCategory('all');
                setSelectedShopFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              پاک کردن فیلترها
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const live = computeLivePrice(item);
              return (
                <article
                  key={item.id}
                  className="bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-stone-100 dark:bg-stone-900 overflow-hidden relative">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {item.shopName} · عیار {toPersianDigits(item.karat)} · {formatGrams(item.weightGrams)}
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums pt-1">
                        اجرت {toPersianDigits(item.wagePercent)}٪ · سود {toPersianDigits(item.profitPercent)}٪
                        {item.brokeragePercent > 0 && ` · حق‌العمل ${toPersianDigits(item.brokeragePercent)}٪`}
                        {' · '}کد <span className="font-mono-code">{item.assayCode}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 dark:text-stone-500 font-mono-code" dir="ltr">
                        SSTID: {item.sstid} · MU: {item.mu}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-stone-500">قیمت لحظه‌ای</span>
                      <span className="text-base font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatToman(live.netPayableToman)}
                      </span>
                    </div>

                    {isMerchant ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateCatalogStock(item.id, -1)}
                            className="w-9 h-9 rounded-lg border border-stone-300 dark:border-stone-700 flex items-center justify-center cursor-pointer"
                            aria-label="کاهش موجودی"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold tabular-nums px-2">
                            موجودی: {toPersianDigits(item.stock)}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCatalogStock(item.id, 1)}
                            className="w-9 h-9 rounded-lg border border-stone-300 dark:border-stone-700 flex items-center justify-center cursor-pointer"
                            aria-label="افزایش موجودی"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCatalogVisibility(item.id)}
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            item.activeOnline
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                          }`}
                        >
                          {item.activeOnline ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {item.activeOnline ? 'فعال آنلاین' : 'مخفی'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={item.stock === 0}
                        onClick={() => setSelectedProduct(item)}
                        className="w-full min-h-[44px] rounded-xl bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        {item.stock > 0 ? 'خرید آنلاین / رزرو تحویل در گالری' : 'ناموجود'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Customer Purchase / Reserve Bottom Sheet Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                خرید و رزرو تحویل فیزیکی
              </h3>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {selectedProduct.title}
                </div>
                <div className="text-xs text-stone-500 mt-1 tabular-nums">
                  {selectedProduct.shopName} · {formatGrams(selectedProduct.weightGrams)} · عیار{' '}
                  {toPersianDigits(selectedProduct.karat)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex items-baseline justify-between">
                <span className="text-xs text-stone-500">مبلغ نهایی لحظه‌ای</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatToman(computeLivePrice(selectedProduct).netPayableToman)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-stone-500">روش تسویه</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBuyMode('pos_card')}
                    className={`min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                      buyMode === 'pos_card'
                        ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                        : 'border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    کارتخوان پوز / شاپرک
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyMode('gold_wallet')}
                    className={`min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                      buyMode === 'gold_wallet'
                        ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600'
                        : 'border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    کسر از کیف طلای دیجیتال
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-stone-500">شیوه دریافت</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('in_person_pos')}
                    className={`min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                      deliveryMethod === 'in_person_pos'
                        ? 'border-stone-900 dark:border-amber-500 bg-stone-900/5 dark:bg-amber-950/30 font-bold'
                        : 'border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    مراجعه حضوری (کد QR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('insured_courier')}
                    className={`min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                      deliveryMethod === 'insured_courier'
                        ? 'border-stone-900 dark:border-amber-500 bg-stone-900/5 dark:bg-amber-950/30 font-bold'
                        : 'border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    ارسال پیک بیمه‌شده
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmPurchase}
                className="w-full min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold cursor-pointer"
              >
                تایید خرید و صدور کد تحویل فیزیکی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merchant Add Product Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <form
            onSubmit={handleCreateProduct}
            className="w-full sm:max-w-md bg-white dark:bg-[#15171C] border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                افزودن محصول جدید به ویترین گالری
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs text-stone-500 mb-1">عنوان قطعه طلا</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثلاً: گردنبند کارتیه ۱۸ عیار"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-500 mb-1">
                  شناسه ۱۳ رقمی کالا سامانه مودیان (sstid)
                </label>
                <select
                  value={newSstid}
                  onChange={(e) => {
                    const matched = OFFICIAL_GOLD_SSTIDS.find((s) => s.sstid === e.target.value);
                    setNewSstid(e.target.value);
                    if (matched) {
                      setNewMu(matched.defaultMu);
                      setNewVatBaseRate(matched.defaultVra);
                      setNewKarat(matched.defaultKarat);
                    }
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                >
                  {OFFICIAL_GOLD_SSTIDS.map((opt) => (
                    <option key={opt.sstid} value={opt.sstid}>
                      {opt.sstid} — {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">دسته‌بندی</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CatalogCategory)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                  >
                    <option value="jewelry">زیورآلات ۱۸ عیار</option>
                    <option value="bullion">شمش ۲۴ عیار</option>
                    <option value="abshodeh">طلای آب‌شده</option>
                    <option value="coin">سکه بانکی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">واحد اندازه‌گیری (mu)</label>
                  <select
                    value={newMu}
                    onChange={(e) => setNewMu(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                  >
                    {OFFICIAL_GOLD_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.label} (کد {u.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">وزن / مقدار (am)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">عیار (cui)</label>
                  <input
                    type="number"
                    value={newKarat}
                    onChange={(e) => setNewKarat(Number(e.target.value) || 750)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">اجرت ساخت (٪)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newWage}
                    onChange={(e) => setNewWage(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">سود فروشنده (٪)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newProfit}
                    onChange={(e) => setNewProfit(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">حق‌العمل (٪ — bros)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newBrokerage}
                    onChange={(e) => setNewBrokerage(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">موجودی انبار (عدد)</label>
                  <input
                    type="number"
                    min="1"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">نرخ مالیات اصل کالا (vra)</label>
                  <select
                    value={newVatBaseRate}
                    onChange={(e) => setNewVatBaseRate(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                  >
                    <option value={0}>۰٪ (اصل طلا معاف)</option>
                    <option value={10}>۱۰٪ (جواهر و سنگ قیمتی)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">کد ری‌گیری / انبار</label>
                  <input
                    type="text"
                    value={newAssay}
                    onChange={(e) => setNewAssay(e.target.value)}
                    dir="ltr"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-mono-code"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-stone-900 dark:bg-amber-600 text-white text-sm font-bold cursor-pointer mt-2"
              >
                ثبت محصول در ویترین آنلاین
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
