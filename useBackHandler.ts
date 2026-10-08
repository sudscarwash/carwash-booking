/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Reusable Back-Button and History Navigation Framework for Autoshine BN.
 * 
 * DESIGNED FOR MINIMAL ERROR POTENTIAL AND ZERO-FRICTION DEVELOPER HANDOFF:
 * 1. Automatically intercepts the device / browser Back button (and Android back swipe)
 *    to close open popups before navigating away.
 * 2. Manages a clean LIFO (Last-In-First-Out) stack: if multiple popups or sub-steps
 *    are open, Back closes ONLY the topmost popup.
 * 3. Prevents "ghost" history entries: when a popup is closed via on-screen UI
 *    (e.g., clicking "X", clicking backdrop, or form completion), it cleanly
 *    discards the pushed history state so pressing Back later doesn't do nothing.
 * 4. Easily reusable: any developer building a new modal simply uses `<Modal>`
 *    or adds `useModalBack(isOpen, onClose)` with zero manual history logic.
 */

import { useEffect, useRef, useCallback } from 'react';

interface ModalStackEntry {
  id: string;
  onClose: () => void;
  pushedHistory: boolean;
}

// Global in-memory stack of currently active modals/popups
const modalStack: ModalStackEntry[] = [];

// Flag to differentiate whether a popstate was fired by native browser navigation
// (e.g. user pressed physical Back) vs. our programmatic history.back() cleanup.
let isProgrammaticPop = false;

// Global popstate listener registered once on window
let isGlobalListenerAttached = false;

function ensureGlobalListener() {
  if (typeof window === 'undefined' || isGlobalListenerAttached) return;

  window.addEventListener('popstate', (event) => {
    // If this popstate was caused by our own cleanup (when user clicked 'X' or 'Cancel'), ignore it.
    if (isProgrammaticPop) {
      isProgrammaticPop = false;
      return;
    }

    // If there is an active modal on top of the stack, close it!
    if (modalStack.length > 0) {
      const topModal = modalStack.pop();
      if (topModal) {
        // Because the browser already popped the history entry, we do NOT call history.back()
        try {
          topModal.onClose();
        } catch (err) {
          console.error('[Autoshine BackHandler] Error executing modal onClose:', err);
        }
      }
    }
  });

  isGlobalListenerAttached = true;
}

/**
 * Universal hook to bind any popup or modal to the browser/hardware Back button.
 * 
 * @param isOpen Whether the modal is currently open and visible
 * @param onClose Callback function called when the modal should close (or step back)
 * @param modalId Optional unique identifier for diagnostic / debugging purposes
 */
export function useModalBack(
  isOpen: boolean,
  onClose: () => void,
  modalId?: string
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const idRef = useRef(modalId || `modal-${Math.random().toString(36).slice(2, 9)}`);
  if (modalId && idRef.current !== modalId) {
    idRef.current = modalId;
  }

  // Track if this instance has an active entry in modalStack and history
  const hasPushedRef = useRef(false);

  useEffect(() => {
    ensureGlobalListener();

    if (isOpen) {
      // Push history state if not already pushed for this instance
      if (!hasPushedRef.current) {
        const stateObj = {
          autoshine_modal: true,
          modalId: idRef.current,
          timestamp: Date.now(),
        };

        try {
          window.history.pushState(stateObj, '');
          hasPushedRef.current = true;
        } catch (e) {
          console.warn('[Autoshine BackHandler] Unable to pushState:', e);
        }

        modalStack.push({
          id: idRef.current,
          onClose: () => onCloseRef.current(),
          pushedHistory: hasPushedRef.current,
        });
      }
    } else {
      // When modal becomes closed:
      // If it was still recorded in modalStack, that means it was closed via UI (e.g. "X" button or backdrop)
      // rather than the browser Back button. We must clean up the history entry!
      if (hasPushedRef.current) {
        const index = modalStack.findIndex((m) => m.id === idRef.current);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }
        hasPushedRef.current = false;

        // Cleanly pop the dummy entry from history
        try {
          isProgrammaticPop = true;
          window.history.back();
        } catch (e) {
          isProgrammaticPop = false;
        }
      }
    }

    return () => {
      // Unmount cleanup: if modal unmounts while still open
      if (hasPushedRef.current) {
        const index = modalStack.findIndex((m) => m.id === idRef.current);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }
        hasPushedRef.current = false;

        try {
          isProgrammaticPop = true;
          window.history.back();
        } catch (e) {
          isProgrammaticPop = false;
        }
      }
    };
  }, [isOpen]);
}

/**
 * Universal hook for Dashboard Tabs navigation via Back button.
 * When user navigates through tabs, pressing Back returns to the previous tab
 * (unless a modal is currently open, in which case the modal closes first).
 * 
 * @param activeTab Currently active tab
 * @param setActiveTab Tab setter function
 * @param defaultTab The root / default tab
 * @param tabParam Name of the URL query parameter (e.g. 'tab')
 */
export function useTabBack<T extends string>(
  activeTab: T,
  setActiveTab: ((tab: T) => void) | React.Dispatch<React.SetStateAction<T>>,
  defaultTab: T,
  tabParam: string = 'tab'
) {
  const isNavigatingViaPopRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // On initial mount, restore tab from URL search params if present
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get(tabParam) as T | null;
      if (urlTab && urlTab !== activeTab) {
        isNavigatingViaPopRef.current = true;
        setActiveTab(urlTab);
      }
    } catch (e) {
      // In sandbox/preview, ignore URL errors
    }
  }, []);

  // Update URL and history when tab changes
  useEffect(() => {
    if (isNavigatingViaPopRef.current) {
      isNavigatingViaPopRef.current = false;
      return;
    }

    try {
      const url = new URL(window.location.href);
      const currentUrlTab = url.searchParams.get(tabParam);

      if (activeTab === defaultTab) {
        if (currentUrlTab) {
          url.searchParams.delete(tabParam);
          window.history.pushState({ tab: activeTab }, '', url.toString());
        }
      } else if (currentUrlTab !== activeTab) {
        url.searchParams.set(tabParam, activeTab);
        window.history.pushState({ tab: activeTab }, '', url.toString());
      }
    } catch (e) {
      // In sandbox/preview, ignore URL errors
    }
  }, [activeTab, defaultTab, tabParam]);

  // Listen to popstate for tab navigation (only if no modals are open)
  useEffect(() => {
    const handlePopState = () => {
      // If a modal was open, the modal handler consumes the popstate first!
      if (modalStack.length > 0) return;

      try {
        const params = new URLSearchParams(window.location.search);
        const urlTab = (params.get(tabParam) as T) || defaultTab;
        if (urlTab !== activeTabRef.current) {
          isNavigatingViaPopRef.current = true;
          setActiveTab(urlTab);
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [defaultTab, tabParam, setActiveTab]);
}
