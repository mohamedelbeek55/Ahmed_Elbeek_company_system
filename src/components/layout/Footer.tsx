import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-light-surface border-t border-outline py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        
        <div>
          <p className="font-headline text-headline-sm font-bold text-charcoal">
            شركة أحمد البيك للاستيراد والتصدير
          </p>
          <p className="font-body text-body-sm text-light-on-surface-variant">
            نظام إدارة وتسيير قوافل الشاحنات — الإصدار المؤسسي المعتمد v1.2
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-body-sm text-charcoal font-medium tabular-nums">
          <a
            href="tel:01093313193"
            className="inline-flex items-center gap-1.5 hover:text-primary transition"
          >
            <span className="material-symbols-outlined text-primary text-base">call</span>
            <span>01093313193</span>
          </a>
          <span className="text-outline hidden sm:inline">|</span>
          <a
            href="mailto:elbeekb2b@gmail.com"
            className="inline-flex items-center gap-1.5 hover:text-primary transition"
          >
            <span className="material-symbols-outlined text-primary text-base">mail</span>
            <span>elbeekb2b@gmail.com</span>
          </a>
        </div>

      </div>
    </footer>
  );
}
