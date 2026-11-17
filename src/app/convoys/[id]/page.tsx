'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import type { ConvoyWithDetails } from '@/types/database.types';
import { calculateElapsedDays, formatCurrency } from '@/lib/calculations';

export default function ConvoyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [convoy, setConvoy] = useState<ConvoyWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [unloadingModalOpen, setUnloadingModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completionDate, setCompletionDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [editableLoadingDate, setEditableLoadingDate] = useState('');

  useEffect(() => {
    if (id) {
      loadConvoy(id);
    }
  }, [id]);

  const loadConvoy = async (convoyId: string) => {
    setLoading(true);
    const data = await ConvoyRepository.getConvoyById(convoyId);
    if (data) {
      setConvoy(data);
      setEditableLoadingDate(data.loading_date);
      if (data.completion_date) {
        setCompletionDate(data.completion_date);
      }
    }
    setLoading(false);
  };

  const handleUpdateLoadingDate = async (newDate: string) => {
    if (!convoy) return;
    setEditableLoadingDate(newDate);
    convoy.loading_date = newDate;
    // recalculate
    setConvoy({ ...convoy });
  };

  const handleDeleteConvoy = async () => {
    if (!convoy) return;
    setIsDeleting(true);
    try {
      await ConvoyRepository.deleteConvoy(convoy.id);
      router.push('/convoys');
    } catch (err) {
      console.error('Delete error:', err);
      setIsDeleting(false);
    }
  };

  const handleConfirmUnloading = async () => {
    if (!convoy) return;
    await ConvoyRepository.completeConvoy(convoy.id, completionDate);
    setUnloadingModalOpen(false);
    router.push(`/convoys/${convoy.id}/calculate`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 text-center text-charcoal">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-3">
            progress_activity
          </span>
          <p className="font-headline text-headline-md font-bold">جارٍ تحميل بيانات القافلة...</p>
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

  const isCompleted = convoy.status === 'completed';
  const elapsedDays = calculateElapsedDays(editableLoadingDate || convoy.loading_date, isCompleted ? (convoy.completion_date || completionDate) : null);

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-body-sm text-light-on-surface-variant">
            <Link href="/" className="hover:text-primary transition">الرئيسية</Link>
            <span>/</span>
            <Link href="/convoys" className="hover:text-primary transition">سجل البوصلات</Link>
            <span>/</span>
            <span className="text-charcoal font-bold">{convoy.cargo_name}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/convoys/${convoy.id}/drivers`}
              className="px-4 py-2 border border-outline hover:bg-light-surface-variant text-charcoal rounded-DEFAULT font-label text-label-md flex items-center gap-2 font-bold transition"
            >
              <span className="material-symbols-outlined text-lg text-primary">badge</span>
              <span>تنسيق كشف السائقين</span>
            </Link>

            {isCompleted && (
              <Link
                href={`/convoys/${convoy.id}/statement`}
                className="px-4 py-2 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-md flex items-center gap-2 font-bold transition shadow-xs"
              >
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                <span>معاينة البيان المعتمد</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="px-3.5 py-2 border border-red-300 hover:bg-pale-red text-primary rounded-DEFAULT font-label text-label-md flex items-center gap-1.5 font-bold transition cursor-pointer"
              title="حذف القافلة نهائياً"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              <span>حذف البوصلة</span>
            </button>
          </div>
        </div>

        {/* Top Convoy Overview Banner */}
        <div className="bg-light-surface border-2 border-primary/30 rounded-xl p-6 sm:p-8 mb-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-light-gray">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-label bg-emerald-50 text-success border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    <span>تم التعتيق وتصفية الحساب</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-label bg-amber-50 text-warning border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-warning animate-ping"></span>
                    <span>قافلة نشطة في موقع التفريغ</span>
                  </span>
                )}

                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-sm font-label font-bold ${
                  convoy.location_id === 'rafah'
                    ? 'bg-red-50 text-primary border border-red-200'
                    : 'bg-amber-50 text-warning border border-amber-300'
                }`}>
                  <span className="material-symbols-outlined text-sm">anchor</span>
                  <span>مكان التحميل: {convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</span>
                </span>

                <span className="text-body-sm text-light-on-surface-variant tabular-nums">
                  رقم البوصلة: {convoy.convoy_number}
                </span>
              </div>

              <h2 className="font-headline text-display-lg text-charcoal font-bold">
                قافلة: {convoy.cargo_name}
              </h2>
              <p className="font-body text-body-md text-light-on-surface-variant mt-1">
                خط السير المعتمد: {convoy.route_notes || 'ميناء التحميل ⟵ ميناء الإسكندرية البحري (رصيف 22)'}
              </p>
            </div>

            {/* Action Box: 'تعتيق' */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-pale-red/60 p-4 rounded-xl border border-pale-red">
              <div className="text-right sm:text-left ml-auto sm:ml-0">
                <span className="block font-label text-label-md text-charcoal font-bold">
                  {isCompleted ? 'تم إتمام التعتيق' : 'جاهز لإنهاء الرحلة؟'}
                </span>
                <span className="text-body-sm text-light-on-surface-variant">
                  {isCompleted ? 'يمكنك إعادة احتساب التكاليف أو طباعة البيان' : 'يتم تثبيت تاريخ التعتيق واحتساب النولون والمبيت'}
                </span>
              </div>
              
              {isCompleted ? (
                <Link
                  href={`/convoys/${convoy.id}/calculate`}
                  className="w-full sm:w-auto px-6 py-3.5 bg-charcoal hover:bg-charcoal/90 text-on-primary font-headline text-headline-sm font-bold rounded-DEFAULT shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">calculate</span>
                  <span>تعديل الحسابات</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setUnloadingModalOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-opacity-95 text-on-primary font-headline text-headline-sm font-bold rounded-DEFAULT shadow-md transition flex items-center justify-center gap-3 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-2xl">local_shipping</span>
                  <span>تعتيق</span>
                </button>
              )}
            </div>

          </div>

          {/* Live Core Convoy Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 pt-6">
            
            <div className="bg-light-surface-variant p-4 rounded-lg border border-outline/70">
              <span className="text-body-sm text-light-on-surface-variant font-medium block mb-1">مكان التحميل</span>
              <div className="flex items-center gap-1.5 text-primary font-bold">
                <span className="material-symbols-outlined text-xl">anchor</span>
                <span className="font-headline text-headline-sm text-primary font-bold">
                  {convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}
                </span>
              </div>
              <span className="text-body-sm text-light-on-surface-variant">المنفذ التجاري المعتمد</span>
            </div>

            <div className="bg-light-surface-variant p-4 rounded-lg border border-outline/70">
              <span className="text-body-sm text-light-on-surface-variant font-medium block mb-1">اسم البضاعة</span>
              <span className="font-headline text-headline-sm text-charcoal font-bold block truncate">
                {convoy.cargo_name}
              </span>
              <span className="text-body-sm text-light-on-surface-variant">حمولة مبردة تصدير</span>
            </div>

            <div className="bg-light-surface-variant p-4 rounded-lg border border-outline/70">
              <span className="text-body-sm text-light-on-surface-variant font-medium block mb-1">عدد الشاحنات المقيدة</span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-display-lg text-charcoal font-bold tabular-nums">
                  {convoy.truck_count}
                </span>
                <span className="text-body-sm text-light-on-surface-variant">شاحنة تريلا</span>
              </div>
              <span className="text-body-sm text-success font-semibold">مكتملة وموزعة بالبيان</span>
            </div>

            <div className="bg-light-surface-variant p-4 rounded-lg border border-outline/70">
              <label htmlFor="detailLoadingDateInput" className="text-body-sm text-light-on-surface-variant font-medium flex items-center justify-between mb-1">
                <span>تاريخ التحميل (قابل للتعديل)</span>
                <span className="material-symbols-outlined text-sm text-primary">edit_calendar</span>
              </label>
              <input
                type="date"
                id="detailLoadingDateInput"
                value={editableLoadingDate}
                onChange={(e) => handleUpdateLoadingDate(e.target.value)}
                className="font-headline text-headline-sm text-charcoal font-bold tabular-nums block w-full bg-white border border-outline rounded px-2 py-1 focus:border-primary outline-none"
              />
              <span className="text-xs text-light-on-surface-variant block mt-1">تاريخ التحميل من موقع المنفذ</span>
            </div>

            {/* Highlighted Automatic Calculation */}
            <div className="bg-pale-red p-4 rounded-lg border border-primary/20">
              <span className="text-body-sm text-primary font-bold block mb-1">ليالي المبيت المحتسبة (تلقائي)</span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-display-lg text-primary font-bold tabular-nums">
                  {elapsedDays}
                </span>
                <span className="text-body-md text-primary font-bold">{elapsedDays === 1 ? 'ليلة مبيت' : 'ليالي مبيت'}</span>
              </div>
              <span className="text-body-sm text-charcoal font-semibold block mt-1">
                {isCompleted ? 'باستثناء يوم التحميل ويوم التعتيق' : 'باستثناء يوم التحميل واليوم الحالي'}
              </span>
            </div>

          </div>

        </div>

        {/* Convoy Trucks Table (Aligned with Official Word Corporate Spec) */}
        <div className="bg-light-surface border border-outline rounded-xl p-6 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-headline text-headline-md font-bold text-charcoal flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">view_list</span>
                <span>كشف سيارات القافلة (بيان الشاحنات الرسمي)</span>
              </h3>
              <p className="font-body text-body-sm text-light-on-surface-variant">
                سجل الشاحنات مطابق لأعمدة البيان المعتمد: (م، الميناء، الاسم، الرقم القومي، سيارة رقم، مقطورة رقم).
              </p>
            </div>
            <Link
              href={`/convoys/${convoy.id}/drivers`}
              className="px-4 py-2 bg-light-surface-variant hover:bg-pale-red text-charcoal hover:text-primary border border-outline rounded-DEFAULT font-label text-label-md font-bold transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              <span>تعديل كشف السائقين ({convoy.trucks?.length || convoy.truck_count} شاحنة)</span>
            </Link>
          </div>

          <div className="overflow-x-auto border border-outline rounded-lg">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-charcoal text-on-primary border-b border-outline text-label-md font-label">
                  <th className="py-3.5 px-4 w-12 text-center">م</th>
                  <th className="py-3.5 px-4">الميناء</th>
                  <th className="py-3.5 px-4">اسم السائق</th>
                  <th className="py-3.5 px-4">الرقم القومي</th>
                  <th className="py-3.5 px-4">سيارة رقم</th>
                  <th className="py-3.5 px-4">مقطورة رقم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline text-body-md">
                {(!convoy.trucks || convoy.trucks.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-light-on-surface-variant">
                      لم يتم إدخال بيانات تفصيلية للسائقين بعد. انقر على &quot;تعديل كشف السائقين&quot; بالأعلى لإدخال أرقام اللوحات والأسماء.
                    </td>
                  </tr>
                ) : (
                  convoy.trucks.map((t, idx) => (
                    <tr
                      key={t.id}
                      className={idx % 2 === 1 ? 'bg-light-surface-variant/40 hover:bg-light-surface-variant' : 'hover:bg-light-surface-variant/70'}
                    >
                      <td className="py-3.5 px-4 text-center tabular-nums font-bold">{t.sequence_number}</td>
                      <td className="py-3.5 px-4 font-bold text-charcoal">
                        {t.political_destination?.includes('رفح') ? 'ميناء رفح' : 'ميناء العوجة'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-charcoal">{t.driver_name || '—'}</td>
                      <td className="py-3.5 px-4 tabular-nums text-light-on-surface-variant">{t.national_id || '—'}</td>
                      <td className="py-3.5 px-4 tabular-nums font-bold text-charcoal">{t.truck_plate || '—'}</td>
                      <td className="py-3.5 px-4 tabular-nums font-bold text-charcoal">{t.trailer_plate || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Unloading Confirmation Modal (تعتيق) */}
      {unloadingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-light-surface border border-outline rounded-xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-surface-enter">
            
            <header className="flex items-start justify-between mb-4 border-b border-light-gray pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pale-red text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">fact_check</span>
                </div>
                <div>
                  <h2 className="text-charcoal font-headline text-headline-md font-bold">
                    تأكيد تعتيق القافلة
                  </h2>
                  <p className="text-light-on-surface-variant text-body-sm">
                    تسجيل تاريخ التعتيق واحتساب مدة المبيت تلقائياً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnloadingModalOpen(false)}
                className="text-light-on-surface-variant hover:text-charcoal cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </header>

            <div className="space-y-4 mb-6">
              <div className="bg-pale-red/60 p-3.5 rounded-DEFAULT border border-pale-red text-charcoal text-body-md">
                <span className="font-bold text-primary">القافلة:</span> {convoy.cargo_name} ({convoy.truck_count} شاحنة) — {convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}
              </div>

              <div>
                <label className="text-label-md font-label text-charcoal block mb-1.5 font-bold">
                  تاريخ التعتيق (يوم فقط دون توقيت):
                </label>
                <input
                  type="date"
                  required
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full border-2 border-outline rounded-DEFAULT p-3 font-body text-body-md font-bold tabular-nums text-charcoal focus:border-primary outline-none transition"
                />
                <span className="text-body-sm text-light-on-surface-variant mt-1 block">
                  سيتم احتساب {calculateElapsedDays(editableLoadingDate || convoy.loading_date, completionDate)} ليالي مبيت تلقائياً (باستثناء يوم التحميل ويوم التعتيق).
                </span>
              </div>

              <p className="text-body-sm text-light-on-surface-variant bg-light-surface-variant p-3 rounded-DEFAULT">
                عند تأكيد التعتيق، سيتم نقلك مباشرة لشاشة احتساب النفقات (النولون والمبيت والتخليص) وإصدار بيان الـ PDF المعتمد.
              </p>
            </div>

            <footer className="flex items-center justify-end gap-3 pt-4 border-t border-light-gray">
              <button
                type="button"
                onClick={() => setUnloadingModalOpen(false)}
                className="px-5 py-2.5 border border-outline rounded-DEFAULT text-charcoal font-label text-label-md hover:bg-light-surface-variant cursor-pointer transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmUnloading}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-DEFAULT font-label text-label-md font-bold hover:bg-opacity-95 shadow-xs cursor-pointer transition flex items-center gap-2"
              >
                <span>تأكيد التعتيق والانتقال للحساب</span>
                <span className="material-symbols-outlined text-lg">arrow_back</span>
              </button>
            </footer>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && convoy && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-light-surface border border-outline rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <span className="w-10 h-10 rounded-full bg-pale-red flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </span>
              <div>
                <h3 className="font-headline text-headline-sm font-bold text-charcoal">
                  تأكيد حذف القافلة
                </h3>
                <p className="text-body-sm text-light-on-surface-variant">إجراء إداري دائم لا يمكن التراجع عنه</p>
              </div>
            </div>

            <div className="bg-light-surface-variant p-3.5 rounded-DEFAULT text-body-md text-charcoal mb-6 space-y-1 border border-outline">
              <p><strong>اسم البضاعة:</strong> {convoy.cargo_name}</p>
              <p><strong>مكان التحميل:</strong> {convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</p>
              <p><strong>رقم البوصلة:</strong> {convoy.convoy_number}</p>
            </div>

            <p className="text-body-sm text-light-on-surface-variant mb-6">
              سيتم حذف هذه القافلة وسجل شاحناتها وحساباتها ومستنداتها نهائياً من قاعدة البيانات، وسيتم تحويلك إلى سجل البوصلات.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-gray">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-outline rounded-DEFAULT text-charcoal hover:bg-light-surface-variant font-label text-label-md transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConvoy}
                disabled={isDeleting}
                className="px-5 py-2 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-md font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                <span>{isDeleting ? 'جارٍ الحذف...' : 'تأكيد الحذف نهائياً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

