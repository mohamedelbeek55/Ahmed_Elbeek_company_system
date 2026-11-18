'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import type { LoadingLocationId } from '@/types/database.types';

export default function CreateConvoyPage() {
  const router = useRouter();
  const [cargoName, setCargoName] = useState('');
  const [locationId, setLocationId] = useState<LoadingLocationId>('rafah');
  const [truckCount, setTruckCount] = useState<string>('5');
  // Default to today in YYYY-MM-DD (DATE ONLY)
  const [loadingDate, setLoadingDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoName.trim()) return;

    setIsSubmitting(true);
    try {
      const parsedTruckCount = Math.max(1, parseInt(truckCount, 10) || 1);
      const convoy = await ConvoyRepository.createConvoy({
        cargo_name: cargoName.trim(),
        location_id: locationId,
        truck_count: parsedTruckCount,
        loading_date: loadingDate,
      });

      router.push(`/convoys/${convoy.id}`);
    } catch (err) {
      console.error('Error creating convoy:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        <div className="bg-light-surface border border-outline rounded-xl p-5 sm:p-8 shadow-xs">
          
          {/* Form Header */}
          <div className="border-b border-light-gray pb-6 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1 text-primary font-label text-label-sm mb-1.5">
                <span className="material-symbols-outlined text-base">local_shipping</span>
                <span>بدء تسيير بوصلة شحن جديدة</span>
              </div>
              <h2 className="font-headline text-headline-md sm:text-headline-lg font-bold text-charcoal">
                إنشاء بوصلة جديدة
              </h2>
              <p className="font-body text-body-sm sm:text-body-md text-light-on-surface-variant mt-1">
                وفقاً لقواعد النظام: يتم تعريف البوصلة باسم البضاعة وعدد العربيات ومكان التحميل تلقائياً دون أكواد يدوية.
              </p>
            </div>

            <span className="px-3 py-1 bg-pale-red text-primary rounded-full text-label-sm font-label font-bold self-start sm:self-auto shrink-0">
              الخطوة 1 من 3
            </span>
          </div>

          {/* Business Rules Notice Box */}
          <div className="bg-light-surface-variant border border-outline/80 rounded-lg p-4 mb-6 sm:mb-8 flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-2xl shrink-0 mt-0.5">
              info
            </span>
            <div className="text-body-sm text-charcoal space-y-1">
              <p className="font-bold">قاعدة عمل هامة:</p>
              <p className="text-light-on-surface-variant">
                • لا يُطلب إدخال توقيت (ساعات أو دقائق)، يُكتفى باختيار <strong>التاريخ فقط</strong>.
              </p>
              <p className="text-light-on-surface-variant">
                • تبدأ حسابات المبيت تلقائياً من تاريخ التحميل المدخل هنا وحتى يوم إجراء عملية <strong>&quot;تعتيق&quot;</strong>.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Field 1: Cargo Name */}
            <div>
              <label className="block font-label text-label-md sm:text-label-lg text-charcoal mb-2">
                اسم البضاعة المحملة <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={cargoName}
                onChange={(e) => setCargoName(e.target.value)}
                placeholder="اكتب اسم البضاعة (مثال: رمان وندرفل، بصل أحمر تصدير، بطاطس...)"
                className="w-full border-2 border-outline rounded-DEFAULT px-4 py-3 sm:py-3.5 font-body text-body-md sm:text-body-lg text-charcoal focus:border-primary outline-none transition"
              />
              <span className="block text-body-sm text-light-on-surface-variant mt-1.5">
                هذا الاسم سيظهر مباشرة على الترويسة وفي بيان الحسابات وتنسيق السائقين.
              </span>
            </div>

            {/* Field: Loading Location (مكان التحميل) */}
            <div>
              <label className="block font-label text-label-md sm:text-label-lg text-charcoal mb-2">
                مكان التحميل (الميناء التشغيلي) <span className="text-primary">*</span>
              </label>
              <div className="relative flex items-center">
                <select
                  required
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value as LoadingLocationId)}
                  className="w-full border-2 border-outline rounded-DEFAULT px-4 py-3 sm:py-3.5 pr-11 font-body text-body-md sm:text-body-lg font-semibold text-charcoal focus:border-primary outline-none transition bg-light-surface appearance-none cursor-pointer"
                >
                  <option value="rafah">ميناء رفح</option>
                  <option value="al_awja">ميناء العوجة</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 text-primary text-xl pointer-events-none">
                  anchor
                </span>
                <span className="material-symbols-outlined absolute left-4 text-light-on-surface-variant pointer-events-none">
                  expand_more
                </span>
              </div>
              <span className="block text-body-sm text-light-on-surface-variant mt-1.5">
                حدد موقع التحميل التشغيلي (ميناء رفح أو ميناء العوجة). تخضع العمليات لنفس آليات العمل وقواعد الحساب.
              </span>
            </div>

            {/* Two Column Grid: Truck Count & Loading Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Field 2: Truck Count */}
              <div>
                <label className="block font-label text-label-md sm:text-label-lg text-charcoal mb-2">
                  عدد العربيات بالبوصلة <span className="text-primary">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    min={1}
                    max={100}
                    placeholder="1"
                    value={truckCount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setTruckCount('');
                        return;
                      }
                      const clean = val.replace(/^0+/, '');
                      setTruckCount(clean);
                    }}
                    className="w-full border-2 border-outline rounded-DEFAULT px-4 py-3 sm:py-3.5 pl-20 font-body text-body-md sm:text-body-lg font-bold tabular-nums text-charcoal focus:border-primary outline-none transition"
                  />
                  <span className="absolute left-4 text-body-sm sm:text-body-md text-light-on-surface-variant font-semibold pointer-events-none">
                    عربيات
                  </span>
                </div>
                <span className="block text-body-sm text-light-on-surface-variant mt-1.5">
                  سيتم إنشاء كشف بيانات لـ {truckCount || 1} عربيات لتنسيق السائقين.
                </span>
              </div>

              {/* Field 3: Loading Date (Date ONLY) */}
              <div>
                <label className="block font-label text-label-md sm:text-label-lg text-charcoal mb-2">
                  تاريخ التحميل (يوم فقط) <span className="text-primary">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={loadingDate}
                  onChange={(e) => setLoadingDate(e.target.value)}
                  className="w-full border-2 border-outline rounded-DEFAULT px-4 py-3 sm:py-3.5 font-body text-body-md sm:text-body-lg font-semibold tabular-nums text-charcoal focus:border-primary outline-none transition"
                />
                <span className="block text-body-sm text-light-on-surface-variant mt-1.5">
                  تاريخ انطلاق البوصلة وبدء احتساب أيام المبيت التشغيلية.
                </span>
              </div>

            </div>

            {/* Action Row */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-light-gray">
              <Link
                href="/convoys"
                className="w-full sm:w-auto px-6 py-3.5 border border-outline text-charcoal hover:bg-light-surface-variant font-label text-label-md rounded-DEFAULT transition text-center min-h-[46px] flex items-center justify-center"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-opacity-95 text-on-primary font-headline text-headline-sm font-bold rounded-DEFAULT shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
              >
                <span>{isSubmitting ? 'جارٍ الإنشاء...' : 'بدء تسيير البوصلة ومتابعة التحميل'}</span>
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
            </div>

          </form>

        </div>

      </main>

      <Footer />
    </>
  );
}

