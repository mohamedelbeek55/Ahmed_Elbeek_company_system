'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import { PDFService } from '@/lib/pdf';
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
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-body-sm text-light-on-surface-variant">
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
              className="px-4 py-2 border border-outline hover:bg-light-surface-variant text-charcoal rounded-DEFAULT font-label text-label-md flex items-center gap-2 font-bold transition"
            >
              <span className="material-symbols-outlined text-lg">
                {previewPdfMode ? 'edit_note' : 'preview'}
              </span>
              <span>{previewPdfMode ? 'العودة لنموذج التعديل' : 'معاينة ورقة الطباعة A4'}</span>
            </button>
          </div>
        </div>

        {/* Convoy Summary Bar */}
        <div className="bg-light-surface border-2 border-primary/20 rounded-xl p-5 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 border border-outline hover:bg-light-surface-variant text-charcoal rounded-DEFAULT font-label text-label-md font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              <span>{isSaving ? 'جارٍ الحفظ...' : saveSuccess ? 'تم الحفظ ✓' : 'حفظ التعديلات'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-6 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary rounded-DEFAULT font-label text-label-md font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{isGeneratingPdf ? 'جارٍ التوليد...' : 'تنزيل كشف PDF'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Editable Form Mode */}
        {!previewPdfMode ? (
          <div className="bg-light-surface border border-outline rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-light-gray">
              <div>
                <h3 className="font-headline text-headline-md font-bold text-charcoal flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  <span>كشف بيانات السائقين والسيارات المعتمد</span>
                </h3>
                <p className="font-body text-body-sm text-light-on-surface-variant">
                  مطابق للنموذج الرسمي (الميناء، الاسم، الرقم القومي، سيارة رقم، مقطورة رقم).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddTruck}
                className="px-4 py-2 bg-light-surface-variant hover:bg-pale-red text-charcoal hover:text-primary border border-outline rounded-DEFAULT font-label text-label-sm font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg text-primary">add</span>
                <span>إضافة شاحنة جديدة للكشف</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-outline rounded-lg">
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

            <div className="flex items-center justify-between pt-6 border-t border-light-gray mt-6">
              <Link
                href={`/convoys/${convoy.id}`}
                className="px-6 py-2.5 border border-outline text-charcoal hover:bg-light-surface-variant font-label text-label-md rounded-DEFAULT transition"
              >
                الرجوع لتفاصيل القافلة
              </Link>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-charcoal hover:bg-charcoal/90 text-white font-label text-label-md rounded-DEFAULT transition cursor-pointer"
                >
                  {isSaving ? 'جارٍ الحفظ...' : 'حفظ الكشف'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPdfMode(true)}
                  className="px-6 py-2.5 bg-primary hover:bg-opacity-95 text-on-primary font-label text-label-md font-bold rounded-DEFAULT shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  <span>معاينة ورقة الـ PDF المعتمدة</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: PDF Sheet Preview Mode */
          <div className="flex flex-col items-center">
            
            <article
              id="official-drivers-manifest-sheet"
              className="a4-sheet p-8 sm:p-14 border border-outline/50 flex flex-col justify-between overflow-hidden relative bg-white my-4 shadow-xl"
            >
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] z-0 select-none">
                <Image
                  src="/logo.png"
                  alt="Watermark"
                  width={450}
                  height={450}
                  className="object-contain"
                />
              </div>

              <div className="relative z-10">
                
                {/* Official Centered Header */}
                <div className="flex flex-col items-center justify-center mb-5">
                  <div className="w-28 h-28 relative flex items-center justify-center">
                    <Image
                      src="/logo.png"
                      alt="Logo"
                      width={112}
                      height={112}
                      priority
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Corporate Red Divider Line */}
                <div className="w-full h-[2.5px] bg-primary mb-6"></div>

                {/* Sheet Metadata */}
                <div className="flex items-end justify-between mb-6 pb-2 text-body-sm text-charcoal">
                  <div>
                    <h2 className="font-headline text-headline-md font-bold text-charcoal mb-1">
                      كشف سيارات وسائقي القافلة المعتمد
                    </h2>
                    <p className="text-body-sm text-light-on-surface-variant font-medium">
                      بضاعة: <strong className="text-primary">{convoy.cargo_name}</strong> | مكان التحميل:{' '}
                      <strong className="text-charcoal">{convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة'}</strong>
                    </p>
                  </div>
                  <div className="text-left font-body tabular-nums space-y-0.5">
                    <div><span className="text-light-on-surface-variant">رقم البوصلة:</span> <strong>{convoy.convoy_number}</strong></div>
                    <div><span className="text-light-on-surface-variant">تاريخ التحميل:</span> <strong>{convoy.loading_date}</strong></div>
                    <div><span className="text-light-on-surface-variant">إجمالي الشاحنات:</span> <strong>{trucks.length} تريلا</strong></div>
                  </div>
                </div>

                {/* Exact Table Matching docx_table_v2 */}
                <div className="border border-charcoal rounded-md overflow-hidden mb-8">
                  <table className="w-full text-right border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-charcoal text-white font-bold border-b border-charcoal">
                        <th className="py-3 px-3 w-12 text-center">م</th>
                        <th className="py-3 px-4">الميناء</th>
                        <th className="py-3 px-4">الاسم (السائق)</th>
                        <th className="py-3 px-4">الرقم القومي</th>
                        <th className="py-3 px-4">سيارة رقم</th>
                        <th className="py-3 px-4">مقطورة رقم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/20 text-charcoal">
                      {trucks.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-light-gray/60' : ''}>
                          <td className="py-3 px-3 text-center tabular-nums font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-charcoal">
                            {row.political_destination?.includes('رفح') ? 'ميناء رفح' : 'ميناء العوجة'}
                          </td>
                          <td className="py-3 px-4 font-bold text-charcoal">{row.driver_name || '—'}</td>
                          <td className="py-3 px-4 tabular-nums text-light-on-surface-variant">{row.national_id || '—'}</td>
                          <td className="py-3 px-4 tabular-nums font-bold text-charcoal">{row.truck_plate || '—'}</td>
                          <td className="py-3 px-4 tabular-nums font-bold text-charcoal">{row.trailer_plate || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Verification Notice */}
                <div className="border border-outline/70 bg-light-surface-variant/40 p-4 rounded-md flex items-center justify-between text-body-sm mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">verified_user</span>
                    <div>
                      <span className="font-bold text-charcoal block">كشف سائقين وشاحنات معتمد إلكترونياً</span>
                      <span className="text-xs text-light-on-surface-variant">
                        معتمد رسمياً للمرور والجمارك والمنافذ الحدودية لشركة أحمد البيك للاستيراد والتصدير.
                      </span>
                    </div>
                  </div>
                  <div className="text-left font-mono text-xs text-light-on-surface-variant shrink-0">
                    <div>REF: {convoy.convoy_number}-DRV</div>
                    <div>TOTAL: {trucks.length} TRUCKS</div>
                  </div>
                </div>

              </div>

              {/* Bottom Footer */}
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

            <div className="flex items-center gap-4 my-6">
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

      <Footer />
    </>
  );
}

