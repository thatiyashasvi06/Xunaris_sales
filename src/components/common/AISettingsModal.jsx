import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { storageService } from '../../services/storageService';
import { Sparkles, Key, Info, CheckCircle, ShieldAlert } from 'lucide-react';

export const AISettingsModal = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState(() => storageService.getAIConfig());
  const [apiKey, setApiKey] = useState('');
  const [useDemoMode, setUseDemoMode] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = storageService.getAIConfig();
      setConfig(current);
      setApiKey(current.apiKey || '');
      setUseDemoMode(current.useDemoMode ?? true);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleSave = (e) => {
    e.preventDefault();
    const updated = {
      apiKey: apiKey.trim(),
      provider: 'gemini',
      useDemoMode: useDemoMode
    };
    storageService.setAIConfig(updated);
    setConfig(updated);
    setSaveSuccess(true);
    if (onSave) onSave(updated);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Engine Configuration"
      subtitle="Manage live Gemini API integration or toggle transparent Demo Mode"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Transparent Disclaimer Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Transparent AI Disclosure</p>
            <p>
              When <strong>Demo Mode</strong> is active, all lead summaries, resume matching scores, and interview evaluations are computed via transparent offline heuristics and explicitly badged as <code className="bg-amber-200/80 px-1 py-0.5 rounded font-mono">[Demo AI]</code>. Xunaris never presents simulated output as live API results.
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-slate-800">Use Offline Demo AI Engine</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate AI lead scoring, resume matching, and candidate interview summaries without an external API key.
              </p>
            </div>
            <input
              type="checkbox"
              checked={useDemoMode}
              onChange={(e) => setUseDemoMode(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-hyra-700 focus:ring-hyra-600 cursor-pointer"
            />
          </label>
        </div>

        {/* Live API Key Section */}
        <div className={`space-y-3 transition-opacity ${useDemoMode ? 'opacity-60' : 'opacity-100'}`}>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-hyra-700" />
              Google Gemini API Key
            </label>
            <span className="text-[11px] text-slate-400">Optional</span>
          </div>

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            disabled={useDemoMode}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-hyra-600 focus:border-hyra-600 font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500">
            Used directly from your browser to call Google Gemini 1.5 Flash for live contextual reasoning. Your key is saved locally in browser storage only.
          </p>
        </div>

        {/* Current Active Engine Status */}
        <div className="rounded-lg p-3 bg-slate-100 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">Active Engine:</span>
          <span className={`px-2 py-0.5 rounded-full font-semibold ${
            !useDemoMode && apiKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {!useDemoMode && apiKey ? 'Live Gemini 1.5 Flash' : 'Demo AI Engine (Heuristic Simulator)'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-hyra-700 hover:bg-hyra-700 rounded-lg shadow-sm transition-colors"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                Saved!
              </>
            ) : (
              'Save AI Preferences'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
