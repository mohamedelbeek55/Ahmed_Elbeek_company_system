'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import type { ConvoyWithDetails, CustomItemCalculationMode } from '@/types/database.types';
import {
  calculateElapsedDays,
  calculateConvoyFinances,
  formatCurrency,
  getCustomItemTotal,
} from '@/lib/calculations';

interface CustomItemFormState {
  id: string;
  name: string;
  amount: string;
  calculation_mode: CustomItemCalculationMode;
}

export default function CostCalculationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [convoy, setConvoy] = useState<ConvoyWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states (kept as string to allow seamless clearing and prevent 030000 leading zero bugs)
  const [loadingDate, setLoadingDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [dailyRate, setDailyRate] = useState<string>('500');
  const [freightRate, setFreightRate] = useState<string>('8500');
  const [clearanceCost, setClearanceCost] = useState<string>('14500');
  const [portDemurrage, setPortDemurrage] = useState<string>('0');
  const [customItems, setCustomItems] = useState<CustomItemFormState[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (convoyId: string) => {
    setLoading(true);
    const data = await ConvoyRepository.getConvoyById(convoyId);
    if (data) {
      setConvoy(data);
      setLoadingDate(data.loading_date);
      setCompletionDate(data.completion_date || new Date().toISOString().split('T')[0]);

      const rawCalc = Array.isArray(data.calculation)
        ? (data.calculation.length > 0 ? data.calculation[0] : null)
        : data.calculation;

      if (rawCalc) {
        setDailyRate(String(rawCalc.daily_accommodation_rate));
        setFreightRate(String(rawCalc.freight_rate_per_truck));
        setClearanceCost(String(rawCalc.customs_clearance));
        setPortDemurrage(String(rawCalc.port_demurrage ?? '0'));
        if (Array.isArray(rawCalc.custom_items) && rawCalc.custom_items.length > 0) {
          setCustomItems(
            rawCalc.custom_items.map((item: any, idx: number) => ({
              id: item.id || `ci-${Date.now()}-${idx}`,
              name: item.name || '',
              amount: String(item.amount ?? ''),
              calculation_mode: (item.calculation_mode || item.calculationMode || 'FIXED_TOTAL') as CustomItemCalculationMode,
            }))
          );
        }
      }
    }
    setLoading(false);
  };

  const handleNumberInput = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setter('');
      return;
    }
    // Remove leading zeros if followed by non-zero digits (e.g. "030000" -> "30000", but keep "0" or "0.")
    const clean = val.replace(/^0+(?=\d)/, '');
    setter(clean);
  };

  const handleAddCustomItem = () => {
    const newId = `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setCustomItems((prev) => [
      ...prev,
      {
        id: newId,
        name: '',
        amount: '',
        calculation_mode: 'FIXED_TOTAL', // Default to FIXED_TOTAL to prevent unintended inflation
      },
    ]);

    setTimeout(() => {
      const el = document.getElementById(`custom-item-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = el.querySelector('input');
        if (input) input.focus();
      }
    }, 120);
  };

  const handleUpdateCustomItem = (
    itemId: string,
    field: 'name' | 'amount' | 'calculation_mode',
    value: string
  ) => {
    setCustomItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          if (field === 'amount') {
            const clean = value === '' ? '' : value.replace(/^0+(?=\d)/, '');
            return { ...item, amount: clean };
          }
          if (field === 'calculation_mode') {
            return { ...item, calculation_mode: value as CustomItemCalculationMode };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleRemoveCustomItem = (itemId: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 text-center text-charcoal">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-3">
            progress_activity
          </span>
          <p className="font-headline text-headline-md font-bold">جارٍ تجهيز شاشة الحسابات...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!convoy) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 text-center text-charcoal">
          <p className="font-headline text-headline-md font-bold text-primary mb-4">القافلة غير موجودة</p>
          <Link href="/convoys" className="px-6 py-2.5 bg-primary text-on-primary rounded-DEFAULT">
            الرجوع لسجل القوافل
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  // Reactive financial calculations on every keystroke
  const numDailyRate = parseFloat(dailyRate) || 0;
  const numFreightRate = parseFloat(freightRate) || 0;
  const numClearanceCost = parseFloat(clearanceCost) || 0;
  const numPortDemurrage = parseFloat(portDemurrage) || 0;

  const formattedCustomItems = customItems.map((item) => ({
    id: item.id,
    name: item.name.trim(),
    amount: parseFloat(item.amount) || 0,
    calculation_mode: item.calculation_mode,
    calculationMode: item.calculation_mode,
  }));

  const financialResult = calculateConvoyFinances({
    truckCount: convoy.truck_count,
    loadingDate,
    completionDate,
    dailyAccommodationRate: numDailyRate,
    freightRatePerTruck: numFreightRate,
    customsClearance: numClearanceCost,
    portDemurrage: numPortDemurrage,
    additionalExpenses: 0,
    customItems: formattedCustomItems,
  });

  const handleSaveAndPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await ConvoyRepository.saveCalculation({
        convoy_id: convoy.id,
        loading_date: loadingDate,
        completion_date: completionDate,
        accommodation_nights: financialResult.accommodationNights,
        daily_accommodation_rate: numDailyRate,
        total_accommodation: financialResult.totalAccommodation,
        freight_rate_per_truck: numFreightRate,
        total_freight: financialResult.totalFreight,
        customs_clearance: numClearanceCost,
        port_demurrage: numPortDemurrage,
        additional_expenses: 0,
        additional_expenses_notes: null,
        custom_items: formattedCustomItems.filter((it) => it.name || it.amount > 0),
        grand_total: financialResult.grandTotal,
        average_cost_per_truck: financialResult.averageCostPerTruck,
        currency: 'EGP',
      });

      // Immediate reliable navigation to preview
      if (typeof window !== 'undefined') {
        window.location.href = `/convoys/${convoy.id}/statement`;
      } else {
        router.refresh();
        router.push(`/convoys/${convoy.id}/statement`);
      }
    } catch (err) {
      console.error('Error saving calculation:', err);
      setIsSaving(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 lg:pb-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-label text-label-sm mb-1">
              <span className="material-symbols-outlined text-base">calculate</span>
              <span>المعادلات الحسابية المعتمدة رسمياً</span>
            </div>
            <h2 className="font-headline text-headline-md sm:text-headline-lg font-bold text-charcoal">
              احتساب تكاليف القافلة بعد التعتيق
            </h2>
            <p className="font-body text-body-sm sm:text-body-md text-light-on-surface-variant mt-0.5">
              تم ملء بيانات القافلة وتاريخ التعتيق تلقائياً. أدخل فئات النولون والمبيت والتخليص لاستخراج البيان فوراً.
            </p>
          </div>

          <span className="px-3 py-1.5 bg-emerald-50 text-success border border-emerald-200 rounded-full text-label-sm font-label font-bold self-start sm:self-auto flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span>حالة القافلة: تم التعتيق بنجاح</span>
          </span>
        </div>

        {/* Automatically Prefilled Convoy Overview Banner */}
        <div className="bg-light-surface border-2 border-primary/20 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-light-gray pb-3 sm:pb-4 mb-4">
            <h3 className="font-headline text-base sm:text-headline-md font-bold text-charcoal flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl sm:text-2xl">fact_check</span>
              <span>بيانات القافلة المعتمدة (مملوءة تلقائياً)</span>
            </h3>
            <span className="text-body-sm text-light-on-surface-variant tabular-nums">
              الرقم: {convoy.convoy_number}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4 text-body-md">
            <div className="bg-light-surface-variant/50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg sm:rounded-none">
              <span className="text-body-sm text-light-on-surface-variant block mb-1">مكان التحميل:</span>
              <span className="font-bold text-primary text-body-lg flex items-center gap-1">
                <span className="material-symbols-outlined text-base">anchor</span>
                <span>{convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</span>
              </span>
            </div>

            <div className="bg-light-surface-variant/50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg sm:rounded-none">
              <span className="text-body-sm text-light-on-surface-variant block mb-1">اسم البضاعة:</span>
              <span className="font-bold text-charcoal text-body-lg">
                {convoy.cargo_name}
              </span>
            </div>

            <div className="bg-light-surface-variant/50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg sm:rounded-none">
              <span className="text-body-sm text-light-on-surface-variant block mb-1">عدد الشاحنات:</span>
              <span className="font-bold text-charcoal tabular-nums text-body-lg">
                {convoy.truck_count} شاحنة
              </span>
            </div>

            <div className="bg-light-surface-variant/50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg sm:rounded-none">
              <label htmlFor="costLoadingDate" className="text-body-sm text-light-on-surface-variant block mb-1 font-medium">
                تاريخ التحميل (قابل للتعديل):
              </label>
              <input
                type="date"
                id="costLoadingDate"
                value={loadingDate}
                onChange={(e) => setLoadingDate(e.target.value)}
                className="font-bold text-charcoal tabular-nums bg-white border border-outline rounded px-2.5 py-1.5 text-body-sm w-full focus:border-primary outline-none"
              />
            </div>

            <div className="bg-light-surface-variant/50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg sm:rounded-none">
              <label htmlFor="costUnloadDate" className="text-body-sm text-light-on-surface-variant block mb-1 font-medium">
                تاريخ التعتيق (قابل للتعديل):
              </label>
              <input
                type="date"
                id="costUnloadDate"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="font-bold text-charcoal tabular-nums bg-white border border-outline rounded px-2.5 py-1.5 text-body-sm w-full focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-light-gray flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-pale-red/50 p-3 rounded-lg">
            <span className="font-label text-label-md text-primary font-bold">
              عدد ليالي المبيت المحتسبة آلياً (باستثناء يوم التحميل ويوم التعتيق):
            </span>
            <span className="font-headline text-headline-sm text-primary font-bold tabular-nums">
              {financialResult.accommodationNights} {financialResult.accommodationNights === 1 ? 'ليلة مبيت' : 'ليالي مبيت'}
            </span>
          </div>
        </div>

        {/* Mobile Real-time Total Highlight Card (lg:hidden) */}
        <div className="lg:hidden bg-charcoal text-white rounded-xl p-4 mb-6 shadow-md border border-charcoal flex items-center justify-between">
          <div>
            <span className="text-xs text-light-gray block">إجمالي المستحق المحتسب فورياً</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline text-2xl font-bold text-white tabular-nums">
                {Math.round(financialResult.grandTotal).toLocaleString('en-US')}
              </span>
              <span className="text-xs text-outline font-bold">ج.م</span>
            </div>
            <span className="text-[11px] text-pale-red block mt-0.5">
              {financialResult.accommodationNights} ليالي مبيت × {convoy.truck_count} شاحنات
            </span>
          </div>

          <button
            type="submit"
            form="cost-calculation-form"
            disabled={isSaving}
            className="px-4 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-sm font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            <span>{isSaving ? 'جارٍ الحفظ...' : 'معاينة البيان'}</span>
          </button>
        </div>

        {/* Calculation Inputs & Live Summary Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Input Column (7 cols) */}
          <div className="lg:col-span-7 bg-light-surface border border-outline rounded-xl p-4 sm:p-8 shadow-xs">
            <h3 className="font-headline text-headline-sm sm:text-headline-md font-bold text-charcoal mb-5 sm:mb-6 border-b border-light-gray pb-3">
              مدخلات صاحب العمل (المالك)
            </h3>

            <form id="cost-calculation-form" onSubmit={handleSaveAndPreview} className="space-y-6">
              
              {/* Input 1: Daily Accommodation Rate */}
              <div>
                <label className="block font-label text-label-md text-charcoal mb-2">
                  1. يومية المبيت للشاحنة الواحدة <span className="text-primary">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    enterKeyHint="next"
                    min="0"
                    step="50"
                    placeholder="0"
                    value={dailyRate}
                    onFocus={(e) => e.target.select()}
                    onChange={handleNumberInput(setDailyRate)}
                    className="w-full border-2 border-outline rounded-DEFAULT p-3 sm:p-3.5 pr-3 sm:pr-4 pl-20 sm:pl-24 font-body text-base sm:text-body-lg font-bold tabular-nums text-charcoal focus:border-primary outline-none transition min-h-[46px]"
                  />
                  <span className="absolute left-3 sm:left-4 text-xs sm:text-body-md text-light-on-surface-variant font-bold pointer-events-none">
                    ج.م / يوم
                  </span>
                </div>
                <p className="text-body-sm text-light-on-surface-variant mt-1.5">
                  قاعدة المبيت: ليالي المبيت ({financialResult.accommodationNights}) × اليومية للشاحنة × عدد الشاحنات ({convoy.truck_count}).
                </p>
              </div>

              {/* Input 2: Freight Rate per Truck */}
              <div>
                <label className="block font-label text-label-md text-charcoal mb-2">
                  2. فئة النولون للشاحنة الواحدة <span className="text-primary">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    enterKeyHint="next"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={freightRate}
                    onFocus={(e) => e.target.select()}
                    onChange={handleNumberInput(setFreightRate)}
                    className="w-full border-2 border-outline rounded-DEFAULT p-3 sm:p-3.5 pr-3 sm:pr-4 pl-22 sm:pl-24 font-body text-base sm:text-body-lg font-bold tabular-nums text-charcoal focus:border-primary outline-none transition min-h-[46px]"
                  />
                  <span className="absolute left-3 sm:left-4 text-xs sm:text-body-md text-light-on-surface-variant font-bold pointer-events-none">
                    ج.م / شاحنة
                  </span>
                </div>
                <p className="text-body-sm text-light-on-surface-variant mt-1.5">
                  قاعدة النولون: فئة النولون للشاحنة × عدد الشاحنات ({convoy.truck_count}).
                </p>
              </div>

              {/* Input 3: Customs Clearance */}
              <div className="pt-4 border-t border-light-gray">
                <label className="block font-label text-label-md text-charcoal mb-2">
                  3. رسوم التخليص الجمركي (Clearance)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    enterKeyHint="next"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={clearanceCost}
                    onFocus={(e) => e.target.select()}
                    onChange={handleNumberInput(setClearanceCost)}
                    className="w-full border border-outline rounded-DEFAULT p-3 sm:p-3.5 pr-3 sm:pr-4 pl-16 font-body text-base sm:text-body-md font-semibold tabular-nums text-charcoal focus:border-primary outline-none transition min-h-[46px]"
                  />
                  <span className="absolute left-3 sm:left-4 text-xs sm:text-body-md text-light-on-surface-variant font-bold pointer-events-none">
                    ج.م
                  </span>
                </div>
                <p className="text-body-sm text-light-on-surface-variant mt-1">
                  * تبقى الرسوم الجمركية بنداً منفصلاً مستقلاً في البيان لحين تحديد أساس توزيعها.
                </p>
              </div>

              {/* Input 4: Port Demurrage / Yard Fees */}
              <div>
                <label className="block font-label text-label-md text-charcoal mb-2 font-bold">
                  4. أرضيات مبيت داخل المنفذ
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    enterKeyHint="next"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={portDemurrage}
                    onFocus={(e) => e.target.select()}
                    onChange={handleNumberInput(setPortDemurrage)}
                    className="w-full border border-outline rounded-DEFAULT p-3 sm:p-3.5 pr-3 sm:pr-4 pl-16 font-body text-base sm:text-body-md font-semibold tabular-nums text-charcoal focus:border-primary outline-none transition min-h-[46px]"
                  />
                  <span className="absolute left-3 sm:left-4 text-xs sm:text-body-md text-light-on-surface-variant font-bold pointer-events-none">
                    ج.م
                  </span>
                </div>
                <p className="text-body-sm text-light-on-surface-variant mt-1">
                  * رسوم أرضيات ومبيت الشاحنات المبردة وساحات الانتظار داخل المنفذ الجمركي.
                </p>
              </div>

              {/* Dynamic Custom Invoice Items Section (بنود الفاتورة المخصصة بالاسم والسعر وطريقة الحساب) */}
              <div className="pt-6 border-t border-light-gray space-y-4">
                {/* Section Header (Info Only) */}
                <div className="bg-light-surface-variant/40 p-3.5 sm:p-4 rounded-xl border border-outline/70">
                  <h4 className="font-headline text-base sm:text-headline-sm font-bold text-charcoal flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl sm:text-2xl">post_add</span>
                    <span>بنود الفاتورة المخصصة (بالاسم والسعر)</span>
                  </h4>
                  <p className="text-body-sm text-light-on-surface-variant mt-0.5">
                    أضف أي بنود إضافية للفاتورة بالاسم مع حرية اختيار طريقة احتساب كل بند بشكل مستقل (لكل عربية أو مبلغ إجمالي ثابت).
                  </p>
                </div>

                {/* Custom Items List */}
                {customItems.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-outline/80 rounded-xl p-5 sm:p-6 text-center text-body-sm text-light-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl text-light-on-surface-variant/60 block mb-1">
                      playlist_add
                    </span>
                    لا توجد بنود مخصصة حالياً. الفاتورة ستعتمد بنود النولون والمبيت والتخليص، أو اضغط <strong className="text-primary font-bold">&quot;+ إضافة بند جديد للفاتورة&quot;</strong> أدناه لإضافة أي بند آخر.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {customItems.map((item, idx) => {
                      const isPerVehicle = item.calculation_mode === 'PER_VEHICLE';
                      const unitAmount = parseFloat(item.amount) || 0;
                      const truckCount = convoy.truck_count;
                      const itemTotal = isPerVehicle ? unitAmount * truckCount : unitAmount;
                      const truckLabel = truckCount >= 3 && truckCount <= 10 ? 'عربيات' : 'عربية';

                      return (
                        <div
                          key={item.id}
                          id={`custom-item-${item.id}`}
                          className="bg-white border-2 border-outline/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3 transition hover:border-primary/60"
                        >
                          {/* Card Header: Item Number & Delete Action */}
                          <div className="flex items-center justify-between border-b border-light-gray pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 sm:w-8 sm:h-8 bg-charcoal text-white font-bold rounded-full flex items-center justify-center text-xs sm:text-body-sm shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-charcoal text-body-sm sm:text-body-md">
                                {item.name ? item.name : `بند إضافي #${idx + 1}`}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveCustomItem(item.id)}
                              className="w-11 h-11 min-w-[44px] min-h-[44px] text-primary hover:bg-pale-red rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
                              title="حذف هذا البند من الفاتورة"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          </div>

                          {/* Calculation Mode Selector: Segmented 2-option Control */}
                          <div>
                            <label className="block text-xs font-semibold text-charcoal mb-1.5">
                              طريقة احتساب البند:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-light-surface-variant/80 rounded-lg border border-outline/70">
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomItem(item.id, 'calculation_mode', 'PER_VEHICLE')}
                                className={`py-2 px-3 rounded-md text-xs sm:text-body-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                                  isPerVehicle
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'text-charcoal hover:bg-white/70'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">local_shipping</span>
                                <span>لكل عربية ({truckCount} {truckLabel})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateCustomItem(item.id, 'calculation_mode', 'FIXED_TOTAL')}
                                className={`py-2 px-3 rounded-md text-xs sm:text-body-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                                  !isPerVehicle
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'text-charcoal hover:bg-white/70'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">payments</span>
                                <span>مبلغ إجمالي (مرة واحدة)</span>
                              </button>
                            </div>
                          </div>

                          {/* Item Name & Amount Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            <div className="sm:col-span-7">
                              <label className="block text-xs font-semibold text-charcoal mb-1">
                                اسم البند المالي
                              </label>
                              <input
                                type="text"
                                placeholder="اكتب اسم البند (مثال: عمال تعتيق إضافية، حراسة خاصة، موازين...)"
                                value={item.name}
                                onChange={(e) => handleUpdateCustomItem(item.id, 'name', e.target.value)}
                                className="w-full border border-outline rounded p-2.5 font-body text-body-sm text-charcoal focus:border-primary outline-none font-medium min-h-[44px]"
                              />
                            </div>

                            <div className="sm:col-span-5">
                              <label className="block text-xs font-semibold text-charcoal mb-1">
                                {isPerVehicle ? 'السعر لكل عربية (ج.م)' : 'القيمة الإجمالية للبند (ج.م)'}
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  step="50"
                                  placeholder="0"
                                  value={item.amount}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateCustomItem(item.id, 'amount', e.target.value)}
                                  className="w-full border border-outline rounded p-2.5 pl-12 font-body text-body-sm font-bold tabular-nums text-charcoal focus:border-primary outline-none min-h-[44px]"
                                />
                                <span className="absolute left-3 text-xs text-light-on-surface-variant font-bold pointer-events-none">
                                  ج.م
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Live Calculation Preview Banner */}
                          <div className="bg-pale-red/35 border border-primary/20 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-body-sm">
                            <span className="font-semibold text-primary flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">calculate</span>
                              <span>معاينة احتساب البند:</span>
                            </span>
                            <span className="font-bold text-charcoal tabular-nums">
                              {isPerVehicle
                                ? `${truckCount} ${truckLabel} × ${unitAmount.toLocaleString('en-US')} ج.م = ${Math.round(itemTotal).toLocaleString('en-US')} ج.م`
                                : `مبلغ ثابت = ${Math.round(itemTotal).toLocaleString('en-US')} ج.م`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add New Item Button: Positioned BELOW the items list for smooth mobile experience */}
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="w-full py-3.5 px-5 bg-white hover:bg-pale-red/30 text-primary border-2 border-dashed border-primary/40 hover:border-primary rounded-xl font-label text-label-md font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs min-h-[48px]"
                >
                  <span className="material-symbols-outlined text-xl">add_circle</span>
                  <span>+ إضافة بند جديد للفاتورة</span>
                </button>
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-light-gray">
                <Link
                  href={`/convoys/${convoy.id}`}
                  className="w-full sm:w-auto px-5 py-3 border border-outline rounded-DEFAULT text-charcoal hover:bg-light-surface-variant transition font-label text-label-md text-center min-h-[46px] flex items-center justify-center"
                >
                  الرجوع للتفاصيل
                </Link>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-7 py-3.5 bg-primary hover:bg-opacity-95 text-on-primary font-headline text-headline-sm font-bold rounded-DEFAULT shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                  <span>{isSaving ? 'جارٍ الحفظ...' : 'توليد ومعاينة بيان الـ PDF المعتمد'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Real-time Live Calculation Summary Card (5 cols) */}
          <div className="lg:col-span-5 bg-light-surface border-2 border-charcoal rounded-xl p-5 sm:p-8 shadow-md sticky top-28">
            <div className="flex items-center justify-between border-b border-light-gray pb-4 mb-6">
              <h3 className="font-headline text-headline-md font-bold text-charcoal flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                <span>ملخص التكاليف الآلي</span>
              </h3>
              <span className="text-body-sm text-success font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                <span>حساب فوري مباشر</span>
              </span>
            </div>

            <div className="space-y-4 text-body-md mb-6">
              
              {/* Accommodation row */}
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-outline">
                <div>
                  <span className="font-semibold text-charcoal block">
                    إجمالي المبيت ({financialResult.accommodationNights} ليالي × {convoy.truck_count} شاحنة)
                  </span>
                  <span className="text-body-sm text-light-on-surface-variant tabular-nums">
                    {financialResult.accommodationNights} × {numDailyRate} × {convoy.truck_count}
                  </span>
                </div>
                <span className="font-headline text-headline-sm font-bold text-primary tabular-nums">
                  {formatCurrency(financialResult.totalAccommodation)}
                </span>
              </div>

              {/* Freight row */}
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-outline">
                <div>
                  <span className="font-semibold text-charcoal block">
                    إجمالي النولون ({convoy.truck_count} شاحنة)
                  </span>
                  <span className="text-body-sm text-light-on-surface-variant tabular-nums">
                    {convoy.truck_count} × {formatCurrency(numFreightRate, false)}
                  </span>
                </div>
                <span className="font-headline text-headline-sm font-bold text-charcoal tabular-nums">
                  {formatCurrency(financialResult.totalFreight)}
                </span>
              </div>

              {/* Clearance row */}
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-outline">
                <div>
                  <span className="font-semibold text-charcoal block">رسوم التخليص الجمركي</span>
                  <span className="text-body-sm text-light-on-surface-variant">بند مالي منفصل بالمنفذ</span>
                </div>
                <span className="font-body text-body-lg font-bold text-charcoal tabular-nums">
                  {formatCurrency(financialResult.customsClearance)}
                </span>
              </div>

              {/* Port Demurrage row */}
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-outline">
                <div>
                  <span className="font-semibold text-charcoal block">أرضيات مبيت داخل المنفذ</span>
                  <span className="text-body-sm text-light-on-surface-variant">رسوم مبيت وساحات المنفذ</span>
                </div>
                <span className="font-body text-body-lg font-bold text-charcoal tabular-nums">
                  {formatCurrency(financialResult.portDemurrage)}
                </span>
              </div>

              {/* Dynamic Custom Cost Items in Summary */}
              {financialResult.customItems.length > 0 && (
                <div className="pt-2 border-b border-dashed border-outline pb-3 space-y-2 bg-light-surface-variant/40 p-2.5 rounded">
                  <span className="text-xs font-bold text-charcoal block">
                    بنود الفاتورة المخصصة ({financialResult.customItems.length}):
                  </span>
                  {financialResult.customItems.map((item, idx) => {
                    const mode = item.calculation_mode || item.calculationMode || 'FIXED_TOTAL';
                    const isPerVehicle = mode === 'PER_VEHICLE';
                    const itemTotal = getCustomItemTotal(item, convoy.truck_count);

                    return (
                      <div key={item.id || idx} className="flex items-center justify-between text-body-sm">
                        <div className="flex flex-col">
                          <span className="text-charcoal font-medium truncate max-w-[190px]" title={item.name || `بند إضافي ${idx + 1}`}>
                            • {item.name || `بند إضافي ${idx + 1}`}
                          </span>
                          {isPerVehicle && (
                            <span className="text-[11px] text-light-on-surface-variant tabular-nums mr-2">
                              ({convoy.truck_count} عربيات × {formatCurrency(item.amount, false)})
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-charcoal tabular-nums">
                          {formatCurrency(itemTotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Average per truck */}
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-outline bg-light-surface-variant p-2.5 rounded">
                <div>
                  <span className="font-semibold text-charcoal block text-body-sm">متوسط التكلفة للشاحنة الواحدة:</span>
                  <span className="text-xs text-light-on-surface-variant">الإجمالي ÷ {convoy.truck_count} شاحنة</span>
                </div>
                <span className="font-headline text-headline-sm font-bold text-charcoal tabular-nums">
                  {formatCurrency(financialResult.averageCostPerTruck)}
                </span>
              </div>

              {/* Grand Total Box */}
              <div className="bg-charcoal text-on-primary p-5 rounded-lg flex items-center justify-between mt-4">
                <div>
                  <span className="font-label text-label-md block text-light-gray">
                    إجمالي مستحقات القافلة بالكامل
                  </span>
                  <span className="text-body-sm text-outline">
                    شامل النولون والمبيت والتخليص والأرضيات والنثريات
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-headline text-display-lg text-on-primary font-bold tabular-nums">
                    {Math.round(financialResult.grandTotal).toLocaleString('en-US')}
                  </span>
                  <span className="text-body-sm text-outline mr-1.5 font-bold">ج.م</span>
                </div>
              </div>

              {/* Tafqeet in Arabic */}
              <p className="text-body-sm text-charcoal bg-pale-red/60 p-3 rounded border border-pale-red font-medium">
                {financialResult.tafqeetAr}
              </p>

            </div>

            <p className="text-body-sm text-center text-light-on-surface-variant">
              يتم تجهيز البيان مطابقاً تماماً للترويسة الرسمية والجداول والعلامة المائية المعتمدة.
            </p>

          </div>

        </div>

      </main>

      {/* Mobile Sticky Bottom Summary Bar (lg:hidden) */}
      <aside aria-label="شريط الحسابات السريع للهواتف" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-charcoal text-on-primary px-4 py-3 shadow-2xl border-t border-white/10 flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-light-gray block leading-none">إجمالي مستحقات القافلة</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-headline text-lg sm:text-xl font-bold text-white tabular-nums">
              {Math.round(financialResult.grandTotal).toLocaleString('en-US')}
            </span>
            <span className="text-xs text-outline font-bold">ج.م</span>
          </div>
          <span className="text-[10px] text-pale-red block mt-0.5 font-medium">
            ({financialResult.accommodationNights} ليالي مبيت محتسبة)
          </span>
        </div>

        <button
          type="submit"
          form="cost-calculation-form"
          disabled={isSaving}
          className="px-4 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-sm font-bold flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 disabled:opacity-50 min-h-[44px]"
        >
          <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
          <span>{isSaving ? 'جارٍ الحفظ...' : 'معاينة البيان PDF'}</span>
        </button>
      </aside>

      <Footer />
    </>
  );
}

