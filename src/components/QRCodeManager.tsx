import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { CarWash } from '../types.js';
import { 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Sparkles, 
  Link as LinkIcon, 
  Edit3, 
  Save, 
  AlertCircle,
  Printer,
  Smartphone,
  Eye
} from 'lucide-react';

interface QRCodeManagerProps {
  carWash: CarWash;
  onUpdateSlug?: (newSlug: string) => Promise<boolean>;
}

export const QRCodeManager: React.FC<QRCodeManagerProps> = ({ carWash, onUpdateSlug }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [customSlug, setCustomSlug] = useState(carWash.slug || '');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [urlFormat, setUrlFormat] = useState<'slug' | 'id'>('slug');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute canonical slug & URL
  const activeSlug = carWash.slug || carWash.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || carWash.id;
  const targetIdentifier = urlFormat === 'id' ? carWash.id : activeSlug;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const bookingUrl = `${baseUrl}/wash/${targetIdentifier}`;

  useEffect(() => {
    setCustomSlug(carWash.slug || activeSlug);
  }, [carWash.slug, activeSlug]);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(bookingUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = bookingUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenDirectlyInApp = () => {
    window.history.pushState({ path: `/wash/${targetIdentifier}` }, '', `/wash/${targetIdentifier}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSaveSlug = async () => {
    setSlugError(null);
    const sanitized = customSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!sanitized || sanitized.length < 3) {
      setSlugError('Link handle must be at least 3 characters long (letters, numbers, hyphens).');
      return;
    }

    if (sanitized === carWash.slug) {
      setIsEditingSlug(false);
      return;
    }

    if (!onUpdateSlug) {
      setSlugError('Updating custom URL is not supported in this view.');
      return;
    }

    setIsSavingSlug(true);
    try {
      const success = await onUpdateSlug(sanitized);
      if (success) {
        setIsEditingSlug(false);
      } else {
        setSlugError('Failed to update URL handle. Please check your connection.');
      }
    } catch (err: any) {
      setSlugError(err?.message || 'Error updating custom link handle.');
    } finally {
      setIsSavingSlug(false);
    }
  };

  // Generate high-resolution printable graphic poster with branding
  const handleDownloadPrintablePoster = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1500);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 1500);

    // Inner White Card
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(80, 80, 1040, 1340, 48);
    ctx.fill();

    // Header Tag
    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath();
    ctx.roundRect(400, 140, 400, 56, 28);
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO BOOK INSTANTLY', 600, 178);

    // Car Wash Title
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';

    // Wrap car wash title if long
    const name = carWash.name;
    if (name.length > 25) {
      ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(name, 600, 260);
    } else {
      ctx.fillText(name, 600, 260);
    }

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Point your phone camera to select wash services & reserve your slot', 600, 310);

    // QR Code Image
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
      // White container box with subtle border
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(260, 360, 680, 680, 32);
      ctx.fill();
      ctx.stroke();

      // Draw QR Code
      ctx.drawImage(qrImg, 300, 400, 600, 600);

      // Direct URL pill
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(200, 1080, 800, 72, 36);
      ctx.fill();

      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      const displayUrl = bookingUrl.replace(/^https?:\/\//, '');
      ctx.fillText(displayUrl, 600, 1127);

      // Location address
      if (carWash.address) {
        ctx.fillStyle = '#475569';
        ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const addressText = carWash.address.length > 55 ? carWash.address.slice(0, 52) + '...' : carWash.address;
        ctx.fillText(addressText, 600, 1200);
      }

      // Footer branding
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Powered by AutoShine BN • No Mobile App Required', 600, 1340);

      // Trigger Download
      const link = document.createElement('a');
      link.download = `${activeSlug}-booking-qr-poster.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    qrImg.src = qrDataUrl;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden" id="qr-code-manager-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-150">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-lg">Customer QR Code & Direct Link</h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-200">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customers scan with any phone camera to jump straight into booking your bays
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPrintablePoster}
            disabled={!qrDataUrl}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            id="download-qr-poster-btn"
            title="Download high-resolution printable counter poster"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Download Poster (PNG)</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 items-center">
        {/* QR Code Canvas / Visual Preview */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="relative group bg-gradient-to-b from-slate-50 to-white p-4 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`${carWash.name} Booking QR Code`}
                className="w-56 h-56 object-contain rounded-2xl bg-white shadow-xs"
                id="booking-qr-preview-img"
              />
            ) : (
              <div className="w-56 h-56 bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}

            <div className="mt-3 text-center">
              <span className="text-[11px] font-bold text-slate-700 block">{carWash.name}</span>
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5 font-medium">
                <Smartphone className="w-3 h-3 text-sky-600" /> Compatible with iOS & Android Camera
              </span>
            </div>
          </div>
        </div>

        {/* Link Details & Configuration */}
        <div className="md:col-span-7 space-y-4">
          {/* Target Format Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setUrlFormat('slug')}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                urlFormat === 'slug'
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Branded Vanity URL</span>
              <span className="text-[10px] font-mono bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-100">
                /wash/{activeSlug}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setUrlFormat('id')}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                urlFormat === 'id'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Permanent Station ID</span>
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                /wash/{carWash.id}
              </span>
            </button>
          </div>

          {/* Direct URL Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-600" /> Direct Booking Web Address
              </span>
              <span className="text-[11px] text-slate-500">
                {urlFormat === 'id' ? 'Immune to future name changes' : 'Custom friendly handle'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 truncate select-all">
                {bookingUrl}
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                }`}
                id="copy-booking-link-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDirectlyInApp}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                id="test-open-direct-link-btn"
                title="Visit live station page directly inside this app"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Page</span>
              </button>

              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                title="Open and preview in new tab"
                id="preview-booking-link-btn"
              >
                <ExternalLink className="w-4 h-4 text-sky-600" />
              </a>
            </div>
          </div>

          {/* Vanity Slug Customizer */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Custom URL Handle</span>
                <span className="text-[11px] text-slate-500">
                  Short, readable name used in your link (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700 font-mono">brunei-royal-auto-spa</code>)
                </span>
              </div>

              {!isEditingSlug && onUpdateSlug && (
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(true)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                  id="edit-slug-btn"
                >
                  <Edit3 className="w-3 h-3" /> Edit Handle
                </button>
              )}
            </div>

            {isEditingSlug ? (
              <div className="space-y-2 pt-1 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono select-none">
                      /wash/
                    </span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="my-carwash-name"
                      className="w-full pl-16 pr-3 py-2 border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-xs font-mono text-slate-800 transition-all bg-white"
                      id="custom-slug-input"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSlug}
                    disabled={isSavingSlug}
                    className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                    id="save-slug-btn"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingSlug ? 'Saving...' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSlug(false);
                      setCustomSlug(carWash.slug || activeSlug);
                      setSlugError(null);
                    }}
                    className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>

                {slugError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {slugError}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-slate-400">Handle:</span>
                <span className="font-bold text-slate-800">{activeSlug}</span>
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="flex items-start gap-3 bg-sky-50/60 border border-sky-100 rounded-2xl p-3.5 text-xs text-sky-900">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="font-bold block">How customers use your QR code:</span>
              <p className="text-[11px] text-slate-600">
                1. Customer points their smartphone camera at your printed QR code.<br />
                2. Your booking schedule, services, and live bay availability open instantly.<br />
                3. Customer logs in or signs up without losing their place, locking in their appointment seamlessly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
