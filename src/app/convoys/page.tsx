'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import type { ConvoyWithDetails } from '@/types/database.types';
import { calculateElapsedDays, formatCurrency } from '@/lib/calculations';

export default function ConvoysListPage() {
  const [convoys, setConvoys] = useState<ConvoyWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'rafah' | 'al_awja' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ConvoyWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadConvoys();
  }, [activeTab, search]);

  const loadConvoys = async () => {
    setLoading(true);
    let locationId: string | undefined;
    let status: string | undefined;

    if (activeTab === 'rafah') locationId = 'rafah';
    if (activeTab === 'al_awja') locationId = 'al_awja';
    if (activeTab === 'active') status = 'active';
    if (activeTab === 'completed') status = 'completed';

    const data = await ConvoyRepository.getConvoys({
      locationId,
      status,
      search,
    });
    setConvoys(data);
    setLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await ConvoyRepository.deleteConvoy(deleteTarget.id);
      setDeleteTarget(null);
      await loadConvoys();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-label text-label-sm mb-1">
              <span className="material-symbols-outlined text-base">local_shipping</span>
              <span>سجل التحميل والموانئ</span>
            </div>
            <h2 className="font-headline text-headline-md sm:text-headline-lg font-bold text-charcoal">
              سجل البوصلات والشحن والتفريغ
            </h2>
            <p className="font-body text-body-sm sm:text-body-md text-light-on-surface-variant mt-0.5">
              متابعة قوافل الشاحنات بكافة مواقع وموانئ التحميل (ميناء رفح وميناء العوجة).
            </p>
          </div>

          <Link
            href="/convoys/new"
            className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-lg font-bold shadow-sm transition flex items-center justify-center gap-2 min-h-[48px]"
          >
            <span className="material-symbols-outlined text-xl">add_circle</span>
            <span>إنشاء بوصلة جديدة</span>
          </Link>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-light-surface border border-outline rounded-xl p-3.5 sm:p-5 mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-DEFAULT font-label text-label-md transition shrink-0 min-h-[44px] flex items-center justify-center ${
                activeTab === 'all'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-light-surface-variant text-charcoal hover:bg-outline/50'
              }`}
            >
              عرض الكل
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rafah')}
              className={`px-3.5 py-2 rounded-DEFAULT font-label text-label-md flex items-center gap-1.5 transition shrink-0 min-h-[44px] justify-center ${
                activeTab === 'rafah'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-light-surface-variant text-charcoal hover:bg-outline/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">anchor</span>
              <span>ميناء رفح</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('al_awja')}
              className={`px-3.5 py-2 rounded-DEFAULT font-label text-label-md flex items-center gap-1.5 transition shrink-0 min-h-[44px] justify-center ${
                activeTab === 'al_awja'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-light-surface-variant text-charcoal hover:bg-outline/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">anchor</span>
              <span>ميناء العوجة</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-2 rounded-DEFAULT font-label text-label-md transition shrink-0 min-h-[44px] flex items-center justify-center ${
                activeTab === 'active'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-light-surface-variant text-charcoal hover:bg-outline/50'
              }`}
            >
              قوافل جارية
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-2 rounded-DEFAULT font-label text-label-md transition shrink-0 min-h-[44px] flex items-center justify-center ${
                activeTab === 'completed'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-light-surface-variant text-charcoal hover:bg-outline/50'
              }`}
            >
              قوافل معتّقة
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              enterKeyHint="search"
              placeholder="بحث باسم البضاعة أو رقم القافلة..."
              className="w-full border border-outline rounded-DEFAULT px-4 py-2.5 pr-10 font-body text-body-sm sm:text-body-md text-charcoal focus:border-primary outline-none transition min-h-[44px]"
            />
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-light-on-surface-variant text-xl pointer-events-none">
              search
            </span>
          </div>

        </div>

        {/* Mobile Convoys Card List (md:hidden) */}
        <div className="md:hidden space-y-3.5 mb-6">
          {convoys.length === 0 ? (
            <div className="bg-light-surface border border-outline rounded-xl p-8 text-center text-light-on-surface-variant">
              <span className="material-symbols-outlined text-4xl block mb-2 text-outline">
                inventory_2
              </span>
              <span>لا توجد قوافل مطابقة لبحثك أو للفلتر المحدد.</span>
            </div>
          ) : (
            convoys.map((convoy) => {
              const nights = calculateElapsedDays(convoy.loading_date, convoy.completion_date);
              const isCompleted = convoy.status === 'completed';

              return (
                <div
                  key={convoy.id}
                  className="bg-light-surface border border-outline rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-light-gray pb-2.5">
                    <div>
                      <Link
                        href={`/convoys/${convoy.id}`}
                        className="font-headline text-headline-sm font-bold text-charcoal hover:text-primary transition block"
                      >
                        {convoy.cargo_name}
                      </Link>
                      <span className="text-xs text-light-on-surface-variant tabular-nums">
                        رقم القافلة: {convoy.convoy_number}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label font-bold shrink-0 ${
                      convoy.location_id === 'rafah'
                        ? 'bg-red-50 text-primary border border-red-200'
                        : 'bg-amber-50 text-warning border border-amber-300'
                    }`}>
                      <span className="material-symbols-outlined text-xs">anchor</span>
                      <span>{convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</span>
                    </span>
                  </div>

                  {/* Convoy Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-light-surface-variant/60 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-light-on-surface-variant block mb-0.5">الشاحنات</span>
                      <span className="font-bold text-charcoal tabular-nums text-sm">
                        {convoy.truck_count} عربيات
                      </span>
                    </div>
                    <div>
                      <span className="text-light-on-surface-variant block mb-0.5">تاريخ التحميل</span>
                      <span className="font-bold text-charcoal tabular-nums text-xs">
                        {convoy.loading_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-light-on-surface-variant block mb-0.5">المبيت</span>
                      <span className="font-bold text-primary tabular-nums text-sm">
                        {nights} {nights === 1 ? 'ليلة' : 'ليالي'}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-light-on-surface-variant font-medium">حالة البوصلة:</span>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-success border border-emerald-200 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        <span>معتّقة ومحسوبة</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-warning border border-amber-200 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></span>
                        <span>جارية بالطريق</span>
                      </span>
                    )}
                  </div>

                  {/* Touch Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-light-gray">
                    {isCompleted ? (
                      <Link
                        href={`/convoys/${convoy.id}/statement`}
                        className="flex-1 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition min-h-[44px]"
                      >
                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                        <span>البيان المعتمد</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/convoys/${convoy.id}`}
                        className="flex-1 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition min-h-[44px]"
                      >
                        <span className="material-symbols-outlined text-lg">local_shipping</span>
                        <span>تعتيق وحساب</span>
                      </Link>
                    )}

                    <Link
                      href={`/convoys/${convoy.id}/drivers`}
                      className="px-3 py-2.5 bg-light-surface-variant hover:bg-outline/40 text-charcoal rounded-DEFAULT font-label text-label-sm font-bold border border-outline flex items-center justify-center gap-1 min-h-[44px]"
                      title="تنسيق كشف السائقين"
                    >
                      <span className="material-symbols-outlined text-lg">badge</span>
                      <span className="text-xs">السائقين</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(convoy)}
                      className="p-2.5 text-light-on-surface-variant hover:text-primary hover:bg-pale-red rounded-DEFAULT border border-outline/70 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="حذف البوصلة"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Convoys Desktop Table (hidden md:block) */}
        <div className="hidden md:block bg-light-surface border border-outline rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-charcoal text-on-primary border-b border-outline font-label text-label-md">
                  <th scope="col" className="py-3.5 px-4">البضاعة (تعريف البوصلة)</th>
                  <th scope="col" className="py-3.5 px-4">مكان التحميل</th>
                  <th scope="col" className="py-3.5 px-4">عدد العربيات</th>
                  <th scope="col" className="py-3.5 px-4">تاريخ التحميل</th>
                  <th scope="col" className="py-3.5 px-4">تاريخ التعتيق</th>
                  <th scope="col" className="py-3.5 px-4">أيام المبيت</th>
                  <th scope="col" className="py-3.5 px-4">الحالة</th>
                  <th scope="col" className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline font-body text-body-md">
                {convoys.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-light-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2 text-outline">
                        inventory_2
                      </span>
                      <span>لا توجد قوافل مطابقة لبحثك أو للفلتر المحدد.</span>
                    </td>
                  </tr>
                ) : (
                  convoys.map((convoy, idx) => {
                    const nights = calculateElapsedDays(convoy.loading_date, convoy.completion_date);
                    const isCompleted = convoy.status === 'completed';

                    return (
                      <tr
                        key={convoy.id}
                        className={idx % 2 === 1 ? 'bg-light-surface-variant/40 hover:bg-light-surface-variant' : 'hover:bg-light-surface-variant/70'}
                      >
                        <td className="py-4 px-4 font-semibold text-charcoal">
                          <Link href={`/convoys/${convoy.id}`} className="hover:text-primary transition flex flex-col">
                            <span className="font-bold text-body-lg">{convoy.cargo_name}</span>
                            <span className="text-xs text-light-on-surface-variant tabular-nums">{convoy.convoy_number}</span>
                          </Link>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label font-semibold ${
                            convoy.location_id === 'rafah'
                              ? 'bg-red-50 text-primary border border-red-200'
                              : 'bg-amber-50 text-warning border border-amber-200'
                          }`}>
                            <span className="material-symbols-outlined text-xs">anchor</span>
                            <span>{convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 tabular-nums font-bold text-charcoal">
                          {convoy.truck_count} عربيات
                        </td>
                        <td className="py-4 px-4 tabular-nums text-light-on-surface-variant">
                          {convoy.loading_date}
                        </td>
                        <td className="py-4 px-4 tabular-nums">
                          {convoy.completion_date ? (
                            <span className="text-light-on-surface-variant">{convoy.completion_date}</span>
                          ) : (
                            <span className="text-warning font-semibold">قيد التشغيل</span>
                          )}
                        </td>
                        <td className="py-4 px-4 tabular-nums font-bold">
                          <span className={isCompleted ? 'text-charcoal' : 'text-primary'}>
                            {nights} {nights === 1 ? 'يوم' : 'أيام'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label bg-emerald-50 text-success border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                              <span>معتّقة ومحسوبة</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label bg-amber-50 text-warning border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"></span>
                              <span>جارية بالطريق</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isCompleted ? (
                              <>
                                <Link
                                  href={`/convoys/${convoy.id}/statement`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-DEFAULT bg-light-surface-variant hover:bg-pale-red text-charcoal hover:text-primary font-label text-label-sm transition border border-outline"
                                  title="عرض بيان الحساب المعتمد"
                                >
                                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                                  <span>البيان</span>
                                </Link>
                                <Link
                                  href={`/convoys/${convoy.id}/drivers`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-DEFAULT hover:bg-light-surface-variant text-charcoal font-label text-label-sm transition border border-outline"
                                  title="تنسيق السائقين"
                                >
                                  <span className="material-symbols-outlined text-base">badge</span>
                                </Link>
                              </>
                            ) : (
                              <>
                                <Link
                                  href={`/convoys/${convoy.id}`}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-DEFAULT bg-primary hover:bg-opacity-95 text-on-primary font-label text-label-sm font-bold shadow-xs transition"
                                >
                                  <span className="material-symbols-outlined text-base">local_shipping</span>
                                  <span>تعتيق وحساب</span>
                                </Link>
                                <Link
                                  href={`/convoys/${convoy.id}/drivers`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-DEFAULT hover:bg-light-surface-variant text-charcoal font-label text-label-sm transition border border-outline"
                                  title="تنسيق السائقين"
                                >
                                  <span className="material-symbols-outlined text-base">badge</span>
                                </Link>
                              </>
                            )}
                            {/* Admin Delete Action */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(convoy)}
                              className="p-1.5 rounded-DEFAULT text-light-on-surface-variant hover:text-primary hover:bg-pale-red transition cursor-pointer"
                              title="حذف البوصلة من النظام"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
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
              <p><strong>اسم البضاعة:</strong> {deleteTarget.cargo_name}</p>
              <p><strong>مكان التحميل:</strong> {deleteTarget.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</p>
              <p><strong>رقم البوصلة:</strong> {deleteTarget.convoy_number}</p>
            </div>

            <p className="text-body-sm text-light-on-surface-variant mb-6">
              سيتم حذف هذه القافلة وسجل شاحناتها وحساباتها ومستنداتها نهائياً من قاعدة البيانات.
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-light-gray">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="w-full sm:w-auto px-5 py-2.5 border border-outline rounded-DEFAULT text-charcoal hover:bg-light-surface-variant font-label text-label-md transition cursor-pointer min-h-[44px] flex items-center justify-center"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-md font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
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

