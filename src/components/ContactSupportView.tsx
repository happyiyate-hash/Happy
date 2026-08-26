import React, { useState, useRef } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  AlertCircle,
  Send,
  Paperclip,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  HelpCircle,
  ChevronRight,
  Loader2,
  X,
  Upload,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { SupportLiveChatView } from './SupportLiveChatView';
import { useTranslation } from '../utils/i18n';

interface ContactSupportViewProps {
  onBack: () => void;
  onNavigateHelpCenter: () => void;
  currentUser?: any;
  initialView?: 'main' | 'chat' | 'report';
}

interface ProblemReport {
  id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  description: string;
  contractAddress?: string;
  attachmentName?: string;
  createdAt: string;
  status: 'Submitted' | 'In Review' | 'Resolved';
}

const STORAGE_REPORTS_KEY = 'tokencare_problem_reports_v1';

export const ContactSupportView: React.FC<ContactSupportViewProps> = ({
  onBack,
  onNavigateHelpCenter,
  currentUser,
  initialView = 'main',
}) => {
  const { t } = useTranslation();
  // Current view mode: 'main' (slim options selection) | 'chat' (standalone live chat) | 'report' (problem ticket form)
  const [view, setView] = useState<'main' | 'chat' | 'report'>(initialView);

  // Official contact information constants
  const OFFICIAL_SUPPORT_EMAIL = 'support@tokencare.io';
  const OFFICIAL_PHONE_NUMBER = '+1 (800) 865-3622';
  const OFFICIAL_PHONE_DISPLAY = '+1 (800) 865-3622';
  const OFFICIAL_PHONE_HOURS = 'Mon–Fri, 9:00 AM – 6:00 PM EST';

  // Copy state helpers
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Report a Problem State
  const [reportCategory, setReportCategory] = useState(t('support.catBug', 'App bug / UI glitch'));
  const [reportSubject, setReportSubject] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportContract, setReportContract] = useState('');
  const [reportAttachment, setReportAttachment] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessTicket, setReportSuccessTicket] = useState<string | null>(null);
  const reportFileInputRef = useRef<HTMLInputElement | null>(null);

  // Stored problem reports
  const [submittedReports, setSubmittedReports] = useState<ProblemReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REPORTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim() || !reportSubject.trim()) return;

    setIsSubmittingReport(true);

    setTimeout(() => {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const ticketId = `TKC-${randomNum}`;

      const newReport: ProblemReport = {
        id: `rep-${Date.now()}`,
        ticketNumber: ticketId,
        category: reportCategory,
        subject: reportSubject,
        description: reportDescription,
        contractAddress: reportContract.trim() || undefined,
        attachmentName: reportAttachment || undefined,
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: 'Submitted',
      };

      const updated = [newReport, ...submittedReports];
      setSubmittedReports(updated);
      try {
        localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save problem report:', err);
      }

      setReportSuccessTicket(ticketId);
      setIsSubmittingReport(false);
      setReportSubject('');
      setReportDescription('');
      setReportContract('');
      setReportAttachment(null);
    }, 900);
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(OFFICIAL_SUPPORT_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(OFFICIAL_PHONE_NUMBER);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // 1. IF CHAT IS SELECTED -> RENDER STANDALONE FULLSCREEN LIVE CHAT
  if (view === 'chat') {
    return (
      <SupportLiveChatView
        onBack={() => setView('main')}
        onNavigateHelpCenter={onNavigateHelpCenter}
        currentUser={currentUser}
      />
    );
  }

  // 2. IF REPORT A PROBLEM IS SELECTED -> RENDER REPORT TICKET FORM VIEW
  if (view === 'report') {
    return (
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden text-white font-sans animate-in fade-in duration-200">
        {/* Top Fixed Header */}
        <header className="shrink-0 z-30 bg-[#090C12] border-b border-zinc-800/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 min-w-0">
              <button
                onClick={() => setView('main')}
                className="p-1 text-white hover:text-emerald-400 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                title="Back to Contact Options"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center space-x-1 text-[10px] text-zinc-400 font-medium truncate">
                  <span onClick={() => setView('main')} className="hover:text-emerald-400 cursor-pointer transition-colors">
                    {t('support.title', 'Contact Support')}
                  </span>
                  <ChevronRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                  <span className="text-amber-400 font-bold truncate">{t('support.reportChannelTitle', 'Report a Problem / Ticket')}</span>
                </div>
                <h1 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{t('support.submitReportTitle', 'Submit Support Ticket')}</span>
                  <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold font-mono">
                    {t('support.official', 'OFFICIAL')}
                  </span>
                </h1>
              </div>
            </div>

            <button
              onClick={() => setView('chat')}
              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[#00E575] text-[11px] font-bold rounded-lg transition-all cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden sm:inline">{t('support.startChat', 'Live Chat')}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Report Content */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 sm:p-5 max-w-3xl w-full mx-auto space-y-4 pb-36 scrollbar-thin"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {reportSuccessTicket && (
            <div className="bg-[#0E2E21] border border-[#00E575]/40 rounded-2xl p-4 space-y-2 shadow-lg animate-in fade-in">
              <div className="flex items-center space-x-2 text-[#00E575]">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-xs font-bold text-white">{t('support.reportSuccessTitle', 'Problem Report Submitted Successfully')}</h3>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                {t('support.reportSuccessDesc', 'Your report has been logged with Reference ID {ticketId}. Our technical team is reviewing the issue and will follow up with you.', { ticketId: reportSuccessTicket })}
              </p>
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setReportSuccessTicket(null)}
                  className="text-xs text-emerald-400 hover:text-white font-bold underline cursor-pointer"
                >
                  {t('support.submitAnother', 'Submit Another Report')}
                </button>
                <button
                  onClick={() => setView('chat')}
                  className="text-xs bg-emerald-500 text-black px-3 py-1.5 rounded-xl font-bold cursor-pointer hover:bg-emerald-400 transition-colors"
                >
                  {t('support.openLiveChat', 'Open Live Chat')}
                </button>
              </div>
            </div>
          )}

          <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>{t('support.ticketDetails', 'Ticket Details')}</span>
              </h2>
              <p className="text-xs text-zinc-400">
                {t('support.ticketDetailsDesc', 'Provide details regarding token verification issues, reward balance discrepancies, or technical bugs.')}
              </p>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3.5">
              {/* Category Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300">{t('support.category', 'Category')}</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full bg-[#06080E] border border-zinc-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#00E575] transition-colors cursor-pointer"
                >
                  <option value={t('support.catVerification', 'Token verification / audit discrepancy')}>{t('support.catVerification', 'Token verification / audit discrepancy')}</option>
                  <option value={t('support.catReward', 'Reward balance / withdrawal issue')}>{t('support.catReward', 'Reward balance / withdrawal issue')}</option>
                  <option value={t('support.catHoneypot', 'Honeypot detector false positive')}>{t('support.catHoneypot', 'Honeypot detector false positive')}</option>
                  <option value={t('support.cat2fa', 'Two-Factor Authentication (2FA) issue')}>{t('support.cat2fa', 'Two-Factor Authentication (2FA) issue')}</option>
                  <option value={t('support.catWallet', 'Wallet connection error')}>{t('support.catWallet', 'Wallet connection error')}</option>
                  <option value={t('support.catBug', 'App bug / UI glitch')}>{t('support.catBug', 'App bug / UI glitch')}</option>
                  <option value={t('support.catOther', 'Other technical inquiry')}>{t('support.catOther', 'Other technical inquiry')}</option>
                </select>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300">{t('support.subjectLabel', 'Subject / Brief Summary')}</label>
                <input
                  type="text"
                  required
                  value={reportSubject}
                  onChange={(e) => setReportSubject(e.target.value)}
                  placeholder={t('support.subjectPlaceholder', 'e.g. Verification status not updating on Polygon')}
                  className="w-full bg-[#06080E] border border-zinc-800 text-white placeholder-zinc-500 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#00E575] transition-colors"
                />
              </div>

              {/* Describe the problem */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300">{t('support.descLabel', 'Description')}</label>
                <textarea
                  required
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder={t('support.descPlaceholder', 'Tell us what happened, steps to reproduce, or relevant contract details...')}
                  className="w-full bg-[#06080E] border border-zinc-800 text-white placeholder-zinc-500 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#00E575] transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Optional Token Contract Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                  <span>{t('support.contractLabel', 'Token Contract or Tx Hash (Optional)')}</span>
                  <span className="text-[10px] text-zinc-500 font-normal">{t('support.ifApplicable', 'If applicable')}</span>
                </label>
                <input
                  type="text"
                  value={reportContract}
                  onChange={(e) => setReportContract(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#06080E] border border-zinc-800 text-white placeholder-zinc-500 font-mono text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#00E575] transition-colors"
                />
              </div>

              {/* Optional Attachment */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                  <span>{t('support.attachLabel', 'Attach Screenshot or Error Log (Optional)')}</span>
                  <span className="text-[10px] text-zinc-500 font-normal">{t('support.attachSizeLimit', 'PNG, JPG, PDF up to 10MB')}</span>
                </label>

                <input
                  type="file"
                  ref={reportFileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.txt,.log"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setReportAttachment(file.name);
                  }}
                />

                {reportAttachment ? (
                  <div className="flex items-center justify-between bg-zinc-900 border border-emerald-500/40 p-2 rounded-xl text-xs text-emerald-300">
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-[#00E575] shrink-0" />
                      <span className="truncate">{reportAttachment}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportAttachment(null)}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => reportFileInputRef.current?.click()}
                    className="w-full border border-dashed border-zinc-800 hover:border-zinc-700 bg-[#06080E] hover:bg-zinc-900/40 p-2.5 rounded-xl flex items-center justify-center space-x-2 text-xs text-zinc-400 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{t('support.clickToAttach', 'Click to attach screenshot or log file')}</span>
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingReport || !reportSubject.trim() || !reportDescription.trim()}
                className="w-full py-2.5 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>{t('support.submitting', 'Submitting Ticket...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-black" />
                    <span>{t('support.submitProblemReport', 'Submit Problem Report')}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Past Submitted Reports List */}
          {submittedReports.length > 0 && (
            <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white">{t('support.submittedReportsTitle', 'Your Submitted Reports')}</h3>
                <span className="text-[10px] text-zinc-500 font-mono font-bold">
                  {t('support.ticketsCount', '{count} Tickets', { count: submittedReports.length })}
                </span>
              </div>

              <div className="space-y-2">
                {submittedReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 bg-[#06080E] border border-zinc-800 rounded-xl space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded shrink-0">
                          {rep.ticketNumber}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {rep.subject}
                        </span>
                      </div>
                      <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold shrink-0">
                        {rep.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-1">{rep.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                      <span>{t('support.categoryPrefix', 'Category: {category}', { category: rep.category })}</span>
                      <span>{rep.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. MAIN SELECTION VIEW - SLIM, SLEEK CARDS THAT EASILY FIT ON ONE SCREEN
  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden text-white font-sans animate-in fade-in duration-200">
      {/* Top Fixed Header */}
      <header className="shrink-0 z-30 bg-[#090C12] border-b border-zinc-800/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={onBack}
              className="p-1 text-white hover:text-emerald-400 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
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
                <span className="text-emerald-400 font-bold truncate">{t('support.title', 'Contact Support')}</span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>{t('support.title', 'Contact Support')}</span>
                <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/15 text-[#00E575] border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E575] animate-pulse" />
                  {t('support.liveDesk', 'LIVE DESK')}
                </span>
              </h1>
            </div>
          </div>

          <button
            onClick={onNavigateHelpCenter}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-bold rounded-lg transition-all cursor-pointer shrink-0"
          >
            <HelpCircle className="w-3 h-3 text-emerald-400" />
            <span>{t('support.helpCenterBtn', 'Help Center')}</span>
          </button>
        </div>
      </header>

      {/* Main Scrollable Area - Ultra-Slim, Single-Screen Sized Cards */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 sm:p-5 max-w-3xl w-full mx-auto space-y-3 pb-36 scrollbar-thin"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="space-y-0.5 px-0.5">
          <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            {t('support.chooseChannel', 'Choose a Support Channel')}
          </h2>
          <p className="text-[11.5px] text-zinc-400">
            {t('support.subtitle', 'Select the fastest way to get assistance with your account, audits, or reward payouts.')}
          </p>
        </div>

        {/* 1. SLIM LIVE CHAT CARD (Primary Recommended Channel) */}
        <div
          id="contact-channel-live-chat"
          onClick={() => setView('chat')}
          className="bg-gradient-to-r from-[#0E2218] via-[#0B1512] to-[#0B0E17] hover:from-[#133022] hover:to-[#0F1420] border border-emerald-500/40 hover:border-emerald-500/60 rounded-2xl p-3 sm:p-3.5 transition-all cursor-pointer group shadow-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[#00E575] shrink-0 relative">
              <MessageSquare className="w-5 h-5" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E575] border-2 border-[#0B0E17] absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                  {t('support.chatChannelTitle', 'Chat with TokenCare')}
                </h3>
                <span className="text-[9.5px] font-bold text-[#00E575] bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-full shrink-0">
                  {t('support.chatChannelBadge', 'Fastest < 2 mins')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {t('support.chatChannelDesc', 'Real-time messaging with on-chain specialists. Instant answers.')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-xs font-bold text-[#00E575] shrink-0 pl-2">
            <span className="hidden sm:inline">{t('support.startChat', 'Start Chat')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 2. SLIM REPORT A PROBLEM CARD */}
        <div
          id="contact-channel-report-problem"
          onClick={() => setView('report')}
          className="bg-[#0B0E17] hover:bg-zinc-800/40 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-3 sm:p-3.5 transition-all cursor-pointer group shadow-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                  {t('support.reportChannelTitle', 'Report a Problem / Ticket')}
                </h3>
                {submittedReports.length > 0 && (
                  <span className="text-[9.5px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded border border-zinc-700 font-bold shrink-0">
                    {t('support.reportChannelActive', '{count} Active', { count: submittedReports.length })}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {t('support.reportChannelDesc', 'Submit bug reports, audit discrepancies, or payout review tickets.')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-xs font-bold text-amber-400 shrink-0 pl-2">
            <span className="hidden sm:inline">{t('support.submitTicket', 'Submit Ticket')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 3. SLIM EMAIL SUPPORT CARD */}
        <div
          id="contact-channel-email"
          className="bg-[#0B0E17] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-3 sm:p-3.5 transition-all shadow-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  {t('support.emailChannelTitle', 'Email TokenCare Support')}
                </h3>
                <span className="text-[9.5px] text-zinc-400 hidden sm:inline">
                  {t('support.emailChannelReplies', 'Replies in 2–4h')}
                </span>
              </div>
              <p className="text-[11px] font-mono font-bold text-emerald-400 truncate mt-0.5">
                {OFFICIAL_SUPPORT_EMAIL}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 pl-2">
            <button
              onClick={handleCopyEmail}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
              title="Copy email address"
            >
              {copiedEmail ? (
                <Check className="w-3.5 h-3.5 text-[#00E575]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <a
              href={`mailto:${OFFICIAL_SUPPORT_EMAIL}?subject=TokenCare%20Support%20Inquiry`}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold rounded-xl flex items-center space-x-1 transition-colors"
            >
              <span>{t('support.email', 'Email')}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
            </a>
          </div>
        </div>

        {/* 4. SLIM PHONE SUPPORT CARD */}
        <div
          id="contact-channel-phone"
          className="bg-[#0B0E17] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-3 sm:p-3.5 transition-all shadow-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Phone className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  {t('support.phoneChannelTitle', 'Phone Support')}
                </h3>
                <span className="text-[9.5px] text-zinc-400 font-mono hidden sm:inline">
                  {t('support.phoneChannelTollFree', 'Toll-Free')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                <span className="font-mono text-purple-300 font-bold mr-1.5">{OFFICIAL_PHONE_DISPLAY}</span>
                <span className="text-[10px] text-zinc-500 hidden sm:inline">({t('support.phoneChannelHours', OFFICIAL_PHONE_HOURS)})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 pl-2">
            <button
              onClick={handleCopyPhone}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
              title="Copy phone number"
            >
              {copiedPhone ? (
                <Check className="w-3.5 h-3.5 text-[#00E575]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <a
              href={`tel:${OFFICIAL_PHONE_NUMBER.replace(/\D/g, '')}`}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold rounded-xl flex items-center space-x-1 transition-colors"
            >
              <span>{t('support.call', 'Call')}</span>
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
            </a>
          </div>
        </div>

        {/* 5. SLIM HELP CENTER & KNOWLEDGEBASE CARD */}
        <div
          id="contact-channel-help-center"
          onClick={onNavigateHelpCenter}
          className="bg-[#0B0E17]/80 hover:bg-zinc-800/30 border border-zinc-800/80 hover:border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 transition-all cursor-pointer group shadow-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                {t('support.helpCenterCardTitle', 'Help Center & Knowledgebase')}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {t('support.helpCenterCardDesc', 'Browse 38+ comprehensive self-service guides, FAQs, and audits.')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-xs font-bold text-teal-400 shrink-0 pl-2">
            <span className="hidden sm:inline">{t('support.browseGuides', 'Browse Guides')}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

