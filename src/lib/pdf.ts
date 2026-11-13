/**
 * Ahmed Elbeek Management System - PDF Generation & WhatsApp Sharing Engine
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from './supabase/client';
import { ConvoyRepository } from './store';
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
      // Capture canvas with 2x scale for crisp print quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        imageTimeout: 15000,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Create A4 PDF (210 x 297 mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Handle multi-page if content exceeds one page
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      // Trigger user download
      pdf.save(options.fileName);

      // Generate blob for Supabase Storage archive
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
    const calc = convoy.calculation;
    const locationName = convoy.location_id === 'rafah' ? 'ميناء رفح' : 'ميناء العوجة';
    const grandTotal = calc ? Math.round(calc.grand_total).toLocaleString('en-US') : '0';
    const nights = calc ? calc.accommodation_nights : '0';

    const message = [
      `*بيان حسابات رسمي — شركة أحمد البيك للاستيراد والتصدير*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 *البضاعة:* ${convoy.cargo_name}`,
      `⚓ *مكان التحميل:* ${locationName}`,
      `🚛 *عدد الشاحنات:* ${convoy.truck_count} شاحنة تريلا`,
      `📅 *تاريخ التحميل:* ${convoy.loading_date}`,
      `🏁 *تاريخ التعتيق:* ${convoy.completion_date || 'جاري'} (${nights} ليالي مبيت)`,
      `💰 *إجمالي المستحق:* ${grandTotal} ج.م`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📄 مستند إلكتروني معتمد رسمياً: ${convoy.convoy_number}`,
      `📞 للاستفسار: 01093313193 | elbeekb2b@gmail.com`,
    ].join('\n');

    const encoded = encodeURIComponent(message);
    const targetPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';

    return targetPhone
      ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
  },
};
