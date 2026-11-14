'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import { PDFService } from '@/lib/pdf';
import type { ConvoyWithDetails } from '@/types/database.types';
import { formatCurrency, calculateElapsedDays } from '@/lib/calculations';

export default function ArchivePage() {
  const [convoys, setConvoys] = useState<ConvoyWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'rafah' | 'al_awja'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchive();
  }, [activeTab, search]);

  const loadArchive = async () => {
    setLoading(true);
    let locationId: string | undefined;
    if (activeTab === 'rafah') locationId = 'rafah';
    if (activeTab === 'al_awja') locationId = 'al_awja';

    // In archive, we focus on completed convoys or all convoys with issued statements
    const data = await ConvoyRepository.getConvoys({
      locationId,
      status: 'completed',
      search,
    });
    setConvoys(data);
    setLoading(false);
  };

  const handleShareWhatsApp = (convoy: ConvoyWithDetails) => {
    const url = PDFService.getWhatsAppShareUrl(convoy);
    window.open(url, '_blank');
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-label text-label-sm mb-1">
              <span className="material-symbols-outlined text-base">inventory_2</span>
              <span>الأرشيف المؤسسي المعتمد</span>
            </div>
            <h2 className="font-headline text-headline-lg font-bold text-charcoal">
              أرشيف القوافل والبيانات الرسمية الصادرة
            </h2>
            <p className="font-body text-body-md text-light-on-surface-variant">
              سجل مستندات الـ PDF وبيانات الشحن المعتمدة الصادرة عن النظام لميناء رفح وميناء العوجة.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-light-surface border border-outline rounded-full font-label text-label-md font-bold text-charcoal tabular-nums shadow-xs">
              {convoys.length} بيان معتمد محفوظ
            </span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-light-surface border border-outline rounded-xl p-4 sm:p-5 mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-DEFAULT font-label text-label-md transition ${
                activeTab === 'all'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-light-surface-variant text-charcoal hover:bg-outline/50'
              }`}
            >
              كافة الموانئ ({convoys.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rafah')}
              className={`px-4 py-2 rounded-DEFAULT font-label text-label-md flex items-center gap-1.5 transition ${
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
              className={`px-4 py-2 rounded-DEFAULT font-label text-label-md flex items-center gap-1.5 transition ${
                activeTab === 'al_awja'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'bg-light-surface-variant text-charcoal hover:bg-outline/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">anchor</span>
              <span>ميناء العوجة</span>
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الأرشيف باسم البضاعة..."
              className="w-full border border-outline rounded-DEFAULT px-4 py-2.5 pr-10 font-body text-body-md text-charcoal focus:border-primary outline-none transition"
            />
            <span className="material-symbols-outlined absolute right-3 top-3 text-light-on-surface-variant text-lg pointer-events-none">
              search
            </span>
          </div>
        </div>

        {/* Archive Table */}
        <div className="bg-light-surface border border-outline rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-charcoal text-on-primary border-b border-outline font-label text-label-md">
                  <th scope="col" className="py-3.5 px-4">بيان القافلة والبضاعة</th>
                  <th scope="col" className="py-3.5 px-4">مكان التحميل</th>
                  <th scope="col" className="py-3.5 px-4">الشاحنات</th>
                  <th scope="col" className="py-3.5 px-4">تاريخ التحميل</th>
                  <th scope="col" className="py-3.5 px-4">تاريخ التعتيق</th>
                  <th scope="col" className="py-3.5 px-4">المبيت</th>
                  <th scope="col" className="py-3.5 px-4">إجمالي المبلغ</th>
                  <th scope="col" className="py-3.5 px-4 text-center">المستند والخيارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline font-body text-body-md">
                {convoys.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-light-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl block mb-2 text-outline">
                        folder_open
                      </span>
                      <span>لا توجد مستندات معتمدة بالأرشيف مطابقة للبحث.</span>
                    </td>
                  </tr>
                ) : (
                  convoys.map((convoy, idx) => {
                    const nights = calculateElapsedDays(convoy.loading_date, convoy.completion_date);
                    const grandTotal = convoy.calculation?.grand_total || 0;

                    return (
                      <tr
                        key={convoy.id}
                        className={idx % 2 === 1 ? 'bg-light-surface-variant/40 hover:bg-light-surface-variant' : 'hover:bg-light-surface-variant/70'}
                      >
                        <td className="py-4 px-4 font-semibold text-charcoal">
                          <Link href={`/convoys/${convoy.id}/statement`} className="hover:text-primary transition flex flex-col">
                            <span className="font-bold text-body-lg text-charcoal">{convoy.cargo_name}</span>
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
                          {convoy.truck_count} شاحنة
                        </td>
                        <td className="py-4 px-4 tabular-nums text-light-on-surface-variant">
                          {convoy.loading_date}
                        </td>
                        <td className="py-4 px-4 tabular-nums text-charcoal font-semibold">
                          {convoy.completion_date || '—'}
                        </td>
                        <td className="py-4 px-4 tabular-nums font-bold text-charcoal">
                          {nights} {nights === 1 ? 'ليلة' : 'ليالي'}
                        </td>
                        <td className="py-4 px-4 tabular-nums font-bold text-primary text-body-lg">
                          {formatCurrency(grandTotal)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/convoys/${convoy.id}/statement`}
                              className="px-3 py-1.5 rounded-DEFAULT bg-primary hover:bg-opacity-95 text-on-primary font-label text-label-sm font-bold shadow-xs transition flex items-center gap-1"
                              title="معاينة وتنزيل البيان الرسمي"
                            >
                              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                              <span>البيان</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(convoy)}
                              className="p-1.5 rounded-DEFAULT bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                              title="مشاركة البيان عبر واتساب"
                            >
                              <span className="material-symbols-outlined text-lg">chat</span>
                            </button>

                            <Link
                              href={`/convoys/${convoy.id}/drivers`}
                              className="p-1.5 rounded-DEFAULT hover:bg-light-surface-variant text-charcoal border border-outline transition"
                              title="كشف السائقين"
                            >
                              <span className="material-symbols-outlined text-lg">badge</span>
                            </Link>
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

      <Footer />
    </>
  );
}

