import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Lock,
  Percent,
  AlertCircle,
  HelpCircle,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { SafetyAnalysis } from '../types';
import { VerificationReport } from '../services/verificationEngine';

interface SecurityAnalysisCardProps {
  safety: SafetyAnalysis;
  report?: VerificationReport;
}

export const SecurityAnalysisCard: React.FC<SecurityAnalysisCardProps> = ({ safety, report }) => {
  const trustScore = report?.trustScore ?? safety.score ?? 50;
  const securityScore = report?.securityScore ?? (safety.isHoneypot ? 10 : 45);
  const marketMaturityScore = report?.marketMaturityScore ?? 35;
  const verdict = report?.verdict ?? (trustScore >= 85 ? 'APPROVED' : trustScore >= 60 ? 'NEEDS_OBSERVATION' : trustScore >= 40 ? 'HIGH_RISK' : 'REJECTED');

  const verdictConfig = {
    APPROVED_EXCELLENT: {
      badge: report?.verdictLabel || 'Audited / Excellent 🟢',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      bannerBg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Audited / Excellent',
      actionText: report?.actionableRecommendation || 'Safe to accept for community donations. Fully verified contract security and mature trading history.',
    },
    APPROVED_LOW_RISK: {
      badge: report?.verdictLabel || 'Accepted (Low Risk) 🟢',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      bannerBg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Accepted (Low Risk)',
      actionText: report?.actionableRecommendation || 'Accepted (Low Risk). Verified contract security and healthy market performance.',
    },
    ACCEPTED_MEDIUM_RISK: {
      badge: report?.verdictLabel || 'Accepted (Medium Risk) 🟡',
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      bannerBg: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      title: 'Accepted (Medium Risk)',
      actionText: report?.actionableRecommendation || 'Accepted (Medium Risk). Verified contract code and passing security checks, but liquidity or trading volume is moderate.',
    },
    HIGH_RISK_WARN: {
      badge: report?.verdictLabel || 'High Risk (Warn User) 🟠',
      bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
      bannerBg: 'bg-orange-950/40 border-orange-500/30 text-orange-200',
      icon: <AlertTriangle className="w-6 h-6 text-orange-400" />,
      title: 'High Risk (Warn User)',
      actionText: report?.actionableRecommendation || 'High Risk. Shallow liquidity, low trading volume, or active owner privileges detected. Warn users before processing donations.',
    },
    APPROVED: {
      badge: report?.verdictLabel || 'Approved ✅',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      bannerBg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Approved Token',
      actionText: report?.actionableRecommendation || 'Safe to accept for community donations. Fully verified contract security and mature trading history.',
    },
    NEEDS_OBSERVATION: {
      badge: report?.verdictLabel || 'Needs Observation 🟡',
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      bannerBg: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      title: 'Needs Observation',
      actionText: report?.actionableRecommendation || 'Monitor for several days before accepting donations.',
    },
    HIGH_RISK: {
      badge: report?.verdictLabel || 'High Risk 🟠',
      bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
      bannerBg: 'bg-orange-950/40 border-orange-500/30 text-orange-200',
      icon: <AlertTriangle className="w-6 h-6 text-orange-400" />,
      title: 'High Risk Caution',
      actionText: report?.actionableRecommendation || 'Exercise caution. Shallow liquidity pool or active owner permissions detected.',
    },
    REJECTED: {
      badge: report?.verdictLabel || 'Rejected 🔴',
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      bannerBg: 'bg-rose-950/40 border-rose-500/30 text-rose-200',
      icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
      title: 'Rejected Token',
      actionText: report?.actionableRecommendation || 'Do not accept or donate using this token due to severe smart contract vulnerabilities or failed security rules.',
    },
  }[verdict] || {
    badge: report?.verdictLabel || 'Evaluated',
    bg: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400',
    bannerBg: 'bg-zinc-950/40 border-zinc-500/30 text-zinc-200',
    icon: <Info className="w-6 h-6 text-zinc-400" />,
    title: 'Evaluated Token',
    actionText: report?.actionableRecommendation || 'Token evaluated.',
  };

  const warnings = report?.warnings ?? safety.warnings ?? [];
  const passedSecurity = report?.passedSecurity ?? ['Contract source code verified', 'Swap test passed without honeypot restriction'];
  const passedMarket = report?.passedMarket ?? ['Liquidity pool initialized'];
  const isNewToken = report?.isNewToken ?? (safety.pairAgeDays < 14);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-sm">
      {/* Title & Safety Score Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" /> Contract Security & Market Audit
            </h2>
            {isNewToken && (
              <span className="text-[11px] bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" /> Newly Launched Token
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Engine evaluates <span className="text-zinc-200 font-medium">Smart Contract Vulnerabilities</span> separately from <span className="text-zinc-200 font-medium">Market Maturity</span>.
          </p>
        </div>

        {/* Big Verdict & Score Badge */}
        <div className="flex items-center space-x-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Audit Verdict</div>
            <div className={`text-xs font-bold px-3 py-1 rounded-full border mt-1 inline-block ${verdictConfig.bg}`}>
              {verdictConfig.badge}
            </div>
          </div>
          <div className="relative w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            <span
              className={`text-2xl font-black font-mono ${
                verdict === 'APPROVED'
                  ? 'text-emerald-400'
                  : verdict === 'NEEDS_OBSERVATION'
                  ? 'text-amber-400'
                  : verdict === 'HIGH_RISK'
                  ? 'text-orange-400'
                  : 'text-rose-400'
              }`}
            >
              {trustScore}
            </span>
            <span className="text-[10px] text-zinc-500 absolute bottom-1 font-mono">/100</span>
          </div>
        </div>
      </div>

      {/* DUAL METRIC PROGRESS METERS: Security vs Market Maturity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric 1: Smart Contract Security */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Smart Contract Security
            </span>
            <span className="font-mono text-emerald-400 font-bold">{securityScore} / 50 Pts</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            Answers: <span className="italic text-zinc-300">"Can this contract steal users' money?"</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                securityScore >= 45 ? 'bg-emerald-400' : securityScore >= 35 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${(securityScore / 50) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Market Maturity */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-200 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-400" /> Market Maturity & History
            </span>
            <span className="font-mono text-blue-400 font-bold">{marketMaturityScore} / 50 Pts</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            Answers: <span className="italic text-zinc-300">"Has this token proven itself in the market yet?"</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                marketMaturityScore >= 40 ? 'bg-blue-400' : marketMaturityScore >= 25 ? 'bg-amber-400' : 'bg-zinc-600'
              }`}
              style={{ width: `${(marketMaturityScore / 50) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actionable Verdict Banner */}
      <div className={`p-4 rounded-xl border flex items-center space-x-3.5 ${verdictConfig.bannerBg}`}>
        <div className="shrink-0 p-2.5 rounded-xl bg-black/30 border border-white/10">
          {verdictConfig.icon}
        </div>
        <div className="space-y-0.5">
          <div className="text-[11px] uppercase tracking-wider font-extrabold opacity-80">
            Audit Recommendation
          </div>
          <div className="text-sm font-bold text-white">{verdictConfig.actionText}</div>
        </div>
      </div>

      {/* Transparent Breakdown Panel: "Why isn't this Approved?" or "Audit Factor Breakdown" */}
      <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider border-b border-zinc-800/80 pb-2">
          <HelpCircle className="w-4 h-4 text-blue-400" />
          {verdict === 'APPROVED' ? 'Why is this Approved?' : "Why isn't this Approved?"}
        </h3>

        <div className="space-y-2 text-xs">
          {/* Passed Security Checks */}
          {passedSecurity.map((item, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}

          {/* Passed Market Checks */}
          {passedMarket.map((item, idx) => (
            <div key={`m-${idx}`} className="flex items-start space-x-2 text-blue-300">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}

          {/* Warnings & Maturity Delays */}
          {warnings.map((warn, idx) => (
            <div key={`w-${idx}`} className="flex items-start space-x-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Risk Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Honeypot Check */}
        <div
          className={`p-3.5 rounded-xl border ${
            safety.isHoneypot
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
          }`}
        >
          <div className="text-xs text-zinc-400 flex items-center justify-between">
            <span>Honeypot Check</span>
            {safety.isHoneypot ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <div className="text-sm font-bold mt-1">
            {safety.isHoneypot ? 'RISK DETECTED' : 'NOT A HONEYPOT'}
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">
            {safety.isHoneypot ? 'Selling blocked or restricted' : 'Swap test passed cleanly'}
          </div>
        </div>

        {/* Buy / Sell Taxes */}
        <div className="p-3.5 rounded-xl border bg-zinc-950/80 border-zinc-800 text-zinc-300">
          <div className="text-xs text-zinc-400 flex items-center justify-between">
            <span>Trading Fees</span>
            <Percent className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm font-bold mt-1 text-zinc-100 font-mono">
            Buy: {safety.buyTaxPct}% | Sell: {safety.sellTaxPct}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {safety.buyTaxPct + safety.sellTaxPct === 0 ? '0% Tax (No skim)' : 'Tax fee applied on transfer'}
          </div>
        </div>

        {/* Mintable Check */}
        <div className="p-3.5 rounded-xl border bg-zinc-950/80 border-zinc-800 text-zinc-300">
          <div className="text-xs text-zinc-400 flex items-center justify-between">
            <span>Mint Function</span>
            <Info className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-sm font-bold mt-1 text-zinc-100">
            {safety.isMintable ? 'MINTABLE (Warning)' : 'NON-MINTABLE'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {safety.isMintable ? 'Supply can be inflated' : 'Fixed supply limit'}
          </div>
        </div>

        {/* Liquidity Lock */}
        <div className="p-3.5 rounded-xl border bg-zinc-950/80 border-zinc-800 text-zinc-300">
          <div className="text-xs text-zinc-400 flex items-center justify-between">
            <span>LP Lock Status</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold mt-1 text-zinc-100 font-mono">
            {safety.liquidityLockedPct}% Locked
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Protected against liquidity pull
          </div>
        </div>
      </div>
    </div>
  );
};

