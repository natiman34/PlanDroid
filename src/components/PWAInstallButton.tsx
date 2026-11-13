import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Monitor, Apple, X, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';
import type { Language } from '../types';

interface PWAInstallButtonProps {
  lang?: Language;
  variant?: 'header' | 'settings' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'en',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running inside installed standalone PWA
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {lang === 'am'
              ? 'PlanDroid በመሳሪያዎ ላይ ተጭኗል (ከመስመር ውጭ ዝግጁ)'
              : 'PlanDroid is installed as a standalone app (Offline Ready)'}
          </span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      try {
        const accepted = await install();
        // On Android, even if accepted, WebAPK minting can fail due to dev server cookies.
        // Always open the guide modal with tips so the user has the 'Add to Home screen' fallback.
        setShowGuideModal(true);
      } catch (e) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const buttonContent = (
    <>
      <Download className="w-3.5 h-3.5" />
      <span>
        {lang === 'am' ? 'አፕሊኬሽኑን ጫን' : 'Install App'}
      </span>
    </>
  );

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30 transition active:scale-95 cursor-pointer"
          title="Install PlanDroid on Chrome / Android / Desktop"
        >
          {buttonContent}
        </button>
      )}

      {variant === 'settings' && (
        <div className="p-4 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-400" />
              {lang === 'am' ? 'PlanDroidን በስልክዎ/ኮምፒውተርዎ ላይ ይጫኑ' : 'Install PlanDroid on Device'}
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {lang === 'am'
                ? 'ያለ ኢንተርኔት በከፍተኛ ፍጥነት በቀጥታ እንደ ራሱን የቻለ አፕሊኬሽን ይጠቀሙ'
                : 'Fast, offline-first native app experience with zero browser frames or latency.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            {buttonContent}
          </button>
        </div>
      )}

      {/* Installation Guide Modal for Chrome & Android Troubleshooting */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {lang === 'am' ? 'PlanDroid የመጫኛ መመሪያ እና መፍትሄ' : 'PlanDroid Chrome Installation Guide'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'am' ? 'በስልክዎ እና በኮምፒውተርዎ ላይ የመጫን ዘዴዎች' : 'Android Chrome and Desktop Installation Steps'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Android Troubleshooting Callout */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {lang === 'am'
                    ? '"This app cannot be installed" የሚል መልእክት በ Android Chrome ከመጣ?'
                    : 'Getting "This app cannot be installed" in Android Chrome?'}
                </span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {lang === 'am'
                  ? 'የ Android Chrome አውቶማቲክ WebAPK አመንጪ የደመና ማረጋገጫ (Cookie) ከውጭ ማለፍ ስለማይችል ስህተት ሊያሳይ ይችላል። መፍትሄው ቀላል ነው:'
                  : 'Android Chrome uses an automated Google WebAPK cloud builder. Because this development preview is protected by secure session cookies, Chrome\'s background builder cannot read the assets anonymously, causing that error.'}
              </p>
              <div className="pt-1 text-xs text-amber-100 bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/20 space-y-1">
                <p className="font-semibold text-amber-300">
                  {lang === 'am' ? 'ፈጣን መፍትሄ (Add to Home screen):' : 'Immediate 100% Working Fix:'}
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-200">
                  <li>
                    {lang === 'am'
                      ? 'በ Chrome የላይኛው ቀኝ ጥግ ያለውን ሦስት ነጥብ (⋮) ይንኩ።'
                      : 'Tap the three dots menu (⋮) in the top-right corner of Chrome.'}
                  </li>
                  <li>
                    {lang === 'am'
                      ? '"Add to Home screen" (ወደ መነሻ ገጽ ጨምር) የሚለውን ይምረጡ።'
                      : 'Tap "Add to Home screen" (or "Add shortcut").'}
                  </li>
                  <li>
                    {lang === 'am'
                      ? '"Add" ን ያረጋግጡ። አፕሊኬሽኑ በስልክዎ መነሻ ገጽ ላይ በሙሉ ማያ ገጽ እና ከመስመር ውጭ (Offline) ይሰራል!'
                      : 'Tap "Add". The app opens in full standalone offline mode with all widgets and notifications!'}
                  </li>
                </ol>
              </div>
            </div>

            {/* Android Chrome Standard Steps */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'am' ? 'በስልክ Chrome (Android) ላይ' : 'Chrome on Android Phone / Tablet'}</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>
                  {lang === 'am'
                    ? 'በ Chrome በላይኛው ቀኝ በኩል ያለውን ሜኑ (ሦስቱን ነጥቦች ⋮) ይንኩ'
                    : 'Tap the Chrome menu (three dots ⋮) at the top right.'}
                </li>
                <li>
                  {lang === 'am'
                    ? '"Add to Home screen" ወይም "Install app" የሚለውን ይምረጡ'
                    : 'Tap "Add to Home screen" or "Install app".'}
                </li>
                <li>
                  {lang === 'am'
                    ? 'ማሳሰቢያ፡ በ Incognito (የግል) ገጽ ውስጥ ካሉ ወደ መደበኛ የ Chrome ገጽ ይቀይሩ።'
                    : 'Note: Ensure you are in a standard tab (not Incognito, which blocks installation).'}
                </li>
              </ol>
            </div>

            {/* Desktop Chrome Instructions */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>{lang === 'am' ? 'በኮምፒውተር Chrome ላይ' : 'Chrome on Desktop (PC / Mac / Linux / Chromebook)'}</span>
              </div>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>
                  {lang === 'am'
                    ? 'በአድራሻ አሞሌው (URL bar) በስተቀኝ በኩል ያለውን የመጫኛ ምልክት (Install icon 🖵) ይጫኑ'
                    : 'Click the Install icon in Chrome\'s address bar (right side of the URL bar).'}
                </li>
                <li>
                  {lang === 'am'
                    ? 'ወይም የ Chrome ሜኑን (ሦስቱን ነጥቦች ⋮) በመንካት "Save and share" -> "Install PlanDroid" ን ይምረጡ'
                    : 'Or click Chrome\'s menu (three dots ⋮) → "Save and share" → "Install PlanDroid".'}
                </li>
              </ol>
            </div>

            {/* iOS Safari fallback */}
            {isIOS && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Apple className="w-4 h-4 text-slate-300" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Tap the <strong>Share</strong> button in the Safari toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                </ol>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">PlanDroid PWA v1.0 • Offline Ready</span>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
              >
                {lang === 'am' ? 'እሺ፣ ገብቶኛል' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
