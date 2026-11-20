# PlanDroid Mobile — PWA Installation & Mobile Usage Guide

![PlanDroid Mobile](https://img.shields.io/badge/PlanDroid-Mobile%20PWA-5A0FC8?style=for-the-badge&logo=pwa)
![Android](https://img.shields.io/badge/Android-Installable-3DDC84?style=flat-square&logo=android)
![iOS](https://img.shields.io/badge/iOS-Add%20to%20Home%20Screen-000000?style=flat-square&logo=apple)
![Offline](https://img.shields.io/badge/Offline-First-FF6B35?style=flat-square)

---

## 📱 Overview

PlanDroid Mobile is the **Progressive Web App (PWA)** version of PlanDroid — a single codebase that installs and runs natively on **Android**, **iOS**, and **Desktop** without app store distribution. Built with offline-first architecture, it delivers a native-like experience while keeping your data entirely on your device.

### Why PWA?
| Benefit | Description |
|---------|-------------|
| **No App Store** | Install directly from browser; no review delays, no fees |
| **Single Codebase** | Web + Mobile from one React/TypeScript project |
| **Instant Updates** | Service Worker auto-updates; no manual downloads |
| **Storage Efficient** | ~2-5 MB installed vs. 50-200 MB native apps |
| **Privacy First** | Zero cloud sync unless you enable it; all data local |

---

## 📥 Installation Instructions

### Android (Chrome, Edge, Brave, Firefox)
1. Open PlanDroid in your browser: `https://your-domain.com` or `http://localhost:3000`
2. Tap **⋮ Menu** (top-right) → **"Install app"** or **"Add to Home screen"**
3. Confirm **"Install"** in the prompt
4. PlanDroid appears in app drawer & home screen with its own icon

> **Chrome Custom Tab Note**: If opened via a link from another app, use the address bar menu (⋮) → "Open in Chrome" first, then install.

### iOS / iPadOS (Safari Only)
1. Open PlanDroid in **Safari** (other browsers don't support PWA install on iOS)
2. Tap **Share** (□↑) → Scroll down → **"Add to Home Screen"**
3. Optionally edit name → Tap **"Add"**
4. App appears on Home Screen; launches fullscreen (no Safari UI)

> **iOS Limitations**: Background timer persistence limited; push notifications require iOS 16.4+ and explicit permission. Service Worker caching works but background execution is restricted.

### Desktop (Windows, macOS, Linux, ChromeOS)
- **Chrome/Edge**: Address bar 📥 icon → "Install PlanDroid"
- **Firefox**: Menu → "Install this site as an app" (may require `about:config` → `webapps.enable` = true)
- Creates standalone window with native title bar, taskbar/dock icon

---

## 🎯 Mobile-Optimized Features

### Touch-First Interface
| Interaction | Implementation |
|-------------|----------------|
| **Drag-to-Reorder** | Touch events on grip handle + `elementFromPoint` for drop targets |
| **Swipe Gestures** | Horizontal scroll on filter chips, quick-action pills |
| **Large Tap Targets** | Minimum 44×48px on all buttons, checkboxes, icons |
| **Haptic Feedback** | `navigator.vibrate()` on timer completion, task done |
| **Safe Area Insets** | `env(safe-area-inset-bottom)` for notches/home indicator |

### Background Timer Persistence
PlanDroid's focus timer **continues running** when:
- Screen turns off / device locks
- App is backgrounded / switched away
- Browser tab is hidden (desktop)

**How it works:**
1. Timestamp-based calculation (`targetEndTime` + `Date.now()`) — no `setInterval` drift
2. `visibilitychange` + `focus` event listeners recalculate on wake
3. Service Worker shows persistent notification with live countdown
4. On completion: vibration + alarm sound + completion notification (even if screen off)

> **Android**: Full background execution supported.
> **iOS**: Timer persists but alarms may be delayed if iOS suspends SW; use "Add to Home Screen" for best results.

### Native Notification Integration
| Feature | Android | iOS (16.4+) |
|---------|---------|-------------|
| **Pinned Plan** | ✅ Status bar persistent | ✅ Notification Center |
| **Timer Countdown** | ✅ Live updating | ⚠️ Periodic updates |
| **Completion Alert** | ✅ Vibration + sound | ✅ Sound (if permitted) |
| **Task Reminders** | ✅ Scheduled via SW | ⚠️ Limited background |
| **Action Buttons** | ✅ Mark Done / Snooze | ⚠️ Open app only |

**Permission Flow:**
1. Settings → Notifications → "Enable Phone Notifications"
2. Browser prompts for permission → Allow
3. Pin any task → Appears in system notification tray

---

## ⚙️ Mobile-Specific Settings

Access via **Settings** (gear icon in bottom nav) → scroll to relevant sections:

### Alarm & Sound (Optimized for Mobile)
- **Alarm Melody**: Bell / Digital / Chime / Harp (test with "Test Sound")
- **Volume**: 0–100% slider + presets (25/50/80/100%)
- **Repeat Interval**: Sustained pulse / 15s / 30s / 1m / 2m / Play once
- **1-Minute Warning**: Gentle dual-tone chime before session ends
- **Vibration**: On/Off (uses `navigator.vibrate([300,150,300,150,450])`)

### Quiet Hours (Do Not Disturb)
- **Enable**: Toggle on
- **From/To**: Time pickers (default 22:00 – 07:00)
- Silences all reminder nudges during window; timer alarms still fire

### Persistent Reminders
- **Interval**: 15 / 30 / 60 minutes
- Nudges unfinished urgent tasks throughout workday
- Respects Quiet Hours

### Display & Theme
- **Dark / Light / System Auto** — respects OS preference when "System" selected
- **Time Format**: 24-hour (14:30) or 12-hour (2:30 PM)
- **Week Starts**: Monday or Sunday

---

## 📴 Offline Usage

PlanDroid is **fully functional offline** after first load:

| Capability | Offline Support |
|------------|-----------------|
| **Task CRUD** | ✅ localStorage + IndexedDB |
| **Auto-Schedule** | ✅ Pure JS engine |
| **Focus Timer** | ✅ Web Audio API (no network) |
| **Notifications** | ✅ Service Worker (local) |
| **Habits/Streaks** | ✅ Local calculation |
| **Analytics/Charts** | ✅ Recharts (client-side) |
| **AI Coach** | ⚠️ Falls back to offline responses |
| **Backup/Restore** | ✅ JSON file download/upload |

**First Load**: Visit online once → Service Worker caches all assets → Works offline forever.

---

## 🔧 Troubleshooting Mobile Issues

### "Install" Option Not Showing
| Platform | Fix |
|----------|-----|
| **Android** | Must use HTTPS (or localhost); clear browser cache; try Chrome/Edge |
| **iOS** | Must use Safari; not available in Chrome/Firefox on iOS |
| **Desktop** | Check `chrome://apps` or `edge://apps`; ensure PWA enabled |

### Timer Stops When Screen Off
- **Android**: Disable battery optimization for browser (Settings → Apps → Chrome → Battery → Unrestricted)
- **iOS**: Known limitation; keep app in foreground for critical timers
- **Workaround**: Enable "Pinned Notification" — shows live countdown in notification shade

### Notifications Not Appearing
1. Settings → Notifications → Check "Phone notifications enabled" badge
2. Browser settings → Site permissions → Notifications → Allow
3. Android: Settings → Apps → Chrome → Notifications → Allow
4. iOS: Settings → Notifications → Safari/PlanDroid → Allow

### Audio Not Playing
- **Autoplay Policy**: Browsers require user gesture first
- **Fix**: Tap "Test Sound" in Settings → Alarm section after install
- **iOS**: Silent switch (side button) mutes Web Audio — toggle off

### Data Loss After Browser Clear
- **Prevention**: Export JSON backup regularly (Settings → Backup → Export Full JSON Backup)
- **Recovery**: Import same JSON file; IndexedDB mirror may auto-restore

---

## 📐 Responsive Breakpoints (Mobile-First)

```css
/* Tailwind breakpoints used in components */
sm:  640px   /* Tablet portrait / large phone landscape */
md:  768px   /* Tablet landscape */
lg:  1024px  /* Desktop */
xl:  1280px  /* Wide desktop */
```

### Layout Adaptations
| Component | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|-----------|-----------------|---------------------|-------------------|
| **Timeline** | Single column segments | Side-by-side morning/afternoon | Three columns |
| **Kanban** | Horizontal scroll | 2 columns + 1 | 3 columns |
| **Weekly Planner** | Agenda/List default | Calendar 2-col | Calendar 7-col |
| **Modals** | Full-screen bottom sheet | Centered max-w-lg | Centered max-w-md |
| **Bottom Nav** | Fixed, 4 tabs | Fixed, centered max-w-md | Fixed, centered max-w-md |

---

## 🧪 Testing Checklist (Mobile QA)

### Installation & Launch
- [ ] Install from Chrome Android → appears in app drawer
- [ ] Install from Safari iOS → fullscreen launch, no Safari UI
- [ ] Install from Chrome Desktop → standalone window
- [ ] Offline: Enable Airplane mode → app loads & functions
- [ ] Update: Deploy new version → SW shows "New version available" toast

### Core Flows
- [ ] Create plan → auto-schedules → appears in timeline
- [ ] Pin plan → shows in Android notification tray
- [ ] Start focus timer → background persists → completes with alarm
- [ ] Complete task → confetti + streak updates
- [ ] Switch to Kanban → drag between columns
- [ ] Weekly view → Calendar/Agenda/List toggle
- [ ] Analytics → Recharts renders, tooltip works on touch
- [ ] Settings → All toggles persist after reload
- [ ] Habits → 7-day dots toggle, streak calculates
- [ ] AI Coach → Send message → receives response (or fallback)
- [ ] Backup → Export JSON → Import JSON → data restored

### Edge Cases
- [ ] Virtual keyboard opens → modal resizes (visualViewport)
- [ ] Screen rotation (if unlocked) → layout adapts
- [ ] Low storage warning → IndexedDB quota handling
- [ ] Date change at midnight → streak recalculates
- [ ] Timezone change → schedules adjust correctly

---

## 📦 Building for Production (Mobile)

```bash
# Production build (outputs to /dist)
npm run build

# Preview production build locally
npm run preview
# Visit http://localhost:4173 on phone (same WiFi)

# Or serve with Express (includes API for AI Coach)
npm run start
# Visit http://<server-ip>:3000
```

### Deploy Targets (Static + API)
| Platform | Static Hosting | API Server |
|----------|----------------|------------|
| **Vercel** | `vercel --prod` | Serverless Functions |
| **Netlify** | `netlify deploy --prod` | Netlify Functions |
| **Cloudflare Pages** | `wrangler pages deploy` | Cloudflare Workers |
| **Firebase Hosting** | `firebase deploy` | Cloud Functions |
| **GitHub Pages** | `gh-pages -d dist` | ❌ (static only) |
| **Docker** | `nginx` + `dist/` | `node server.ts` |

> **Note**: AI Coach requires Node.js server for `/api/gemini/chat` proxy. Static-only hosts need separate Functions/Workers.

### PWA Checklist (Pre-Deploy)
- [ ] `manifest.webmanifest` served with `Content-Type: application/manifest+json`
- [ ] `sw.js` served with `Service-Worker-Allowed: /`
- [ ] Icons: 192×192, 512×512 (any + maskable)
- [ ] `apple-touch-icon.png` (180×180) present
- [ ] HTTPS enforced (required for PWA install)
- [ ] `Cache-Control: no-cache` for `sw.js` and manifest
- [ ] CORS headers on icons for WebAPK minting

---

## 🔗 Deep Linking & Sharing

### URL Structure (Hash-based SPA)
```
https://app.plandroid.com/#/              → Plans (Timeline)
https://app.plandroid.com/#/weekly        → Weekly Planner
https://app.plandroid.com/#/analytics     → Analytics
https://app.plandroid.com/#/settings      → Settings
```

### Share Current Plan (Future)
```javascript
// Planned: Web Share API integration
if (navigator.share) {
  await navigator.share({
    title: task.title,
    text: `${task.startTime}–${task.endTime} • ${task.durationMinutes}m`,
    url: window.location.href
  });
}
```

---

## 📋 Mobile-Specific File Manifest

```
public/
├── manifest.webmanifest       # PWA manifest (primary)
├── manifest.json              # Legacy manifest (fallback)
├── sw.js                      # Service Worker (Workbox-generated)
├── pwa-192x192.png            # Icon 192px (any)
├── pwa-maskable-192x192.png   # Icon 192px (maskable - Android adaptive)
├── pwa-512x512.png            # Icon 512px (any)
├── pwa-maskable-512x512.png   # Icon 512px (maskable - splash screens)
├── apple-touch-icon.png       # iOS Home Screen (180x180)
├── favicon.ico                # Legacy browser icon
└── icon.svg                   # SVG source icon
```

### Icon Generation (scripts/generate-icons.mjs)
```bash
# Regenerate all icons from icon.svg
node scripts/generate-icons.mjs
# Uses sharp to resize + create maskable variants with safe zone padding
```

---

## 📖 Related Documentation

- **[README.md](README.md)** — Full project overview, features, tech stack, desktop/web usage
- **[CHANGELOG.md](CHANGELOG.md)** — Version history (if maintained)
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Development workflow (if maintained)

---

## 🆘 Support

| Channel | Link |
|---------|------|
| **Bug Reports** | [GitHub Issues](https://github.com/your-username/PlanDroid/issues/new?template=bug_report.md) |
| **Feature Requests** | [GitHub Issues](https://github.com/your-username/PlanDroid/issues/new?template=feature_request.md) |
| **Mobile-Specific Issues** | Label: `mobile` / `pwa` / `android` / `ios` |
| **Discussions** | [GitHub Discussions](https://github.com/your-username/PlanDroid/discussions) |

---

**PlanDroid Mobile** — Your pocket productivity partner. 📱⚡

*Install once, focus forever.*