/**
 * Ahmed Elbeek Management System - PDF Generation & WhatsApp Sharing Engine
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from './supabase/client';
import { ConvoyRepository, parseCalculationMeta } from './store';
import type { ConvoyWithDetails } from '@/types/database.types';

export interface PDFExportOptions {
  elementId: string;
  fileName: string;
  convoyId: string;
  documentType: 'statement' | 'drivers_manifest';
  documentNumber: string;
}

export const PDFService = {
  /**
   * Generates a downloadable A4 PDF from a DOM element, preserving exact CSS,
   * Arabic typography, logo, watermark, and corporate layout.
   */
  async generateAndDownloadPDF(options: PDFExportOptions): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    const element = document.getElementById(options.elementId);
    if (!element) {
      return { success: false, error: `العنصر ${options.elementId} غير موجود` };
    }

    try {
      // 1. Wait for document fonts to load completely
      if (typeof document !== 'undefined' && (document as any).fonts) {
        await (document as any).fonts.ready;
      }

      // 2. Ensure all images inside element are fully loaded
      const images = Array.from(element.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // 3. Render element to high-res canvas (PNG)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        imageTimeout: 0,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById(options.elementId);
          if (clonedEl) {
            clonedEl.style.width = '794px';
            clonedEl.style.maxWidth = '794px';
            clonedEl.style.margin = '0 auto';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.border = 'none';
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');

      // 4. Create standard A4 PDF (210 x 297 mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Single-page fit check: if content fits comfortably within ~1 A4 page (up to 8% margin)
      if (imgHeight <= pdfHeight * 1.08) {
        const finalHeight = Math.min(pdfHeight, imgHeight);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, finalHeight, undefined, 'FAST');
      } else {
        // Multi-page document
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 5) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      // 5. Trigger user download
      pdf.save(options.fileName);

      // 6. Generate blob for Supabase Storage archive
      const blob = pdf.output('blob');

      // Async upload to Supabase Storage & save document record
      this.uploadToStorageAndArchive({
        convoyId: options.convoyId,
        fileName: options.fileName,
        documentType: options.documentType,
        documentNumber: options.documentNumber,
        blob,
      }).catch((err) => console.warn('Supabase Storage background upload note:', err));

      return { success: true, blob };
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء توليد ملف الـ PDF' };
    }
  },

  /**
   * Upload to Supabase Storage and link in database
   */
  async uploadToStorageAndArchive(params: {
    convoyId: string;
    fileName: string;
    documentType: 'statement' | 'drivers_manifest';
    documentNumber: string;
    blob: Blob;
  }): Promise<void> {
    const storagePath = `statements/${params.convoyId}/${params.fileName}`;

    try {
      // 1. Upload to Supabase Storage bucket
      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(storagePath, params.blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      let publicUrl: string | null = null;
      if (!uploadError) {
        const { data } = supabase.storage.from('statements').getPublicUrl(storagePath);
        publicUrl = data?.publicUrl || null;
      }

      // 2. Save metadata to issued_documents
      await ConvoyRepository.saveDocument({
        convoy_id: params.convoyId,
        document_type: params.documentType,
        document_number: params.documentNumber,
        file_name: params.fileName,
        storage_path: storagePath,
        file_size_bytes: params.blob.size,
        mime_type: 'application/pdf',
        public_url: publicUrl,
        metadata: { uploaded_at: new Date().toISOString() },
      });
    } catch (e) {
      // Ensure local record is still preserved
      await ConvoyRepository.saveDocument({
        convoy_id: params.convoyId,
        document_type: params.documentType,
        document_number: params.documentNumber,
        file_name: params.fileName,
        storage_path: storagePath,
        file_size_bytes: params.blob.size,
        mime_type: 'application/pdf',
        public_url: null,
      });
    }
  },

  /**
   * WhatsApp sharing link generator with formatted Egyptian commercial text
   */
  getWhatsAppShareUrl(convoy: ConvoyWithDetails, phoneNumber?: string): string {
    const rawCalc = Array.isArray(convoy.calculation)
      ? (convoy.calculation.length > 0 ? convoy.calculation[0] : null)
      : convoy.calculation;
    const calc = parseCalculationMeta(rawCalc);
    const locationName = convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة';
    const nights = calc ? calc.accommodation_nights : '0';
    const demurrage = Number(calc?.port_demurrage) || 0;
    const customItemsList = Array.isArray((calc as any)?.custom_items) ? (calc as any).custom_items : [];

    const customItemsTotal = customItemsList.reduce(
      (acc: number, it: any) => acc + (Number(it?.amount) || 0),
      0
    );
    const grandTotalNum = Math.max(
      Number(calc?.grand_total) || 0,
      (Number(calc?.total_freight) || 0) +
        (Number(calc?.total_accommodation) || 0) +
        (Number(calc?.customs_clearance) || 0) +
        demurrage +
        customItemsTotal
    );
    const grandTotal = Math.round(grandTotalNum).toLocaleString('en-US');

    const lines = [
      `*بيان حسابات رسمي — شركة أحمد البيك للاستيراد والتصدير*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 *البضاعة:* ${convoy.cargo_name}`,
      `⚓ *مكان التحميل:* ${locationName}`,
      `🚛 *عدد الشاحنات:* ${convoy.truck_count} شاحنة تريلا`,
      `📅 *تاريخ التحميل:* ${convoy.loading_date}`,
      `🏁 *تاريخ التعتيق:* ${convoy.completion_date || 'جاري'} (${nights} ليالي مبيت)`,
    ];

    if (demurrage > 0) {
      lines.push(`🏢 *أرضيات مبيت داخل المنفذ:* ${Math.round(demurrage).toLocaleString('en-US')} ج.م`);
    }

    if (customItemsList.length > 0) {
      customItemsList.forEach((ci: any) => {
        if (ci.name || ci.amount > 0) {
          lines.push(`➕ *${ci.name || 'بند إضافي'}:* ${Math.round(Number(ci.amount) || 0).toLocaleString('en-US')} ج.م`);
        }
      });
    }

    lines.push(
      `💰 *إجمالي المستحق:* ${grandTotal} ج.م`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📄 مستند إلكتروني معتمد رسمياً: ${convoy.convoy_number}`,
      `📞 للاستفسار: 01093313193 | elbeekb2b@gmail.com`
    );

    const encoded = encodeURIComponent(lines.join('\n'));
    const targetPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';

    return targetPhone
      ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
  },
};

