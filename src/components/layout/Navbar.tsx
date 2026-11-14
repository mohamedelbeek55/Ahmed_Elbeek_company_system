'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active item
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { href: '/', label: 'لوحة التحكم', icon: 'dashboard' },
    { href: '/convoys', label: 'تحميل', icon: 'local_shipping' },
    { href: '/archive', label: 'الأرشيف والبيانات', icon: 'inventory_2' },
    { href: '/settings', label: 'الإعدادات', icon: 'settings' },
  ];

  return (
    <header className="bg-light-surface border-b border-outline sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 relative flex-shrink-0 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="شعار شركة أحمد البيك للاستيراد والتصدير"
                width={48}
                height={48}
                priority
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h1 className="font-headline text-headline-sm font-bold text-charcoal leading-tight">
                أحمد البيك للاستيراد والتصدير
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant">
                نظام إدارة وتسيير قوافل الشاحنات
              </p>
            </div>
          </Link>
        </div>

        {/* Main Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-DEFAULT font-label text-label-md flex items-center gap-2 transition duration-state-change ${
                  active
                    ? 'bg-pale-red text-primary font-bold'
                    : 'text-charcoal hover:bg-light-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Owner Profile & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-charcoal text-on-primary font-bold flex items-center justify-center font-headline text-label-lg shadow-xs">
              أ
            </div>
            <div className="hidden xl:block text-right">
              <span className="block font-label text-label-md text-charcoal leading-none">م. أحمد البيك</span>
              <span className="font-body text-body-sm text-light-on-surface-variant">مالك الشركة</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-charcoal hover:bg-light-surface-variant rounded-DEFAULT transition"
            aria-label="القائمة الرئيسية"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-outline bg-light-surface px-4 py-3 space-y-1 shadow-md">
          {navLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-DEFAULT text-body-md font-semibold transition ${
                  active
                    ? 'bg-pale-red text-primary'
                    : 'text-charcoal hover:bg-light-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-outline/50 flex items-center justify-between text-body-sm text-light-on-surface-variant px-3 py-1">
            <span>م. أحمد البيك (صاحب الشركة)</span>
            <Link href="/login" className="text-primary font-bold">تسجيل الخروج</Link>
          </div>
        </div>
      )}
    </header>
  );
}

