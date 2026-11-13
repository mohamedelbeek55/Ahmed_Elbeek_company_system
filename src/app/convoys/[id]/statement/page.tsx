'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import { PDFService } from '@/lib/pdf';
import type { ConvoyWithDetails } from '@/types/database.types';
import {
  calculateElapsedDays,
  calculateConvoyFinances,
  formatCurrency,
  arabicTafqeet,
} from '@/lib/calculations';

export default function StatementPreviewPage() {
  const params = useParams();
  const id = params?.id as string;

  const [convoy, setConvoy] = useState<ConvoyWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [whatsappCopied, setWhatsappCopied] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (convoyId: string) => {
    setLoading(true);
    const data = await ConvoyRepository.getConvoyById(convoyId);
    setConvoy(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 text-center text-charcoal">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-3">
            progress_activity
          </span>
          <p className="font-headline text-headline-md font-bold">جارٍ تجهيز معاينة البيان المعتمد...</p>
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

  // Fallback financial calculation if not yet stored
  const calc = convoy.calculation || {
    id: 'c-temp',
    convoy_id: convoy.id,
    loading_date: convoy.loading_date,
    completion_date: convoy.completion_date || convoy.loading_date,
    accommodation_nights: calculateElapsedDays(convoy.loading_date, convoy.completion_date),
    daily_accommodation_rate: 500,
    total_accommodation: calculateElapsedDays(convoy.loading_date, convoy.completion_date) * 500 * convoy.truck_count,
    freight_rate_per_truck: 8500,
    total_freight: 8500 * convoy.truck_count,
    customs_clearance: 14500,
    additional_expenses: 3600,
    additional_expenses_notes: 'موازين، كروت بوابات، حراسات وتفريغ',
    grand_total:
      calculateElapsedDays(convoy.loading_date, convoy.completion_date) * 500 * convoy.truck_count +
      8500 * convoy.truck_count +
      14500 +
      3600,
    average_cost_per_truck: 14508.33,
    currency: 'EGP',
    calculated_by: null,
    calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const fileName = `بيان_معتمد_${convoy.cargo_name.replace(/\s+/g, '_')}_${convoy.convoy_number}.pdf`;
    await PDFService.generateAndDownloadPDF({
      elementId: 'official-statement-sheet',
      fileName,
      convoyId: convoy.id,
      documentType: 'statement',
      documentNumber: convoy.convoy_number,
    });
    setIsGenerating(false);
  };

  const handleWhatsAppShare = () => {
    const url = PDFService.getWhatsAppShareUrl(convoy);
    window.open(url, '_blank');
  };

  const handleCopyWhatsAppText = () => {
    const calc = convoy.calculation;
    const locationName = convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة';
    const grandTotal = calc ? Math.round(calc.grand_total).toLocaleString('en-US') : '0';
    const nights = calc ? calc.accommodation_nights : '0';

    const text = [
      `*بيان حسابات رسمي — شركة أحمد البيك للاستيراد والتصدير*`,
      `📦 البضاعة: ${convoy.cargo_name}`,
      `⚓ مكان التحميل: ${locationName}`,
      `🚛 عدد الشاحنات: ${convoy.truck_count} تريلا`,
      `📅 تاريخ التحميل: ${convoy.loading_date}`,
      `🏁 تاريخ التعتيق: ${convoy.completion_date || 'جاري'} (${nights} ليالي مبيت)`,
      `💰 إجمالي المستحق: ${grandTotal} ج.م`,
      `📄 مستند معتمد رقم: ${convoy.convoy_number}`,
      `📞 01093313193 | elbeekb2b@gmail.com`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setWhatsappCopied(true);
    setTimeout(() => setWhatsappCopied(false), 3000);
  };

  return (
    <>
      {/* Floating PDF Action Bar */}
      <header className="bg-charcoal text-on-primary sticky top-0 z-40 border-b border-white/10 px-4 sm:px-6 py-3.5 shadow-md no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <Link
              href={`/convoys/${convoy.id}/calculate`}
              className="p-2 hover:bg-white/10 rounded-DEFAULT transition text-light-gray"
              title="الرجوع لشاشة الحسابات"
            >
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </Link>
            <div>
              <h1 className="font-headline text-headline-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">picture_as_pdf</span>
                <span>معاينة البيان المعتمد (PDF Preview)</span>
              </h1>
              <p className="font-body text-body-sm text-outline hidden sm:block">
                مطابق للنموذج الرسمي المعتمد: شعار الشركة، الخط الفاصل الأحمر، ترويسة الجدول الداكنة، والعلامة المائية.
              </p>
            </div>
          </div>

          {/* Quick Document Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-DEFAULT font-label text-label-md flex items-center gap-2 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              <span>طباعة فورية</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-DEFAULT font-label text-label-md font-bold flex items-center gap-2 transition shadow-xs cursor-pointer"
              title="إرسال ملخص البيان عبر تطبيق واتساب"
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              <span>مشاركة واتساب</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-DEFAULT font-label text-label-sm transition cursor-pointer"
              title="نسخ نص البيان للواتساب"
            >
              {whatsappCopied ? 'تم النسخ ✓' : 'نسخ النص'}
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-md font-bold shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{isGenerating ? 'جارٍ التوليد...' : 'تنزيل وحفظ PDF'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Viewport Area */}
      <main className="flex-1 flex justify-center py-8 sm:py-12 px-3 sm:px-6 bg-[#4A4E54]">
        
        {/* The A4 Corporate Sheet (Strict Reference Compliance) */}
        <article
          id="official-statement-sheet"
          className="a4-sheet p-8 sm:p-14 border border-outline/50 flex flex-col justify-between overflow-hidden relative bg-white"
        >
          {/* Faint Red Logo Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0 select-none">
            <Image
              src="/logo.png"
              alt="Watermark"
              width={500}
              height={500}
              className="object-contain"
            />
          </div>

          {/* Top Section: Logo & Red Divider */}
          <div className="relative z-10">
            
            {/* Official Logo Centered */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="w-32 h-32 relative flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Ahmed Elbeek Import & Export"
                  width={128}
                  height={128}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Corporate Red Divider Line */}
            <div className="w-full h-[2.5px] bg-primary mb-6"></div>

            {/* Document Metadata Header */}
            <div className="flex items-end justify-between mb-5 text-body-sm text-charcoal">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-body-sm text-light-on-surface-variant font-medium">
                    بيان تشغيل وتفريغ شاحنات:
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-label font-bold ${
                    convoy.location_id === 'rafah'
                      ? 'bg-red-50 text-primary border border-primary'
                      : 'bg-amber-50 text-warning border border-amber-400'
                  }`}>
                    <span>مكان التحميل: {convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</span>
                  </span>
                </div>
                <h2 className="font-headline text-headline-md font-bold text-primary">
                  بضاعة: {convoy.cargo_name} ({convoy.truck_count} شاحنة تريلا)
                </h2>
              </div>
              <div className="text-left font-body tabular-nums space-y-0.5">
                <div>
                  <span className="text-light-on-surface-variant">تاريخ التحميل:</span>{' '}
                  <strong className="font-bold">{calc.loading_date}</strong>
                </div>
                <div>
                  <span className="text-light-on-surface-variant">تاريخ التعتيق:</span>{' '}
                  <strong className="font-bold">{calc.completion_date}</strong> (
                  <span className="text-primary font-bold">{calc.accommodation_nights}</span> ليالي مبيت)
                </div>
              </div>
            </div>

            {/* Electronic Load & Cost Summary (Matching Stitch and Word Reference) */}
            <div className="border border-charcoal rounded-md overflow-hidden mb-8 shadow-xs">
              <div className="bg-charcoal text-white px-5 py-3 flex items-center justify-between font-bold">
                <span className="text-body-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
                  <span>كشف تفريغ وحساب التحميلة الإلكتروني (بوصلة واحدة)</span>
                </span>
                <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-light-gray font-normal">
                  مستند إلكتروني معتمد — لا يتطلب توقيعاً يدوياً
                </span>
              </div>

              {/* Convoy Parameters Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-light-surface-variant border-b border-charcoal/20 text-body-sm">
                <div>
                  <span className="block text-light-on-surface-variant font-medium">عدد العربيات بالبوصلة:</span>
                  <span className="text-charcoal font-bold text-body-lg tabular-nums">
                    {convoy.truck_count} عربيات
                  </span>
                </div>
                <div>
                  <span className="block text-light-on-surface-variant font-medium">مكان التحميل المعتمد:</span>
                  <span className="text-primary font-bold text-body-lg">
                    {convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}
                  </span>
                </div>
                <div>
                  <span className="block text-light-on-surface-variant font-medium">يومية المبيت للعربية:</span>
                  <span className="text-charcoal font-bold text-body-lg tabular-nums">
                    {formatCurrency(calc.daily_accommodation_rate, false)} ج.م / يوم
                  </span>
                </div>
                <div>
                  <span className="block text-light-on-surface-variant font-medium">فئة نولون العربية:</span>
                  <span className="text-charcoal font-bold text-body-lg tabular-nums">
                    {formatCurrency(calc.freight_rate_per_truck, false)} ج.م
                  </span>
                </div>
              </div>

              {/* Itemized Calculation Table */}
              <table className="w-full text-right border-collapse text-body-sm">
                <thead>
                  <tr className="bg-light-gray text-charcoal border-b border-charcoal/20 font-bold">
                    <th className="py-3 px-4 w-12 text-center">م</th>
                    <th className="py-3 px-4">بيان البند المالي للتحميلة</th>
                    <th className="py-3 px-4 text-center">أساس الاحتساب الآلي</th>
                    <th className="py-3 px-4 text-left">المبلغ الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/10 text-charcoal">
                  <tr>
                    <td className="py-3.5 px-4 text-center tabular-nums font-bold">1</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold block">إجمالي نولون الشحن والتوصيل</span>
                      <span className="text-xs text-light-on-surface-variant">
                        شحن {convoy.truck_count} عربيات تريلا للبوصلة
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center tabular-nums font-medium text-light-on-surface-variant">
                      {convoy.truck_count} عربيات × {formatCurrency(calc.freight_rate_per_truck, false)} ج.م
                    </td>
                    <td className="py-3.5 px-4 text-left font-bold tabular-nums text-body-md">
                      {formatCurrency(calc.total_freight)}
                    </td>
                  </tr>

                  <tr className="bg-gray-50/50">
                    <td className="py-3.5 px-4 text-center tabular-nums font-bold">2</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold block text-primary">إجمالي المبيت وأيام الانتظار</span>
                      <span className="text-xs text-light-on-surface-variant">
                        فترة التحميل حتى التعتيق ({calc.accommodation_nights} ليالي)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center tabular-nums font-medium text-light-on-surface-variant">
                      {calc.accommodation_nights} ليالي × {formatCurrency(calc.daily_accommodation_rate, false)} ج.م × {convoy.truck_count} عربيات
                    </td>
                    <td className="py-3.5 px-4 text-left font-bold tabular-nums text-body-md text-primary">
                      {formatCurrency(calc.total_accommodation)}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3.5 px-4 text-center tabular-nums font-bold">3</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold block">رسوم التخليص الجمركي (Clearance)</span>
                      <span className="text-xs text-light-on-surface-variant">بند مالي منفصل بالمنفذ</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-light-on-surface-variant">
                      بند جمركي مستقل
                    </td>
                    <td className="py-3.5 px-4 text-left font-bold tabular-nums text-body-md">
                      {formatCurrency(calc.customs_clearance)}
                    </td>
                  </tr>

                  <tr className="bg-gray-50/50">
                    <td className="py-3.5 px-4 text-center tabular-nums font-bold">4</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold block">المصاريف الإضافية والنثريات</span>
                      <span className="text-xs text-light-on-surface-variant">
                        {calc.additional_expenses_notes || 'موازين، كروت بوابات، حراسات وتفريغ'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-light-on-surface-variant">
                      إيصالات ونثريات
                    </td>
                    <td className="py-3.5 px-4 text-left font-bold tabular-nums text-body-md">
                      {formatCurrency(calc.additional_expenses)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Final Grand Total Bar */}
              <div className="bg-charcoal text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-light-gray block">إجمالي صافي مستحقات التحميلة (البوصلة):</span>
                  <span className="text-body-md font-bold text-outline">
                    {arabicTafqeet(calc.grand_total)}
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-headline text-display-lg text-white font-bold tabular-nums leading-none">
                    {Math.round(calc.grand_total).toLocaleString('en-US')}
                  </span>
                  <span className="text-body-sm text-light-gray mr-1">جنيه مصري</span>
                </div>
              </div>
            </div>

            {/* Official Electronic Document Validation Badge */}
            <div className="border border-outline/70 bg-light-surface-variant/40 p-4 rounded-md flex items-center justify-between text-body-sm mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">verified_user</span>
                <div>
                  <span className="font-bold text-charcoal block">بيان مالي إلكتروني معتمد رسمياً</span>
                  <span className="text-xs text-light-on-surface-variant">
                    تم إصدار هذا المستند آلياً من منظومة أحمد البيك للاستيراد والتصدير. لا يتطلب توقيعاً يدوياً أو أختاماً ورقية.
                  </span>
                </div>
              </div>
              <div className="text-left font-mono text-xs text-light-on-surface-variant shrink-0">
                <div>REF: {convoy.convoy_number}</div>
                <div>VERIFIED: {calc.completion_date}</div>
              </div>
            </div>

          </div>

          {/* Bottom Corporate Footer (Exact Match to Reference Word Document) */}
          <div className="relative z-10 pt-6">
            <div className="w-full h-[1px] bg-primary mb-3"></div>
            <div className="flex items-center justify-center gap-6 text-body-sm text-charcoal font-medium tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">call</span>
                <span>01093313193</span>
              </span>
              <span className="text-primary font-bold">|</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">mail</span>
                <span>elbeekb2b@gmail.com</span>
              </span>
            </div>
          </div>

        </article>

      </main>

      <div className="no-print">
        <Footer />
      </div>
    </>
  );
}
