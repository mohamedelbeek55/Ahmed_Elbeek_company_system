const assert = require('assert');

// Test Date Elapsed Calculations
function calculateElapsedDays(startDateStr, endDateStr) {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = endDateStr ? new Date(endDateStr + 'T00:00:00') : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

// Test Financial Calculations
function calculateConvoyFinances(input) {
  const truckCount = Math.max(1, Math.round(Number(input.truckCount) || 1));
  const nights = calculateElapsedDays(input.loadingDate, input.completionDate);
  const dailyRate = Number(input.dailyAccommodationRate) || 0;
  const freightRate = Number(input.freightRatePerTruck) || 0;
  const clearance = Number(input.customsClearance) || 0;
  const extras = Number(input.additionalExpenses) || 0;

  const totalAccommodation = nights * dailyRate * truckCount;
  const totalFreight = freightRate * truckCount;
  const grandTotal = totalAccommodation + totalFreight + clearance + extras;
  const averageCostPerTruck = truckCount > 0 ? grandTotal / truckCount : 0;

  return {
    accommodationNights: nights,
    totalAccommodation,
    totalFreight,
    customsClearance: clearance,
    additionalExpenses: extras,
    grandTotal,
    averageCostPerTruck,
  };
}

console.log('🧪 Starting Ahmed Elbeek System Automated Test Suite...\n');

// Test 1: Date-only elapsed calculation (2026-11-04 to 2026-11-13 = 9 days)
{
  const days = calculateElapsedDays('2026-11-04', '2026-11-13');
  assert.strictEqual(days, 9, 'Elapsed days between Nov 4 and Nov 13 must be 9');
  console.log('✓ Test 1 Passed: Calendar date-only difference calculation (9 nights)');
}

// Test 2: Same-day loading & completion (2026-11-04 to 2026-11-04 = 0 days)
{
  const days = calculateElapsedDays('2026-11-04', '2026-11-04');
  assert.strictEqual(days, 0, 'Same day must return 0 nights');
  console.log('✓ Test 2 Passed: Same-day loading & unloading equals 0 nights');
}

// Test 3: Approved Convoy 1 Business Calculation
// 12 trucks, 9 nights, 500 daily rate, 8500 freight rate, 14500 clearance, 3600 extras
// Accommodation: 9 * 500 * 12 = 54,000
// Freight: 12 * 8500 = 102,000
// Clearance: 14,500
// Extras: 3,600
// Grand Total: 54000 + 102000 + 14500 + 3600 = 174,100
// Avg per truck: 174100 / 12 = 14508.33
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

  assert.strictEqual(result.accommodationNights, 9);
  assert.strictEqual(result.totalAccommodation, 54000);
  assert.strictEqual(result.totalFreight, 102000);
  assert.strictEqual(result.customsClearance, 14500);
  assert.strictEqual(result.additionalExpenses, 3600);
  assert.strictEqual(result.grandTotal, 174100);
  assert.strictEqual(Number(result.averageCostPerTruck.toFixed(2)), 14508.33);
  console.log('✓ Test 3 Passed: Approved Stitch Convoy #1 financial formulas (Total: 174,100 EGP)');
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
    completionDate: '2026-11-05',
    dailyAccommodationRate: 400,
    freightRatePerTruck: 6000,
    customsClearance: 5000,
    additionalExpenses: 1500,
  });

  // Accommodation: 4 * 400 * 10 = 16000
  // Freight: 10 * 6000 = 60000
  // Clearance = 5000 (not multiplied by 10!)
  // Extras = 1500 (not multiplied by 10!)
  // Total: 16000 + 60000 + 5000 + 1500 = 82500
  assert.strictEqual(testClearance.customsClearance, 5000);
  assert.strictEqual(testClearance.additionalExpenses, 1500);
  assert.strictEqual(testClearance.grandTotal, 82500);
  console.log('✓ Test 5 Passed: Lump-sum clearance & expenses separation rule');
}

console.log('\n🎉 ALL 5 AUTOMATED TESTS PASSED SUCCESSFULLY!');

