/**
 * Ahmed Elbeek Management System - Business Logic & Financial Calculations
 */

export interface CustomCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface CalculationInput {
  truckCount: number;
  loadingDate: string; // YYYY-MM-DD
  completionDate: string; // YYYY-MM-DD
  dailyAccommodationRate: number; // ج.م / يوم
  freightRatePerTruck: number; // ج.م / شاحنة
  customsClearance?: number; // ج.م
  portDemurrage?: number; // أرضيات مبيت داخل المنفذ ج.م
  additionalExpenses?: number; // ج.م (اختياري)
  customItems?: CustomCostItem[]; // بنود تكاليف إضافية مخصصة
}

export interface CalculationResult {
  accommodationNights: number;
  totalAccommodation: number;
  totalFreight: number;
  customsClearance: number;
  portDemurrage: number;
  additionalExpenses: number;
  customItemsTotal: number;
  customItems: CustomCostItem[];
  grandTotal: number;
  averageCostPerTruck: number;
  tafqeetAr: string;
}

/**
 * Calculate difference in calendar days between two date strings (YYYY-MM-DD).
 * Dates are strictly DATE-ONLY.
 */
export function calculateElapsedDays(startDateStr: string, endDateStr?: string | null): number {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = endDateStr ? new Date(endDateStr + 'T00:00:00') : new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  const diffMs = end.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Standard business rule calculations according to company specifications
 */
export function calculateConvoyFinances(input: CalculationInput): CalculationResult {
  const truckCount = Math.max(1, Math.round(Number(input.truckCount) || 1));
  const nights = calculateElapsedDays(input.loadingDate, input.completionDate);
  const dailyRate = Number(input.dailyAccommodationRate) || 0;
  const freightRate = Number(input.freightRatePerTruck) || 0;
  const clearance = Number(input.customsClearance) || 0;
  const demurrage = Number(input.portDemurrage) || 0;
  const extras = Number(input.additionalExpenses) || 0;

  const customItems: CustomCostItem[] = Array.isArray(input.customItems)
    ? input.customItems
        .filter((item) => item && (item.name?.trim() || Number(item.amount) > 0))
        .map((item, idx) => ({
          id: item.id || `custom-${idx + 1}-${Date.now()}`,
          name: (item.name || '').trim(),
          amount: Number(item.amount) || 0,
        }))
    : [];

  const customItemsTotal = customItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

  // Accommodation = Nights × Daily rate per truck × Truck count
  const totalAccommodation = nights * dailyRate * truckCount;

  // Freight = Freight rate per truck × Truck count
  const totalFreight = freightRate * truckCount;

  // Grand total combines standard items, demurrage, clearance, extras, and all custom items
  const grandTotal = totalAccommodation + totalFreight + clearance + demurrage + extras + customItemsTotal;

  // Average cost per truck
  const averageCostPerTruck = truckCount > 0 ? grandTotal / truckCount : 0;

  return {
    accommodationNights: nights,
    totalAccommodation,
    totalFreight,
    customsClearance: clearance,
    portDemurrage: demurrage,
    additionalExpenses: extras,
    customItemsTotal,
    customItems,
    grandTotal,
    averageCostPerTruck,
    tafqeetAr: arabicTafqeet(grandTotal),
  };
}

/**
 * Format numbers with thousands commas and currency suffix
 */
export function formatCurrency(amount: number, showCurrency: boolean = true): string {
  const formatted = Math.round(amount).toLocaleString('en-US');
  return showCurrency ? `${formatted} ج.م` : formatted;
}

/**
 * Arabic Currency Tafqeet (تحويل الأرقام إلى نصوص بالجنيه المصري)
 */
export function arabicTafqeet(amount: number): string {
  const num = Math.floor(amount);
  if (num === 0) return 'صفر جنيه مصري';

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertChunk(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;

    if (h > 0) parts.push(hundreds[h]);

    if (rem >= 10 && rem <= 19) {
      parts.push(teens[rem - 10]);
    } else {
      if (u > 0) parts.push(units[u]);
      if (t > 0) parts.push(tens[t]);
    }

    return parts.join(' و');
  }

  const parts: string[] = [];

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertChunk(millions)} ملايين`);
    else parts.push(`${convertChunk(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertChunk(thousands)} آلاف`);
    else parts.push(`${convertChunk(thousands)} ألف`);
  }

  if (remainder > 0) {
    parts.push(convertChunk(remainder));
  }

  const text = parts.join(' و');
  return `فقط ${text} جنيه مصري لا غير`;
}

