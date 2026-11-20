# PlanDroid Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-XX-XX — Initial Release

### 🎉 Added
- **Core Planning Engine**
  - Offline-first auto-scheduler with priority, energy level, and preferred slot awareness
  - Natural language task input parser (`"Deep work 45m urgent morning"`)
  - Fixed-time task locking with conflict detection
  - One-click daily rebalance from current time
  - Recurring tasks: daily, weekdays, weekly, custom days

- **Task Management**
  - Rich task model: title, description, category, duration, priority (4 levels), energy level, preferred slot
  - Custom categories with 12-color palette + tag management modal
  - Timeline view (Morning/Afternoon/Evening segments) with drag-to-reorder (mouse + touch)
  - Kanban board (Active/Queued/Completed) with drag-and-drop
  - Quick-start presets: Deep Work, Team Sync, Break

- **Focus Timer (Pomodoro)**
  - Countdown & stopwatch modes
  - Focus / Break session toggle
  - Ambient audio: Brown Noise, White Noise, Rain, Alpha Wave (10Hz)
  - Configurable alarm melodies: Bell, Digital, Chime, Harp
  - Sustained/repeating alarm intervals (play once, 15s, 30s, 1m, 2m, continuous)
  - 1-minute warning chime
  - Background persistence via timestamp-based calculation
  - Floating mini-bar when modal collapsed

- **Notifications & Reminders**
  - Pinned notification drawer (active task always visible)
  - Android/OS native notification pinning via Service Worker
  - Task start reminders with configurable offsets
  - Persistent nudges for unfinished urgent tasks
  - Quiet hours (Do Not Disturb window)
  - Vibration support on completion/alarms

- **Analytics & Gamification**
  - 7-day interactive charts (Recharts): tasks, sessions, focus time
  - Daily & weekly progress bars with motivational messages
  - Productivity streak: consecutive 100% completion days
  - Milestone system (3, 7, 14, 21, 30, 60, 100+ days)
  - Overdue & upcoming task action lists
  - Daily briefing clipboard export

- **AI Productivity Coach**
  - Gemini 3.8 Flash / 3.1 Flash-Lite integration
  - Context-aware: knows streak, today's tasks, completion status, schedule
  - Coaching: streak protection, task breakdown, schedule optimization, cognitive resets
  - Conversation persistence in localStorage
  - Offline fallback responses

- **Internationalization**
  - English (default)
  - Amharic (አማርኛ) — full UI translation

- **Data & Backup**
  - Dual persistence: localStorage + IndexedDB mirror
  - Full JSON backup/restore (tasks, habits, categories, config, settings, sessions, goals)
  - Project source ZIP download
  - Auto-recovery from IndexedDB if localStorage cleared

- **PWA / Mobile**
  - Service Worker (Workbox) with precaching + SPA fallback
  - Web App Manifest: standalone, portrait, maskable icons
  - Installable on Android, iOS, Desktop
  - Touch-first interactions, safe area insets, visual viewport handling
  - Background timer execution + native notifications

### 🛠️ Technical
- React 19 + TypeScript 7 + Vite 8
- Tailwind CSS 4 (Vite plugin)
- Express server with Vite middleware (dev) + static serving (prod)
- Web Audio API synthesizers (zero external audio dependencies)
- Lucide React icons, Motion animations, canvas-confetti
- Recharts for analytics visualization

---

## [Unreleased] — Upcoming

### Planned
- [ ] Cloud sync (optional, encrypted, user-controlled storage)
- [ ] Team workspaces with real-time collaboration
- [ ] Calendar integration (.ics import/export, Google/Outlook sync)
- [ ] Home screen widgets (Android/iOS)
- [ ] Voice input (Web Speech API)
- [ ] Advanced recurrence (monthly, quarterly, exceptions)
- [ ] Time tracking reports (CSV/PDF with project/client breakdown)
- [ ] Focus music integration (YouTube/Spotify embed)
- [ ] Pomodoro statistics (session distribution, interruption count, focus quality)
- [ ] Full WCAG 2.1 AA accessibility audit

### Technical Debt
- [ ] Migrate to React 19 `use` hook for async resources
- [ ] Introduce global state library (Zustand/Jotai) if needed
- [ ] Add unit tests (Vitest) for scheduler, streak, date utils
- [ ] Add E2E tests (Playwright) for critical flows
- [ ] Bundle analysis & code splitting
- [ ] Replace canvas-confetti with lightweight custom implementation

---

## Version History Format

```
## [MAJOR.MINOR.PATCH] - YYYY-MM-DD
### 🎉 Added      — New features
### 🔧 Changed    — Changes to existing functionality
### 🐛 Fixed      — Bug fixes
### 🗑️ Removed    — Removed features
### 🔒 Security   — Vulnerability fixes
### 📚 Docs       — Documentation updates
### ⚡ Performance — Performance improvements
### ♻️ Refactored — Code refactoring without behavior changes
```