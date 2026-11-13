import React from 'react';
import {
  FileText,
  Smartphone,
  BellRing,
  Cpu,
  Layers,
  Palette,
  WifiOff,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Download
} from 'lucide-react';

export const SpecificationModal: React.FC = () => {
  return (
    <div className="space-y-6 text-slate-200">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              PlanDroid — Android App Specification & Architecture
            </h2>
            <p className="text-xs text-slate-400">
              Detailed technical blueprint, offline scheduling heuristics, notification subsystem, and UX guidelines
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Main Screens & Navigation Flow */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>1. Core Screens & Navigation Architecture</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Screen A: Smart Daily Timeline
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Presents chronological time slots organized into Morning Focus (08:00–12:00), Afternoon Sprint (12:00–17:00), and Evening Wrap-up (17:00+). Visual indicators depict fixed meetings, cognitive buffers (5–15 min), and lunch windows.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Screen B: Natural Task Suggestion Bar
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Provides an offline NLP input engine. Users type rough thoughts (e.g., &quot;Finish deck 45m urgent morning&quot;) which extracts task title, duration, priority, and energy slot, and slots it collision-free automatically.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              Screen C: Kanban Pipeline & Stage Board
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Three-column workflow (Active Pinned Plan, Queued Tasks, and Completed). Allows fast drag-and-drop or single-tap stage promotion and re-prioritization.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
            <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Screen D: Fullscreen Focus Pomodoro
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Minimalist circular SVG countdown with synthesized Web Audio chimes for distraction-free execution. Triggers confetti and auto-promotes the next queued task upon completion.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Pinned Android Notification Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-wider">
          <BellRing className="w-4 h-4" />
          <span>2. Pinned Notification Subsystem & Android Lifecycle</span>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <h4 className="font-bold text-slate-100 mb-1.5 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              Android Foreground Service & Ongoing Notification
            </h4>
            <p className="text-slate-400 mb-2">
              In Android native implementation (Kotlin/Jetpack Compose), the schedule runs as an ongoing Foreground Service using <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">NotificationCompat.Builder</code>:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 ml-1">
              <li>
                <strong className="text-slate-100">Ongoing Flag:</strong> <code className="text-slate-400">.setOngoing(true)</code> prevents the user or Android OS from swiping away the active task card.
              </li>
              <li>
                <strong className="text-slate-100">Notification Channel:</strong> Low priority channel (<code className="text-slate-400">IMPORTANCE_LOW</code>) ensures the notification stays quietly pinned in the status bar without intrusive sound spam on every second tick.
              </li>
              <li>
                <strong className="text-slate-100">Action PendingIntents:</strong> Direct notification actions (<code className="text-slate-400">[✓ Mark Done]</code>, <code className="text-slate-400">[+15m Snooze]</code>, <code className="text-slate-400">[Next Task]</code>) execute instantly in the background via a <code className="text-slate-400">BroadcastReceiver</code>.
              </li>
              <li>
                <strong className="text-slate-100">Web/PWA Dual Support:</strong> Employs Web Notification API with persistent tags (<code className="text-slate-400">plandroid-ongoing-plan</code>) and a simulated high-fidelity Android notification shade on-screen.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Smart Offline Scheduling Heuristics */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-wider">
          <Cpu className="w-4 h-4" />
          <span>3. Offline Scheduling Heuristic Engine</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs text-slate-300">
          <p className="text-slate-400">
            The app operates 100% locally with zero cloud dependencies using deterministic interval heuristics:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="font-bold text-blue-300 block mb-1">1. Priority & Energy Weighting</span>
              <p className="text-slate-400 text-[11px]">
                Urgent (P0) and High-focus deep work tasks are scheduled into high-energy morning slots before mental fatigue sets in.
              </p>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="font-bold text-blue-300 block mb-1">2. Conflict-Free Interval Packing</span>
              <p className="text-slate-400 text-[11px]">
                Fixed-time appointments (syncs, meetings) are locked in as immovable barriers. Free intervals are populated using greedy interval placement.
              </p>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="font-bold text-blue-300 block mb-1">3. Cognitive Buffer Injection</span>
              <p className="text-slate-400 text-[11px]">
                Automatically injects 5–15 min rest gaps between intensive blocks and protects a dedicated 45m lunch window.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: UI/UX Guidelines & Android Installability */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-wider">
          <Palette className="w-4 h-4" />
          <span>4. UI/UX Design Guidelines & Browser Compatibility</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Minimalist Modern Design Principles
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>High-contrast OLED Dark Palette (<code className="text-slate-300">#020617</code>, <code className="text-slate-300">#0f172a</code>).</li>
              <li>Generous touch and click targets (&gt;= 48px) for desktop and mobile navigation.</li>
              <li>Zero unrequested visual fluff: strict focus on schedule clarity and task progress.</li>
              <li>100% Free: All scheduling algorithms, focus timers, and stats require no subscription.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-400" />
              Full Browser Compatibility in Google Chrome
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Functions seamlessly as a normal website in Chrome, Safari, Edge, and Firefox.</li>
              <li><strong>Zero Installation Required:</strong> Instant access on any desktop, tablet, or phone.</li>
              <li>Offline Service Worker caches static assets for lightning-fast subsequent loads.</li>
              <li>All task data is saved safely in client-side LocalStorage.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
