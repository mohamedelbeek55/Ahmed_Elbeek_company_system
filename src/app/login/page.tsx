'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('ahmed.elbeek');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = AuthService.login(username, password);
    if (res.success) {
      router.push('/');
    } else {
      setError(res.error || 'فشل تسجيل الدخول');
      setLoading(false);
    }
  };

  return (
    <div className="bg-light-gray text-charcoal font-body min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-light-surface rounded-xl border border-outline shadow-md p-8 sm:p-10">
        
        {/* Official Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-28 h-28 mb-3 relative flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="شعار شركة أحمد البيك للاستيراد والتصدير"
              width={112}
              height={112}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="font-headline text-headline-lg text-charcoal font-bold mt-2">
            أحمد البيك للاستيراد والتصدير
          </h1>
          <p className="font-body text-body-md text-light-on-surface-variant mt-1">
            نظام إدارة وتسيير قوافل الشاحنات
          </p>
          <div className="w-12 h-1 bg-primary rounded-full mt-3"></div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-DEFAULT bg-pale-red border border-primary/30 text-primary text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-label text-label-md text-charcoal mb-2">
              اسم المستخدم أو البريد الإلكتروني
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-outline rounded-DEFAULT px-4 py-3 pr-11 font-body text-body-md text-charcoal focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                placeholder="أدخل اسم المستخدم"
              />
              <span className="material-symbols-outlined absolute right-3 text-light-on-surface-variant pointer-events-none text-xl">
                person
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-label text-label-md text-charcoal">
                كلمة المرور
              </label>
              <span className="text-body-sm text-primary font-semibold">
                بوابة المالك
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-outline rounded-DEFAULT px-4 py-3 pr-11 font-body text-body-md text-charcoal focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                placeholder="أدخل كلمة المرور"
              />
              <span className="material-symbols-outlined absolute right-3 text-light-on-surface-variant pointer-events-none text-xl">
                lock
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-outline text-primary focus:ring-primary h-4 w-4"
              />
              <span className="font-body text-body-sm text-light-on-surface-variant">
                تذكر تسجيل الدخول
              </span>
            </label>
            <span className="text-body-sm text-light-on-surface-variant">
              النسخة الداخلية v1.2
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-opacity-95 text-on-primary font-label text-label-lg py-3.5 px-4 rounded-DEFAULT transition duration-state-change shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-6 disabled:opacity-50"
          >
            <span>{loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول للنظام'}</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-light-gray text-center">
          <p className="font-body text-body-sm text-light-on-surface-variant">
            نظام مركزي مبسط ومصمم خصيصاً لإدارة عمليات التعتيق وحساب النفقات.
          </p>
          <div className="flex items-center justify-center gap-3 mt-3 text-body-sm text-light-on-surface-variant font-medium">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base text-primary">call</span>
              01093313193
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base text-primary">mail</span>
              elbeekb2b@gmail.com
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

