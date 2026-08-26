import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  FileText,
  Cookie,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_LAST_UPDATED,
  TERMS_OF_SERVICE_SECTIONS,
  TERMS_LAST_UPDATED,
  COOKIE_STORAGE_DETAILS,
  COOKIES_LAST_UPDATED,
} from '../data/legalData';
import { clearAllAppStorage } from '../services/storage';
import { useTranslation } from '../utils/i18n';

interface TermsAndPrivacyViewProps {
  onBack: () => void;
  onNavigateContactSupport: () => void;
  initialTab?: 'privacy' | 'terms' | 'cookies' | 'preferences';
}

export const TermsAndPrivacyView: React.FC<TermsAndPrivacyViewProps> = ({
  onBack,
  onNavigateContactSupport,
  initialTab = 'privacy',
}) => {
  const { t } = useTranslation();
  const [activeLegalTab, setActiveLegalTab] = useState<'privacy' | 'terms' | 'cookies' | 'preferences'>(initialTab);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleTabChange = (tab: 'privacy' | 'terms' | 'cookies' | 'preferences') => {
    setActiveLegalTab(tab);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Privacy Preferences state
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => {
    try {
      return localStorage.getItem('tokencare_pref_analytics') !== 'false';
    } catch {
      return true;
    }
  });

  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(() => {
    try {
      return localStorage.getItem('tokencare_pref_diagnostics') !== 'false';
    } catch {
      return true;
    }
  });

  const [marketingAlerts, setMarketingAlerts] = useState(() => {
    try {
      return localStorage.getItem('tokencare_pref_marketing') === 'true';
    } catch {
      return false;
    }
  });

  const [prefsSavedMessage, setPrefsSavedMessage] = useState<string | null>(null);

  const handleSavePreferences = () => {
    try {
      localStorage.setItem('tokencare_pref_analytics', String(analyticsEnabled));
      localStorage.setItem('tokencare_pref_diagnostics', String(diagnosticsEnabled));
      localStorage.setItem('tokencare_pref_marketing', String(marketingAlerts));
      setPrefsSavedMessage(t('legal.prefsSaved', 'Privacy preferences successfully saved.'));
      setTimeout(() => setPrefsSavedMessage(null), 3000);
    } catch (e) {
      console.warn('Failed to save privacy preferences:', e);
    }
  };

  const handleClearLocalStorage = () => {
    if (window.confirm(t('legal.confirmClearStorage', 'Are you sure you want to clear cached token data and local storage? This will reload the app.'))) {
      clearAllAppStorage();
      window.location.reload();
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#06080E] text-white font-sans animate-in fade-in duration-200">
      {/* 1. Merged Compact Non-Scrolling Top Header Card (Header + Category Tab Selection) */}
      <div className="shrink-0 z-30 bg-[#090C12]">
        <div className="max-w-3xl mx-auto px-4 pt-2.5 pb-2.5 space-y-2.5">
          {/* Top Row: Navigation + Title + Support */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2 min-w-0">
              <button
                onClick={onBack}
                id="legal-back-btn"
                className="p-1 -ml-1 text-white hover:text-emerald-400 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center space-x-1 text-[10px] text-zinc-400 font-medium truncate">
                  <span onClick={onBack} className="hover:text-emerald-400 cursor-pointer transition-colors">
                    {t('nav.settings', 'Settings')}
                  </span>
                  <ChevronRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                  <span className="text-emerald-400 font-bold truncate">{t('legal.title', 'Legal & Privacy')}</span>
                </div>
                <h1 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{t('legal.title', 'Legal & Privacy')}</span>
                </h1>
              </div>
            </div>

            <button
              onClick={onNavigateContactSupport}
              id="legal-support-btn"
              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-lg transition-all cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3 h-3 text-[#00E575]" />
              <span>{t('legal.support', 'Support')}</span>
            </button>
          </div>

          {/* Category Tabs: Privacy Policy, Terms of Service, Cookie Policy, Privacy Preferences */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-xs pb-0.5">
            <button
              id="tab-privacy"
              onClick={() => handleTabChange('privacy')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeLegalTab === 'privacy'
                  ? 'text-[#00E575] bg-emerald-500/10 font-bold border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('legal.privacyPolicy', 'Privacy Policy')}</span>
            </button>

            <button
              id="tab-terms"
              onClick={() => handleTabChange('terms')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeLegalTab === 'terms'
                  ? 'text-[#00E575] bg-emerald-500/10 font-bold border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('legal.termsOfService', 'Terms of Service')}</span>
            </button>

            <button
              id="tab-cookies"
              onClick={() => handleTabChange('cookies')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeLegalTab === 'cookies'
                  ? 'text-[#00E575] bg-emerald-500/10 font-bold border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Cookie className="w-3.5 h-3.5" />
              <span>{t('legal.cookiePolicy', 'Cookie Policy')}</span>
            </button>

            <button
              id="tab-preferences"
              onClick={() => handleTabChange('preferences')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                activeLegalTab === 'preferences'
                  ? 'text-[#00E575] bg-emerald-500/10 font-bold border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('legal.privacyPreferences', 'Privacy Preferences')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Page Content (Dedicated Natural Vertical Scroll for legal documents & policies) */}
      <main
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto w-full overscroll-y-contain px-4 py-5 space-y-6 pb-36"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-3xl w-full mx-auto space-y-6">

        {/* ---------------------------------------------------- */}
        {/* TAB 1: PRIVACY POLICY (Sitting directly on background) */}
        {/* ---------------------------------------------------- */}
        {activeLegalTab === 'privacy' && (
          <div className="space-y-7 animate-in fade-in duration-200">
            {/* Title & Meta */}
            <div className="space-y-2 border-b border-zinc-800/80 pb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t('legal.privacyTitle', 'TokenCare Privacy Policy')}
              </h2>
              <div className="flex items-center space-x-2 text-xs text-zinc-400">
                <span>{t('legal.effectiveDate', 'Effective Date:')}</span>
                <strong className="text-zinc-200 font-medium">{PRIVACY_POLICY_LAST_UPDATED}</strong>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-1">
                {t('legal.privacyIntro', 'At TokenCare, we believe privacy is foundational to decentralized finance. This policy outlines the limited technical data we process to verify smart contracts, prevent fraud, and route community rewards safely.')}
              </p>
            </div>

            {/* Structured Section-by-Section Legal Text */}
            <div className="space-y-8 text-zinc-300 text-xs sm:text-sm leading-relaxed">
              {PRIVACY_POLICY_SECTIONS.map((sec) => (
                <section key={sec.id} id={`sec-${sec.id}`} className="space-y-3 pt-1">
                  {/* Section Title */}
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="text-[#00E575] font-mono text-xs sm:text-sm font-bold">
                      {sec.number}.
                    </span>
                    <span>{sec.title}</span>
                  </h3>

                  {/* Body Paragraphs */}
                  <div className="space-y-2.5 pl-3.5 sm:pl-4 border-l-2 border-zinc-800/80">
                    {sec.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        {p}
                      </p>
                    ))}

                    {/* Subsections (Lists/Breakdowns) */}
                    {sec.subsections && sec.subsections.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {sec.subsections.map((sub, sIdx) => (
                          <div key={sIdx} className="space-y-1.5">
                            <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00E575]" />
                              <span>{sub.subtitle}</span>
                            </h4>
                            <ul className="space-y-1.5 pl-4">
                              {sub.points.map((point, ptIdx) => (
                                <li key={ptIdx} className="text-xs text-zinc-400 list-disc leading-relaxed">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Highlight Box if present */}
                    {sec.keyHighlight && (
                      <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#00E575] shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-[#00E575] font-bold">{t('legal.keyPrinciple', 'Key Principle:')} </strong>
                          {sec.keyHighlight}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>

            {/* Bottom Contact / Inquiries Box */}
            <div className="border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">{t('legal.questionsPrivacy', 'Questions regarding our Privacy Policy?')}</span>
                <span className="text-[11px] text-zinc-400">{t('legal.dpoEmail', 'Our Data Protection Officer can be reached at privacy@tokencare.io')}</span>
              </div>
              <button
                onClick={onNavigateContactSupport}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                {t('legal.contactSupportDesk', 'Contact Support Desk')}
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: TERMS OF SERVICE                              */}
        {/* ---------------------------------------------------- */}
        {activeLegalTab === 'terms' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2 border-b border-zinc-800/80 pb-4">
              <h2 className="text-xl font-bold text-white">{t('legal.termsTitle', 'Terms of Service')}</h2>
              <p className="text-xs text-zinc-400">
                {t('legal.lastModified', 'Last modified:')} <strong className="text-zinc-200">{TERMS_LAST_UPDATED}</strong>
              </p>
            </div>

            <div className="space-y-6 text-zinc-300 text-xs sm:text-sm leading-relaxed">
              {TERMS_OF_SERVICE_SECTIONS.map((term) => (
                <div key={term.id} className="space-y-2">
                  <h3 className="text-sm font-bold text-white">{term.title}</h3>
                  <p className="text-xs text-zinc-300 pl-3 border-l-2 border-zinc-800/80 leading-relaxed">
                    {term.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: COOKIE & STORAGE POLICY                       */}
        {/* ---------------------------------------------------- */}
        {activeLegalTab === 'cookies' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2 border-b border-zinc-800/80 pb-4">
              <h2 className="text-xl font-bold text-white">{t('legal.cookiesTitle', 'Cookie & Client Storage')}</h2>
              <p className="text-xs text-zinc-400">
                {t('legal.lastModified', 'Last modified:')} <strong className="text-zinc-200">{COOKIES_LAST_UPDATED}</strong>
              </p>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {t('legal.cookiesDesc', 'TokenCare uses client-side browser storage (localStorage and IndexedDB) to enable offline speed and preserve user preferences. We do not use third-party advertising cookies.')}
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {t('legal.storageKeysUsage', 'Storage Keys & Usage')}
              </span>
              <div className="border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden bg-[#0B0E17]">
                {COOKIE_STORAGE_DETAILS.map((item, idx) => (
                  <div key={idx} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-400">{item.key}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{item.duration}</span>
                    </div>
                    <div className="text-[11px] font-bold text-zinc-300">{item.type}</div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: PRIVACY PREFERENCES                           */}
        {/* ---------------------------------------------------- */}
        {activeLegalTab === 'preferences' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-2 border-b border-zinc-800/80 pb-4">
              <h2 className="text-xl font-bold text-white">{t('legal.prefsTitle', 'Privacy Preferences')}</h2>
              <p className="text-xs text-zinc-400">
                {t('legal.prefsDesc', 'Customize data sharing, analytics telemetry, and local storage on this device.')}
              </p>
            </div>

            {prefsSavedMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#00E575]" />
                <span>{prefsSavedMessage}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Toggle 1: Performance Diagnostics */}
              <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-xs font-bold text-white block">{t('legal.diagTitle', 'Performance Diagnostics')}</span>
                  <p className="text-[11px] text-zinc-400">
                    {t('legal.diagDesc', 'Share anonymous client-side RPC query latency logs to assist in identifying network bottlenecks.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDiagnosticsEnabled(!diagnosticsEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    diagnosticsEnabled ? 'bg-[#00E575]' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      diagnosticsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Usage Analytics */}
              <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-xs font-bold text-white block">{t('legal.telemetryTitle', 'Aggregated Usage Telemetry')}</span>
                  <p className="text-[11px] text-zinc-400">
                    {t('legal.telemetryDesc', 'Allow anonymized aggregate statistics regarding verified token search frequency.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    analyticsEnabled ? 'bg-[#00E575]' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      analyticsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Ecosystem Alerts */}
              <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-xs font-bold text-white block">{t('legal.alertsTitle', 'Ecosystem & Chain Updates')}</span>
                  <p className="text-[11px] text-zinc-400">
                    {t('legal.alertsDesc', 'Receive in-app notices regarding new EVM network integrations and reward multiplier events.')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMarketingAlerts(!marketingAlerts)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    marketingAlerts ? 'bg-[#00E575]' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      marketingAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Save Preferences Button */}
              <div className="pt-2">
                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 bg-[#00E575] hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  {t('legal.savePrefs', 'Save Privacy Preferences')}
                </button>
              </div>

              {/* Clear Storage Action */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  {t('legal.storageMgmt', 'Local Storage Management')}
                </span>
                <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <span className="text-xs font-bold text-white block">{t('legal.clearCacheTitle', 'Clear Local Cached Data')}</span>
                    <p className="text-[11px] text-zinc-400">
                      {t('legal.clearCacheDesc', 'Wipe locally cached token lists, search queries, and temporary inspection records.')}
                    </p>
                  </div>
                  <button
                    onClick={handleClearLocalStorage}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('legal.clearStorageBtn', 'Clear Storage')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

