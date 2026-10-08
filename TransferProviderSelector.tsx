import React, { useState, useMemo } from 'react';
import { Plus, X, Settings2, Check } from 'lucide-react';
import {
  getTransferPresets,
  addTransferPreset,
  removeTransferPreset,
  saveTransferPresets,
  DEFAULT_TRANSFER_PRESETS,
} from '../utils/paymentPresets';

interface TransferProviderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  businessId?: string;
  businessMethods?: string[];
  placeholder?: string;
  idPrefix?: string;
}

export const TransferProviderSelector: React.FC<TransferProviderSelectorProps> = ({
  value,
  onChange,
  businessId,
  businessMethods,
  placeholder = 'e.g. TAIB, BIBD, Baiduri, SCB...',
  idPrefix = 'tps',
}) => {
  const [savedPresets, setSavedPresets] = useState<string[]>(() => getTransferPresets(businessId));
  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [newPresetInput, setNewPresetInput] = useState('');

  // Re-sync savedPresets when businessId changes (e.g. switching between different car wash locations)
  React.useEffect(() => {
    setSavedPresets(getTransferPresets(businessId));
  }, [businessId]);

  // Serialize businessMethods into a stable string key to prevent infinite re-render loops
  const businessMethodsKey = (businessMethods || []).map((m) => m.trim()).filter(Boolean).join('|');

  // Derive merged presets list synchronously with memoization
  const presets = useMemo(() => {
    const extra = businessMethodsKey ? businessMethodsKey.split('|') : [];
    return Array.from(new Set([...extra, ...savedPresets]));
  }, [savedPresets, businessMethodsKey]);

  const handleSelectPreset = (preset: string) => {
    onChange(preset);
  };

  const handleAddCustom = (nameToAdd: string) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    const updated = addTransferPreset(trimmed, businessId);
    setSavedPresets(updated);
    onChange(trimmed);
    setNewPresetInput('');
  };

  const handleRemovePreset = (presetToRemove: string) => {
    const updated = removeTransferPreset(presetToRemove, businessId);
    setSavedPresets(updated);
    if (value.toLowerCase() === presetToRemove.toLowerCase()) {
      onChange(updated[0] || 'Bank Transfer');
    }
  };

  const handleResetDefaults = () => {
    saveTransferPresets(DEFAULT_TRANSFER_PRESETS, businessId);
    setSavedPresets(DEFAULT_TRANSFER_PRESETS);
  };

  const isCurrentValueInPresets =
    !value.trim() ||
    presets.some((p) => p.toLowerCase() === value.trim().toLowerCase());

  return (
    <div className="space-y-2" id={`${idPrefix}-container`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={`${idPrefix}-input`}
            className="text-[10px] font-black uppercase text-sky-900 tracking-wider"
          >
            Bank / Transfer Provider Name
          </label>
          <span className="text-[9px] text-slate-400 font-medium">
            (Select or write custom)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditingPresets(!isEditingPresets)}
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
            isEditingPresets
              ? 'bg-sky-200 text-sky-900'
              : 'text-slate-400 hover:text-sky-700 hover:bg-sky-50'
          }`}
          title="Customize quick buttons"
          id={`${idPrefix}-toggle-edit-presets`}
        >
          <Settings2 className="w-3 h-3" />
          <span>{isEditingPresets ? 'Done Editing' : 'Customize Buttons'}</span>
        </button>
      </div>

      {/* Edit presets panel */}
      {isEditingPresets && (
        <div
          className="p-2.5 bg-white border border-sky-200 rounded-xl space-y-2 text-xs shadow-2xs animate-fade-in"
          id={`${idPrefix}-edit-panel`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              Manage Quick Transfer Buttons:
            </span>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[10px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
            >
              Reset to Brunei Defaults
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <span
                key={preset}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                {preset}
                <button
                  type="button"
                  onClick={() => handleRemovePreset(preset)}
                  className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors cursor-pointer"
                  title={`Remove ${preset}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={newPresetInput}
              onChange={(e) => setNewPresetInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom(newPresetInput);
                }
              }}
              placeholder="Add bank/provider (e.g. TAIB, SCB...)"
              className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500 bg-slate-50"
            />
            <button
              type="button"
              onClick={() => handleAddCustom(newPresetInput)}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      )}

      {/* Preset Quick Chips */}
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => {
          const isSelected = value.trim().toLowerCase() === preset.trim().toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-2xs ring-1 ring-sky-400'
                  : 'bg-white border border-sky-200 text-sky-800 hover:bg-sky-100/70'
              }`}
              id={`${idPrefix}-preset-${preset.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              <span>{preset}</span>
            </button>
          );
        })}
      </div>

      {/* Write-in Input field */}
      <div className="relative">
        <input
          id={`${idPrefix}-input`}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 border border-sky-300 rounded-lg text-xs font-semibold text-slate-800 bg-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-400"
        />

        {/* Prompt to save custom bank name as quick button if not already saved */}
        {!isCurrentValueInPresets && value.trim().length > 1 && (
          <div className="mt-1.5 flex items-center justify-between bg-sky-100/70 border border-sky-200 rounded-lg px-2.5 py-1 text-[11px] animate-fade-in">
            <span className="text-sky-900 font-medium">
              Add <strong>"{value.trim()}"</strong> to your quick buttons?
            </span>
            <button
              type="button"
              onClick={() => handleAddCustom(value.trim())}
              className="px-2 py-0.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> Save Button
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
