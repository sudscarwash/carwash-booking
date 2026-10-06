/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, AlertCircle, RefreshCw, SwitchCamera } from 'lucide-react';

interface CameraQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  title?: string;
  subtitle?: string;
}

export const CameraQrScannerModal: React.FC<CameraQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Customer QR Code',
  subtitle = 'Point camera at the customer’s Digital Member Card or Voucher QR code',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState(false);

  // Stop camera tracks helper
  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Start camera stream
  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('Camera access is not supported by this browser.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        // Fallback to basic video without facingMode constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        await videoRef.current.play();
        setIsScanning(true);
        scanFrame();
      }
    } catch (err: any) {
      console.warn('Camera permission or stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : err.message || 'Unable to access device camera.'
      );
      setIsScanning(false);
    }
  };

  // Scan frame loop
  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data && code.data.trim().length > 0) {
      const scannedValue = code.data.trim();
      // Optional audio feedback or vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(100);
        } catch {
          // Ignore
        }
      }
      stopCamera();
      onScan(scannedValue);
      onClose();
      return;
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  // Toggle front / back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">{title}</h3>
              <p className="text-[11px] text-slate-400 line-clamp-1">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative aspect-4/3 sm:aspect-square bg-black flex items-center justify-center overflow-hidden">
          {/* Video Stream */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Hidden Canvas for QR Extraction */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay / Aiming Reticle */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-56 h-56 border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Corner Accents */}
                <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                {/* Laser animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" style={{ top: '50%' }} />
              </div>
            </div>
          )}

          {/* Loading or Error State */}
          {!isScanning && !cameraError && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-300 font-bold">Activating Camera Stream...</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
              </div>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 flex-1">
            Center customer QR code inside target box. Scans automatically.
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {hasCamera && !cameraError && (
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Switch front/back camera"
              >
                <SwitchCamera className="w-4 h-4" />
                <span className="hidden sm:inline">Flip</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
