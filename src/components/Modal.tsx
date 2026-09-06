/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Standard Universal Modal Component for Autoshine BN.
 * 
 * ANY developer can use this component for future popups with ZERO extra code:
 * - Automatically supports the physical Back button (and Android back swipe)
 * - Automatically supports the ESC key
 * - Automatically supports backdrop click
 * - Manages clean browser history (no ghost entries when closed via 'X')
 * - Responsive: renders as a mobile bottom-sheet on small screens and centered card on desktop
 * 
 * Usage example:
 * ```tsx
 * import { Modal } from '../components/Modal.js';
 * 
 * <Modal isOpen={isOpen} onClose={onClose} title="My New Feature">
 *   <div>Modal content goes here...</div>
 * </Modal>
 * ```
 */

import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useModalBack } from '../utils/useBackHandler.js';

export interface ModalProps {
  /** Controls visibility of the modal */
  isOpen: boolean;
  /** Function called to close the modal */
  onClose: () => void;
  /** Optional title in the header */
  title?: ReactNode;
  /** Optional subtitle or description */
  subtitle?: ReactNode;
  /** Optional icon displayed beside the title */
  icon?: ReactNode;
  /** Width constraint of the modal card */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  /** Children content rendered inside the modal body */
  children: ReactNode;
  /** Optional unique HTML ID for the modal */
  id?: string;
  /** Additional container classes */
  className?: string;
  /** If true, the header bar is omitted */
  hideHeader?: boolean;
  /** If true (default), shows the close button in the top right */
  showCloseButton?: boolean;
  /** Optional footer content (e.g. actions / buttons) */
  footer?: ReactNode;
  /** If true, clicking the backdrop will NOT close the modal */
  disableBackdropClick?: boolean;
}

const MAX_WIDTH_CLASSES: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'lg',
  children,
  id,
  className = '',
  hideHeader = false,
  showCloseButton = true,
  footer,
  disableBackdropClick = false,
}) => {
  // Bind this modal to hardware / browser Back button
  useModalBack(isOpen, onClose, id);

  // Bind ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = MAX_WIDTH_CLASSES[maxWidth] || 'max-w-lg';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
      id={id ? `${id}-backdrop` : undefined}
      onClick={(e) => {
        if (!disableBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-3xl w-full ${widthClass} shadow-2xl border border-slate-100 flex flex-col overflow-hidden my-auto max-h-[90vh] ${className}`}
        id={id}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {!hideHeader && (title || showCloseButton) && (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {icon && <div className="shrink-0 text-sky-600">{icon}</div>}
              <div className="min-w-0">
                {title && (
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Close (or press Back)"
                id={id ? `${id}-close-btn` : 'modal-close-btn'}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
