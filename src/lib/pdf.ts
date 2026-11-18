/**
 * Ahmed Elbeek Management System - PDF Generation & WhatsApp Sharing Engine
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from './supabase/client';
import { ConvoyRepository, parseCalculationMeta } from './store';
import { getRasterizedPdfIcons, type PdfIconKey } from './pdf-icons';
import type { ConvoyWithDetails } from '@/types/database.types';

export interface PDFExportOptions {
  elementId: string;
  fileName: string;
  convoyId: string;
  documentType: 'statement' | 'drivers_manifest';
  documentNumber: string;
}

const A4_CAPTURE_WIDTH_PX = 794;
const A4_CAPTURE_MIN_HEIGHT_PX = 1120;
const A4_CAPTURE_SCALE = 2;

let cachedInlinedFontCss: string | null = null;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches Google Fonts Cairo stylesheet and inlines its WOFF2 font files as Base64 data URIs.
 * Required so browser-native SVG <foreignObject> rendering preserves the exact Cairo Arabic font
 * without external network requests (which browsers block inside SVG <img> for security).
 */
async function getInlinedCairoFontCss(): Promise<string> {
  if (cachedInlinedFontCss !== null) return cachedInlinedFontCss;

  try {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
    const cairoLink = links.find((l) => l.href && l.href.includes('fonts.googleapis.com') && l.href.includes('Cairo'));
    const fontCssUrl =
      cairoLink?.href ||
      'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap';

    const cssResp = await fetch(fontCssUrl);
    if (!cssResp.ok) return '';
    let cssText = await cssResp.text();

    // Find all unique font file URLs (woff2/ttf) inside @font-face rules
    const urlMatches = Array.from(cssText.matchAll(/url\((['"]?)(https:\/\/[^)'"]+)\1\)/g));
    const uniqueUrls = Array.from(new Set(urlMatches.map((m) => m[2])));

    const urlToDataUri = new Map<string, string>();
    await Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) return;
          const blob = await resp.blob();
          const dataUrl = await blobToDataUrl(blob);
          if (dataUrl) urlToDataUri.set(url, dataUrl);
        } catch {
          // Skip individual font subset if unreachable
        }
      })
    );

    urlToDataUri.forEach((dataUrl, origUrl) => {
      cssText = cssText.split(origUrl).join(dataUrl);
    });

    if (urlToDataUri.size > 0) {
      cachedInlinedFontCss = cssText;
      return cssText;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Collects all same-origin CSS rules currently active on the page (Tailwind + globals.css).
 */
function collectDocumentCss(): string {
  const chunks: string[] = [':root { --font-cairo: "Cairo", sans-serif; }'];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        chunks.push(rule.cssText);
      }
    } catch {
      // Cross-origin stylesheet (Google Fonts handled via getInlinedCairoFontCss)
    }
  }
  return chunks.join('\n');
}

/**
 * Renders the preview DOM element to a high-DPI canvas using the browser's native
 * layout and text-shaping engine (SVG <foreignObject> + inlined Cairo fonts + PNG icons).
 * Matches the on-screen PDF Preview pixel-for-pixel, eliminating html2canvas Arabic
 * baseline drift and pill/icon vertical misalignment.
 */
async function captureElementWithNativeEngine(
  element: HTMLElement,
  rasterizedIcons: Record<PdfIconKey, string>
): Promise<HTMLCanvasElement> {
  const [inlinedFontCss, documentCss] = await Promise.all([
    getInlinedCairoFontCss(),
    Promise.resolve(collectDocumentCss()),
  ]);

  if (!inlinedFontCss) {
    throw new Error('Cairo font CSS could not be inlined for native SVG capture');
  }

  // Clone the preview DOM node so the visible page is never disturbed
  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.add('pdf-export-mode');
  clone.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
  clone.style.minWidth = `${A4_CAPTURE_WIDTH_PX}px`;
  clone.style.maxWidth = `${A4_CAPTURE_WIDTH_PX}px`;
  clone.style.minHeight = `${A4_CAPTURE_MIN_HEIGHT_PX}px`;
  clone.style.height = 'auto';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.backgroundColor = '#FFFFFF';

  // Swap icon <img> elements to pre-rasterized 4x crisp PNG data URIs
  const iconImgs = Array.from(clone.querySelectorAll<HTMLImageElement>('img[data-pdf-icon]'));
  iconImgs.forEach((imgEl) => {
    const iconKey = imgEl.getAttribute('data-pdf-icon') as PdfIconKey | null;
    if (iconKey && rasterizedIcons[iconKey]) {
      imgEl.setAttribute('src', rasterizedIcons[iconKey]);
    }
  });

  // Measure true rendered A4 height in an offscreen container at exact 794px width
  const measureHost = document.createElement('div');
  measureHost.setAttribute('dir', 'rtl');
  measureHost.setAttribute('lang', 'ar');
  measureHost.style.position = 'fixed';
  measureHost.style.left = '-99999px';
  measureHost.style.top = '0';
  measureHost.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
  measureHost.style.visibility = 'hidden';
  measureHost.style.pointerEvents = 'none';
  measureHost.style.zIndex = '-1';
  measureHost.appendChild(clone);
  document.body.appendChild(measureHost);

  const measuredHeight = Math.max(
    A4_CAPTURE_MIN_HEIGHT_PX,
    Math.ceil(clone.getBoundingClientRect().height)
  );
  document.body.removeChild(measureHost);

  // Build self-contained XHTML SVG <foreignObject>
  const svgNS = 'http://www.w3.org/2000/svg';
  const xhtmlNS = 'http://www.w3.org/1999/xhtml';

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('xmlns', svgNS);
  svg.setAttribute('width', String(A4_CAPTURE_WIDTH_PX));
  svg.setAttribute('height', String(measuredHeight));
  svg.setAttribute('viewBox', `0 0 ${A4_CAPTURE_WIDTH_PX} ${measuredHeight}`);

  const styleEl = document.createElementNS(svgNS, 'style');
  styleEl.textContent = `${inlinedFontCss}\n${documentCss}`;
  svg.appendChild(styleEl);

  const foreignObject = document.createElementNS(svgNS, 'foreignObject');
  foreignObject.setAttribute('x', '0');
  foreignObject.setAttribute('y', '0');
  foreignObject.setAttribute('width', '100%');
  foreignObject.setAttribute('height', '100%');

  const xhtmlWrapper = document.createElementNS(xhtmlNS, 'div');
  xhtmlWrapper.setAttribute('xmlns', xhtmlNS);
  xhtmlWrapper.setAttribute('dir', 'rtl');
  xhtmlWrapper.setAttribute('lang', 'ar');
  xhtmlWrapper.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
  xhtmlWrapper.style.minHeight = `${measuredHeight}px`;
  xhtmlWrapper.style.backgroundColor = '#FFFFFF';
  xhtmlWrapper.style.color = '#262626';
  xhtmlWrapper.style.fontFamily = '"Cairo", sans-serif';
  xhtmlWrapper.style.direction = 'rtl';
  xhtmlWrapper.style.textAlign = 'right';
  xhtmlWrapper.appendChild(clone);

  foreignObject.appendChild(xhtmlWrapper);
  svg.appendChild(foreignObject);

  const serializedSvg = new XMLSerializer().serializeToString(svg);
  const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializedSvg)}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = svgDataUri;
  });

  const canvas = document.createElement('canvas');
  canvas.width = A4_CAPTURE_WIDTH_PX * A4_CAPTURE_SCALE;
  canvas.height = measuredHeight * A4_CAPTURE_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(A4_CAPTURE_SCALE, A4_CAPTURE_SCALE);
  ctx.drawImage(img, 0, 0, A4_CAPTURE_WIDTH_PX, measuredHeight);

  // Verify canvas is readable (not tainted)
  canvas.toDataURL('image/png');
  return canvas;
}

export const PDFService = {
  /**
   * Generates a downloadable A4 PDF from a DOM element, preserving exact CSS,
   * Arabic typography, logo, watermark, icons, and corporate layout.
   */
  async generateAndDownloadPDF(options: PDFExportOptions): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    const element = document.getElementById(options.elementId);
    if (!element) {
      return { success: false, error: `العنصر ${options.elementId} غير موجود` };
    }

    let fontMetricsFixStyle: HTMLStyleElement | null = null;

    try {
      // 1. Wait for document fonts to load completely
      if (typeof document !== 'undefined' && (document as any).fonts) {
        await (document as any).fonts.ready;
      }

      // 2. Pre-rasterize all PDF vector icons to crisp 4x PNG data URIs
      const rasterizedIcons = await getRasterizedPdfIcons();

      // 3. Ensure all images inside element are fully loaded
      const images = Array.from(element.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // 4. Primary capture: browser-native SVG <foreignObject> renderer with inlined Cairo fonts.
      //    Produces a pixel-for-pixel match to the PDF Preview (exact Arabic RTL, icons, badges, spacing).
      //    Falls back cleanly to html2canvas if fonts are offline or browser blocks foreignObject.
      let canvas: HTMLCanvasElement;
      try {
        canvas = await captureElementWithNativeEngine(element, rasterizedIcons);
      } catch (nativeErr) {
        console.warn('Native PDF capture fallback to html2canvas:', nativeErr);

        // Fix html2canvas FontMetrics bug caused by Tailwind Preflight (`img { display: block }`)
        fontMetricsFixStyle = document.createElement('style');
        fontMetricsFixStyle.id = 'h2c-font-metrics-fix';
        fontMetricsFixStyle.textContent =
          'body > div > img[width="1"][height="1"] { display: inline !important; }';
        document.head.appendChild(fontMetricsFixStyle);

        canvas = await html2canvas(element, {
          scale: A4_CAPTURE_SCALE,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FFFFFF',
          logging: false,
          imageTimeout: 0,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1280,
          windowHeight: 1123,
          onclone: async (clonedDoc) => {
            const cloneFixStyle = clonedDoc.createElement('style');
            cloneFixStyle.textContent =
              'body > div > img[width="1"][height="1"] { display: inline !important; }';
            clonedDoc.head.appendChild(cloneFixStyle);

            if (clonedDoc.documentElement) {
              clonedDoc.documentElement.style.width = '1280px';
              clonedDoc.documentElement.style.height = 'auto';
              clonedDoc.documentElement.style.minHeight = '0';
              clonedDoc.documentElement.style.overflow = 'visible';
            }
            if (clonedDoc.body) {
              clonedDoc.body.style.width = '1280px';
              clonedDoc.body.style.height = 'auto';
              clonedDoc.body.style.minHeight = '0';
              clonedDoc.body.style.display = 'block';
              clonedDoc.body.style.margin = '0';
              clonedDoc.body.style.padding = '0';
              clonedDoc.body.style.overflow = 'visible';
            }

            const clonedEl = clonedDoc.getElementById(options.elementId);
            if (clonedEl) {
              let parent = clonedEl.parentElement;
              while (parent && parent !== clonedDoc.body) {
                parent.style.display = 'block';
                parent.style.width = '100%';
                parent.style.maxWidth = 'none';
                parent.style.height = 'auto';
                parent.style.minHeight = '0';
                parent.style.padding = '0';
                parent.style.margin = '0';
                parent.style.overflow = 'visible';
                parent.style.transform = 'none';
                parent = parent.parentElement;
              }

              clonedEl.classList.add('pdf-export-mode');
              clonedEl.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
              clonedEl.style.minWidth = `${A4_CAPTURE_WIDTH_PX}px`;
              clonedEl.style.maxWidth = `${A4_CAPTURE_WIDTH_PX}px`;
              clonedEl.style.minHeight = `${A4_CAPTURE_MIN_HEIGHT_PX}px`;
              clonedEl.style.height = 'auto';
              clonedEl.style.margin = '0 auto';
              clonedEl.style.boxShadow = 'none';
              clonedEl.style.border = 'none';

              const iconImgs = Array.from(
                clonedEl.querySelectorAll<HTMLImageElement>('img[data-pdf-icon]')
              );
              await Promise.all(
                iconImgs.map((imgEl) => {
                  const iconKey = imgEl.getAttribute('data-pdf-icon') as PdfIconKey | null;
                  if (!iconKey || !rasterizedIcons[iconKey]) return Promise.resolve();
                  return new Promise<void>((resolve) => {
                    imgEl.onload = () => resolve();
                    imgEl.onerror = () => resolve();
                    imgEl.src = rasterizedIcons[iconKey];
                    if (imgEl.complete && imgEl.naturalWidth > 0) {
                      resolve();
                    }
                  });
                })
              );
            }
          },
        });
      }

      const imgData = canvas.toDataURL('image/png');

      // 6. Create standard A4 PDF (210 x 297 mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Single-page fit check: if content fits within ~1 A4 page (up to 6% tolerance),
      // scale BOTH dimensions proportionally so aspect ratio is never distorted.
      if (imgHeight <= pdfHeight * 1.06) {
        if (imgHeight <= pdfHeight) {
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        } else {
          const ratio = pdfHeight / imgHeight;
          const scaledWidth = imgWidth * ratio;
          const xOffset = (pdfWidth - scaledWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, pdfHeight, undefined, 'FAST');
        }
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

      // 7. Trigger user download
      pdf.save(options.fileName);

      // 8. Generate blob for Supabase Storage archive
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
    } finally {
      if (fontMetricsFixStyle && fontMetricsFixStyle.parentNode) {
        fontMetricsFixStyle.parentNode.removeChild(fontMetricsFixStyle);
      }
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

