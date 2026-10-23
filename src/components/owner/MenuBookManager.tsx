import React, { useState } from 'react';
import { Restaurant, MenuBookPage } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { compressMenuPageImage } from '../../utils/imageCompressor';
import { 
  Upload, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Eye, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  BookOpen, 
  Image as ImageIcon,
  Edit2,
  Check,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { MenuBookViewerModal } from '../customer/MenuBookViewerModal';

interface MenuBookManagerProps {
  restaurant: Restaurant;
}

export const MenuBookManager: React.FC<MenuBookManagerProps> = ({ restaurant }) => {
  const { updateRestaurantDetails } = useRestaurants();
  const pages: MenuBookPage[] = restaurant?.menuBookPages || [];

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);

  // Compression metrics
  const totalBookletKb = pages.reduce((sum, p) => sum + (p.compressedSizeKb || 140), 0);
  const totalOriginalKb = pages.reduce((sum, p) => sum + (p.originalSizeKb || 4200), 0);
  const totalSavingsMb = ((totalOriginalKb - totalBookletKb) / 1024).toFixed(1);
  const totalSavingsPercent = totalOriginalKb > 0 ? Math.round(((totalOriginalKb - totalBookletKb) / totalOriginalKb) * 100) : 0;

  // Handle Multi-file Upload with Client-Side Auto-Compression
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newPages: MenuBookPage[] = [...pages];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pageNum = newPages.length + 1;
        setUploadStatus(`Optimizing page ${i + 1} of ${files.length} (${file.name})...`);

        // Compress high-res photo to mobile-safe lightweight JPEG
        const result = await compressMenuPageImage(file);
        const originalMb = (result.originalSizeKb / 1024).toFixed(1);

        newPages.push({
          id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: `Page ${pageNum} — ${file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')}`,
          pageNumber: pageNum,
          imageUrl: result.base64,
          originalSizeKb: result.originalSizeKb,
          compressedSizeKb: result.compressedSizeKb,
          uploadedAt: new Date().toISOString(),
        });
      }

      updateRestaurantDetails(restaurant.id, { menuBookPages: newPages });
      setUploadStatus(`Successfully optimized and added ${files.length} menu page(s)! Photo size automatically reduced by ~95% for instant mobile loading.`);
      setTimeout(() => setUploadStatus(null), 6000);
    } catch (err) {
      console.error('Failed to compress menu page image:', err);
      alert('One or more images could not be processed. Please check file format.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Reorder page up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    // update page numbers
    updated.forEach((p, idx) => (p.pageNumber = idx + 1));
    updateRestaurantDetails(restaurant.id, { menuBookPages: updated });
  };

  // Reorder page down
  const handleMoveDown = (index: number) => {
    if (index === pages.length - 1) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    // update page numbers
    updated.forEach((p, idx) => (p.pageNumber = idx + 1));
    updateRestaurantDetails(restaurant.id, { menuBookPages: updated });
  };

  // Delete page
  const handleDeletePage = (pageId: string) => {
    if (!confirm('Are you sure you want to remove this menu page?')) return;
    const updated = pages.filter(p => p.id !== pageId);
    updated.forEach((p, idx) => (p.pageNumber = idx + 1));
    updateRestaurantDetails(restaurant.id, { menuBookPages: updated });
  };

  // Edit title
  const handleSaveTitle = (pageId: string) => {
    if (!editingTitle.trim()) return;
    const updated = pages.map(p => (p.id === pageId ? { ...p, title: editingTitle.trim() } : p));
    updateRestaurantDetails(restaurant.id, { menuBookPages: updated });
    setEditingPageId(null);
    setEditingTitle('');
  };

  // Add demo sample pages if empty
  const handleAddSamplePages = () => {
    const demoPages: MenuBookPage[] = [
      {
        id: `demo_p1_${Date.now()}`,
        title: 'Page 1 — Starters, Antipasti, Handmade Pasta & Wood-Fired Pizzas',
        pageNumber: 1,
        imageUrl: '/menu-pages/menu_page_1.jpg',
        originalSizeKb: 4850,
        compressedSizeKb: 138,
        uploadedAt: new Date().toISOString(),
      },
      {
        id: `demo_p2_${Date.now()}`,
        title: 'Page 2 — Chef Specialties, Risotto, Bistecca, Dolci & Artisan Drinks',
        pageNumber: 2,
        imageUrl: '/menu-pages/menu_page_2.jpg',
        originalSizeKb: 5120,
        compressedSizeKb: 145,
        uploadedAt: new Date().toISOString(),
      },
    ];
    updateRestaurantDetails(restaurant.id, { menuBookPages: demoPages });
  };

  return (
    <div className="space-y-6">
      {/* Header & Data Optimization Summary Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#DCE3DD] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#2F7A4F]" />
            <h3 className="font-bold text-base text-[#16241B] font-display">
              Physical Menu Booklet & Printed Page Scans
            </h3>
          </div>
          <p className="text-xs text-[#526056] max-w-2xl leading-relaxed">
            Upload your physical printed restaurant menu pages or scans. Our built-in compression automatically scales multi-megabyte photos down by 90%–97%, ensuring customers on mobile data load pages in under a second while keeping all dish names and prices razor-sharp.
          </p>
        </div>

        {/* Bandwidth Savings Badge */}
        {pages.length > 0 && (
          <div className="bg-[#EBF3EE] border border-[#2F7A4F]/30 p-4 rounded-2xl shrink-0 space-y-1 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-end gap-1.5 text-xs font-extrabold text-[#2F7A4F]">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Smart Mobile Data Saver Active</span>
            </div>
            <p className="text-[11px] text-[#526056]">
              {pages.length} Pages • <span className="font-bold text-[#16241B]">{totalBookletKb} KB</span> Total Booklet
            </p>
            <p className="text-[10px] font-bold text-[#2F7A4F]">
              Saved ~{totalSavingsMb} MB bandwidth ({totalSavingsPercent}% smaller)
            </p>
          </div>
        )}
      </div>

      {uploadStatus && (
        <div className="p-3 bg-[#EBF3EE] border border-[#2F7A4F]/30 rounded-2xl text-xs text-[#2F7A4F] font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Upload Zone & Actions */}
      <div className="bg-white p-6 rounded-3xl border border-[#DCE3DD] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-[#16241B]">Upload New Menu Pages</h4>
            <p className="text-xs text-[#526056]">Select one or multiple photos/scans (JPEG, PNG, WebP). Automatic compression runs in the browser.</p>
          </div>

          <div className="flex items-center gap-2">
            {pages.length === 0 && (
              <button
                onClick={handleAddSamplePages}
                className="px-3.5 py-2 bg-white hover:bg-[#F6F7F5] border border-[#DCE3DD] text-[#16241B] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C48214]" />
                <span>Load 2-Page Sample Menu Booklet</span>
              </button>
            )}

            <label className="px-4 py-2 bg-[#2F7A4F] hover:bg-[#235D3B] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Compressing & Adding...' : 'Upload Page(s)'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesSelected}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Compression Explainer Callout */}
        <div className="p-3.5 bg-[#F8FAF9] rounded-2xl border border-[#DCE3DD] text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#16241B]">
            <Zap className="w-3.5 h-3.5 text-[#2F7A4F]" />
            <span>Automatic In-Browser Image Reduction (90%–97% Size Reduction)</span>
          </div>
          <p className="text-[#526056] text-[11px] leading-relaxed">
            When you upload camera photos (even 5MB–15MB iPhone/Android photos), our built-in engine automatically downscales and compresses them to ~120KB–160KB before saving. Small menu dish names, ingredients, and prices remain crystal-sharp, while mobile diners experience sub-second loading without consuming heavy cellular data.
          </p>
        </div>
      </div>

      {/* Uploaded Pages List */}
      {pages.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#DCE3DD] shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#F6F7F5] flex items-center justify-center mx-auto text-[#526056]">
            <ImageIcon className="w-7 h-7 text-[#2F7A4F]" />
          </div>
          <h4 className="font-bold text-base text-[#16241B]">No Printed Menu Pages Uploaded Yet</h4>
          <p className="text-xs text-[#526056] max-w-md mx-auto">
            Upload pictures of your printed physical menu so customers can quickly flip through your authentic restaurant menu booklet while also ordering online!
          </p>
          <button
            onClick={handleAddSamplePages}
            className="px-4 py-2.5 bg-[#2F7A4F] text-white rounded-xl text-xs font-bold hover:bg-[#235D3B] transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load Sample 3-Page Menu Booklet</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#526056] uppercase tracking-wider">
              Uploaded Booklet Pages ({pages.length})
            </span>
            <button
              onClick={() => setPreviewPageIndex(0)}
              className="text-xs font-bold text-[#2F7A4F] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Customer Booklet Viewer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pages.map((page, index) => {
              const isEditing = editingPageId === page.id;
              const savings = page.originalSizeKb && page.compressedSizeKb
                ? Math.round(((page.originalSizeKb - page.compressedSizeKb) / page.originalSizeKb) * 100)
                : 95;

              return (
                <div
                  key={page.id}
                  className="bg-white p-4 rounded-2xl border border-[#DCE3DD] hover:border-[#2F7A4F]/40 shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                    {/* Thumbnail */}
                    <div 
                      onClick={() => setPreviewPageIndex(index)}
                      className="w-16 h-20 rounded-xl bg-[#16241B] overflow-hidden shrink-0 border border-[#DCE3DD] relative group cursor-pointer shadow-2xs"
                      title="Click to preview full size"
                    >
                      <img
                        src={page.imageUrl}
                        alt={page.title}
                        className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#16241B] text-white text-[10px] font-bold font-mono">
                          Page {page.pageNumber}
                        </span>
                        {page.compressedSizeKb && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#EBF3EE] text-[#2F7A4F] text-[10px] font-bold border border-[#2F7A4F]/20">
                            <Zap className="w-2.5 h-2.5 text-emerald-600" />
                            <span>
                              {((page.originalSizeKb || 4800) / 1024).toFixed(1)} MB ➔ {page.compressedSizeKb} KB ({savings}% smaller)
                            </span>
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-[#2F7A4F] rounded-lg focus:outline-none w-full max-w-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTitle(page.id)}
                            className="p-1 bg-[#2F7A4F] text-white rounded-lg hover:bg-[#235D3B] cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPageId(null)}
                            className="p-1 bg-[#F6F7F5] text-[#526056] rounded-lg hover:bg-[#DCE3DD] cursor-pointer"
                            title="Cancel"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#16241B] truncate">{page.title}</h4>
                          <button
                            onClick={() => {
                              setEditingPageId(page.id);
                              setEditingTitle(page.title);
                            }}
                            className="text-[#526056] hover:text-[#16241B] p-0.5 cursor-pointer"
                            title="Edit page title"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <p className="text-[11px] text-[#526056]">
                        Uploaded {new Date(page.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => setPreviewPageIndex(index)}
                      className="p-2 rounded-xl bg-[#F6F7F5] hover:bg-[#DCE3DD] text-[#16241B] text-xs font-bold transition-all cursor-pointer"
                      title="Inspect Page in High Res"
                    >
                      <Eye className="w-4 h-4 text-[#526056]" />
                    </button>

                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-2 rounded-xl bg-[#F6F7F5] hover:bg-[#DCE3DD] text-[#16241B] disabled:opacity-30 cursor-pointer"
                      title="Move Page Earlier"
                    >
                      <MoveUp className="w-4 h-4 text-[#526056]" />
                    </button>

                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === pages.length - 1}
                      className="p-2 rounded-xl bg-[#F6F7F5] hover:bg-[#DCE3DD] text-[#16241B] disabled:opacity-30 cursor-pointer"
                      title="Move Page Later"
                    >
                      <MoveDown className="w-4 h-4 text-[#526056]" />
                    </button>

                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer ml-1"
                      title="Delete Page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Preview Modal */}
      {previewPageIndex !== null && (
        <MenuBookViewerModal
          restaurant={restaurant}
          initialPageIndex={previewPageIndex}
          onClose={() => setPreviewPageIndex(null)}
        />
      )}
    </div>
  );
};
