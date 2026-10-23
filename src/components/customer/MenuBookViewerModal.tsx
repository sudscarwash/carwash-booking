import React, { useState, useEffect, useCallback } from 'react';
import { Restaurant, MenuBookPage } from '../../types';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Sparkles, 
  Download, 
  UtensilsCrossed, 
  Layers, 
  Zap,
  Info
} from 'lucide-react';

interface MenuBookViewerModalProps {
  restaurant?: Restaurant;
  restaurantName?: string;
  pages?: MenuBookPage[];
  initialPageIndex?: number;
  onClose: () => void;
  onSwitchToOrdering?: () => void;
}

export const MenuBookViewerModal: React.FC<MenuBookViewerModalProps> = ({
  restaurant,
  restaurantName,
  pages: propPages,
  initialPageIndex = 0,
  onClose,
  onSwitchToOrdering
}) => {
  const pages = propPages || restaurant?.menuBookPages || [];
  const displayName = restaurantName || restaurant?.name || 'Restaurant';
  const [currentPageIndex, setCurrentPageIndex] = useState(
    Math.min(Math.max(0, initialPageIndex), Math.max(0, pages.length - 1))
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(true);

  const currentPage: MenuBookPage | undefined = pages[currentPageIndex];

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setZoomLevel(1);
    setCurrentPageIndex(prev => (prev > 0 ? prev - 1 : pages.length - 1));
  }, [pages.length]);

  const handleNext = useCallback(() => {
    setZoomLevel(1);
    setCurrentPageIndex(prev => (prev < pages.length - 1 ? prev + 1 : 0));
  }, [pages.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === '+' || e.key === '=') setZoomLevel(z => Math.min(2.5, z + 0.25));
      if (e.key === '-') setZoomLevel(z => Math.max(1, z - 0.25));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  // Total compressed data footprint
  const totalBookletKb = pages.reduce((sum, p) => sum + (p.compressedSizeKb || 150), 0);
  const totalOriginalKb = pages.reduce((sum, p) => sum + (p.originalSizeKb || 4000), 0);
  const totalSavedMb = ((totalOriginalKb - totalBookletKb) / 1024).toFixed(1);

  if (pages.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F6F7F5] flex items-center justify-center mx-auto text-[#526056]">
            <UtensilsCrossed className="w-6 h-6 text-[#2F7A4F]" />
          </div>
          <h3 className="font-bold text-lg text-[#16241B]">No Physical Menu Uploaded Yet</h3>
          <p className="text-xs text-[#526056]">
            {displayName} has not yet uploaded physical printed menu scans. You can still order through the interactive online menu!
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#2F7A4F] text-white rounded-xl text-xs font-bold hover:bg-[#235D3B] transition-all cursor-pointer"
          >
            Browse Interactive Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col text-white select-none">
      {/* Top Controls Bar */}
      <div className="px-4 py-3 bg-black/60 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#2F7A4F] flex items-center justify-center font-bold text-xs shrink-0">
            📖
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white truncate">{displayName}</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2F7A4F]/30 text-[#8BAE97] text-[10px] font-bold border border-[#2F7A4F]/40">
                <Zap className="w-3 h-3 text-emerald-400" />
                Data Saver (Saved {totalSavedMb} MB)
              </span>
            </div>
            <p className="text-[11px] text-white/70 truncate">
              {currentPage?.title || `Page ${currentPageIndex + 1}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setZoomLevel(z => Math.max(1, z - 0.25))}
              disabled={zoomLevel <= 1}
              className="p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-white/90">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.25))}
              disabled={zoomLevel >= 2.5}
              className="p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white cursor-pointer ml-1"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Thumbnails */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showThumbnails 
                ? 'bg-white/20 border-white/30 text-white' 
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
            title="Toggle Page Thumbnails"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden md:inline">Pages</span>
          </button>

          {/* Switch to Online Ordering */}
          {onSwitchToOrdering && (
            <button
              onClick={() => {
                onClose();
                onSwitchToOrdering();
              }}
              className="px-3 py-1.5 bg-[#E0562B] hover:bg-[#B5431E] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Order Dishes Online</span>
              <span className="sm:hidden">Order</span>
            </button>
          )}

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer ml-1"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Page Viewer Stage */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-6">
        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          className="absolute left-3 sm:left-6 z-20 p-3 sm:p-4 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/15 text-white shadow-xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Previous Page (Left Arrow)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={handleNext}
          className="absolute right-3 sm:right-6 z-20 p-3 sm:p-4 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/15 text-white shadow-xl backdrop-blur-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Next Page (Right Arrow)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Interactive Page Container */}
        <div 
          className="max-h-full max-w-full overflow-auto flex items-center justify-center transition-transform duration-200"
        >
          {currentPage && (
            <div 
              className="relative rounded-xl overflow-hidden shadow-2xl transition-all bg-[#1a1a1a]"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out'
              }}
            >
              <img
                src={currentPage.imageUrl}
                alt={currentPage.title}
                className="max-h-[75vh] w-auto max-w-[92vw] sm:max-w-[80vw] object-contain rounded-xl select-none"
                draggable={false}
              />
              
              {/* Page Number Watermark Overlay */}
              <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-xs font-mono font-bold text-white/90 border border-white/10">
                Page {currentPageIndex + 1} of {pages.length}
              </div>

              {/* Data footprint tag */}
              {currentPage.compressedSizeKb && (
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-mono text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>{currentPage.compressedSizeKb} KB</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Thumbnail Strip & Page Selector */}
      {showThumbnails && pages.length > 1 && (
        <div className="p-3 bg-black/80 border-t border-white/10 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
            {pages.map((page, idx) => {
              const isActive = idx === currentPageIndex;
              return (
                <button
                  key={page.id || idx}
                  onClick={() => {
                    setZoomLevel(1);
                    setCurrentPageIndex(idx);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer border text-left ${
                    isActive 
                      ? 'bg-[#2F7A4F] border-[#2F7A4F] text-white shadow-lg ring-2 ring-emerald-400/50' 
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <div className="w-7 h-9 rounded bg-black/40 overflow-hidden shrink-0 border border-white/10">
                    <img 
                      src={page.imageUrl} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 max-w-[130px] sm:max-w-[180px]">
                    <span className="text-[10px] uppercase tracking-wider font-bold block opacity-80">
                      Page {idx + 1}
                    </span>
                    <span className="text-xs font-bold truncate block">
                      {page.title.replace(/^Page \d+ [—–-] /, '')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
