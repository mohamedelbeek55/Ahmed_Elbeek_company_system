/**
 * Self-contained crisp icons for official PDF documents.
 * Using explicit xmlns, width, height, and hex fill (#9E1B24) guarantees
 * zero currentColor/SVG misalignment bugs across all browsers and html2canvas exports.
 */

const BRAND_RED = '#B51F2D';

function toSvgDataUri(pathD: string, fill: string = BRAND_RED, size: number = 24): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}"><path d="${pathD}"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const PDF_ICONS = {
  receipt: toSvgDataUri(
    'M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v20l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5V2l-1.5 1.5zM16 17H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V7h8v2z',
    BRAND_RED,
    20
  ),
  verifiedShield: toSvgDataUri(
    'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
    BRAND_RED,
    24
  ),
  phone: toSvgDataUri(
    'M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    BRAND_RED,
    16
  ),
  mail: toSvgDataUri(
    'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    BRAND_RED,
    16
  ),
} as const;

export type PdfIconKey = keyof typeof PDF_ICONS;

/**
 * Rasterizes an SVG data URI to a crisp 4x high-DPI PNG data URI via offscreen canvas.
 * Ensures html2canvas never distorts, clips, or misaligns icons on any browser or screen DPI.
 */
export async function rasterizeSvgDataUriToPng(
  svgDataUri: string,
  displaySizePx: number = 24
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return svgDataUri;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = 4;
        const canvas = document.createElement('canvas');
        canvas.width = displaySizePx * scale;
        canvas.height = displaySizePx * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(svgDataUri);
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(svgDataUri);
      }
    };
    img.onerror = () => resolve(svgDataUri);
    img.src = svgDataUri;
  });
}

/**
 * Pre-rasterizes all PDF icons to high-DPI PNG data URIs for rock-solid html2canvas export.
 */
export async function getRasterizedPdfIcons(): Promise<Record<PdfIconKey, string>> {
  const [receipt, verifiedShield, phone, mail] = await Promise.all([
    rasterizeSvgDataUriToPng(PDF_ICONS.receipt, 20),
    rasterizeSvgDataUriToPng(PDF_ICONS.verifiedShield, 24),
    rasterizeSvgDataUriToPng(PDF_ICONS.phone, 16),
    rasterizeSvgDataUriToPng(PDF_ICONS.mail, 16),
  ]);

  return { receipt, verifiedShield, phone, mail };
}
