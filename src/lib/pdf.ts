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
 * Inlined critical styles for the canonical A4 PDF export.
 * Guarantees that even if external stylesheets fail to load (e.g. mobile browsers,
 * CORS restrictions, or slow connections), the PDF export will ALWAYS render with
 * exact corporate colors, 4-column layout, 128px logo, 420px watermark, and unclipped tables.
 */
function getCriticalPdfExportCss(): string {
  return `
    :root { --font-cairo: "Cairo", sans-serif; }
    * { box-sizing: border-box; }
    .pdf-export-mode {
      width: ${A4_CAPTURE_WIDTH_PX}px !important;
      min-width: ${A4_CAPTURE_WIDTH_PX}px !important;
      max-width: ${A4_CAPTURE_WIDTH_PX}px !important;
      min-height: ${A4_CAPTURE_MIN_HEIGHT_PX}px !important;
      height: auto !important;
      padding: 48px !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      overflow: visible !important;
      background-color: #FFFFFF !important;
      color: #262626 !important;
      font-family: var(--font-cairo) !important;
      direction: rtl !important;
      text-align: right !important;
      box-sizing: border-box !important;
    }
    .pdf-export-mode .pdf-watermark-img {
      width: 420px !important;
      height: 420px !important;
      max-width: none !important;
    }
    .pdf-export-mode .pdf-logo-box {
      width: 128px !important;
      height: 128px !important;
      min-width: 128px !important;
      min-height: 128px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .pdf-export-mode .pdf-logo-img {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
    }
    .pdf-export-mode .pdf-title {
      font-size: 20px !important;
      line-height: 28px !important;
      font-weight: 700 !important;
      color: #800000 !important;
    }
    .pdf-export-mode .pdf-header-row {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-end !important;
      justify-content: space-between !important;
      gap: 16px !important;
    }
    .pdf-export-mode .pdf-header-dates {
      text-align: left !important;
      background-color: transparent !important;
      padding: 0 !important;
    }
    .pdf-export-mode .pdf-bar-row {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
    }
    .pdf-export-mode .pdf-params-grid {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 16px !important;
    }
    .pdf-export-mode .pdf-table-scroll {
      overflow: visible !important;
      width: 100% !important;
    }
    .pdf-export-mode .pdf-table-scroll table {
      width: 100% !important;
      min-width: 100% !important;
      table-layout: auto !important;
    }
    .pdf-export-mode .pdf-total-bar {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
    }
    .pdf-export-mode .pdf-total-amount {
      font-size: 32px !important;
      line-height: 36px !important;
      font-weight: 700 !important;
    }
    .pdf-export-mode .pdf-badge-row {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 16px !important;
    }
    .pdf-export-mode .pdf-badge-ref {
      text-align: left !important;
    }
    .pdf-export-mode .pdf-footer-row {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 24px !important;
    }
    .pdf-export-mode .pdf-footer-sep {
      display: inline !important;
    }
    .pdf-export-mode .pdf-icon-img {
      display: inline-block !important;
      flex-shrink: 0 !important;
      vertical-align: middle !important;
      object-fit: contain !important;
      max-width: none !important;
    }
  `;
}

/**
 * Collects all same-origin CSS rules currently active on the page (Tailwind + globals.css).
 */
function collectDocumentCss(): string {
  const chunks: string[] = [getCriticalPdfExportCss()];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        chunks.push(rule.cssText);
      }
    } catch {
      // Cross-origin stylesheet
    }
  }
  return chunks.join('\n');
}

/**
 * Transforms an on-screen DOM node into a canonical desktop A4 element.
 * Enforces explicit inline styles on every child element so that mobile media queries
 * (e.g. sm:flex-row, sm:grid-cols-4, sm:w-32) NEVER downgrade or break the layout
 * on mobile devices.
 */
function prepareCanonicalA4Element(
  sourceElement: HTMLElement,
  rasterizedIcons: Record<PdfIconKey, string>
): HTMLElement {
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.classList.add('pdf-export-mode');

  // Enforce root canonical A4 styles
  clone.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
  clone.style.minWidth = `${A4_CAPTURE_WIDTH_PX}px`;
  clone.style.maxWidth = `${A4_CAPTURE_WIDTH_PX}px`;
  clone.style.minHeight = `${A4_CAPTURE_MIN_HEIGHT_PX}px`;
  clone.style.height = 'auto';
  clone.style.padding = '48px';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.backgroundColor = '#FFFFFF';
  clone.style.color = '#262626';
  clone.style.fontFamily = '"Cairo", sans-serif';
  clone.style.direction = 'rtl';
  clone.style.textAlign = 'right';
  clone.style.boxSizing = 'border-box';

  // 1. Watermark image
  const watermarkImg = clone.querySelector<HTMLElement>('.pdf-watermark-img');
  if (watermarkImg) {
    watermarkImg.style.width = '420px';
    watermarkImg.style.height = '420px';
    watermarkImg.style.maxWidth = 'none';
  }

  // 2. Logo container & img
  const logoBox = clone.querySelector<HTMLElement>('.pdf-logo-box');
  if (logoBox) {
    logoBox.style.width = '128px';
    logoBox.style.height = '128px';
    logoBox.style.minWidth = '128px';
    logoBox.style.minHeight = '128px';
    logoBox.style.display = 'flex';
    logoBox.style.alignItems = 'center';
    logoBox.style.justifyContent = 'center';
  }
  const logoImg = clone.querySelector<HTMLElement>('.pdf-logo-img');
  if (logoImg) {
    logoImg.style.width = '100%';
    logoImg.style.height = '100%';
    logoImg.style.objectFit = 'contain';
  }

  // 3. Header row
  const headerRow = clone.querySelector<HTMLElement>('.pdf-header-row');
  if (headerRow) {
    headerRow.style.display = 'flex';
    headerRow.style.flexDirection = 'row';
    headerRow.style.alignItems = 'flex-end';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.gap = '16px';
  }

  // 4. Header dates
  const headerDates = clone.querySelector<HTMLElement>('.pdf-header-dates');
  if (headerDates) {
    headerDates.style.textAlign = 'left';
    headerDates.style.backgroundColor = 'transparent';
    headerDates.style.padding = '0';
  }

  // 5. Title
  const title = clone.querySelector<HTMLElement>('.pdf-title');
  if (title) {
    title.style.fontSize = '20px';
    title.style.lineHeight = '28px';
    title.style.fontWeight = '700';
    title.style.color = '#800000';
  }

  // 6. Bar row
  const barRow = clone.querySelector<HTMLElement>('.pdf-bar-row');
  if (barRow) {
    barRow.style.display = 'flex';
    barRow.style.flexDirection = 'row';
    barRow.style.alignItems = 'center';
    barRow.style.justifyContent = 'space-between';
    barRow.style.gap = '12px';
  }

  // 7. Parameters grid
  const paramsGrid = clone.querySelector<HTMLElement>('.pdf-params-grid');
  if (paramsGrid) {
    paramsGrid.style.display = 'grid';
    paramsGrid.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
    paramsGrid.style.gap = '16px';
  }

  // 8. Table & Scroll container
  const tableScroll = clone.querySelector<HTMLElement>('.pdf-table-scroll');
  if (tableScroll) {
    tableScroll.style.overflow = 'visible';
    tableScroll.style.width = '100%';
  }
  const table = clone.querySelector<HTMLElement>('.pdf-table-scroll table');
  if (table) {
    table.style.width = '100%';
    table.style.minWidth = '100%';
    table.style.tableLayout = 'auto';
  }

  // 9. Total bar
  const totalBar = clone.querySelector<HTMLElement>('.pdf-total-bar');
  if (totalBar) {
    totalBar.style.display = 'flex';
    totalBar.style.flexDirection = 'row';
    totalBar.style.alignItems = 'center';
    totalBar.style.justifyContent = 'space-between';
    totalBar.style.gap = '12px';
  }
  const totalAmount = clone.querySelector<HTMLElement>('.pdf-total-amount');
  if (totalAmount) {
    totalAmount.style.fontSize = '32px';
    totalAmount.style.lineHeight = '36px';
    totalAmount.style.fontWeight = '700';
  }

  // 10. Badge row
  const badgeRow = clone.querySelector<HTMLElement>('.pdf-badge-row');
  if (badgeRow) {
    badgeRow.style.display = 'flex';
    badgeRow.style.flexDirection = 'row';
    badgeRow.style.alignItems = 'center';
    badgeRow.style.justifyContent = 'space-between';
    badgeRow.style.gap = '16px';
  }
  const badgeRef = clone.querySelector<HTMLElement>('.pdf-badge-ref');
  if (badgeRef) {
    badgeRef.style.textAlign = 'left';
  }

  // 11. Footer row & separator
  const footerRow = clone.querySelector<HTMLElement>('.pdf-footer-row');
  if (footerRow) {
    footerRow.style.display = 'flex';
    footerRow.style.flexDirection = 'row';
    footerRow.style.flexWrap = 'nowrap';
    footerRow.style.alignItems = 'center';
    footerRow.style.justifyContent = 'center';
    footerRow.style.gap = '24px';
  }
  const footerSep = clone.querySelector<HTMLElement>('.pdf-footer-sep');
  if (footerSep) {
    footerSep.style.display = 'inline';
  }

  // 12. Swap all icons to pre-rasterized 4x crisp PNG data URIs
  const iconImgs = Array.from(clone.querySelectorAll<HTMLImageElement>('img[data-pdf-icon]'));
  iconImgs.forEach((imgEl) => {
    const iconKey = imgEl.getAttribute('data-pdf-icon') as PdfIconKey | null;
    if (iconKey && rasterizedIcons[iconKey]) {
      imgEl.setAttribute('src', rasterizedIcons[iconKey]);
      imgEl.style.display = 'inline-block';
      imgEl.style.verticalAlign = 'middle';
      imgEl.style.objectFit = 'contain';
      imgEl.style.flexShrink = '0';
      imgEl.style.maxWidth = 'none';
    }
  });

  return clone;
}

/**
 * Renders the canonical A4 element to a high-DPI canvas using browser-native SVG <foreignObject>.
 * Uses inlined Cairo fonts and pre-rasterized 4x PNG icons.
 */
async function captureElementWithNativeEngine(
  canonicalClone: HTMLElement,
  measuredHeight: number
): Promise<HTMLCanvasElement> {
  const [inlinedFontCss, documentCss] = await Promise.all([
    getInlinedCairoFontCss(),
    Promise.resolve(collectDocumentCss()),
  ]);

  if (!inlinedFontCss) {
    throw new Error('Cairo font CSS could not be inlined for native SVG capture');
  }

  const svgTarget = canonicalClone.cloneNode(true) as HTMLElement;

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
  xhtmlWrapper.appendChild(svgTarget);

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

  // Verify canvas is readable (not tainted by Safari/WebKit)
  canvas.toDataURL('image/png');
  return canvas;
}

export interface PDFGenerationResult {
  success: boolean;
  blob?: Blob;
  file?: File;
  error?: string;
}

export interface PDFShareResult {
  supported: boolean;
  shared: boolean;
  cancelled?: boolean;
  blob?: Blob;
  file?: File;
  error?: string;
}

export const PDFService = {
  /**
   * Session cache for the last generated PDF to preserve browser user activation
   * for the Web Share API and eliminate redundant rendering.
   */
  _lastGeneratedPDF: null as {
    elementId: string;
    fileName: string;
    blob: Blob;
    file: File;
    timestamp: number;
  } | null,

  /**
   * Generates a downloadable A4 PDF from a DOM element as a Blob and File object,
   * preserving exact CSS, Arabic typography, logo, watermark, icons, and corporate layout.
   * If triggerDownload is true, triggers browser download to disk.
   */
  async generatePDF(
    options: PDFExportOptions,
    triggerDownload: boolean = true
  ): Promise<PDFGenerationResult> {
    const element = document.getElementById(options.elementId);
    if (!element) {
      return { success: false, error: `العنصر ${options.elementId} غير موجود` };
    }

    // Check if we already have a freshly generated PDF for this exact element and filename (< 60s)
    if (
      this._lastGeneratedPDF &&
      this._lastGeneratedPDF.elementId === options.elementId &&
      this._lastGeneratedPDF.fileName === options.fileName &&
      Date.now() - this._lastGeneratedPDF.timestamp < 60000
    ) {
      if (triggerDownload) {
        const url = URL.createObjectURL(this._lastGeneratedPDF.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = options.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      return {
        success: true,
        blob: this._lastGeneratedPDF.blob,
        file: this._lastGeneratedPDF.file,
      };
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

      // 4. Prepare canonical A4 clone with forced desktop styles (eliminates all mobile viewport differences)
      const canonicalElement = prepareCanonicalA4Element(element, rasterizedIcons);

      // Mount into an offscreen desktop host to accurately measure height and render
      const renderHost = document.createElement('div');
      renderHost.id = 'pdf-export-host';
      renderHost.setAttribute('dir', 'rtl');
      renderHost.setAttribute('lang', 'ar');
      renderHost.style.position = 'fixed';
      renderHost.style.left = '0';
      renderHost.style.top = '0';
      renderHost.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
      renderHost.style.zIndex = '-99999';
      renderHost.style.opacity = '1';
      renderHost.style.pointerEvents = 'none';
      renderHost.appendChild(canonicalElement);
      document.body.appendChild(renderHost);

      const measuredHeight = Math.max(
        A4_CAPTURE_MIN_HEIGHT_PX,
        Math.ceil(canonicalElement.getBoundingClientRect().height)
      );

      // 5. Primary capture: browser-native SVG <foreignObject> renderer with inlined Cairo fonts.
      //    Produces a pixel-for-pixel match to the PDF Preview (exact Arabic RTL, icons, badges, spacing).
      //    Falls back cleanly to html2canvas on mobile Safari/WebKit or if Cairo font cannot be inlined.
      let canvas: HTMLCanvasElement;
      try {
        canvas = await captureElementWithNativeEngine(canonicalElement, measuredHeight);
      } catch (nativeErr) {
        console.warn('Native PDF capture fallback to html2canvas:', nativeErr);

        // Fix html2canvas FontMetrics bug caused by Tailwind Preflight (`img { display: block }`)
        fontMetricsFixStyle = document.createElement('style');
        fontMetricsFixStyle.id = 'h2c-font-metrics-fix';
        fontMetricsFixStyle.textContent =
          'body > div > img[width="1"][height="1"] { display: inline !important; }';
        document.head.appendChild(fontMetricsFixStyle);

        const documentCss = collectDocumentCss();

        canvas = await html2canvas(canonicalElement, {
          scale: A4_CAPTURE_SCALE,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FFFFFF',
          logging: false,
          imageTimeout: 0,
          scrollX: 0,
          scrollY: 0,
          width: A4_CAPTURE_WIDTH_PX,
          height: measuredHeight,
          windowWidth: A4_CAPTURE_WIDTH_PX,
          windowHeight: measuredHeight,
          x: 0,
          y: 0,
          onclone: async (clonedDoc) => {
            // 1. Inject inlined critical styles and collected document CSS
            const criticalStyle = clonedDoc.createElement('style');
            criticalStyle.textContent = `${getCriticalPdfExportCss()}\n${documentCss}`;
            clonedDoc.head.appendChild(criticalStyle);

            // 2. Fix html2canvas FontMetrics bug
            const cloneFixStyle = clonedDoc.createElement('style');
            cloneFixStyle.textContent =
              'body > div > img[width="1"][height="1"] { display: inline !important; }';
            clonedDoc.head.appendChild(cloneFixStyle);

            if (clonedDoc.documentElement) {
              clonedDoc.documentElement.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
              clonedDoc.documentElement.style.height = 'auto';
              clonedDoc.documentElement.style.overflow = 'visible';
            }
            if (clonedDoc.body) {
              clonedDoc.body.style.width = `${A4_CAPTURE_WIDTH_PX}px`;
              clonedDoc.body.style.height = 'auto';
              clonedDoc.body.style.display = 'block';
              clonedDoc.body.style.margin = '0';
              clonedDoc.body.style.padding = '0';
              clonedDoc.body.style.overflow = 'visible';
            }

            const clonedHost = clonedDoc.getElementById('pdf-export-host');
            if (clonedHost) {
              clonedHost.style.position = 'static';
              clonedHost.style.left = '0';
              clonedHost.style.top = '0';
              clonedHost.style.visibility = 'visible';
              clonedHost.style.opacity = '1';
            }
          },
        });
      } finally {
        if (renderHost && renderHost.parentNode) {
          renderHost.parentNode.removeChild(renderHost);
        }
      }

      const imgData = canvas.toDataURL('image/png');

      // 5. Create standard A4 PDF (210 x 297 mm)
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

      // 6. Optional browser download trigger
      if (triggerDownload) {
        pdf.save(options.fileName);
      }

      // 7. Generate Blob and File objects
      const blob = pdf.output('blob');
      const file = typeof File !== 'undefined'
        ? new File([blob], options.fileName, { type: 'application/pdf', lastModified: Date.now() })
        : undefined;

      // Cache the result for subsequent instant downloads or Web Share actions
      if (file) {
        this._lastGeneratedPDF = {
          elementId: options.elementId,
          fileName: options.fileName,
          blob,
          file,
          timestamp: Date.now(),
        };
      }

      // Async upload to Supabase Storage & save document record
      this.uploadToStorageAndArchive({
        convoyId: options.convoyId,
        fileName: options.fileName,
        documentType: options.documentType,
        documentNumber: options.documentNumber,
        blob,
      }).catch((err) => console.warn('Supabase Storage background upload note:', err));

      return { success: true, blob, file };
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
   * Generates and downloads the A4 PDF to user's device (backward-compatible).
   */
  async generateAndDownloadPDF(options: PDFExportOptions): Promise<PDFGenerationResult> {
    return this.generatePDF(options, true);
  },

  /**
   * Shares the actual generated PDF FILE as a document attachment via Web Share API.
   * If supported by the browser, opens the native share sheet with the PDF file.
   * If unsupported, returns supported: false so caller can trigger download and guide user.
   */
  async sharePDFFile(options: PDFExportOptions): Promise<PDFShareResult> {
    // 1. Generate or retrieve the PDF File/Blob
    const genResult = await this.generatePDF(options, false);
    if (!genResult.success || !genResult.blob || !genResult.file) {
      return {
        supported: false,
        shared: false,
        error: genResult.error || 'فشل توليد ملف الـ PDF للمشاركة',
      };
    }

    const file = genResult.file;

    // 2. Check Web Share API file-sharing capability
    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });

    if (!canShareFiles) {
      return {
        supported: false,
        shared: false,
        blob: genResult.blob,
        file: genResult.file,
      };
    }

    // 3. Prompt native OS share sheet with the actual PDF file attachment
    try {
      await navigator.share({
        files: [file],
        title: options.fileName.replace(/\.pdf$/i, ''),
      });
      return {
        supported: true,
        shared: true,
        blob: genResult.blob,
        file: genResult.file,
      };
    } catch (err: any) {
      // User dismissed or cancelled the share sheet
      if (err?.name === 'AbortError') {
        return {
          supported: true,
          shared: false,
          cancelled: true,
          blob: genResult.blob,
          file: genResult.file,
        };
      }
      console.warn('navigator.share failed, treating as unsupported:', err);
      return {
        supported: false,
        shared: false,
        blob: genResult.blob,
        file: genResult.file,
        error: err?.message,
      };
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

