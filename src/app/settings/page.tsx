'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ConvoyRepository } from '@/lib/store';
import type { Database } from '@/types/database.types';

type SettingsRow = Database['public']['Tables']['company_settings']['Row'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const data = await ConvoyRepository.getSettings();
    setSettings(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await ConvoyRepository.updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 text-center text-charcoal">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-3">
            progress_activity
          </span>
          <p className="font-headline text-headline-md font-bold">جارٍ تحميل الإعدادات...</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-label text-label-sm mb-1">
              <span className="material-symbols-outlined text-base">settings</span>
              <span>لوحة التحكم المؤسسية</span>
            </div>
            <h2 className="font-headline text-headline-lg font-bold text-charcoal">
              إعدادات النظام والشركة
            </h2>
            <p className="font-body text-body-md text-light-on-surface-variant">
              إدارة البيانات التجارية، أرقام التواصل في ترويسة وتذييل الـ PDF، والقيم الافتراضية لحساب النولون والمبيت.
            </p>
          </div>

          {saveSuccess && (
            <span className="px-4 py-2 bg-emerald-50 text-success border border-emerald-200 rounded-DEFAULT font-label text-label-md font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>تم حفظ التعديلات بنجاح</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Card 1: Commercial Data */}
          <div className="bg-light-surface border border-outline rounded-xl p-6 sm:p-8 shadow-xs">
            <h3 className="font-headline text-headline-md font-bold text-charcoal mb-4 flex items-center gap-2 border-b border-light-gray pb-3">
              <span className="material-symbols-outlined text-primary">domain</span>
              <span>البيانات التجارية المعتمدة</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  اسم الشركة التجاري (عربي)
                </label>
                <input
                  type="text"
                  required
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full border border-outline rounded-DEFAULT p-3 font-body text-body-md text-charcoal focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  الاسم بالإنجليزية (Commercial Name)
                </label>
                <input
                  type="text"
                  value={settings.trade_name_en || ''}
                  onChange={(e) => setSettings({ ...settings, trade_name_en: e.target.value })}
                  className="w-full border border-outline rounded-DEFAULT p-3 font-body text-body-md text-charcoal focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  رقم السجل التجاري
                </label>
                <input
                  type="text"
                  value={settings.commercial_registration || ''}
                  onChange={(e) => setSettings({ ...settings, commercial_registration: e.target.value })}
                  className="w-full border border-outline rounded-DEFAULT p-3 font-body text-body-md tabular-nums text-charcoal focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  رقم البطاقة الضريبية
                </label>
                <input
                  type="text"
                  value={settings.tax_id || ''}
                  onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                  className="w-full border border-outline rounded-DEFAULT p-3 font-body text-body-md tabular-nums text-charcoal focus:border-primary outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  العنوان التجاري الرئيسي
                </label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full border border-outline rounded-DEFAULT p-3 font-body text-body-md text-charcoal focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Contact Info in Official PDFs */}
          <div className="bg-light-surface border border-outline rounded-xl p-6 sm:p-8 shadow-xs">
            <h3 className="font-headline text-headline-md font-bold text-charcoal mb-4 flex items-center gap-2 border-b border-light-gray pb-3">
              <span className="material-symbols-outlined text-primary">contacts</span>
              <span>بيانات الاتصال في تذييل الـ PDF المعتمد</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  رقم الهاتف المعتمد (يظهر في تذييل كافة البيانات)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full border-2 border-outline rounded-DEFAULT p-3 pl-10 font-body text-body-md font-bold tabular-nums text-charcoal focus:border-primary outline-none"
                  />
                  <span className="material-symbols-outlined absolute left-3 text-primary text-xl pointer-events-none">
                    call
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  البريد الإلكتروني المعتمد (يظهر في تذييل كافة البيانات)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    required
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="w-full border-2 border-outline rounded-DEFAULT p-3 pl-10 font-body text-body-md font-bold text-charcoal focus:border-primary outline-none"
                  />
                  <span className="material-symbols-outlined absolute left-3 text-primary text-xl pointer-events-none">
                    mail
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Default Rates */}
          <div className="bg-light-surface border border-outline rounded-xl p-6 sm:p-8 shadow-xs">
            <h3 className="font-headline text-headline-md font-bold text-charcoal mb-4 flex items-center gap-2 border-b border-light-gray pb-3">
              <span className="material-symbols-outlined text-primary">price_change</span>
              <span>القيم المالية الافتراضية (ترحيل تلقائي للشاشات)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  يومية المبيت الافتراضية للشاحنة
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="50"
                    placeholder="0"
                    value={settings.default_daily_rate ?? 500}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setSettings({ ...settings, default_daily_rate: val === '' ? 0 : Number(val) });
                    }}
                    className="w-full border border-outline rounded-DEFAULT p-3 pl-20 font-body text-body-md font-bold tabular-nums text-charcoal focus:border-primary outline-none"
                  />
                  <span className="absolute left-4 text-body-sm text-light-on-surface-variant font-bold pointer-events-none">
                    ج.م / يوم
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  فئة النولون الافتراضية للشاحنة
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="100"
                    placeholder="0"
                    value={settings.default_freight_rate ?? 8500}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      setSettings({ ...settings, default_freight_rate: val === '' ? 0 : Number(val) });
                    }}
                    className="w-full border border-outline rounded-DEFAULT p-3 pl-24 font-body text-body-md font-bold tabular-nums text-charcoal focus:border-primary outline-none"
                  />
                  <span className="absolute left-4 text-body-sm text-light-on-surface-variant font-bold pointer-events-none">
                    ج.م / شاحنة
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Owner Profile */}
          <div className="bg-light-surface border border-outline rounded-xl p-6 sm:p-8 shadow-xs">
            <h3 className="font-headline text-headline-md font-bold text-charcoal mb-4 flex items-center gap-2 border-b border-light-gray pb-3">
              <span className="material-symbols-outlined text-primary">person</span>
              <span>حساب المالك (صاحب الشركة)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  اسم صاحب الشركة
                </label>
                <input
                  type="text"
                  value={settings.owner_name || ''}
                  onChange={(e) => setSettings({ ...settings, owner_name: e.target.value })}
                  className="w-full border border-outline rounded-DEFAULT p-3 font-body text-body-md font-semibold text-charcoal focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block font-label text-label-md text-charcoal mb-1.5">
                  المسمى المؤسسي
                </label>
                <input
                  type="text"
                  value={settings.owner_title || ''}
                  onChange={(e) => setSettings({ ...settings, owner_title: e.target.value })}
                  className="w-full border border-outline rounded-DEFAULT p-3 font-body text-body-md text-charcoal focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-opacity-95 text-on-primary font-headline text-headline-sm font-bold rounded-DEFAULT shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              <span className="material-symbols-outlined text-xl">save</span>
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الشركة'}</span>
            </button>
          </div>

        </form>

      </main>

      <Footer />
    </>
  );
}

