'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import type { ConvoyWithDetails } from '@/types/database.types';
import { calculateElapsedDays, formatCurrency } from '@/lib/calculations';

export default function DashboardPage() {
  const [convoys, setConvoys] = useState<ConvoyWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await ConvoyRepository.getConvoys();
    setConvoys(data);
    setLoading(false);
  };

  // Metrics calculation
  const activeConvoys = convoys.filter((c) => c.status === 'active');
  const completedConvoys = convoys.filter((c) => c.status === 'completed');
  
  const activeTrucksCount = activeConvoys.reduce((sum, c) => sum + (c.truck_count || 0), 0);

  // Rafah Stats
  const rafahConvoys = convoys.filter((c) => c.location_id === 'rafah');
  const rafahActive = rafahConvoys.filter((c) => c.status === 'active');
  const rafahCompleted = rafahConvoys.filter((c) => c.status === 'completed');
  const rafahActiveTrucks = rafahActive.reduce((sum, c) => sum + (c.truck_count || 0), 0);

  // Al-Awja Stats
  const awjaConvoys = convoys.filter((c) => c.location_id === 'al_awja');
  const awjaActive = awjaConvoys.filter((c) => c.status === 'active');
  const awjaCompleted = awjaConvoys.filter((c) => c.status === 'completed');
  const awjaActiveTrucks = awjaActive.reduce((sum, c) => sum + (c.truck_count || 0), 0);

  // Statements count
  const totalDocuments = convoys.reduce((sum, c) => sum + (c.documents?.length || 0), 0);

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Welcome & Fast Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-light-surface p-6 rounded-xl border border-outline shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-primary font-label text-label-sm mb-1">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>النظام الإداري المالي والتشغيلي الموحد</span>
            </div>
            <h2 className="font-headline text-headline-lg font-bold text-charcoal">
              مرحباً بك، أ. أحمد البيك
            </h2>
            <p className="font-body text-body-md text-light-on-surface-variant mt-0.5">
              متابعة فورية لتحميل البوصلات، تسجيل التعتيق بنقرة واحدة، وتنسيق بيانات السائقين واحتساب النولون والمبيت.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/convoys/new"
              className="px-6 py-3 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-lg font-bold shadow-sm transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              <span>إنشاء بوصلة</span>
            </Link>
          </div>
        </div>

        {/* Quick Glanceable Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          {/* Metric 1: Active Convoys */}
          <div className="bg-light-surface border border-outline hover:border-primary/50 transition p-5 rounded-lg shadow-xs flex items-center justify-between">
            <div>
              <p className="text-light-on-surface-variant font-body text-body-sm mb-1 font-medium">
                البوصلات النشطة حالياً
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-display-lg text-primary font-bold tabular-nums">
                  {activeConvoys.length}
                </span>
                <span className="text-body-sm text-light-on-surface-variant">بوصلات</span>
              </div>
              <span className="text-body-sm text-warning font-semibold flex items-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                قيد السير والانتظار
              </span>
            </div>
            <div className="w-13 h-13 rounded-xl bg-pale-red text-primary flex items-center justify-center p-3">
              <span className="material-symbols-outlined text-3xl">rv_hookup</span>
            </div>
          </div>

          {/* Metric 2: Total Active Trucks */}
          <div className="bg-light-surface border border-outline hover:border-charcoal/40 transition p-5 rounded-lg shadow-xs flex items-center justify-between">
            <div>
              <p className="text-light-on-surface-variant font-body text-body-sm mb-1 font-medium">
                إجمالي الشاحنات على الطريق
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-display-lg text-charcoal font-bold tabular-nums">
                  {activeTrucksCount}
                </span>
                <span className="text-body-sm text-light-on-surface-variant">شاحنة تريلا</span>
              </div>
              <span className="text-body-sm text-charcoal font-medium mt-1 inline-block">
                موزعة على {activeConvoys.length} بوصلات
              </span>
            </div>
            <div className="w-13 h-13 rounded-xl bg-light-surface-variant text-charcoal flex items-center justify-center p-3">
              <span className="material-symbols-outlined text-3xl">local_shipping</span>
            </div>
          </div>

          {/* Metric 3: Completed Convoys */}
          <div className="bg-light-surface border border-outline hover:border-success/50 transition p-5 rounded-lg shadow-xs flex items-center justify-between">
            <div>
              <p className="text-light-on-surface-variant font-body text-body-sm mb-1 font-medium">
                البوصلات المكتملة والمعتّقة
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-display-lg text-success font-bold tabular-nums">
                  {completedConvoys.length}
                </span>
                <span className="text-body-sm text-light-on-surface-variant">بوصلة</span>
              </div>
              <span className="text-body-sm text-success font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                تم استخراج بياناتها
              </span>
            </div>
            <div className="w-13 h-13 rounded-xl bg-emerald-50 text-success flex items-center justify-center p-3">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
          </div>

          {/* Metric 4: Exported PDFs */}
          <div className="bg-light-surface border border-outline hover:border-primary/50 transition p-5 rounded-lg shadow-xs flex items-center justify-between">
            <div>
              <p className="text-light-on-surface-variant font-body text-body-sm mb-1 font-medium">
                البيانات المعتمدة الصادرة
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-display-lg text-charcoal font-bold tabular-nums">
                  {Math.max(totalDocuments, completedConvoys.length)}
                </span>
                <span className="text-body-sm text-light-on-surface-variant">بيان رسمي</span>
              </div>
              <Link
                href="/archive"
                className="text-body-sm text-primary font-semibold flex items-center gap-1 mt-1 hover:underline"
              >
                <span>فتح الأرشيف</span>
                <span className="material-symbols-outlined text-xs">arrow_back</span>
              </Link>
            </div>
            <div className="w-13 h-13 rounded-xl bg-light-gray text-charcoal flex items-center justify-center p-3">
              <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
            </div>
          </div>

        </div>

        {/* Location-based Operational Split (رفح & العوجة) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          
          {/* Rafah Port Operational Summary */}
          <div className="bg-light-surface border-2 border-red-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-light-gray pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-lg bg-pale-red text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">anchor</span>
                </span>
                <div>
                  <h3 className="font-headline text-headline-sm font-bold text-charcoal">
                    عمليات ميناء رفح
                  </h3>
                  <p className="text-body-sm text-light-on-surface-variant">المنفذ التجاري الرئيسي</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-red-50 text-primary font-label text-label-sm font-bold rounded-full border border-red-200">
                {rafahConvoys.length} قافلة إجمالية
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-light-surface-variant/80 p-2.5 rounded-lg">
                <span className="text-body-sm text-light-on-surface-variant block text-xs">قوافل جارية</span>
                <span className="font-headline text-headline-md text-primary font-bold tabular-nums">
                  {rafahActive.length}
                </span>
                <span className="text-[11px] text-warning block font-semibold">تحت الانتظار</span>
              </div>
              <div className="bg-light-surface-variant/80 p-2.5 rounded-lg">
                <span className="text-body-sm text-light-on-surface-variant block text-xs">شاحنات على الطريق</span>
                <span className="font-headline text-headline-md text-charcoal font-bold tabular-nums">
                  {rafahActiveTrucks}
                </span>
                <span className="text-[11px] text-light-on-surface-variant block">تريلا محملة</span>
              </div>
              <div className="bg-light-surface-variant/80 p-2.5 rounded-lg">
                <span className="text-body-sm text-light-on-surface-variant block text-xs">قوافل مكتملة</span>
                <span className="font-headline text-headline-md text-success font-bold tabular-nums">
                  {rafahCompleted.length}
                </span>
                <span className="text-[11px] text-success block font-semibold">معتّقة ومحسوبة</span>
              </div>
            </div>
          </div>

          {/* Al-Awja Port Operational Summary */}
          <div className="bg-light-surface border-2 border-amber-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-light-gray pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-lg bg-amber-50 text-warning flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">anchor</span>
                </span>
                <div>
                  <h3 className="font-headline text-headline-sm font-bold text-charcoal">
                    عمليات ميناء العوجة
                  </h3>
                  <p className="text-body-sm text-light-on-surface-variant">المنفذ التجاري الثانوي</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-50 text-charcoal font-label text-label-sm font-bold rounded-full border border-amber-300">
                {awjaConvoys.length} قافلة إجمالية
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-light-surface-variant/80 p-2.5 rounded-lg">
                <span className="text-body-sm text-light-on-surface-variant block text-xs">قوافل جارية</span>
                <span className="font-headline text-headline-md text-primary font-bold tabular-nums">
                  {awjaActive.length}
                </span>
                <span className="text-[11px] text-warning block font-semibold">تحت الانتظار</span>
              </div>
              <div className="bg-light-surface-variant/80 p-2.5 rounded-lg">
                <span className="text-body-sm text-light-on-surface-variant block text-xs">شاحنات على الطريق</span>
                <span className="font-headline text-headline-md text-charcoal font-bold tabular-nums">
                  {awjaActiveTrucks}
                </span>
                <span className="text-[11px] text-light-on-surface-variant block">تريلا محملة</span>
              </div>
              <div className="bg-light-surface-variant/80 p-2.5 rounded-lg">
                <span className="text-body-sm text-light-on-surface-variant block text-xs">قوافل مكتملة</span>
                <span className="font-headline text-headline-md text-success font-bold tabular-nums">
                  {awjaCompleted.length}
                </span>
                <span className="text-[11px] text-success block font-semibold">معتّقة ومحسوبة</span>
              </div>
            </div>
          </div>

        </div>

        {/* Live Operational Convoys Table */}
        <div className="bg-light-surface border border-outline rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-headline text-headline-md font-bold text-charcoal flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">view_list</span>
                <span>سجل البوصلات والعمليات الأخيرة</span>
              </h3>
              <p className="font-body text-body-sm text-light-on-surface-variant">
                قوافل الشحن والتعتيق الجارية والمكتملة بكافة الموانئ التشغيلية.
              </p>
            </div>
            <Link
              href="/convoys"
              className="text-primary font-label text-label-md font-bold hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>عرض جميع البوصلات</span>
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </Link>
          </div>

          <div className="overflow-x-auto border border-outline rounded-lg">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-charcoal text-on-primary border-b border-outline font-label text-label-md">
                  <th scope="col" className="py-3.5 px-4">اسم البضاعة</th>
                  <th scope="col" className="py-3.5 px-4">مكان التحميل</th>
                  <th scope="col" className="py-3.5 px-4">عدد الشاحنات</th>
                  <th scope="col" className="py-3.5 px-4">تاريخ التحميل</th>
                  <th scope="col" className="py-3.5 px-4">تاريخ التعتيق</th>
                  <th scope="col" className="py-3.5 px-4">مدة المبيت</th>
                  <th scope="col" className="py-3.5 px-4">إجمالي المستحق</th>
                  <th scope="col" className="py-3.5 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline font-body text-body-md">
                {convoys.slice(0, 6).map((convoy, idx) => {
                  const nights = calculateElapsedDays(convoy.loading_date, convoy.completion_date);
                  const isCompleted = convoy.status === 'completed';

                  return (
                    <tr
                      key={convoy.id}
                      className={idx % 2 === 1 ? 'bg-light-surface-variant/40 hover:bg-light-surface-variant' : 'hover:bg-light-surface-variant/70'}
                    >
                      <td className="py-4 px-4 font-semibold text-charcoal">
                        <Link href={`/convoys/${convoy.id}`} className="hover:text-primary transition flex items-center gap-1.5">
                          <span>{convoy.cargo_name}</span>
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
                      <td className="py-4 px-4 tabular-nums font-bold">
                        {convoy.calculation ? (
                          <span className="text-charcoal">{formatCurrency(convoy.calculation.grand_total)}</span>
                        ) : (
                          <span className="text-light-on-surface-variant text-xs">لم تُحسب بعد</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isCompleted ? (
                          <Link
                            href={`/convoys/${convoy.id}/statement`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-DEFAULT bg-light-surface-variant hover:bg-pale-red text-charcoal hover:text-primary font-label text-label-sm transition border border-outline"
                          >
                            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                            <span>البيان الرسمي</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/convoys/${convoy.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-DEFAULT bg-primary hover:bg-opacity-95 text-on-primary font-label text-label-sm font-bold shadow-xs transition"
                          >
                            <span className="material-symbols-outlined text-base">local_shipping</span>
                            <span>تعتيق وحساب</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <Footer />
    </>
  );
}
