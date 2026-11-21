'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import { PDFService } from '@/lib/pdf';
import { PDF_ICONS } from '@/lib/pdf-icons';
import { COMPANY_LOGO_BASE64 } from '@/lib/logoBase64';
import type { ConvoyWithDetails, Database } from '@/types/database.types';

type TruckRow = Database['public']['Tables']['convoy_trucks']['Insert'];

export default function DriverManifestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [convoy, setConvoy] = useState<ConvoyWithDetails | null>(null);
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewPdfMode, setPreviewPdfMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      if (data.trucks && data.trucks.length > 0) {
        // Normalize any old values like "ميناء العوجة ⟵ القاهرة" to "ميناء العوجة" or "ميناء رفح"
        const cleanTrucks = data.trucks.map(t => {
          let port = t.political_destination || '';
          if (port.includes('رفح')) port = 'ميناء رفح';
          else if (port.includes('العوجة')) port = 'ميناء العوجة';
          else port = data.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة';
          return {
            ...t,
            political_destination: port,
          };
        });
        setTrucks(cleanTrucks);
      } else {
        // Initialize rows matching truck_count
        const initial: TruckRow[] = [];
        const count = data.truck_count || 5;
        const defaultDest = data.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة';
        for (let i = 1; i <= count; i++) {
          initial.push({
            convoy_id: convoyId,
            sequence_number: i,
            political_destination: defaultDest,
            driver_name: '',
            national_id: '',
            truck_plate: '',
            trailer_plate: '',
          });
        }
        setTrucks(initial);
      }
    }
    setLoading(false);
  };

  const handleRowChange = (index: number, field: keyof TruckRow, value: any) => {
    const updated = [...trucks];
    updated[index] = { ...updated[index], [field]: value };
    setTrucks(updated);
  };

  const handleAddTruck = () => {
    const nextSeq = trucks.length + 1;
    const defaultDest = convoy?.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة';
    setTrucks([
      ...trucks,
      {
        convoy_id: id,
        sequence_number: nextSeq,
        political_destination: defaultDest,
        driver_name: '',
        national_id: '',
        truck_plate: '',
        trailer_plate: '',
      },
    ]);

    setTimeout(() => {
      const el = document.getElementById(`truck-card-${nextSeq - 1}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = el.querySelector('input');
        if (input) input.focus();
      }
    }, 120);
  };

  const handleRemoveTruck = (index: number) => {
    if (trucks.length <= 1) return;
    const filtered = trucks.filter((_, i) => i !== index).map((t, i) => ({
      ...t,
      sequence_number: i + 1,
    }));
    setTrucks(filtered);
  };

  const handleSave = async () => {
    if (!convoy) return;
    setIsSaving(true);
    try {
      await ConvoyRepository.saveTrucks(convoy.id, trucks);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving trucks:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!convoy) return;
    setIsGeneratingPdf(true);
    await handleSave();

    // Ensure the A4 sheet is mounted in DOM if triggered from Editable Form tab
    if (!previewPdfMode) {
      setPreviewPdfMode(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const fileName = `كشف_سائقين_${convoy.cargo_name.replace(/\s+/g, '_')}_${convoy.convoy_number}.pdf`;
    await PDFService.generateAndDownloadPDF({
      elementId: 'official-drivers-manifest-sheet',
      fileName,
      convoyId: convoy.id,
      documentType: 'drivers_manifest',
      documentNumber: `${convoy.convoy_number}-DRV`,
    });
    setIsGeneratingPdf(false);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 text-center text-charcoal">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-3">
            progress_activity
          </span>
          <p className="font-headline text-headline-md font-bold">جارٍ تحميل كشف السائقين...</p>
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

  return (
    <>
      <div className="no-print">
        <Navbar />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        
        {/* Navigation Breadcrumb */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-body-sm text-light-on-surface-variant">
            <Link href="/" className="hover:text-primary transition">الرئيسية</Link>
            <span>/</span>
            <Link href="/convoys" className="hover:text-primary transition">سجل البوصلات</Link>
            <span>/</span>
            <Link href={`/convoys/${convoy.id}`} className="hover:text-primary transition">{convoy.cargo_name}</Link>
            <span>/</span>
            <span className="text-charcoal font-bold">تنسيق السائقين</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewPdfMode(!previewPdfMode)}
              className="px-4 py-2 border border-outline hover:bg-light-surface-variant text-charcoal rounded-DEFAULT font-label text-label-md flex items-center gap-2 font-bold transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">
                {previewPdfMode ? 'edit_note' : 'preview'}
              </span>
              <span>{previewPdfMode ? 'العودة لنموذج التعديل' : 'معاينة ورقة الطباعة A4'}</span>
            </button>
          </div>
        </div>

        {/* Convoy Summary Bar */}
        <div className="no-print bg-light-surface border-2 border-primary/20 rounded-xl p-4 sm:p-5 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div>
              <span className="text-xs text-light-on-surface-variant block">البضاعة المحملة:</span>
              <span className="font-headline text-headline-sm font-bold text-charcoal">{convoy.cargo_name}</span>
            </div>
            <div className="h-8 w-[1px] bg-outline hidden sm:block"></div>
            <div>
              <span className="text-xs text-light-on-surface-variant block">مكان التحميل:</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">anchor</span>
                <span>{convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</span>
              </span>
            </div>
            <div className="h-8 w-[1px] bg-outline hidden sm:block"></div>
            <div>
              <span className="text-xs text-light-on-surface-variant block">تاريخ التحميل:</span>
              <span className="font-bold text-charcoal tabular-nums">{convoy.loading_date}</span>
            </div>
            <div className="h-8 w-[1px] bg-outline hidden sm:block"></div>
            <div>
              <span className="text-xs text-light-on-surface-variant block">إجمالي الشاحنات:</span>
              <span className="font-headline text-headline-sm font-bold text-charcoal tabular-nums">
                {trucks.length} شاحنة
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-5 py-2.5 border border-outline hover:bg-light-surface-variant text-charcoal rounded-DEFAULT font-label text-label-md font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              <span>{isSaving ? 'جارٍ الحفظ...' : saveSuccess ? 'تم الحفظ ✓' : 'حفظ التعديلات'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-md font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{isGeneratingPdf ? 'جارٍ التوليد...' : 'تنزيل كشف PDF'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Editable Form Mode */}
        {!previewPdfMode ? (
          <div className="bg-light-surface border border-outline rounded-xl p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-light-gray">
              <div>
                <h3 className="font-headline text-headline-sm sm:text-headline-md font-bold text-charcoal flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  <span>كشف بيانات السائقين والسيارات المعتمد</span>
                </h3>
                <p className="font-body text-body-sm text-light-on-surface-variant mt-0.5">
                  مطابق للنموذج الرسمي (الميناء، الاسم، الرقم القومي، سيارة رقم، مقطورة رقم).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddTruck}
                className="hidden sm:flex w-auto px-4 py-2.5 bg-light-surface-variant hover:bg-pale-red text-charcoal hover:text-primary border border-outline rounded-DEFAULT font-label text-label-sm font-bold transition items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <span className="material-symbols-outlined text-lg text-primary">add</span>
                <span>إضافة شاحنة جديدة للكشف</span>
              </button>
            </div>

            {/* Mobile Driver Card List (md:hidden) */}
            <div className="md:hidden space-y-3.5 mb-4">
              {trucks.map((row, idx) => (
                <div
                  key={idx}
                  id={`truck-card-${idx}`}
                  className="bg-white border-2 border-outline/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-light-gray pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-charcoal text-white font-bold rounded-full flex items-center justify-center text-xs tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-charcoal text-body-sm">
                        شاحنة تريلا #{idx + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTruck(idx)}
                      disabled={trucks.length <= 1}
                      className="p-2 text-light-on-surface-variant hover:text-primary hover:bg-pale-red rounded-DEFAULT transition disabled:opacity-30 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="حذف هذا الصف"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal mb-1">
                      اسم السائق رباعياً
                    </label>
                    <input
                      type="text"
                      autoComplete="name"
                      enterKeyHint="next"
                      value={row.driver_name || ''}
                      onChange={(e) => handleRowChange(idx, 'driver_name', e.target.value)}
                      placeholder="اسم السائق رباعياً"
                      className="w-full border border-outline rounded px-3 py-2.5 text-body-sm font-semibold text-charcoal focus:border-primary outline-none min-h-[46px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal mb-1">
                      الرقم القومي (14 رقماً)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      enterKeyHint="next"
                      maxLength={14}
                      value={row.national_id || ''}
                      onChange={(e) => handleRowChange(idx, 'national_id', e.target.value)}
                      placeholder="14 رقماً"
                      className="w-full border border-outline rounded px-3 py-2.5 text-body-sm tabular-nums text-charcoal focus:border-primary outline-none min-h-[46px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1">
                        سيارة رقم
                      </label>
                      <input
                        type="text"
                        enterKeyHint="next"
                        value={row.truck_plate || ''}
                        onChange={(e) => handleRowChange(idx, 'truck_plate', e.target.value)}
                        placeholder="د ف ج 8391"
                        className="w-full border border-outline rounded px-2.5 py-2.5 text-body-sm font-bold tabular-nums text-charcoal focus:border-primary outline-none min-h-[46px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1">
                        مقطورة رقم
                      </label>
                      <input
                        type="text"
                        enterKeyHint="next"
                        value={row.trailer_plate || ''}
                        onChange={(e) => handleRowChange(idx, 'trailer_plate', e.target.value)}
                        placeholder="ط ن ر 2940"
                        className="w-full border border-outline rounded px-2.5 py-2.5 text-body-sm font-bold tabular-nums text-charcoal focus:border-primary outline-none min-h-[46px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal mb-1">
                      الميناء
                    </label>
                    <select
                      value={row.political_destination?.includes('رفح') ? 'ميناء رفح' : 'ميناء العوجة'}
                      onChange={(e) => handleRowChange(idx, 'political_destination', e.target.value)}
                      className="w-full border border-outline rounded px-3 py-2.5 text-body-sm font-semibold text-charcoal bg-light-surface focus:border-primary outline-none transition cursor-pointer min-h-[46px]"
                    >
                      <option value="ميناء رفح">ميناء رفح</option>
                      <option value="ميناء العوجة">ميناء العوجة</option>
                    </select>
                  </div>
                </div>
              ))}

              {/* Add Truck Button: Positioned BELOW the mobile truck list for continuous data entry */}
              <button
                type="button"
                onClick={handleAddTruck}
                className="w-full py-3.5 px-5 bg-white hover:bg-pale-red/30 text-primary border-2 border-dashed border-primary/40 hover:border-primary rounded-xl font-label text-label-md font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs min-h-[48px]"
              >
                <span className="material-symbols-outlined text-xl">add_circle</span>
                <span>+ إضافة شاحنة جديدة للكشف</span>
              </button>

              {/* Bottom Quick Save Row for Mobile */}
              <div className="pt-3 border-t border-light-gray flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-md font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px] shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">save</span>
                  <span>{isSaving ? 'جارٍ الحفظ...' : saveSuccess ? 'تم الحفظ بنجاح ✓' : 'حفظ كشف السائقين'}</span>
                </button>
              </div>
            </div>

            {/* Desktop Driver Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto border border-outline rounded-lg">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-charcoal text-on-primary border-b border-outline text-label-md font-label">
                    <th className="py-3 px-3 w-12 text-center">م</th>
                    <th className="py-3 px-4 min-w-[140px]">الميناء</th>
                    <th className="py-3 px-4 min-w-[200px]">اسم السائق</th>
                    <th className="py-3 px-4 min-w-[170px]">الرقم القومي (14 رقم)</th>
                    <th className="py-3 px-4 min-w-[140px]">سيارة رقم</th>
                    <th className="py-3 px-4 min-w-[140px]">مقطورة رقم</th>
                    <th className="py-3 px-3 w-12 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline text-body-md">
                  {trucks.map((row, idx) => (
                    <tr key={idx} className="hover:bg-light-surface-variant/50">
                      <td className="py-3 px-3 text-center tabular-nums font-bold text-charcoal">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={row.political_destination?.includes('رفح') ? 'ميناء رفح' : 'ميناء العوجة'}
                          onChange={(e) => handleRowChange(idx, 'political_destination', e.target.value)}
                          className="w-full border border-outline rounded px-2.5 py-1.5 text-body-sm font-semibold text-charcoal bg-light-surface focus:border-primary outline-none transition cursor-pointer"
                        >
                          <option value="ميناء رفح">ميناء رفح</option>
                          <option value="ميناء العوجة">ميناء العوجة</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.driver_name || ''}
                          onChange={(e) => handleRowChange(idx, 'driver_name', e.target.value)}
                          placeholder="اسم السائق رباعياً"
                          className="w-full border border-outline rounded px-2.5 py-1.5 text-body-sm font-semibold text-charcoal focus:border-primary outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          maxLength={14}
                          value={row.national_id || ''}
                          onChange={(e) => handleRowChange(idx, 'national_id', e.target.value)}
                          placeholder="14 رقماً"
                          className="w-full border border-outline rounded px-2.5 py-1.5 text-body-sm tabular-nums text-charcoal focus:border-primary outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.truck_plate || ''}
                          onChange={(e) => handleRowChange(idx, 'truck_plate', e.target.value)}
                          placeholder="مثال: د ف ج 8391"
                          className="w-full border border-outline rounded px-2.5 py-1.5 text-body-sm font-bold tabular-nums text-charcoal focus:border-primary outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.trailer_plate || ''}
                          onChange={(e) => handleRowChange(idx, 'trailer_plate', e.target.value)}
                          placeholder="مثال: ط ن ر 2940"
                          className="w-full border border-outline rounded px-2.5 py-1.5 text-body-sm font-bold tabular-nums text-charcoal focus:border-primary outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveTruck(idx)}
                          disabled={trucks.length <= 1}
                          className="p-1 text-light-on-surface-variant hover:text-primary disabled:opacity-30 cursor-pointer"
                          title="حذف هذا الصف"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-light-gray mt-6">
              <Link
                href={`/convoys/${convoy.id}`}
                className="w-full sm:w-auto px-6 py-2.5 border border-outline text-charcoal hover:bg-light-surface-variant font-label text-label-md rounded-DEFAULT transition text-center min-h-[44px] flex items-center justify-center"
              >
                الرجوع لتفاصيل القافلة
              </Link>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-charcoal hover:bg-charcoal/90 text-white font-label text-label-md rounded-DEFAULT transition cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  {isSaving ? 'جارٍ الحفظ...' : 'حفظ الكشف'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPdfMode(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary font-label text-label-md font-bold rounded-DEFAULT shadow-xs transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  <span>معاينة ورقة الـ PDF المعتمدة</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: PDF Sheet Preview Mode (Responsive on all screens + Canonical A4 on Export/Print) */
          <div className="flex flex-col items-center w-full">
            
            <article
              id="official-drivers-manifest-sheet"
              className="a4-sheet p-4 sm:p-8 md:p-12 border border-outline/50 flex flex-col justify-between overflow-hidden relative bg-white my-2 sm:my-4 shadow-xl rounded-md sm:rounded-none"
            >
              {/* Watermark */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none"
                style={{ opacity: 0.04 }}
              >
                <img
                  src={COMPANY_LOGO_BASE64}
                  alt="Watermark"
                  className="pdf-watermark-img w-[220px] h-[220px] sm:w-[420px] sm:h-[420px] max-w-[80%] object-contain"
                />
              </div>

              <div className="relative z-10">
                
                {/* Official Centered Header */}
                <div className="flex flex-col items-center justify-center mb-4 sm:mb-5">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                    <img
                      src={COMPANY_LOGO_BASE64}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Corporate Red Divider Line */}
                <div className="w-full h-[2.5px] bg-primary mb-5 sm:mb-6"></div>

                {/* Sheet Metadata */}
                <div className="pdf-header-row flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 sm:mb-6 pb-2 text-body-sm text-charcoal">
                  <div>
                    <h2 className="font-headline text-headline-sm sm:text-headline-md font-bold text-charcoal mb-1">
                      كشف سيارات وسائقي القافلة المعتمد
                    </h2>
                    <p className="text-body-sm text-light-on-surface-variant font-medium">
                      بضاعة: <strong className="text-primary">{convoy.cargo_name}</strong> | مكان التحميل:{' '}
                      <strong className="text-charcoal">{convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</strong>
                    </p>
                  </div>
                  <div className="pdf-header-dates text-right sm:text-left font-body tabular-nums space-y-0.5 bg-light-surface-variant/60 sm:bg-transparent p-2.5 sm:p-0 rounded sm:rounded-none">
                    <div><span className="text-light-on-surface-variant">رقم البوصلة:</span> <strong>{convoy.convoy_number}</strong></div>
                    <div><span className="text-light-on-surface-variant">تاريخ التحميل:</span> <strong>{convoy.loading_date}</strong></div>
                    <div><span className="text-light-on-surface-variant">إجمالي الشاحنات:</span> <strong>{trucks.length} تريلا</strong></div>
                  </div>
                </div>

                {/* Exact Table Matching docx_table_v2 (Scrollable on mobile, full-width on A4 export/print) */}
                <div className="border border-charcoal rounded-md overflow-hidden mb-6 sm:mb-8">
                  <div className="pdf-table-scroll overflow-x-auto w-full">
                    <table className="w-full min-w-[560px] sm:min-w-0 text-right border-collapse text-body-sm">
                      <thead>
                        <tr className="bg-charcoal text-white font-bold border-b border-charcoal">
                          <th className="py-3 px-2.5 sm:px-3 w-10 sm:w-12 text-center">م</th>
                          <th className="py-3 px-3 sm:px-4">الميناء</th>
                          <th className="py-3 px-3 sm:px-4">الاسم (السائق)</th>
                          <th className="py-3 px-3 sm:px-4">الرقم القومي</th>
                          <th className="py-3 px-3 sm:px-4">سيارة رقم</th>
                          <th className="py-3 px-3 sm:px-4">مقطورة رقم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/20 text-charcoal">
                        {trucks.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-light-gray/60' : ''}>
                            <td className="py-3 px-2.5 sm:px-3 text-center tabular-nums font-bold">{idx + 1}</td>
                            <td className="py-3 px-3 sm:px-4 font-bold text-charcoal whitespace-nowrap">
                              {row.political_destination?.includes('رفح') ? 'ميناء رفح' : 'ميناء العوجة'}
                            </td>
                            <td className="py-3 px-3 sm:px-4 font-bold text-charcoal">{row.driver_name || '—'}</td>
                            <td className="py-3 px-3 sm:px-4 tabular-nums text-light-on-surface-variant whitespace-nowrap">{row.national_id || '—'}</td>
                            <td className="py-3 px-3 sm:px-4 tabular-nums font-bold text-charcoal whitespace-nowrap">{row.truck_plate || '—'}</td>
                            <td className="py-3 px-3 sm:px-4 tabular-nums font-bold text-charcoal whitespace-nowrap">{row.trailer_plate || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Verification Notice */}
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
                      <span className="font-bold text-charcoal block">كشف سائقين وشاحنات معتمد إلكترونياً</span>
                      <span className="text-xs text-light-on-surface-variant">
                        معتمد رسمياً للمرور والجمارك والمنافذ الحدودية لشركة أحمد البيك للاستيراد والتصدير.
                      </span>
                    </div>
                  </div>
                  <div className="pdf-badge-ref text-right sm:text-left font-mono text-xs text-light-on-surface-variant shrink-0">
                    <div>REF: {convoy.convoy_number}-DRV</div>
                    <div>TOTAL: {trucks.length} TRUCKS</div>
                  </div>
                </div>

              </div>

              {/* Bottom Footer */}
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

            <div className="no-print flex flex-wrap items-center justify-center gap-3 sm:gap-4 my-6">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-3 bg-charcoal hover:bg-charcoal/90 text-white rounded-DEFAULT font-label text-label-md flex items-center gap-2 cursor-pointer shadow-sm transition"
              >
                <span className="material-symbols-outlined text-lg">print</span>
                <span>طباعة الكشف</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-8 py-3 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-md font-bold flex items-center gap-2 cursor-pointer shadow-sm transition disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                <span>{isGeneratingPdf ? 'جارٍ التوليد...' : 'تنزيل ملف PDF'}</span>
              </button>
            </div>

          </div>
        )}

      </main>

      <div className="no-print">
        <Footer />
      </div>
    </>
  );
}

