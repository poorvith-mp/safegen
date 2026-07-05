<div align="center">

<img src="assets/safegen-logo.svg" alt="SafeGen logo" width="80"/>

# SafeGen

**A secure password generator that never leaves your browser.**

![Status](https://img.shields.io/badge/status-launch%20ready-brightgreen)
![Security](https://img.shields.io/badge/network%20calls-zero-blue)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

## The Problem

Most "secure" password generators ask you to trust a server you can't see. Even if they claim not to log anything, you have no way to verify it.

## The Solution

SafeGen generates every password entirely client-side. No backend, no API calls, no analytics. The only thing it remembers is your theme and accent preference — stored locally in your browser, never transmitted.

---

## ✨ Features

- Fully offline-capable password generation
- Light / dark theme toggle
- 4 accent color options (Indigo, Emerald, Rose, Amber)
- One-click copy workflow
- Editable profile, legal docs, and social links built in
- Zero external dependencies or CDN requests

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Markup | Semantic HTML5 |
| Styling | Vanilla CSS with custom properties (theming system) |
| Logic | Vanilla JavaScript (no framework, no build step) |
| Storage | `localStorage` (preferences only) |
| Hosting | Static — deployable anywhere (GitHub Pages, Vercel, Netlify) |

## 📐 How It Works

```
User opens index.html
        │
        ▼
script.js generates password in-memory
        │
        ▼
Displayed in UI + copy-to-clipboard
        │
        ▼
Preferences (theme/accent/length) saved to localStorage
        │
        ▼
(Nothing else happens. No network call. Ever.)
```

## 👤 Target Users

| User | Why SafeGen |
|---|---|
| Privacy-conscious individuals | No server, no trust required |
| Developers | Clean, auditable single-file codebase |
| Students / indie builders | Free, open reference implementation |

## 💸 Pricing

Free. No tiers, no paywall, no account required.

## 🧭 More from Poorvith M P

| Project | What it does |
|---|---|
| [AiScrubber](https://github.com/prvthmpcypher/aiscrubber) | Client-side privacy scrubber for AI prompts |
| [PaperHive](https://github.com/prvthmpcypher/paperhive) | Offline-first PDF toolkit |
| [PortfolioGen](https://github.com/prvthmpcypher/portfoliogen) | Browser-only portfolio generator |
| [CypherPDF](https://github.com/prvthmpcypher/cypherpdf) | Clutter-free PDF reader for Android |

## 🗺 Roadmap

- [ ] Optional passphrase generation mode
- [ ] Export Open Graph / meta tags for richer link previews
- [ ] Split legal pages into standalone HTML files
- [ ] Add CSP meta tag for defense-in-depth

## 🤝 Contributing

Issues and PRs welcome. Keep it dependency-free and zero-network — that's the whole point of this project.

## 📄 License

Released under the [MIT License](LICENSE) — © 2026 Poorvith M P

## 🔗 Links

[![GitHub](https://img.shields.io/badge/GitHub-prvthmpcypher-181717?logo=github)](https://github.com/prvthmpcypher)
[![X](https://img.shields.io/badge/X-@poorvithmp07-000000?logo=x)](https://x.com/poorvithmp07)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-poorvithmp-0A66C2?logo=linkedin)](https://linkedin.com/in/poorvithmp)

---

*Built by [Poorvith M P](https://poorvithmp.vercel.app) — "I learn by shipping."*
