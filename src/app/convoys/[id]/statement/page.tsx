'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository, parseCalculationMeta } from '@/lib/store';
import { PDFService } from '@/lib/pdf';
import { PDF_ICONS } from '@/lib/pdf-icons';
import { COMPANY_LOGO_BASE64 } from '@/lib/logoBase64';
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
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [unsupportedShareModal, setUnsupportedShareModal] = useState<{
    open: boolean;
    fileName: string;
  } | null>(null);
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

  // Normalize calculation in case PostgREST or cache returns array
  const rawCalc = Array.isArray(convoy.calculation)
    ? (convoy.calculation.length > 0 ? convoy.calculation[0] : null)
    : convoy.calculation;

  const parsedCalc = parseCalculationMeta(rawCalc);

  // Fallback financial calculation if not yet stored
  const calc = parsedCalc || {
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
    port_demurrage: 0,
    additional_expenses: 0,
    additional_expenses_notes: null,
    custom_items: [],
    grand_total:
      calculateElapsedDays(convoy.loading_date, convoy.completion_date) * 500 * convoy.truck_count +
      8500 * convoy.truck_count +
      14500,
    average_cost_per_truck: 14508.33,
    currency: 'EGP',
    calculated_by: null,
    calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const customItemsList = Array.isArray((calc as any).custom_items)
    ? (calc as any).custom_items.filter((it: any) => it && (it.name || Number(it.amount) > 0))
    : [];

  const customItemsTotal = customItemsList.reduce(
    (acc: number, it: any) => acc + (Number(it.amount) || 0),
    0
  );

  const grandTotal = Math.max(
    Number(calc.grand_total) || 0,
    (Number(calc.total_freight) || 0) +
      (Number(calc.total_accommodation) || 0) +
      (Number(calc.customs_clearance) || 0) +
      (Number(calc.port_demurrage) || 0) +
      customItemsTotal
  );

  const getStatementFileName = (cargoName: string, truckCount: number): string => {
    const cleanCargo = (cargoName || 'بضاعة')
      .replace(/[\\/:*?"<>|]/g, '')
      .trim();
    const truckUnit = truckCount >= 3 && truckCount <= 10 ? 'عربيات' : 'عربية';
    const truckStr = `${truckCount} ${truckUnit}`;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    return `${cleanCargo} - ${truckStr} - ${todayStr}.pdf`;
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const fileName = getStatementFileName(convoy.cargo_name, convoy.truck_count);
    await PDFService.generateAndDownloadPDF({
      elementId: 'official-statement-sheet',
      fileName,
      convoyId: convoy.id,
      documentType: 'statement',
      documentNumber: convoy.convoy_number,
    });
    setIsGenerating(false);
  };

  const handleWhatsAppShare = async () => {
    if (!convoy) return;
    setIsSharingWhatsApp(true);
    const fileName = getStatementFileName(convoy.cargo_name, convoy.truck_count);

    try {
      const shareResult = await PDFService.sharePDFFile({
        elementId: 'official-statement-sheet',
        fileName,
        convoyId: convoy.id,
        documentType: 'statement',
        documentNumber: convoy.convoy_number,
      });

      if (shareResult.cancelled) {
        // User closed or dismissed the native share sheet
        return;
      }

      if (!shareResult.supported) {
        // Browser does not support Web Share API with files (Desktop Chrome/Brave/Firefox, etc.)
        // 1. Download the generated PDF file automatically to user's device
        if (shareResult.blob) {
          const blobUrl = URL.createObjectURL(shareResult.blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        } else {
          await handleDownloadPDF();
        }

        // 2. Open WhatsApp Web in a new tab
        window.open('https://web.whatsapp.com', '_blank');

        // 3. Show clear Arabic notification explaining that the PDF was downloaded and must be attached manually
        setUnsupportedShareModal({
          open: true,
          fileName,
        });
      }
    } catch (err: any) {
      console.error('WhatsApp share error:', err);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const handleCopyWhatsAppText = () => {
    const locationName = convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة';
    const grandTotalStr = Math.round(grandTotal).toLocaleString('en-US');
    const nights = calc ? calc.accommodation_nights : '0';
    const demurrage = Number(calc?.port_demurrage) || 0;

    const lines = [
      `*بيان حسابات رسمي — شركة أحمد البيك للاستيراد والتصدير*`,
      `📦 البضاعة: ${convoy.cargo_name}`,
      `⚓ مكان التحميل: ${locationName}`,
      `🚛 عدد الشاحنات: ${convoy.truck_count} تريلا`,
      `📅 تاريخ التحميل: ${convoy.loading_date}`,
      `🏁 تاريخ التعتيق: ${convoy.completion_date || 'جاري'} (${nights} ليالي مبيت)`,
    ];

    if (demurrage > 0) {
      lines.push(`🏢 أرضيات مبيت داخل المنفذ: ${Math.round(demurrage).toLocaleString('en-US')} ج.م`);
    }

    if (customItemsList.length > 0) {
      customItemsList.forEach((ci: any) => {
        lines.push(`➕ ${ci.name || 'بند إضافي'}: ${Math.round(Number(ci.amount) || 0).toLocaleString('en-US')} ج.م`);
      });
    }

    lines.push(`💰 إجمالي المستحق: ${grandTotalStr} ج.م`);
    lines.push(`📄 مستند معتمد رقم: ${convoy.convoy_number}`);
    lines.push(`📞 01093313193 | elbeekb2b@gmail.com`);

    navigator.clipboard.writeText(lines.join('\n'));
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
              disabled={isSharingWhatsApp || isGenerating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-DEFAULT font-label text-label-md font-bold flex items-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
              title="مشاركة ملف الـ PDF كملف مرفق عبر واتساب"
            >
              {isSharingWhatsApp ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  <span>جارٍ تجهيز الملف...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">chat</span>
                  <span>مشاركة واتساب</span>
                </>
              )}
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
      <main className="flex-1 flex justify-center py-4 sm:py-8 md:py-12 px-2 sm:px-6 bg-[#4A4E54] overflow-x-hidden">
        
        {/* The A4 Corporate Sheet (Responsive on all screens + Canonical A4 on Export/Print) */}
        <article
          id="official-statement-sheet"
          className="a4-sheet p-4 sm:p-8 md:p-12 border border-outline/50 flex flex-col justify-between overflow-hidden relative bg-white rounded-md sm:rounded-none"
        >
          {/* Faint Red Logo Watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none"
            style={{ opacity: 0.04 }}
          >
            <img
              src={COMPANY_LOGO_BASE64}
              alt="Watermark"
              className="pdf-watermark-img w-[240px] h-[240px] sm:w-[420px] sm:h-[420px] max-w-[80%] object-contain"
            />
          </div>

          {/* Top Section: Logo & Red Divider */}
          <div className="relative z-10">
            
            {/* Official Logo Centered */}
            <div className="flex flex-col items-center justify-center mb-4 sm:mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
                <img
                  src={COMPANY_LOGO_BASE64}
                  alt="Ahmed Elbeek Import & Export"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Corporate Red Divider Line */}
            <div className="w-full h-[2.5px] bg-primary mb-5 sm:mb-6"></div>

            {/* Document Metadata Header */}
            <div className="pdf-header-row flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 text-body-sm text-charcoal">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-body-sm text-light-on-surface-variant font-medium">
                    بيان تشغيل وتفريغ شاحنات:
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-label font-bold ${
                    convoy.location_id === 'rafah'
                      ? 'bg-red-50 text-primary border border-primary'
                      : 'bg-amber-50 text-warning border border-amber-400'
                  }`}>
                    <span>مكان التحميل: {convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</span>
                  </span>
                </div>
                <h2 className="font-headline text-headline-sm sm:text-headline-md font-bold text-primary">
                  بضاعة: {convoy.cargo_name} ({convoy.truck_count} شاحنة تريلا)
                </h2>
              </div>
              <div className="pdf-header-dates text-right sm:text-left font-body tabular-nums space-y-0.5 bg-light-surface-variant/60 sm:bg-transparent p-2.5 sm:p-0 rounded sm:rounded-none">
                <div>
                  <span className="text-light-on-surface-variant">تاريخ التحميل:</span>{' '}
                  <strong className="font-bold">{calc.loading_date}</strong>
                </div>
                <div>
                  <span className="text-light-on-surface-variant">تاريخ التعتيق:</span>{' '}
                  <strong className="font-bold">{calc.completion_date}</strong> (
                  <span className="text-primary font-bold">{calc.accommodation_nights}</span>{' '}
                  {calc.accommodation_nights === 1 ? 'ليلة مبيت' : 'ليالي مبيت'})
                </div>
              </div>
            </div>

            {/* Electronic Load & Cost Summary (Matching Stitch and Word Reference) */}
            <div className="border border-charcoal rounded-md overflow-hidden mb-6 sm:mb-8 shadow-xs">
              <div className="pdf-bar-row bg-charcoal text-white px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold">
                <div className="text-body-sm sm:text-body-md flex items-center">
                  <img
                    data-pdf-icon="receipt"
                    src={PDF_ICONS.receipt}
                    alt=""
                    width={20}
                    height={20}
                    className="pdf-icon-img ml-2"
                    style={{ width: '20px', height: '20px', minWidth: '20px' }}
                  />
                  <span>كشف تفريغ وحساب التحميلة الإلكتروني (بوصلة واحدة)</span>
                </div>
                <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-light-gray font-normal self-start sm:self-auto">
                  مستند إلكتروني معتمد — لا يتطلب توقيعاً يدوياً
                </span>
              </div>

              {/* Convoy Parameters Row */}
              <div className="pdf-params-grid grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-5 bg-light-surface-variant border-b border-charcoal/20 text-body-sm">
                <div>
                  <span className="block text-light-on-surface-variant font-medium">عدد العربيات بالبوصلة:</span>
                  <span className="text-charcoal font-bold text-body-md sm:text-body-lg tabular-nums">
                    {convoy.truck_count} عربيات
                  </span>
                </div>
                <div>
                  <span className="block text-light-on-surface-variant font-medium">مكان التحميل المعتمد:</span>
                  <span className="text-primary font-bold text-body-md sm:text-body-lg">
                    {convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}
                  </span>
                </div>
                <div>
                  <span className="block text-light-on-surface-variant font-medium">يومية المبيت للعربية:</span>
                  <span className="text-charcoal font-bold text-body-md sm:text-body-lg tabular-nums">
                    {formatCurrency(calc.daily_accommodation_rate, false)} ج.م / يوم
                  </span>
                </div>
                <div>
                  <span className="block text-light-on-surface-variant font-medium">فئة نولون العربية:</span>
                  <span className="text-charcoal font-bold text-body-md sm:text-body-lg tabular-nums">
                    {formatCurrency(calc.freight_rate_per_truck, false)} ج.م
                  </span>
                </div>
              </div>

              {/* Itemized Calculation Table (Scrollable on tiny screens, full-width on A4 export/print) */}
              <div className="pdf-table-scroll overflow-x-auto w-full">
                <table className="w-full min-w-[520px] sm:min-w-0 text-right border-collapse text-body-sm">
                  <thead>
                    <tr className="bg-light-gray text-charcoal border-b border-charcoal/20 font-bold">
                      <th className="py-3 px-3 sm:px-4 w-10 sm:w-12 text-center">م</th>
                      <th className="py-3 px-3 sm:px-4">بيان البند المالي للتحميلة</th>
                      <th className="py-3 px-3 sm:px-4 text-center">أساس الاحتساب الآلي</th>
                      <th className="py-3 px-3 sm:px-4 text-left">المبلغ الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/10 text-charcoal">
                    <tr>
                      <td className="py-3.5 px-3 sm:px-4 text-center tabular-nums font-bold">1</td>
                      <td className="py-3.5 px-3 sm:px-4">
                        <span className="font-bold block">إجمالي نولون الشحن والتوصيل</span>
                        <span className="text-xs text-light-on-surface-variant">
                          شحن {convoy.truck_count} عربيات تريلا للبوصلة
                        </span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-center tabular-nums font-medium text-light-on-surface-variant">
                        {convoy.truck_count} عربيات × {formatCurrency(calc.freight_rate_per_truck, false)} ج.م
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-left font-bold tabular-nums text-body-md whitespace-nowrap">
                        {formatCurrency(calc.total_freight)}
                      </td>
                    </tr>

                    <tr className="bg-gray-50/50">
                      <td className="py-3.5 px-3 sm:px-4 text-center tabular-nums font-bold">2</td>
                      <td className="py-3.5 px-3 sm:px-4">
                        <span className="font-bold block text-primary">إجمالي المبيت وأيام الانتظار</span>
                        <span className="text-xs text-light-on-surface-variant">
                          فترة المبيت الفعلية باستثناء يوم التحميل ويوم التعتيق ({calc.accommodation_nights} {calc.accommodation_nights === 1 ? 'ليلة' : 'ليالي'})
                        </span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-center tabular-nums font-medium text-light-on-surface-variant">
                        {calc.accommodation_nights} {calc.accommodation_nights === 1 ? 'ليلة' : 'ليالي'} × {formatCurrency(calc.daily_accommodation_rate, false)} ج.م × {convoy.truck_count} عربيات
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-left font-bold tabular-nums text-body-md text-primary whitespace-nowrap">
                        {formatCurrency(calc.total_accommodation)}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3.5 px-3 sm:px-4 text-center tabular-nums font-bold">3</td>
                      <td className="py-3.5 px-3 sm:px-4">
                        <span className="font-bold block">رسوم التخليص الجمركي (Clearance)</span>
                        <span className="text-xs text-light-on-surface-variant">بند مالي منفصل بالمنفذ</span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-center text-xs text-light-on-surface-variant">
                        بند جمركي مستقل
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-left font-bold tabular-nums text-body-md whitespace-nowrap">
                        {formatCurrency(calc.customs_clearance)}
                      </td>
                    </tr>

                    {Number(calc.port_demurrage) > 0 && (
                      <tr className="bg-gray-50/50">
                        <td className="py-3.5 px-3 sm:px-4 text-center tabular-nums font-bold">4</td>
                        <td className="py-3.5 px-3 sm:px-4">
                          <span className="font-bold block">أرضيات مبيت داخل المنفذ</span>
                          <span className="text-xs text-light-on-surface-variant">
                            مبيت وحراسة الشاحنات المبردة داخل ساحات المنفذ
                          </span>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-center text-xs text-light-on-surface-variant">
                          رسوم ساحات وأرضيات
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-left font-bold tabular-nums text-body-md whitespace-nowrap">
                          {formatCurrency(calc.port_demurrage)}
                        </td>
                      </tr>
                    )}

                    {/* Dynamic Custom Cost Items added by the owner */}
                    {Array.isArray((calc as any).custom_items) &&
                      (calc as any).custom_items
                        .filter((it: any) => it && (it.name || Number(it.amount) > 0))
                        .map((item: any, idx: number) => {
                          const startSeq = Number(calc.port_demurrage) > 0 ? 5 : 4;
                          const rowNumber = startSeq + idx;
                          const isEven = rowNumber % 2 === 0;
                          return (
                            <tr key={item.id || idx} className={isEven ? 'bg-gray-50/50' : ''}>
                              <td className="py-3.5 px-3 sm:px-4 text-center tabular-nums font-bold">{rowNumber}</td>
                              <td className="py-3.5 px-3 sm:px-4">
                                <span className="font-bold block text-charcoal">
                                  {item.name || `بند تكلفة مخصص ${idx + 1}`}
                                </span>
                                <span className="text-xs text-light-on-surface-variant">بند مالي مخصص بالبيان</span>
                              </td>
                              <td className="py-3.5 px-3 sm:px-4 text-center text-xs text-light-on-surface-variant">
                                بند مالي إضافي
                              </td>
                              <td className="py-3.5 px-3 sm:px-4 text-left font-bold tabular-nums text-body-md text-charcoal whitespace-nowrap">
                                {formatCurrency(Number(item.amount) || 0)}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              {/* Final Grand Total Bar */}
              <div className="pdf-total-bar bg-charcoal text-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-light-gray block">إجمالي صافي مستحقات التحميلة (البوصلة):</span>
                  <span className="text-body-sm sm:text-body-md font-bold text-outline">
                    {arabicTafqeet(grandTotal)}
                  </span>
                </div>
                <div className="text-left self-end sm:self-auto whitespace-nowrap">
                  <span className="font-headline text-headline-lg sm:text-display-lg text-white font-bold tabular-nums leading-none">
                    {Math.round(grandTotal).toLocaleString('en-US')}
                  </span>
                  <span className="text-body-sm text-light-gray mr-1.5">جنيه مصري</span>
                </div>
              </div>
            </div>

            {/* Official Electronic Document Validation Badge */}
            <div className="pdf-badge-row border border-outline/70 bg-light-surface-variant/40 p-3.5 sm:p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-body-sm mb-6">
              <div className="flex items-center">
                <img
                  data-pdf-icon="verifiedShield"
                  src={PDF_ICONS.verifiedShield}
                  alt=""
                  width={24}
                  height={24}
                  className="pdf-icon-img ml-3"
                  style={{ width: '24px', height: '24px', minWidth: '24px' }}
                />
                <div>
                  <span className="font-bold text-charcoal block">بيان مالي إلكتروني معتمد رسمياً</span>
                  <span className="text-xs text-light-on-surface-variant">
                    تم إصدار هذا المستند آلياً من منظومة أحمد البيك للاستيراد والتصدير. لا يتطلب توقيعاً يدوياً أو أختاماً ورقية.
                  </span>
                </div>
              </div>
              <div className="pdf-badge-ref text-right sm:text-left font-mono text-xs text-light-on-surface-variant shrink-0">
                <div>REF: {convoy.convoy_number}</div>
                <div>VERIFIED: {calc.completion_date}</div>
              </div>
            </div>

          </div>

          {/* Bottom Corporate Footer (Exact Match to Reference Word Document) */}
          <div className="relative z-10 pt-4 sm:pt-6">
            <div className="w-full h-[1px] bg-primary mb-3"></div>
            <div className="pdf-footer-row flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-body-sm text-charcoal font-medium tabular-nums">
              <span className="inline-flex items-center">
                <img
                  data-pdf-icon="phone"
                  src={PDF_ICONS.phone}
                  alt=""
                  width={16}
                  height={16}
                  className="pdf-icon-img ml-1.5"
                  style={{ width: '16px', height: '16px', minWidth: '16px' }}
                />
                <span>01093313193</span>
              </span>
              <span className="pdf-footer-sep text-primary font-bold hidden sm:inline">|</span>
              <span className="inline-flex items-center">
                <img
                  data-pdf-icon="mail"
                  src={PDF_ICONS.mail}
                  alt=""
                  width={16}
                  height={16}
                  className="pdf-icon-img ml-1.5"
                  style={{ width: '16px', height: '16px', minWidth: '16px' }}
                />
                <span>elbeekb2b@gmail.com</span>
              </span>
            </div>
          </div>

        </article>

      </main>

      {/* Unsupported Browser Share Notification Modal */}
      {unsupportedShareModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-outline animate-in fade-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-light-gray">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">chat</span>
              </div>
              <div>
                <h3 className="font-headline text-headline-sm font-bold text-charcoal">
                  مشاركة ملف البيان عبر واتساب
                </h3>
                <span className="text-xs text-light-on-surface-variant">
                  إرفاق مستند الـ PDF المعتمد
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-body-sm text-charcoal leading-relaxed mb-6">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-900 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-xl shrink-0">check_circle</span>
                <span>
                  تم تنزيل ملف الـ PDF الرسمي <strong>({unsupportedShareModal.fileName})</strong> على جهازك بنجاح.
                </span>
              </div>

              <p className="text-light-on-surface-variant">
                نظراً لأن متصفحات أجهزة الكمبيوتر لا تدعم مشاركة الملفات المباشرة إلى التطبيقات، تم فتح <strong>واتساب ويب</strong> في نافذة جديدة.
              </p>

              <div className="bg-light-surface-variant p-3.5 rounded-lg border border-outline/70">
                <span className="font-bold text-charcoal block mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">attach_file</span>
                  <span>طريقة إرسال الملف في واتساب:</span>
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-light-on-surface-variant mr-1">
                  <li>اختر المحادثة المطلوبة في نافذة واتساب ويب المفتوحة.</li>
                  <li>اسحب ملف الـ PDF المحمّل وأفلته داخل المحادثة، أو اضغط على علامة المشبك (<strong>📎 مستند</strong>).</li>
                  <li>اضغط إرسال ليصل البيان كملف PDF معتمد ذو صفحة واحدة بدقة عالية.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                className="px-4 py-2 border border-outline hover:bg-light-surface-variant text-charcoal font-label text-label-md rounded-DEFAULT transition flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
                <span>فتح واتساب ويب</span>
              </button>

              <button
                type="button"
                onClick={() => setUnsupportedShareModal(null)}
                className="px-6 py-2 bg-primary hover:bg-opacity-95 text-on-primary font-label text-label-md font-bold rounded-DEFAULT shadow-xs transition cursor-pointer"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="no-print">
        <Footer />
      </div>
    </>
  );
}

