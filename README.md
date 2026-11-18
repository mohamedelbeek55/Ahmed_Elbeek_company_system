# Ahmed Elbeek Fleet & Convoy Management System
### شركة أحمد البيك للاستيراد والتصدير — نظام إدارة وتسيير قوافل الشاحنات

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

---

## 📌 Executive Overview

**Ahmed Elbeek Convoy & Fleet Management System** is an enterprise-grade digital platform engineered specifically for **Ahmed Elbeek Import & Export** (`شركة أحمد البيك للاستيراد والتصدير`). The system orchestrates, monitors, and finances cross-border commercial freight convoys traveling between mainland Egypt and vital trade border terminals: **Rafah Port (`ميناء رفح`)** and **Al-Awja Port (`ميناء العوجة`)**.

Built as a specialized operational portal for company owner **Eng. Ahmed Elbeek**, the application streamlines the entire logistics lifecycle: from initial convoy dispatch and driver manifest coordination to single-click completion ("تعتيق"), real-time financial clearance, dynamic demurrage calculation, and automated generation of legally certified, high-DPI official PDF statements with native WhatsApp file attachment dispatch.

---

## 🌟 Core System Capabilities & Features

### 1. Cross-Border Port Operations & Convoy Dispatch
- **Operational Port Segregation:** Dedicated tracking for **Rafah Port** and **Al-Awja Port**, ensuring complete operational separation and port-specific accounting.
- **Clean Convoy Initiation (`/convoys/new`):**
  - No rigid hardcoded defaults; inputs start completely clean with helpful placeholder suggestions.
  - Simplified logistics data entry requiring **calendar dates only** (`YYYY-MM-DD`) without burdensome hours/minutes pickers, matching operational border realities.
  - Automatic consecutive numbering (`ELB-YYYY-PORT-XXX`) preventing duplicate paperwork.

### 2. Automated Financial Logistics Engine (`/convoys/[id]/calculate`)
- **Accurate Accommodation Demurrage Formula:**
  - Implements the certified logistics rule where the day of loading and the day of completion are excluded from overnight accommodation charges:
    $$\text{Accommodation Nights} = \max(0, \text{CompletionDate} - \text{LoadingDate} - 1)$$
  - Multiplied across the entire fleet size:
    $$\text{Total Accommodation} = \text{Nights} \times \text{Daily Rate} \times \text{Truck Count}$$
- **Full-Fleet Freight Calculation:**
  $$\text{Total Freight} = \text{Freight Rate Per Truck} \times \text{Truck Count}$$
- **Independent Customs Clearance & Yard Fees:**
  - Independent customs clearance expenses (`رسوم التخليص الجمركي`).
  - Terminal yard storage and refrigerated truck demurrage (`أرضيات مبيت داخل المنفذ`).
- **Dynamic Custom Invoice Items:**
  - Business owners can add unlimited custom cost items on the fly (e.g., special security escorts, weighbridge tickets, gate cards, additional labor) with custom Arabic labels and amounts.
- **Arabic Currency Formatting & Tafqeet:**
  - Real-time conversion of numerical grand totals into formal Arabic financial prose (`فقط ... لا غير`).

### 3. High-Fidelity Vector PDF Export Engine (`/convoys/[id]/statement`)
- **High-DPI SVG Vector Rendering:**
  - Replaces traditional canvas captures with an isolated SVG `<foreignObject>` capture engine running at $2\times$ pixel ratio ($1588 \times 2246$ px for A4 standard).
  - Inlines Google Cairo fonts directly as base64 to eliminate Arabic letter disconnects and RTL layout drift.
  - Automatically replaces SVG icons with high-resolution $4\times$ PNG representations for razor-sharp printing.
- **Corporate Visual Identity:**
  - High-resolution circular Ahmed Elbeek logo.
  - Signature corporate crimson red divider bar (`#B51F2D`).
  - Dark charcoal header tables (`#262626`) with crisp white typography and light gray borders.
  - Subtle company watermark in the document background.
  - Permanent contact footer (`01093313193` | `elbeekb2b@gmail.com`) and electronic verification badge.

### 4. Direct WhatsApp PDF Document Sharing
- **Native Web Share API Attachment:**
  - Generates the exact certified PDF statement as an in-memory `Blob` and shares it as an actual **document attachment** (`application/pdf`) directly through the operating system's native share sheet.
  - **Dynamic File Naming:** Named automatically according to company convention:  
    `[اسم البضاعة] - [عدد العربيات] عربيات - [تاريخ اليوم].pdf`  
    *(Example: `رمان وندرفل - 5 عربيات - 2026-11-19.pdf`)*.
- **Desktop Fallback Support:**
  - For desktop browsers without Web Share file capabilities, the system automatically triggers a clean PDF download, opens WhatsApp Web, and displays an Arabic guidance modal.

### 5. Driver Manifest & Fleet Coordination (`/convoys/[id]/drivers`)
- **Official Manifest Fields:** Tracks sequence number, assigned port, driver full name, 14-digit National ID (`الرقم القومي`), truck plate number, and trailer plate number.
- **Dedicated Driver Manifest PDF:** Allows one-click export of an independent certified driver manifest document formatted for border checkpoint authorities.

### 6. Mobile-First Responsive Design (All Screen Sizes)
- **Responsive Mobile Card Views:** Automatically replaces multi-column tables on mobile viewports (`< 768px`) with clean, touch-friendly individual convoy cards.
- **Sticky Real-Time Calculation Bar:**
  - On mobile screens during cost calculation, a persistent bottom bar keeps the real-time Grand Total and nights count visible with an instant "Preview PDF" trigger.
  - A highlighted top summary card gives instant visual feedback as numbers are entered.
- **Touch-Optimized Numeric Keypads:**
  - All financial and quantity inputs feature `inputMode="decimal"` and `inputMode="numeric"` to trigger the numeric keypad immediately on iOS and Android.
  - Generous touch targets ($\ge 44\text{px}$) designed for frictionless field use.

### 7. Institutional Archive & Metrics Dashboard (`/archive` & `/`)
- **Real-Time KPIs:** Live metrics showing active convoys, total trucks currently on the road, completed convoys, and total certified PDF statements issued.
- **Multi-Port Filtering:** Fast filter tabs (`عرض الكل`, `ميناء رفح`, `ميناء العوجة`, `قوافل جارية`, `قوافل معتّقة`).
- **Instant Search:** Instant search by cargo name or convoy reference number.

---

## 🛠️ Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14** (App Router) | React 18, Server/Client components, dynamic routing |
| **Language** | **TypeScript 5.x** | Strict typing across financial schemas and database rows |
| **Styling** | **Tailwind CSS 3.4** | Custom design system tokens, Cairo Arabic typography, RTL |
| **Database** | **Supabase (PostgreSQL)** | Persistent storage, Row Level Security (RLS) policies |
| **Authentication** | **Supabase Auth** | Secure owner gateway and session management |
| **PDF Generation** | **jsPDF + SVG `<foreignObject>`** | Custom vector rendering with font and asset inlining |
| **Mobile UX** | **Mobile-First CSS / Web Share** | Mobile card views, sticky touch bars, native Web Share API |
| **Testing** | **Node.js Automated Test Suite** | 7 comprehensive unit and integration tests |
| **Hosting** | **Vercel** | Edge-optimized Next.js hosting with automated CI/CD |

---

## 📂 Project Directory Structure

```
Ahmed_Elbeek_company_system/
├── assets/                          # Corporate reference assets and logo files
│   └── reference/                   # Official stamps, letterheads, and sample receipts
├── public/                          # Static public assets
│   ├── logo.png                     # Official Ahmed Elbeek circular company emblem
│   └── favicon.ico                  # Browser favicon
├── src/
│   ├── app/                         # Next.js 14 App Router pages
│   │   ├── layout.tsx               # Root layout, Cairo font, RTL configuration
│   │   ├── page.tsx                 # Executive Dashboard & KPIs
│   │   ├── globals.css              # Custom styling, print media rules, animations
│   │   ├── login/page.tsx           # Owner portal authentication
│   │   ├── convoys/
│   │   │   ├── page.tsx             # Convoys directory (Mobile Cards & Desktop Table)
│   │   │   ├── new/page.tsx         # Clean convoy dispatch form (Rafah / Al-Awja)
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # Convoy overview & "تعتيق" (Unload) modal
│   │   │       ├── calculate/       # Interactive cost calculator & mobile sticky bar
│   │   │       ├── statement/       # PDF preview, download, and WhatsApp share
│   │   │       └── drivers/         # Driver manifest coordinator & PDF export
│   │   ├── archive/page.tsx         # Archival statement repository
│   │   └── settings/page.tsx        # Company legal data & commercial registry
│   ├── components/
│   │   └── layout/                  # Shared UI components (Navbar, Footer)
│   ├── lib/
│   │   ├── calculations.ts          # Demurrage formulas, freight math, Arabic Tafqeet
│   │   ├── logoBase64.ts            # Base64 inlined company emblem for PDF engine
│   │   ├── pdf-icons.ts             # 4x raster icons for clean PDF rendering
│   │   ├── pdf.ts                   # High-DPI vector SVG PDF generation service
│   │   ├── store.ts                 # Supabase repository and local cache fallback
│   │   └── supabase/client.ts       # Supabase client configuration
│   └── types/
│       └── database.types.ts        # Database TypeScript interface definitions
├── supabase/
│   └── migrations/                  # PostgreSQL schema, RLS policies, and triggers
├── tests/
│   └── run_tests.js                 # Automated business rules & Web Share test runner
├── .env.example                     # Environment variables template
├── package.json                     # Project dependencies and npm scripts
├── tailwind.config.js               # Corporate theme, colors, and typography
└── tsconfig.json                    # TypeScript compiler options
```

---

## 🧮 Mathematical & Business Rules Reference

### 1. Demurrage Nights Calculation
$$\text{Nights} = \max\left(0, \left\lfloor\frac{\text{CompletionDate} - \text{LoadingDate}}{86400000}\right\rfloor - 1\right)$$
*Example:* A convoy loaded on **November 15** and unloaded on **November 20** spans 5 calendar days. Excluding the loading day and unloading day yields **3 billable nights**.

### 2. Grand Total Calculation
$$\text{Grand Total} = \text{Total Accommodation} + \text{Total Freight} + \text{Customs Clearance} + \text{Port Demurrage} + \sum \text{Custom Items}$$

### 3. Average Cost Per Truck
$$\text{Average Cost Per Truck} = \frac{\text{Grand Total}}{\text{Truck Count}}$$

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **npm** or **pnpm**
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mohamedelbeek55/Ahmed_Elbeek_company_system.git
   cd Ahmed_Elbeek_company_system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` and configure your Supabase project credentials:
   ```bash
   cp .env.example .env.local
   ```
   Add your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
   ```

4. **Execute Automated Tests:**
   Verify business rules, financial formulas, and share logic:
   ```bash
   npm test
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser at [http://localhost:3000](http://localhost:3000).

6. **Build for Production:**
   ```bash
   npm run build
   ```

---

## ☁️ Deployment to Vercel

The application is fully optimized for one-click deployment on **Vercel**:

1. Log in to [Vercel](https://vercel.com/) with your GitHub account.
2. Click **Add New** &rarr; **Project** and import `mohamedelbeek55/Ahmed_Elbeek_company_system`.
3. In **Environment Variables**, provide:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Click **Deploy**. Vercel will build and deploy the Next.js application with automatic SSL and edge caching. Every future push to `main` will automatically trigger a production deployment.

---

## 🧪 Automated Test Suite

The repository contains an automated verification suite in `tests/run_tests.js` testing critical financial and operational requirements:

- **Test 1:** Demurrage nights calculation excluding loading and completion days.
- **Test 2:** Safety floor protecting against negative night calculations if dates are inverted.
- **Test 3:** Multi-truck freight and accommodation financial formulas.
- **Test 4:** Port segregation between Rafah Port and Al-Awja Port.
- **Test 5:** Preservation of lump-sum customs clearance without accidental multiplication.
- **Test 6:** Port demurrage yard fees and dynamic custom cost items summation.
- **Test 7a:** Web Share API file attachment format with dynamic Arabic file naming.
- **Test 7b:** Graceful user cancellation handling.
- **Test 7c:** Automatic fallback download on non-supported browsers.

Run the test suite anytime:
```bash
node tests/run_tests.js
```

---

## 🔒 Security & Data Integrity

- **Environment Isolation:** All secret keys, Supabase tokens, and local configuration files are excluded via `.gitignore`.
- **Database Protection:** Supabase PostgreSQL tables utilize Row Level Security (RLS) restricting write operations to authenticated sessions.
- **Client Key Restriction:** Only public/anon keys prefixed with `NEXT_PUBLIC_` are bundled on the client side; service-role keys are never exposed.

---

## 🏢 Corporate Ownership & Contact

**Ahmed Elbeek Import & Export**  
*Logistics, International Freight & Port Forwarding*  
- **Owner:** Eng. Ahmed Elbeek (`م. أحمد البيك`)
- **Direct Phone:** `01093313193`
- **Official Email:** `elbeekb2b@gmail.com`
- **Headquarters:** Cairo & Operational Terminals at Rafah and Al-Awja Ports, Egypt.

---
*Built with precision for enterprise land freight and international trade management.*
