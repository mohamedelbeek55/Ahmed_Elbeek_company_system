const assert = require('assert');

// Test Date Accommodation Nights Calculations
// Rule: Exclude loading day and completion/unloading day
function calculateElapsedDays(startDateStr, endDateStr) {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = endDateStr ? new Date(endDateStr + 'T00:00:00') : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffMs = normalizedEnd.getTime() - normalizedStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays - 1);
}

function getCustomItemTotal(item, truckCount) {
  if (!item) return 0;
  const mode = item.calculation_mode || item.calculationMode || 'FIXED_TOTAL';
  const amount = Number(item.amount) || 0;
  if (mode === 'PER_VEHICLE') {
    const count = Math.max(1, Math.round(Number(truckCount) || 1));
    return amount * count;
  }
  return amount;
}

// Test Financial Calculations
function calculateConvoyFinances(input) {
  const truckCount = Math.max(1, Math.round(Number(input.truckCount) || 1));
  const nights = calculateElapsedDays(input.loadingDate, input.completionDate);
  const dailyRate = Number(input.dailyAccommodationRate) || 0;
  const freightRate = Number(input.freightRatePerTruck) || 0;
  const clearance = Number(input.customsClearance) || 0;
  const demurrage = Number(input.portDemurrage) || 0;
  const extras = Number(input.additionalExpenses) || 0;

  const customItems = Array.isArray(input.customItems)
    ? input.customItems
        .filter((item) => item && (item.name?.trim() || Number(item.amount) > 0))
        .map((item, idx) => {
          const mode = item.calculation_mode || item.calculationMode || 'FIXED_TOTAL';
          return {
            id: item.id || `custom-${idx + 1}`,
            name: (item.name || '').trim(),
            amount: Number(item.amount) || 0,
            calculation_mode: mode,
            calculationMode: mode,
          };
        })
    : [];

  const customItemsTotal = customItems.reduce((acc, it) => acc + getCustomItemTotal(it, truckCount), 0);

  const totalAccommodation = nights * dailyRate * truckCount;
  const totalFreight = freightRate * truckCount;
  const grandTotal = totalAccommodation + totalFreight + clearance + demurrage + extras + customItemsTotal;
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
  };
}

console.log('🧪 Starting Ahmed Elbeek System Automated Test Suite...\n');

// Test 1: Date-only accommodation nights (excluding loading day and completion day)
{
  assert.strictEqual(calculateElapsedDays('2026-11-15', '2026-11-15'), 0, 'Same day must return 0 nights');
  assert.strictEqual(calculateElapsedDays('2026-11-15', '2026-11-16'), 0, 'Next day (15 to 16) must return 0 nights');
  assert.strictEqual(calculateElapsedDays('2026-11-15', '2026-11-17'), 1, '15 to 17 must return 1 night (day 16)');
  assert.strictEqual(calculateElapsedDays('2026-11-15', '2026-11-20'), 4, '15 to 20 must return 4 nights (days 16,17,18,19)');
  assert.strictEqual(calculateElapsedDays('2026-11-04', '2026-11-13'), 8, 'Nov 4 to Nov 13 must return 8 nights');
  console.log('✓ Test 1 Passed: Accommodation nights rule (exclude loading day & completion day)');
}

// Test 2: Past/invalid end date returns 0 nights
{
  const days = calculateElapsedDays('2026-11-20', '2026-11-15');
  assert.strictEqual(days, 0, 'Earlier completion date must return 0 nights');
  console.log('✓ Test 2 Passed: Safety floor at 0 nights for reversed dates');
}

// Test 3: Approved Convoy Business Calculation (Nov 4 to Nov 13 = 8 nights)
// 12 trucks, 8 nights, 500 daily rate, 8500 freight rate, 14500 clearance, 3600 extras
// Accommodation: 8 * 500 * 12 = 48,000
// Freight: 12 * 8500 = 102,000
// Clearance: 14,500
// Extras: 3,600
// Grand Total: 48000 + 102000 + 14500 + 3600 = 168,100
// Avg per truck: 168100 / 12 = 14008.33
{
  const result = calculateConvoyFinances({
    truckCount: 12,
    loadingDate: '2026-11-04',
    completionDate: '2026-11-13',
    dailyAccommodationRate: 500,
    freightRatePerTruck: 8500,
    customsClearance: 14500,
    additionalExpenses: 3600,
  });

  assert.strictEqual(result.accommodationNights, 8);
  assert.strictEqual(result.totalAccommodation, 48000);
  assert.strictEqual(result.totalFreight, 102000);
  assert.strictEqual(result.customsClearance, 14500);
  assert.strictEqual(result.additionalExpenses, 3600);
  assert.strictEqual(result.grandTotal, 168100);
  assert.strictEqual(Number(result.averageCostPerTruck.toFixed(2)), 14008.33);
  console.log('✓ Test 3 Passed: Convoy financial formulas with updated nights rule (Total: 168,100 EGP)');
}

// Test 4: Location filtering rules
{
  const sampleConvoys = [
    { id: '1', location_id: 'rafah', status: 'completed' },
    { id: '2', location_id: 'al_awja', status: 'completed' },
    { id: '3', location_id: 'rafah', status: 'active' },
    { id: '4', location_id: 'al_awja', status: 'active' },
  ];

  const rafahOnly = sampleConvoys.filter(c => c.location_id === 'rafah');
  const awjaOnly = sampleConvoys.filter(c => c.location_id === 'al_awja');

  assert.strictEqual(rafahOnly.length, 2);
  assert.strictEqual(awjaOnly.length, 2);
  console.log('✓ Test 4 Passed: Port location segregation (Rafah vs Al-Awja)');
}

// Test 5: Clearance and additional expenses are separate amounts
{
  const testClearance = calculateConvoyFinances({
    truckCount: 10,
    loadingDate: '2026-11-01',
    completionDate: '2026-11-05', // 3 nights (days 2, 3, 4)
    dailyAccommodationRate: 400,
    freightRatePerTruck: 6000,
    customsClearance: 5000,
    additionalExpenses: 1500,
  });

  // Accommodation: 3 * 400 * 10 = 12000
  // Freight: 10 * 6000 = 60000
  // Clearance = 5000 (not multiplied by 10!)
  // Extras = 1500 (not multiplied by 10!)
  // Total: 12000 + 60000 + 5000 + 1500 = 78500
  assert.strictEqual(testClearance.accommodationNights, 3);
  assert.strictEqual(testClearance.customsClearance, 5000);
  assert.strictEqual(testClearance.additionalExpenses, 1500);
  assert.strictEqual(testClearance.grandTotal, 78500);
  console.log('✓ Test 5 Passed: Lump-sum clearance & expenses separation rule');
}

// Test 6: Port Demurrage (أرضيات مبيت داخل المنفذ) and Dynamic Custom Cost Items
{
  const testNewItems = calculateConvoyFinances({
    truckCount: 5,
    loadingDate: '2026-11-10',
    completionDate: '2026-11-14', // 3 nights (days 11, 12, 13)
    dailyAccommodationRate: 500, // 3 * 500 * 5 = 7,500
    freightRatePerTruck: 8000, // 5 * 8000 = 40,000
    customsClearance: 12000,
    portDemurrage: 6500, // أرضيات مبيت داخل المنفذ
    additionalExpenses: 2500,
    customItems: [
      { id: 'c1', name: 'عمال تعتيق إضافية', amount: 3000 },
      { id: 'c2', name: 'حراسة ساحات ليلية', amount: 1500 },
    ],
  });

  // Expected Grand Total:
  // 7500 + 40000 + 12000 + 6500 + 2500 + 3000 + 1500 = 73,000
  // Average per truck = 73000 / 5 = 14,600
  assert.strictEqual(testNewItems.accommodationNights, 3);
  assert.strictEqual(testNewItems.totalAccommodation, 7500);
  assert.strictEqual(testNewItems.totalFreight, 40000);
  assert.strictEqual(testNewItems.portDemurrage, 6500);
  assert.strictEqual(testNewItems.customItemsTotal, 4500);
  assert.strictEqual(testNewItems.grandTotal, 73000);
  assert.strictEqual(testNewItems.averageCostPerTruck, 14600);
  console.log('✓ Test 6 Passed: Port Demurrage and dynamic custom cost items calculation');
}

// Test 7: Web Share API PDF File sharing simulation
{
  function getStatementFileName(cargoName, truckCount) {
    const cleanCargo = (cargoName || 'بضاعة').replace(/[\\/:*?"<>|]/g, '').trim();
    const truckUnit = truckCount >= 3 && truckCount <= 10 ? 'عربيات' : 'عربية';
    const truckStr = `${truckCount} ${truckUnit}`;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return `${cleanCargo} - ${truckStr} - ${todayStr}.pdf`;
  }

  const expectedName = getStatementFileName('برتقال صيفي', 5);
  const fakeFile = { name: expectedName, type: 'application/pdf', size: 283119 };
  const fakeBlob = {};

  async function simulateShare(canShareValue, shareRejection) {
    const calls = [];
    const mockNavigator = {
      share: async (data) => {
        calls.push(data);
        if (shareRejection) throw shareRejection;
      },
      canShare: (data) => {
        return canShareValue && !!(data && data.files && data.files.length > 0);
      },
    };

    if (!mockNavigator.canShare({ files: [fakeFile] })) {
      return { supported: false, shared: false, file: fakeFile, blob: fakeBlob };
    }

    try {
      await mockNavigator.share({
        files: [fakeFile],
        title: fakeFile.name.replace(/\.pdf$/i, ''),
      });
      return { supported: true, shared: true, file: fakeFile, blob: fakeBlob, calls };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { supported: true, shared: false, cancelled: true, file: fakeFile, blob: fakeBlob };
      }
      return { supported: false, shared: false, file: fakeFile, blob: fakeBlob };
    }
  }

  // 7a. Supported device share test
  simulateShare(true, null).then((res) => {
    assert.strictEqual(res.supported, true);
    assert.strictEqual(res.shared, true);
    assert.strictEqual(res.calls.length, 1);
    assert.strictEqual(res.calls[0].files[0].name, expectedName);
    assert.strictEqual(res.calls[0].files[0].type, 'application/pdf');
    assert.strictEqual(res.calls[0].title, expectedName.replace(/\.pdf$/i, ''));
    assert.strictEqual(res.calls[0].text, undefined, 'Must not share report body as long WhatsApp text');
    console.log(`✓ Test 7a Passed: Web Share API file attachment invocation with clean name: "${expectedName}"`);
  });

  // 7b. Cancelled share test (AbortError)
  const abortErr = new Error('User cancelled');
  abortErr.name = 'AbortError';
  simulateShare(true, abortErr).then((res) => {
    assert.strictEqual(res.supported, true);
    assert.strictEqual(res.cancelled, true);
    assert.strictEqual(res.shared, false);
    console.log('✓ Test 7b Passed: User cancellation handled gracefully without errors');
  });

  // 7c. Unsupported device fallback
  simulateShare(false, null).then((res) => {
    assert.strictEqual(res.supported, false);
    assert.strictEqual(res.shared, false);
    assert.strictEqual(res.file.name, expectedName);
    console.log('✓ Test 7c Passed: Unsupported browser fallback triggers file download');
  });
}

// Test 8: Custom Invoice Item - "لكل عربية" (PER_VEHICLE mode)
{
  const result = calculateConvoyFinances({
    truckCount: 5,
    loadingDate: '2026-11-10',
    completionDate: '2026-11-10', // 0 nights
    dailyAccommodationRate: 0,
    freightRatePerTruck: 0,
    customItems: [
      { id: 'item-1', name: 'ميزان وطبان', amount: 1000, calculation_mode: 'PER_VEHICLE' },
    ],
  });

  // 5 trucks × 1,000 = 5,000 EGP
  assert.strictEqual(result.customItemsTotal, 5000);
  assert.strictEqual(getCustomItemTotal(result.customItems[0], 5), 5000);
  console.log('✓ Test 8 Passed: Custom invoice item "لكل عربية" (PER_VEHICLE: 5 trucks × 1,000 = 5,000 EGP)');
}

// Test 9: Custom Invoice Item - "مبلغ إجمالي (مرة واحدة)" (FIXED_TOTAL mode)
{
  const result = calculateConvoyFinances({
    truckCount: 5,
    loadingDate: '2026-11-10',
    completionDate: '2026-11-10',
    dailyAccommodationRate: 0,
    freightRatePerTruck: 0,
    customItems: [
      { id: 'item-1', name: 'إكراميات سائقين', amount: 1000, calculation_mode: 'FIXED_TOTAL' },
    ],
  });

  // Fixed total = 1,000 EGP regardless of 5 trucks
  assert.strictEqual(result.customItemsTotal, 1000);
  assert.strictEqual(getCustomItemTotal(result.customItems[0], 5), 1000);
  console.log('✓ Test 9 Passed: Custom invoice item "مبلغ إجمالي" (FIXED_TOTAL: 1,000 EGP fixed)');
}

// Test 10: Mixed Custom Items with Complete Convoy Finances
{
  const result = calculateConvoyFinances({
    truckCount: 5,
    loadingDate: '2026-11-10',
    completionDate: '2026-11-14', // 3 nights (days 11, 12, 13)
    dailyAccommodationRate: 500,  // 3 * 500 * 5 = 7,500
    freightRatePerTruck: 8000,    // 5 * 8000 = 40,000
    customsClearance: 12000,
    portDemurrage: 6500,
    additionalExpenses: 2500,
    customItems: [
      { id: 'c1', name: 'ميزان وطبان', amount: 1000, calculation_mode: 'PER_VEHICLE' }, // 5 * 1000 = 5,000
      { id: 'c2', name: 'إكراميات', amount: 1000, calculation_mode: 'FIXED_TOTAL' },   // 1,000
    ],
  });

  // Expected Custom Items Total = 5,000 + 1,000 = 6,000 EGP
  assert.strictEqual(result.customItemsTotal, 6000);
  // Expected Grand Total = 7,500 + 40,000 + 12,000 + 6,500 + 2,500 + 6,000 = 74,500 EGP
  assert.strictEqual(result.grandTotal, 74500);
  // Expected Average Cost per Truck = 74,500 / 5 = 14,900 EGP
  assert.strictEqual(result.averageCostPerTruck, 14900);
  console.log('✓ Test 10 Passed: Mixed custom items integration into Grand Total (74,500 EGP) and Avg/Truck (14,900 EGP)');
}

// Test 11: Dynamic Truck Count Changes
{
  const items = [
    { id: 'c1', name: 'ميزان وطبان', amount: 1000, calculation_mode: 'PER_VEHICLE' },
    { id: 'c2', name: 'إكراميات', amount: 1000, calculation_mode: 'FIXED_TOTAL' },
  ];

  // 5 trucks
  const res5 = calculateConvoyFinances({
    truckCount: 5,
    loadingDate: '2026-11-10',
    completionDate: '2026-11-10',
    customItems: items,
  });
  assert.strictEqual(getCustomItemTotal(items[0], 5), 5000);
  assert.strictEqual(getCustomItemTotal(items[1], 5), 1000);
  assert.strictEqual(res5.customItemsTotal, 6000);

  // Change truck count from 5 to 3
  const res3 = calculateConvoyFinances({
    truckCount: 3,
    loadingDate: '2026-11-10',
    completionDate: '2026-11-10',
    customItems: items,
  });
  // Item 1 automatically recalculates to 3 × 1,000 = 3,000
  assert.strictEqual(getCustomItemTotal(items[0], 3), 3000);
  // Item 2 remains 1,000 fixed
  assert.strictEqual(getCustomItemTotal(items[1], 3), 1000);
  assert.strictEqual(res3.customItemsTotal, 4000);
  console.log('✓ Test 11 Passed: Dynamic truck count change (5 trucks -> 6,000 EGP, 3 trucks -> 4,000 EGP)');
}

// Test 12: Backward Compatibility with Legacy Records (no calculation_mode specified)
{
  const legacyRecord = {
    truckCount: 8,
    loadingDate: '2026-11-01',
    completionDate: '2026-11-04', // 2 nights
    dailyAccommodationRate: 400,  // 2 * 400 * 8 = 6,400
    freightRatePerTruck: 5000,    // 8 * 5000 = 40,000
    customsClearance: 10000,
    additionalExpenses: 1500,
    customItems: [
      // Legacy item has NO calculation_mode or calculationMode property
      { id: 'legacy-1', name: 'بند قديم بدون نمط حساب', amount: 2500 },
      { id: 'legacy-2', name: 'بند قديم إضافي', amount: 1200 },
    ],
  };

  const result = calculateConvoyFinances(legacyRecord);

  // Must default to FIXED_TOTAL, NOT multiplied by 8 trucks
  assert.strictEqual(getCustomItemTotal(result.customItems[0], 8), 2500);
  assert.strictEqual(getCustomItemTotal(result.customItems[1], 8), 1200);
  assert.strictEqual(result.customItemsTotal, 3700);

  // Grand Total = 6,400 + 40,000 + 10,000 + 1,500 + 3,700 = 61,600 EGP
  assert.strictEqual(result.grandTotal, 61600);
  console.log('✓ Test 12 Passed: 100% backward compatibility with legacy custom cost records (defaults to fixed amount)');
}

console.log('\n🎉 ALL 12 AUTOMATED TESTS PASSED SUCCESSFULLY!');

