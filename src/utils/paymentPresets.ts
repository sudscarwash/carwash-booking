// Utility for managing flexible Brunei bank and transfer settlement presets
// Scoped per business/owner so Owner 1 and Owner 2 have their own independent presets

export const DEFAULT_TRANSFER_PRESETS = [
  'BIBD',
  'Baiduri',
  'TAIB',
  'Standard Chartered',
  'Bank Transfer',
];

function getStorageKey(businessId?: string): string {
  const sanitized = (businessId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `carwash_transfer_presets_${sanitized}`;
}

export function getTransferPresets(businessId?: string): string[] {
  try {
    const key = getStorageKey(businessId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load transfer presets from storage:', e);
  }
  return DEFAULT_TRANSFER_PRESETS;
}

export function saveTransferPresets(presets: string[], businessId?: string): void {
  try {
    const key = getStorageKey(businessId);
    const cleaned = Array.from(new Set(presets.map((p) => p.trim()).filter(Boolean)));
    localStorage.setItem(key, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to save transfer presets:', e);
  }
}

export function addTransferPreset(name: string, businessId?: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getTransferPresets(businessId);
  const current = getTransferPresets(businessId);
  const exists = current.some((p) => p.toLowerCase() === trimmed.toLowerCase());
  if (!exists) {
    const updated = [...current, trimmed];
    saveTransferPresets(updated, businessId);
    return updated;
  }
  return current;
}

export function removeTransferPreset(name: string, businessId?: string): string[] {
  const current = getTransferPresets(businessId);
  const updated = current.filter((p) => p.toLowerCase() !== name.toLowerCase());
  // Ensure at least one default remains
  const finalPresets = updated.length > 0 ? updated : DEFAULT_TRANSFER_PRESETS;
  saveTransferPresets(finalPresets, businessId);
  return finalPresets;
}
