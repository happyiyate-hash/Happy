import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Coins,
  Heart,
  Shield,
  Settings,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Check,
  MessageSquare,
  HelpCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import {
  HELP_CATEGORIES,
  HelpArticle,
  HelpCategory,
  searchHelpArticles,
  getHelpArticleById,
} from '../data/helpCenterData';
import { useTranslation } from '../utils/i18n';

interface HelpCenterViewProps {
  onBack: () => void;
  onNavigateContactSupport: () => void;
}

export const HelpCenterView: React.FC<HelpCenterViewProps> = ({
  onBack,
  onNavigateContactSupport,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);

  const articleScrollRef = useRef<HTMLDivElement | null>(null);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  // Search Results calculation
  const searchResults = useMemo(() => {
    return searchHelpArticles(searchQuery);
  }, [searchQuery]);

  // Selected article resolution
  const activeArticleData = useMemo(() => {
    if (!selectedArticleId) return null;
    return getHelpArticleById(selectedArticleId);
  }, [selectedArticleId]);

  const handleSelectArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    setFeedbackGiven(null);
    if (articleScrollRef.current) {
      articleScrollRef.current.scrollTop = 0;
    }
  };

  const handleBackToMain = () => {
    setSelectedArticleId(null);
    setFeedbackGiven(null);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  };

  const renderCategoryIcon = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Coins':
        return <Coins className={className} />;
      case 'Heart':
        return <Heart className={className} />;
      case 'Shield':
        return <Shield className={className} />;
      case 'Settings':
        return <Settings className={className} />;
      case 'AlertTriangle':
        return <AlertTriangle className={className} />;
      default:
        return <BookOpen className={className} />;
    }
  };

  // ==========================================
  // DEDICATED ARTICLE VIEW (No giant card wrapping)
  // ==========================================
  if (activeArticleData) {
    const { article, category } = activeArticleData;

    return (
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#06080E] text-white animate-in fade-in duration-200">
        {/* Top Slim Header */}
        <header className="shrink-0 z-30 bg-[#090C12]/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-2.5 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2 min-w-0">
              <button
                onClick={handleBackToMain}
                className="p-1 text-white hover:text-emerald-400 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                title={t('helpCenter.title', 'Help Center')}
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center space-x-1 text-[11px] text-zinc-400 truncate">
                  <span
                    onClick={handleBackToMain}
                    className="hover:text-emerald-400 cursor-pointer transition-colors"
                  >
                    {t('helpCenter.title', 'Help Center')}
                  </span>
                  <ChevronRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />
                  <span className="text-emerald-400 font-bold truncate">{category.title}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onNavigateContactSupport}
              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-lg transition-all cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3 h-3 text-[#00E575]" />
              <span>{t('helpCenter.contactSupport', 'Contact Support')}</span>
            </button>
          </div>
        </header>

        {/* Article Content Sitting Directly on the Main Dark Background - Dedicated Natural Scroll */}
        <main
          ref={articleScrollRef}
          className="flex-1 min-h-0 overflow-y-auto w-full overscroll-y-contain px-4 py-6 sm:py-8 space-y-6 pb-36"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="max-w-3xl w-full mx-auto space-y-6">
            {/* Eyebrow & Title */}
            <div className="space-y-2 border-b border-zinc-800/60 pb-5">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#00E575] tracking-wide uppercase">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.title}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 font-normal normal-case">{article.readTime}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {article.title}
              </h1>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed pt-1 font-normal">
                {article.content.intro}
              </p>
            </div>

            {/* Article Sections (Plain text typography with subtle styling) */}
            <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
              {article.content.sections.map((section, idx) => (
                <div key={idx} className="space-y-2.5">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-[#00E575] font-mono text-xs">0{idx + 1}.</span>
                    <span>{section.heading}</span>
                  </h2>

                  <div className="space-y-2 pl-4 border-l-2 border-zinc-800/80">
                    {section.body.map((paragraph, pIdx) => {
                      const isBullet = paragraph.startsWith('• ') || paragraph.match(/^\d+\.\s/);
                      return (
                        <p
                          key={pIdx}
                          className={`text-xs sm:text-sm text-zinc-300 ${
                            isBullet ? 'pl-2 text-zinc-200 font-medium' : ''
                          }`}
                        >
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>

                  {/* Optional Tip Highlight */}
                  {section.tip && (
                    <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 flex items-start space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#00E575] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#00E575] font-bold">{t('helpCenter.proTip', 'Pro Tip:')} </strong>
                        {section.tip}
                      </span>
                    </div>
                  )}

                  {/* Optional Warning Highlight */}
                  {section.warning && (
                    <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-amber-400 font-bold">{t('helpCenter.importantNotice', 'Important Notice:')} </strong>
                        {section.warning}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {article.content.conclusion && (
                <p className="text-xs sm:text-sm text-zinc-400 italic pt-2">
                  {article.content.conclusion}
                </p>
              )}
            </div>

            {/* Feedback Section */}
            <div className="pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#090C12]/60 border border-zinc-800/80 rounded-2xl p-4">
              <div>
                <span className="text-xs font-bold text-white block">{t('helpCenter.wasHelpful', 'Was this article helpful?')}</span>
                <span className="text-[11px] text-zinc-400">{t('helpCenter.feedbackDesc', 'Your feedback helps improve our knowledge base.')}</span>
              </div>

              {feedbackGiven ? (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('helpCenter.feedbackThanks', 'Thank you for your feedback!')}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setFeedbackGiven('yes')}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3 text-emerald-400" />
                    <span>{t('helpCenter.yes', 'Yes')}</span>
                  </button>
                  <button
                    onClick={() => setFeedbackGiven('no')}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <ThumbsDown className="w-3 h-3 text-red-400" />
                    <span>{t('helpCenter.no', 'No')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Related Articles */}
            {article.relatedArticleIds && article.relatedArticleIds.length > 0 && (
              <div className="space-y-2 pt-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t('helpCenter.relatedArticles', 'Related Articles')}
                </span>
                <div className="divide-y divide-zinc-800/60 border border-zinc-800/80 rounded-2xl overflow-hidden bg-[#090C12]/40">
                  {article.relatedArticleIds.map((relId) => {
                    const relData = getHelpArticleById(relId);
                    if (!relData) return null;
                    return (
                      <div
                        key={relId}
                        onClick={() => handleSelectArticle(relId)}
                        className="p-3 hover:bg-zinc-800/40 transition-colors cursor-pointer flex items-center justify-between text-xs text-zinc-300 hover:text-emerald-300 group"
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <BookOpen className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                          <span className="truncate font-medium">{relData.article.title}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Prompt: Still need help? */}
            <div className="border border-zinc-800/80 rounded-2xl p-4 bg-[#090C12] flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-xs font-bold text-white">{t('helpCenter.stillNeedHelp', 'Still need help?')}</h3>
                <p className="text-[11px] text-zinc-400">
                  {t('helpCenter.stillNeedHelpDesc', 'Our support team is available 24/7 via live chat and problem tickets.')}
                </p>
              </div>

              <button
                onClick={onNavigateContactSupport}
                className="px-3.5 py-2 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black text-xs font-black rounded-xl flex items-center space-x-1 cursor-pointer shadow-md shadow-emerald-500/20 transition-all shrink-0"
              >
                <span>{t('helpCenter.contactSupport', 'Contact Support')}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-black" />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // MAIN HELP CENTER VIEW
  // ==========================================
  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#06080E] text-white animate-in fade-in duration-200">
      {/* 1. COMPACT NON-SCROLLING TOP HEADER: Back + Help Center Title + Contact Support + Search */}
      <div className="shrink-0 z-30 bg-[#090C12]">
        <div className="max-w-3xl mx-auto px-6 pt-3.5 pb-3 space-y-2.5">
          {/* Header Row: Back + Help Center & Contact Support */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 min-w-0">
              <button
                onClick={onBack}
                id="help-center-back-btn"
                className="p-1 -ml-1 text-white hover:text-emerald-400 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                title={t('common.back', 'Back')}
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {t('helpCenter.title', 'Help Center')}
              </h1>
            </div>

            <button
              onClick={onNavigateContactSupport}
              id="help-center-contact-support-btn"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#00E575]" />
              <span>{t('helpCenter.contactSupport', 'Contact Support')}</span>
            </button>
          </div>

          {/* Search Field */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              id="help-center-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('helpCenter.searchPlaceholder', 'Search guides, 2FA, token verification...')}
              className="w-full bg-[#0E131F] border border-zinc-800/90 focus:border-[#00E575] focus:ring-1 focus:ring-[#00E575]/20 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Page Content - Dedicated Single Vertical Scroll Container (Flat Knowledge Base Layout) */}
      <main
        ref={mainScrollRef}
        className="flex-1 min-h-0 overflow-y-auto w-full overscroll-y-contain px-6 py-6 space-y-8 pb-44"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-3xl w-full mx-auto space-y-8">
          {/* SEARCH RESULTS VIEW */}
          {searchQuery && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 pb-1 border-b border-zinc-800/60">
                <span>
                  {t('helpCenter.searchResultsFor', 'Search results for')} "<strong className="text-white">{searchQuery}</strong>"
                </span>
                <span className="text-zinc-500 font-mono">{searchResults.length} {t('helpCenter.found', 'found')}</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <HelpCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">{t('helpCenter.noResults', 'No articles matched your search')}</h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      {t('helpCenter.noResultsDesc', 'Try searching with simpler keywords, or talk directly with our support team.')}
                    </p>
                  </div>
                  <button
                    onClick={onNavigateContactSupport}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-[#00E575] hover:underline cursor-pointer pt-1"
                  >
                    <span>{t('helpCenter.openLiveChat', 'Open Support Live Chat')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {searchResults.map(({ article, category, matchSnippet }) => (
                    <div
                      key={article.id}
                      onClick={() => handleSelectArticle(article.id)}
                      className="py-3.5 px-2 -mx-2 hover:bg-zinc-800/30 rounded-lg transition-colors cursor-pointer group flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2 text-[10px] text-zinc-400">
                          <span className="font-bold text-[#00E575] uppercase">{category.title}</span>
                          <span>•</span>
                          <span>{article.readTime}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00E575] transition-colors">
                          {article.title}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {matchSnippet}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#00E575] shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ALL HELP CATEGORIES (Clean, unboxed documentation stream) */}
          {!searchQuery &&
            HELP_CATEGORIES.map((cat, catIndex) => (
              <section key={cat.id} className="space-y-3">
                {/* Category Header: Uppercase Title & Clean Description directly on page background */}
                <div className="space-y-1">
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <span
                      className="w-1.5 h-3.5 rounded-full inline-block"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.title}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pl-3.5">
                    {cat.description}
                  </p>
                </div>

                {/* Article List with thin dividers */}
                <div className="divide-y divide-zinc-800/60 pt-1">
                  {cat.articles.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => handleSelectArticle(art.id)}
                      className="py-2.5 px-2 -mx-2 hover:bg-zinc-800/30 rounded-lg transition-colors cursor-pointer group flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="text-emerald-400 font-bold text-base leading-none select-none">
                          •
                        </span>
                        <span className="text-xs sm:text-sm text-zinc-200 group-hover:text-white font-medium truncate">
                          {art.title}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[11px] text-zinc-500 hidden sm:inline font-normal">
                          {art.readTime}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#00E575] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtle Divider Line Between Category Sections */}
                {catIndex < HELP_CATEGORIES.length - 1 && (
                  <div className="pt-6 border-b border-zinc-800/60" />
                )}
              </section>
            ))}

          {/* Bottom Contact Support Prompt */}
          {!searchQuery && (
            <div className="pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-white">{t('helpCenter.needHelp', 'Need customized assistance?')}</h3>
                <p className="text-xs text-zinc-400">
                  {t('helpCenter.needHelpDesc', 'Can’t find what you\'re looking for? Connect with our support team in real time.')}
                </p>
              </div>

              <button
                onClick={onNavigateContactSupport}
                className="self-start sm:self-auto px-4 py-2 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black text-xs font-black rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition-all shrink-0"
              >
                <span>{t('helpCenter.contactSupport', 'Contact Support')}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-black" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

