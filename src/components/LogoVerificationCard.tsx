import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Star,
  Image as ImageIcon,
  Wand2,
  Maximize2,
  Target,
  LayoutGrid,
  Scissors,
  Sparkles,
  Check,
  Cpu,
  Layers,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  LogoVerificationReport,
  LogoQualityCheck,
  downloadAndPrepareImageSource,
} from '../services/logoVerificationEngine';
import { LogoCropModal } from './LogoCropModal';
import { LogoStatus } from '../types';

interface LogoVerificationCardProps {
  report: LogoVerificationReport | null;
  logoStatus?: LogoStatus;
  onLogoStatusChange?: (status: LogoStatus) => void;
  onUpdateLogo: (logoUrl: string) => void;
  isSkeleton?: boolean;
  stage?: number; // 0..2 = skeleton, 3+ = logo verification revealed
  isVerifying?: boolean;
}

export const LogoVerificationCard: React.FC<LogoVerificationCardProps> = ({
  report,
  logoStatus = 'checking',
  onLogoStatusChange,
  onUpdateLogo,
  isSkeleton = false,
  stage = 4,
  isVerifying = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [fixSuccessMessage, setFixSuccessMessage] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sequential pipeline step animation when stage >= 3
  useEffect(() => {
    if (stage >= 3 && !isSkeleton) {
      setActiveStepIndex(0);
      const timers: NodeJS.Timeout[] = [];
      [1, 2, 3, 4].forEach((step) => {
        const t = setTimeout(() => {
          setActiveStepIndex(step);
        }, step * 200);
        timers.push(t);
      });
      return () => timers.forEach(clearTimeout);
    } else {
      setActiveStepIndex(0);
    }
  }, [stage, isSkeleton]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size === 0) {
        alert('Selected image file is empty (0 bytes).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          onUpdateLogo(result);
          if (onLogoStatusChange) onLogoStatusChange('checking');
          setFixSuccessMessage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      const prepared = urlInput.trim();
      onUpdateLogo(prepared);
      if (onLogoStatusChange) onLogoStatusChange('checking');
      setUrlInput('');
      setShowUrlForm(false);
      setFixSuccessMessage(null);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const logoUrl = report?.logoUrl || '';
  const hasLogo = !!logoUrl;

  const handleLogoLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      if (onLogoStatusChange) onLogoStatusChange('valid');
    } else {
      if (onLogoStatusChange) onLogoStatusChange('invalid');
    }
  };

  const handleLogoError = () => {
    if (onLogoStatusChange) onLogoStatusChange('invalid');
  };

  const score = report?.score ?? 0;
  const isValid = report?.isValid ?? false;
  const failureReason = report?.failureReason;
  const geometry = report?.geometry;
  const pipeline = report?.pipeline;

  const renderStars = (scoreVal: number) => {
    const starsCount = Math.round((scoreVal / 100) * 5);
    return (
      <div className="flex items-center space-x-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= starsCount ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
            }`}
          />
        ))}
      </div>
    );
  };

  const checksList: LogoQualityCheck[] = report ? Object.values(report.checks) : [];

  return (
    <div className="bg-[#0B0E17]/90 border border-zinc-800/90 rounded-lg p-2 space-y-2 shadow-md backdrop-blur-sm text-white">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/svg+xml,image/webp,image/jpeg,image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1 truncate">
              Logo Optimization Engine
              {hasLogo && (
                <span
                  className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold border flex items-center gap-1 ${
                    logoStatus === 'valid'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : logoStatus === 'checking'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                  }`}
                >
                  {logoStatus === 'valid' && (
                    <>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>VERIFIED</span>
                    </>
                  )}
                  {logoStatus === 'checking' && (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      <span>CHECKING</span>
                    </>
                  )}
                  {logoStatus === 'invalid' && (
                    <>
                      <XCircle className="w-2.5 h-2.5" />
                      <span>INVALID LOGO</span>
                    </>
                  )}
                </span>
              )}
            </h3>
            <span className="text-[9px] text-zinc-400 block truncate">
              {hasLogo
                ? logoStatus === 'valid'
                  ? '✓ Token logo verified and renderable in browser'
                  : logoStatus === 'checking'
                  ? 'Checking token logo...'
                  : 'Unable to load token logo. Upload another logo or enter URL.'
                : 'Upload token logo for automated processing'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {hasLogo && score < 100 && (
            <button
              type="button"
              onClick={() => setShowCropModal(true)}
              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded text-[9px] flex items-center space-x-0.5 cursor-pointer transition-all"
              title="Fix logo layout"
            >
              <Scissors className="w-2.5 h-2.5 text-amber-400" />
              <span>Fix</span>
            </button>
          )}

          <button
            type="button"
            onClick={triggerUpload}
            className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-semibold rounded text-[9px] flex items-center space-x-1 transition-all cursor-pointer"
          >
            <Upload className="w-2.5 h-2.5" />
            <span>{hasLogo ? 'Change' : 'Upload'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUrlForm(!showUrlForm)}
            className="text-[8px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
          >
            {showUrlForm ? 'Cancel' : 'URL'}
          </button>
        </div>
      </div>

      {/* Hidden Primary Browser Image Renderer for direct DOM validation */}
      {hasLogo && (
        <div className="hidden">
          <img
            src={logoUrl}
            alt="Token Logo Validator"
            onLoad={handleLogoLoad}
            onError={handleLogoError}
          />
        </div>
      )}

      {/* URL Input Popup Form */}
      {showUrlForm && (
        <form
          onSubmit={handleUrlSubmit}
          className="flex items-center gap-1 bg-[#06080F] p-1 rounded border border-zinc-800 animate-in fade-in"
        >
          <input
            type="url"
            placeholder="Paste logo URL (https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 text-white text-[9px] rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-2 py-0.5 bg-emerald-500 text-black text-[9px] font-bold rounded cursor-pointer"
          >
            Apply
          </button>
        </form>
      )}

      {/* Auto-Fix Success Toast Notification */}
      {fixSuccessMessage && (
        <div className="bg-teal-950/50 border border-teal-500/40 rounded p-1.5 flex items-start space-x-1.5 text-[9px] text-teal-200 animate-in fade-in">
          <Sparkles className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Auto-Optimization: </span>
            <span>{fixSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFixSuccessMessage(null)}
            className="text-teal-400 hover:text-white cursor-pointer font-mono font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Processing Pipeline & Quality Report */}
      {stage < 3 || isSkeleton ? (
        /* Card 3 Skeleton Placeholder State */
        <div className="space-y-2 p-1 animate-pulse">
          <div className="bg-[#06080F] border border-zinc-800/80 p-2 rounded-md space-y-2">
            <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
              <div className="h-3 bg-zinc-800/80 rounded w-28" />
              <div className="h-2.5 bg-zinc-800/80 rounded w-16" />
            </div>
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-zinc-800/80 rounded border border-zinc-700/50" />
              ))}
            </div>
          </div>
          <div className="bg-[#06080F] border border-zinc-800/80 p-2 rounded-md space-y-2">
            <div className="flex justify-between">
              <div className="h-3 bg-zinc-800/80 rounded w-24" />
              <div className="h-3 bg-zinc-800/80 rounded w-10" />
            </div>
            <div className="w-full bg-zinc-800/80 h-2 rounded-full" />
          </div>
        </div>
      ) : hasLogo ? (
        <div className="space-y-1.5">
          {/* 1. Actionable Logo Processing Pipeline Section */}
          <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md space-y-1">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1">
              <span className="text-[9px] font-bold text-white flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                Pipeline Workflow
              </span>
              <span className="text-[8px] font-mono text-zinc-400">
                512×512 PNG
              </span>
            </div>

            {/* Pipeline Step Badges with Sequential Step Animation */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 text-[8px]">
              {/* Step 1: Boundaries & Crop */}
              <div
                className={`p-1 rounded border flex items-center space-x-0.5 transition-all duration-300 ${
                  activeStepIndex >= 0 && pipeline?.autoCropped
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                }`}
              >
                <Check className={`w-2.5 h-2.5 ${activeStepIndex >= 0 && pipeline?.autoCropped ? 'text-emerald-400 font-bold' : 'text-zinc-600'}`} />
                <span className="font-medium truncate">Cropped</span>
              </div>

              {/* Step 2: Auto Center */}
              <div
                className={`p-1 rounded border flex items-center space-x-0.5 transition-all duration-300 ${
                  activeStepIndex >= 1 && pipeline?.autoCentered
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                }`}
              >
                <Check className={`w-2.5 h-2.5 ${activeStepIndex >= 1 && pipeline?.autoCentered ? 'text-emerald-400 font-bold' : 'text-zinc-600'}`} />
                <span className="font-medium truncate">Centered</span>
              </div>

              {/* Step 3: Resized Standard */}
              <div
                className={`p-1 rounded border flex items-center space-x-0.5 transition-all duration-300 ${
                  activeStepIndex >= 2 && pipeline?.resizedToStandard
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                }`}
              >
                <Check className={`w-2.5 h-2.5 ${activeStepIndex >= 2 && pipeline?.resizedToStandard ? 'text-emerald-400 font-bold' : 'text-zinc-600'}`} />
                <span className="font-medium truncate">Resized</span>
              </div>

              {/* Step 4: Compressed & Optimized */}
              <div
                className={`p-1 rounded border flex items-center space-x-0.5 transition-all duration-300 ${
                  activeStepIndex >= 3 && pipeline?.compressedOptimized
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                }`}
              >
                <Check className={`w-2.5 h-2.5 ${activeStepIndex >= 3 && pipeline?.compressedOptimized ? 'text-emerald-400 font-bold' : 'text-zinc-600'}`} />
                <span className="font-medium truncate">Compressed</span>
              </div>

              {/* Step 5: Render Verified */}
              <div
                className={`p-1 rounded border flex items-center space-x-0.5 col-span-2 sm:col-span-1 transition-all duration-300 ${
                  activeStepIndex >= 4 && pipeline?.renderingVerified
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(34,197,94,0.15)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                }`}
              >
                <ShieldCheck className={`w-2.5 h-2.5 ${activeStepIndex >= 4 && pipeline?.renderingVerified ? 'text-emerald-400 font-bold' : 'text-zinc-600'}`} />
                <span className="font-medium truncate">Rendered</span>
              </div>
            </div>

            {/* Compression Stats Bar */}
            {pipeline && (
              <div className="bg-[#0B0E17] border border-zinc-800 p-1 rounded flex items-center justify-between text-[8.5px] gap-1">
                <div className="flex items-center space-x-1">
                  <span className="text-zinc-400">{pipeline.originalSizeFormatted}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="font-mono font-bold text-emerald-400">{pipeline.optimizedSizeFormatted}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold text-[8px]">
                    -{pipeline.compressionRatioPct}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Quality Score Progress Bar */}
          <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold text-zinc-200 flex items-center gap-1">
                Quality
                {renderStars(score)}
              </span>
              <span className="font-mono font-bold text-xs text-emerald-400">
                {score}/100
              </span>
            </div>

            <div className="w-full bg-zinc-800/90 h-1.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  score >= 85
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : score >= 70
                    ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                    : 'bg-gradient-to-r from-amber-500 to-rose-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Geometry Analysis Details Grid */}
          {geometry && (
            <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md space-y-1">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1">
                <span className="text-[9px] font-bold text-zinc-300 flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-teal-400" />
                  Geometry
                </span>
                <span className="font-mono text-[9px] font-bold text-teal-400">
                  Shape {geometry.shapeScore}/100
                </span>
              </div>

              {/* Geometry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[8.5px]">
                <div className="bg-[#0B0E17] border border-zinc-800/80 p-1 rounded space-y-0.5">
                  <div className="text-zinc-400 flex items-center space-x-0.5">
                    <Maximize2 className="w-2.5 h-2.5 text-zinc-400" />
                    <span>Aspect</span>
                  </div>
                  <div className="font-bold text-zinc-200 flex items-center justify-between">
                    <span>{geometry.isSquare ? '1:1 Square' : `${geometry.aspectRatio.toFixed(2)}:1`}</span>
                    {geometry.isSquare ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                    )}
                  </div>
                </div>

                <div className="bg-[#0B0E17] border border-zinc-800/80 p-1 rounded space-y-0.5">
                  <div className="text-zinc-400 flex items-center space-x-0.5">
                    <Target className="w-2.5 h-2.5 text-zinc-400" />
                    <span>Center</span>
                  </div>
                  <div className="font-bold text-zinc-200 flex items-center justify-between">
                    <span>H:{geometry.centerAlignment.horizontalPct}% V:{geometry.centerAlignment.verticalPct}%</span>
                    {geometry.centerAlignment.isCentered ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                    )}
                  </div>
                </div>

                <div className="bg-[#0B0E17] border border-zinc-800/80 p-1 rounded space-y-0.5">
                  <div className="text-zinc-400 flex items-center space-x-0.5">
                    <LayoutGrid className="w-2.5 h-2.5 text-zinc-400" />
                    <span>Fill</span>
                  </div>
                  <div className="font-bold text-zinc-200 flex items-center justify-between">
                    <span>{geometry.canvasCoveragePct}%</span>
                    {geometry.canvasCoveragePct >= 40 && geometry.canvasCoveragePct <= 88 ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                    )}
                  </div>
                </div>

                <div className="bg-[#0B0E17] border border-zinc-800/80 p-1 rounded space-y-0.5">
                  <div className="text-zinc-400 flex items-center space-x-0.5">
                    <Scissors className="w-2.5 h-2.5 text-zinc-400" />
                    <span>Margins</span>
                  </div>
                  <div className="font-bold text-zinc-200 flex items-center justify-between">
                    <span>{!geometry.touchesEdge ? 'Clean' : 'Border'}</span>
                    {!geometry.touchesEdge ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[8.5px]">
            {report?.summaryBadges.map((badge, idx) => (
              <div
                key={idx}
                className="bg-[#06080F] border border-zinc-800/60 px-1.5 py-0.5 rounded flex items-center space-x-1"
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span className="text-zinc-300 truncate">{badge}</span>
              </div>
            ))}
          </div>

          {/* Failure / Low Quality Alert Notice with Interactive Fix Button */}
          {score < 100 && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-md p-1.5 flex items-center justify-between gap-1 text-[9px] animate-in fade-in">
              <div className="flex items-center space-x-1 min-w-0">
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                <div className="text-amber-200 truncate">
                  <span className="font-bold text-amber-300 uppercase">
                    Rating ({score}/100):
                  </span>{' '}
                  <span className="truncate">
                    {failureReason || 'Adjust in 512×512 cropper.'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCropModal(true)}
                className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded text-[9px] flex items-center space-x-1 shrink-0 cursor-pointer transition-all"
              >
                <Scissors className="w-2.5 h-2.5" />
                <span>Fix</span>
              </button>
            </div>
          )}

          {/* Collapsible 11-Point Verification Analysis */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-[8.5px] text-zinc-400 hover:text-white flex items-center space-x-1 cursor-pointer pt-0.5"
            >
              <span>
                {showDetails ? 'Hide 11-Point Audit' : 'View Full 11-Point Audit'}
              </span>
              {showDetails ? (
                <ChevronUp className="w-2.5 h-2.5" />
              ) : (
                <ChevronDown className="w-2.5 h-2.5" />
              )}
            </button>

            {showDetails && (
              <div className="mt-1 space-y-0.5 text-[8.5px] max-h-[120px] overflow-y-auto pr-0.5 animate-in fade-in">
                {checksList.map((check) => (
                  <div
                    key={check.id}
                    className="bg-[#06080F] border border-zinc-800/60 p-1 rounded flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-1 min-w-0">
                      {check.status === 'passed' ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      ) : check.status === 'warning' ? (
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                      )}
                      <span className="text-zinc-300 font-medium truncate">
                        {check.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="font-mono font-bold text-emerald-400">
                        {check.score}/{check.maxScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State: Logo Required Warning */
        <div className="bg-[#06080F] border border-zinc-800/80 rounded-md p-2 text-center space-y-1.5">
          <div className="space-y-1">
            <div className="flex justify-center">
              <Upload className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="font-bold text-white text-[10px] uppercase tracking-wider">
                Upload Token Project Logo
              </div>
              <p className="text-[9px] text-zinc-400 max-w-xs mx-auto mt-0.5 leading-tight">
                Upload or enter image URL for token campaign logo.
              </p>
            </div>
            <button
              type="button"
              onClick={triggerUpload}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded text-[9.5px] inline-flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
            >
              <Upload className="w-3 h-3" />
              <span>Select Logo File</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Manual Logo Crop & 512×512 Equalizer Modal */}
      {report?.logoUrl && (
        <LogoCropModal
          isOpen={showCropModal}
          onClose={() => setShowCropModal(false)}
          logoUrl={report.logoUrl}
          onApplyCrop={(croppedUrl, successMsg) => {
            onUpdateLogo(croppedUrl);
            setFixSuccessMessage(successMsg);
          }}
        />
      )}
    </div>
  );
};
