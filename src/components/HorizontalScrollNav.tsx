/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type HorizontalScrollTone = 'white' | 'slate' | 'slate-100' | 'dark-indigo';

interface HorizontalScrollNavProps {
  children: React.ReactNode;
  className?: string;
  scrollClassName?: string;
  tone?: HorizontalScrollTone;
  showProgressBar?: boolean;
  compactArrows?: boolean;
  ariaLabel?: string;
  id?: string;
}

interface ScrollMetrics {
  overflows: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  thumbWidthPct: number;
  thumbLeftPct: number;
}

const INITIAL_METRICS: ScrollMetrics = {
  overflows: false,
  canScrollLeft: false,
  canScrollRight: false,
  thumbWidthPct: 100,
  thumbLeftPct: 0,
};

const TONE_STYLES: Record<
  HorizontalScrollTone,
  {
    fadeLeft: string;
    fadeRight: string;
    btn: string;
    track: string;
    thumb: string;
  }
> = {
  white: {
    fadeLeft: 'from-white via-white/90 to-transparent',
    fadeRight: 'from-white via-white/90 to-transparent',
    btn: 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200 shadow-md',
    track: 'bg-slate-200/70',
    thumb: 'bg-indigo-500/80',
  },
  slate: {
    fadeLeft: 'from-slate-50 via-slate-50/90 to-transparent',
    fadeRight: 'from-slate-50 via-slate-50/90 to-transparent',
    btn: 'bg-white/95 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-md',
    track: 'bg-slate-200/80',
    thumb: 'bg-indigo-500/80',
  },
  'slate-100': {
    fadeLeft: 'from-slate-100 via-slate-100/90 to-transparent',
    fadeRight: 'from-slate-100 via-slate-100/90 to-transparent',
    btn: 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200 shadow-md',
    track: 'bg-slate-300/70',
    thumb: 'bg-slate-600/75',
  },
  'dark-indigo': {
    fadeLeft: 'from-indigo-950 via-indigo-950/90 to-transparent',
    fadeRight: 'from-indigo-950 via-indigo-950/90 to-transparent',
    btn: 'bg-indigo-900/95 hover:bg-indigo-800 text-white border-white/25 shadow-md',
    track: 'bg-white/15',
    thumb: 'bg-white/80',
  },
};

export const HorizontalScrollNav: React.FC<HorizontalScrollNavProps> = ({
  children,
  className = '',
  scrollClassName = 'flex items-center gap-2',
  tone = 'white',
  showProgressBar = true,
  compactArrows = false,
  ariaLabel = 'Scrollable navigation',
  id,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>(INITIAL_METRICS);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const overflows = maxScroll > 2;

    if (!overflows) {
      setMetrics((prev) =>
        !prev.overflows && !prev.canScrollLeft && !prev.canScrollRight
          ? prev
          : INITIAL_METRICS
      );
      return;
    }

    const canScrollLeft = scrollLeft > 2;
    const canScrollRight = scrollLeft < maxScroll - 2;
    const thumbWidthPct = Math.max(18, Math.min(100, (clientWidth / scrollWidth) * 100));
    const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;
    const thumbLeftPct = ratio * (100 - thumbWidthPct);

    setMetrics((prev) => {
      if (
        prev.overflows === overflows &&
        prev.canScrollLeft === canScrollLeft &&
        prev.canScrollRight === canScrollRight &&
        Math.abs(prev.thumbWidthPct - thumbWidthPct) < 0.5 &&
        Math.abs(prev.thumbLeftPct - thumbLeftPct) < 0.5
      ) {
        return prev;
      }
      return {
        overflows,
        canScrollLeft,
        canScrollRight,
        thumbWidthPct,
        thumbLeftPct,
      };
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId = requestAnimationFrame(measure);

    const handleScroll = () => measure();
    const handleResize = () => measure();

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(measure);
      });
      resizeObserver.observe(el);
    }

    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(measure);
      });
      mutationObserver.observe(el, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [measure]);

  const scrollByDirection = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(150, Math.round(el.clientWidth * 0.65));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const styles = TONE_STYLES[tone];

  return (
    <div id={id} className={`relative min-w-0 max-w-full ${className}`}>
      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        role="region"
        aria-label={ariaLabel}
        className={`overflow-x-auto no-scrollbar scrollbar-none touch-pan-x scroll-smooth ${scrollClassName}`}
      >
        {children}
      </div>

      {/* Left Gradient Fade + Scroll Button (only shown when overflowing left) */}
      {metrics.canScrollLeft && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute top-0 bottom-0 left-0 z-10 bg-gradient-to-r ${compactArrows ? 'w-7' : 'w-10'} ${styles.fadeLeft}`}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollByDirection('left');
            }}
            aria-label="Scroll options left"
            title="Scroll left"
            className={`absolute left-0.5 top-1/2 -translate-y-1/2 z-20 ${compactArrows ? 'w-6 h-7' : 'w-7 h-7'} rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 ring-1 ring-black/5 ${styles.btn}`}
          >
            <ChevronLeft className={`${compactArrows ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
          </button>
        </>
      )}

      {/* Right Gradient Fade + Scroll Button (only shown when overflowing right) */}
      {metrics.canScrollRight && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute top-0 bottom-0 right-0 z-10 bg-gradient-to-l ${compactArrows ? 'w-7' : 'w-12'} ${styles.fadeRight}`}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollByDirection('right');
            }}
            aria-label="More options to the right"
            title="Scroll right to see more"
            className={`absolute right-0.5 top-1/2 -translate-y-1/2 z-20 h-7 ${compactArrows ? 'w-6 px-0' : 'px-1.5'} rounded-full border flex items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ring-1 ring-black/5 ${styles.btn}`}
          >
            {!compactArrows && (
              <span className="text-[9px] font-extrabold uppercase tracking-tight pl-0.5 hidden min-[360px]:inline">More</span>
            )}
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </>
      )}

      {/* Subtle Scroll Position Track (only visible when content overflows horizontally) */}
      {showProgressBar && metrics.overflows && (
        <div
          aria-hidden="true"
          className={`w-full h-[3px] rounded-full overflow-hidden mt-1 ${styles.track}`}
        >
          <div
            className={`h-full rounded-full transition-[width,margin-left] duration-150 ${styles.thumb}`}
            style={{
              width: `${metrics.thumbWidthPct}%`,
              marginLeft: `${metrics.thumbLeftPct}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};
