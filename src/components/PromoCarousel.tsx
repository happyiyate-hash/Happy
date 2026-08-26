import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Rocket,
  ShieldCheck,
  Sparkles,
  Award,
  Megaphone,
  Coins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubmittedToken } from '../types';
import { Advertisement, getDefaultAdvertisements } from '../data/advertisements';

interface PromoCarouselProps {
  tokens?: SubmittedToken[];
  customAds?: Advertisement[];
  onNavigateAddToken: () => void;
  onSelectToken?: (token: SubmittedToken) => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0.8,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0.8,
  }),
};

export const PromoCarousel: React.FC<PromoCarouselProps> = ({
  tokens = [],
  customAds,
  onNavigateAddToken,
  onSelectToken,
}) => {
  const [[page, direction], setPage] = useState<[number, number]>([0, 0]);
  const [isPaused, setIsPaused] = useState(false);

  // Load data-driven advertisement list (custom or default 7 campaigns)
  const slides: Advertisement[] =
    customAds && customAds.length > 0
      ? customAds
      : getDefaultAdvertisements(tokens, onNavigateAddToken, onSelectToken);

  const activeIndex = Math.abs(page % slides.length);

  const paginate = useCallback((newDirection: number) => {
    setPage(([prevPage]) => [prevPage + newDirection, newDirection]);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const currentSlide = slides[activeIndex];
    const duration = currentSlide?.durationMs || 4500;
    const interval = setInterval(() => {
      paginate(1);
    }, duration);
    return () => clearInterval(interval);
  }, [isPaused, paginate, activeIndex, slides]);

  const current = slides[activeIndex];

  const renderIcon = (iconType: Advertisement['iconType']) => {
    switch (iconType) {
      case 'flame':
        return <Flame className="w-4 h-4 text-emerald-400" />;
      case 'rocket':
        return <Rocket className="w-4 h-4 text-emerald-400" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'sparkles':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'award':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'megaphone':
        return <Megaphone className="w-4 h-4 text-emerald-400" />;
      case 'coins':
        return <Coins className="w-4 h-4 text-amber-400" />;
      default:
        return <Flame className="w-4 h-4 text-emerald-400" />;
    }
  };

  if (!current) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#06080e] shadow-md transition-all group select-none touch-pan-y h-[82px] sm:h-[88px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={page}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.25 },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.8}
          onDragStart={() => setIsPaused(true)}
          onDragEnd={(e, { offset, velocity }) => {
            setIsPaused(false);
            const swipe = Math.abs(offset.x) * velocity.x;
            if (swipe < -200 || offset.x < -40) {
              paginate(1);
            } else if (swipe > 200 || offset.x > 40) {
              paginate(-1);
            }
          }}
          onClick={() => {
            if (current.onClick) {
              current.onClick();
            } else if (onNavigateAddToken) {
              onNavigateAddToken();
            }
          }}
          className={`absolute inset-0 bg-gradient-to-r ${current.gradient || 'from-[#0d2a1f] via-[#091f17] to-[#06080e]'} p-3 sm:p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-colors`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-black/50 border border-emerald-500/20 shrink-0">
              {renderIcon(current.iconType)}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    current.badgeBg ||
                    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  } uppercase tracking-wider`}
                >
                  {current.tag}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate group-hover:text-emerald-300 transition-colors">
                {current.title}
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-400 truncate leading-snug">
                {current.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 pr-1">
            <span className="text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
              {current.actionText}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Horizontal Carousel Slide Indicators */}
      <div className="absolute bottom-2 right-3 z-10 flex items-center space-x-1 pointer-events-auto">
        {slides.map((_, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const diff = idx - activeIndex;
                if (diff !== 0) {
                  paginate(diff);
                }
              }}
              className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'w-4 bg-emerald-400'
                  : 'w-1 bg-zinc-600/80 hover:bg-zinc-400'
              }`}
              title={`Slide ${idx + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
};


