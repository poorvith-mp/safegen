# Design System Overview

Complete reference for typography (font families, font sizes) and color palettes used across the website.

---

## 1. Typography & Font Families

The site uses 4 custom font families defined in `tailwind.config.js` and `index.css`:

1. **Headline Font (`font-headline`)** â€” Playfair Display (Serif)
   - Usage: Main page titles, hero headings, section headers, and key quotation blocks.
2. **Body Font (`font-body`)** â€” DM Sans & Plus Jakarta Sans (Sans-Serif)
   - Usage: Primary body paragraphs, article reading text, detailed summaries, and form inputs.
3. **Label & Badge Font (`font-label`)** â€” Geist (Sans-Serif)
   - Usage: Navigation tabs, category pills, system badges, buttons, uppercase tracking labels (`uppercase tracking-wider`).
4. **Monospace Font (`font-mono`)** â€” Geist Mono (Monospace)
   - Usage: User handles (`@username`), dates, statistics, code blocks, and technical specs.

---

## 2. Font Size Scale & Hierarchy

Responsive font scale:

| Element | Class Name | Rem / Pixel Size | Font Weight & Style |
| :--- | :--- | :--- | :--- |
| Hero Display Titles | `text-4xl` to `text-6xl` | 2.25rem â€“ 3.75rem (36px â€“ 60px) | `font-headline font-bold leading-[1.06]` |
| Main Page Titles (H1) | `text-4xl` to `text-5xl` | 2.25rem â€“ 3.0rem (36px â€“ 48px) | `font-headline font-bold tracking-tight` |
| Section Titles (H2) | `text-2xl` to `text-3xl` | 1.5rem â€“ 1.875rem (24px â€“ 30px) | `font-headline font-bold` |
| Subheadings (H3) | `text-lg` to `text-xl` | 1.125rem â€“ 1.25rem (18px â€“ 20px) | `font-headline font-bold` |
| Body Paragraphs | `text-base` to `text-lg` | 1.0rem â€“ 1.125rem (16px â€“ 18px) | `font-body text-slate-700 leading-relaxed` |
| Small Descriptions | `text-xs` to `text-sm` | 0.75rem â€“ 0.875rem (12px â€“ 14px) | `font-body text-slate-600` |
| Badges / Category Pills | `text-[10px]` to `text-xs` | 10px â€“ 12px | `font-label font-bold uppercase tracking-widest` |
| Code & Handles | `text-xs` to `text-sm` | 12px â€“ 14px | `font-mono text-emerald-700 font-bold` |

---

## 3. Complete Color Palette

### A. Base Neutral & Slate Spectrum (Light & Dark Themes)

- **Primary Dark / Slate 950**: `#020617` & `#0f172a`
  - Usage: Dark hero banners, primary action buttons, dark mode headers, code editor backgrounds.
- **Light Primary / Slate 50**: `#f8fafc` & `#ffffff`
  - Usage: Light-mode page background, card surfaces, modal dialog backgrounds.
- **Borders & Dividers / Slate 200 & 300**: `#e2e8f0` & `#cbd5e1`
  - Usage: Glassmorphism card borders, section divider lines, input field outlines.
- **Muted Body Text / Slate 500 & 600**: `#64748b` & `#475569`
  - Usage: Secondary descriptions, dates, footers, read-time labels.

### B. Brand Accent & Functional State Colors

- **Emerald Accent (Primary Identity & Success)**
  - `#059669` (`bg-emerald-600`), `#10b981` (`bg-emerald-500`): Live demo buttons, primary CTAs, checkmarks.
  - `#ecfdf5` (`bg-emerald-50`), `#065f46` (`text-emerald-800`): Verified badges, active category pills, success notification toasts.
- **Amber Warning (Category Accents & Lock States)**
  - `#d97706` (`text-amber-600`), `#fffbeb` (`bg-amber-50`): Lock badges, category tags, warning alerts.
- **Red Danger (Security & Deletion)**
  - `#dc2626` (`bg-red-600`), `#fef2f2` (`bg-red-50`): Permanent deletion buttons, multi-step confirmation warnings, error toasts.
- **Blue & Purple (Code & Tech Badges)**
  - `#2563eb` (`blue-600`), `#9333ea` (`purple-600`): IDE syntax highlights, system badges, tech stack tags.

### C. Glassmorphism Design Tokens (`index.css`)

- **`.glass-surface`**: `background: rgba(255, 255, 255, 0.75)` with `backdrop-filter: blur(28px)` and subtle white inset border.
- **`.glass-card-interactive`**: `background: rgba(255, 255, 255, 0.8)` with `backdrop-filter: blur(20px)`, smooth `-6px` lift on hover, and slate shadow.

