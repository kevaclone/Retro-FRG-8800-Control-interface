import React, { useState, useMemo } from 'react';
import { FrequencyEntry, MemoryBank, RadioMode } from '../types/radio';
import {
  Radio,
  Plus,
  Edit3,
  Trash2,
  Search,
  Check,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Play,
  Square,
  Sparkles,
  Download,
  Upload,
} from 'lucide-react';

interface MemoryBanksManagerProps {
  banks: MemoryBank[];
  frequencies: FrequencyEntry[];
  activeBankId: string;
  currentFreqHz: number;
  currentMode: RadioMode;
  vfdColor: string;
  isScanning?: boolean;
  onSelectBank: (bankId: string) => void;
  onTuneEntry: (entry: FrequencyEntry) => void;
  onSaveFrequency: (entry: FrequencyEntry, isNew: boolean) => void;
  onDeleteFrequency: (id: string) => void;
  onCreateBank: (bank: MemoryBank) => void;
  onDeleteBank: (bankId: string) => void;
  onExportJson: () => void;
  onTriggerScan?: () => void;
}

const MODES: RadioMode[] = ['AM-W', 'AM-N', 'USB', 'LSB', 'CW', 'FM'];

type SortField = 'channel' | 'freq' | 'mode' | 'callsign' | 'station' | 'location';
type SortOrder = 'asc' | 'desc';

export const MemoryBanksManager: React.FC<MemoryBanksManagerProps> = ({
  banks,
  frequencies,
  activeBankId,
  currentFreqHz,
  currentMode,
  vfdColor,
  isScanning = false,
  onSelectBank,
  onTuneEntry,
  onSaveFrequency,
  onDeleteFrequency,
  onCreateBank,
  onDeleteBank,
  onExportJson,
  onTriggerScan,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<FrequencyEntry | null>(null);
  const [isCreatingNewEntry, setIsCreatingNewEntry] = useState<boolean>(false);
  const [showNewBankModal, setShowNewBankModal] = useState<boolean>(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('freq');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // New Bank Form State
  const [newBankName, setNewBankName] = useState<string>('');
  const [newBankShort, setNewBankShort] = useState<string>('');
  const [newBankRegion, setNewBankRegion] = useState<string>('Queensland / SW Pacific');
  const [newBankDesc, setNewBankDesc] = useState<string>('');

  const activeBank = useMemo(
    () => banks.find((b) => b.id === activeBankId) || banks[0],
    [banks, activeBankId]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedFrequencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const bankFiltered = frequencies.filter((f) => {
      const matchesBank = activeBankId === 'ALL' || f.bankId === activeBankId;
      if (!matchesBank) return false;
      if (!q) return true;
      return (
        f.callsign.toLowerCase().includes(q) ||
        f.stationName.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.notes.toLowerCase().includes(q) ||
        f.freqKhz.toString().includes(q)
      );
    });

    return [...bankFiltered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'freq') {
        cmp = a.freqKhz - b.freqKhz;
      } else if (sortField === 'callsign') {
        cmp = a.callsign.localeCompare(b.callsign);
      } else if (sortField === 'station') {
        cmp = a.stationName.localeCompare(b.stationName);
      } else if (sortField === 'location') {
        cmp = a.location.localeCompare(b.location);
      } else if (sortField === 'mode') {
        cmp = a.mode.localeCompare(b.mode);
      } else {
        cmp = a.freqKhz - b.freqKhz;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [frequencies, activeBankId, searchQuery, sortField, sortOrder]);

  const handleStartAddFrequency = (useCurrentVfo: boolean) => {
    const targetBankId = activeBankId === 'ALL' ? banks[0].id : activeBankId;
    const defaultKhz = useCurrentVfo
      ? Number((currentFreqHz / 1000).toFixed(3))
      : 612.0;
    const defaultMode = useCurrentVfo ? currentMode : 'AM-W';

    setIsCreatingNewEntry(true);
    setEditingEntry({
      id: `custom-${Date.now()}`,
      bankId: targetBankId,
      freqKhz: defaultKhz,
      callsign: useCurrentVfo ? 'VFO STORE' : '',
      stationName: useCurrentVfo ? 'VFO Stored Frequency' : '',
      location: 'Queensland, Australia',
      stateOrRegion: 'QLD',
      mode: defaultMode,
      schedule: '24h Continuous',
      notes: '',
      powerKw: '10 kW',
      signalStrength: 9,
    });
  };

  const handleStartEditFrequency = (entry: FrequencyEntry) => {
    setIsCreatingNewEntry(false);
    setEditingEntry({ ...entry });
  };

  const handleCommitFrequencyForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const cleaned: FrequencyEntry = {
      ...editingEntry,
      callsign: editingEntry.callsign.trim() || 'STATION',
      stationName: editingEntry.stationName.trim() || 'Custom Station',
      location: editingEntry.location.trim() || 'Australia / Pacific',
      freqKhz: Math.max(150, Math.min(29999.999, Number(editingEntry.freqKhz) || 612)),
    };
    onSaveFrequency(cleaned, isCreatingNewEntry);
    setEditingEntry(null);
  };

  const handleCommitNewBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    const shortCode =
      newBankShort.trim().toUpperCase() ||
      newBankName.trim().slice(0, 8).toUpperCase();
    const created: MemoryBank = {
      id: `bank-${Date.now()}`,
      name: newBankName.trim(),
      shortLabel: shortCode,
      region: newBankRegion.trim() || 'Australia / SW Pacific',
      description:
        newBankDesc.trim() ||
        'User-defined custom memory bank for Windows 11 application.',
      category: 'CUSTOM',
      isSystem: false,
    };
    onCreateBank(created);
    setNewBankName('');
    setNewBankShort('');
    setNewBankDesc('');
    setShowNewBankModal(false);
  };

  const getModeBadgeClass = (mode: RadioMode) => {
    switch (mode) {
      case 'AM-W':
      case 'AM-N':
        return 'bg-teal-950 text-teal-300 border-teal-500/40';
      case 'USB':
        return 'bg-blue-950 text-blue-300 border-blue-500/40';
      case 'LSB':
        return 'bg-cyan-950 text-cyan-300 border-cyan-500/40';
      case 'CW':
        return 'bg-amber-950 text-amber-300 border-amber-500/40';
      case 'FM':
        return 'bg-purple-950 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <section
      aria-label="Queensland and South West Pacific Memory Banks"
      className="bg-[#12151c] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl"
    >
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Memory Banks & Station Database</span>
            </h2>
            {activeBankId === 'scan-bank' && isScanning && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>SCANNING ACTIVE</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pre-loaded with verified Queensland AM broadcasters, RFDS Outback emergency frequencies, Oceanic ATC, Marine Distress, and South West Pacific DX.
          </p>
        </div>

        {/* Action Controls: ADD, EDIT, SCAN, STORE VFO, EXPORT */}
        <div className="flex items-center gap-2 flex-wrap">
          {onTriggerScan && (
            <button
              type="button"
              onClick={onTriggerScan}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow ${
                isScanning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              }`}
              title={`Scan channels in ${activeBank.name}`}
            >
              {isScanning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isScanning ? 'STOP SCAN' : `SCAN ${activeBank.shortLabel}`}</span>
            </button>
          )}

          {/* Dedicated Prominent ADD / EDIT Button (Per user requirement) */}
          <button
            type="button"
            onClick={() => {
              const bankChannels = filteredAndSortedFrequencies;
              if (bankChannels.length > 0) {
                const tunedCh =
                  bankChannels.find(
                    (f) =>
                      Math.abs(currentFreqHz - Math.round(f.freqKhz * 1000)) <= 50
                  ) || bankChannels[0];
                handleStartEditFrequency(tunedCh);
              } else {
                handleStartAddFrequency(false);
              }
            }}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_14px_rgba(6,182,212,0.45)]"
            title="Add or Edit frequency channel in open memory bank"
          >
            <Edit3 className="w-4 h-4 stroke-[2.5]" />
            <span>ADD / EDIT</span>
          </button>

          {/* Prominent + ADD CHANNEL Button */}
          <button
            type="button"
            onClick={() => handleStartAddFrequency(false)}
            className="px-3 py-1.5 rounded-lg bg-[#182635] hover:bg-[#203247] border border-cyan-500/60 text-cyan-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Add a new frequency channel to this memory bank"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400 stroke-[3]" />
            <span>+ ADD CHANNEL</span>
          </button>

          {/* STORE VFO Button */}
          <button
            type="button"
            onClick={() => handleStartAddFrequency(true)}
            className="px-3 py-1.5 rounded-lg bg-[#18202d] hover:bg-[#232c3e] border border-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Store current radio VFO frequency & mode directly into this bank"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Store VFO ({(currentFreqHz / 1000).toFixed(3)} kHz)</span>
          </button>

          {/* Export JSON Button */}
          <button
            type="button"
            onClick={onExportJson}
            className="px-2.5 py-1.5 rounded-lg bg-[#141822] hover:bg-[#1f2535] border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors flex items-center gap-1 cursor-pointer"
            title="Export memory banks to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* MEMORY BANK SELECTOR TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-thin">
        {banks.map((bank) => {
          const isSelected = bank.id === activeBankId;
          const isScanBank = bank.id === 'scan-bank';
          const count = frequencies.filter((f) => f.bankId === bank.id).length;
          return (
            <button
              key={bank.id}
              type="button"
              onClick={() => onSelectBank(bank.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? isScanBank
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-[#181d26] text-slate-300 hover:bg-[#222936] hover:text-white border border-slate-800'
              }`}
            >
              <span>{bank.shortLabel}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  isSelected ? 'bg-black/25 text-black' : 'bg-black/40 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelectBank('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeBankId === 'ALL'
              ? 'bg-slate-200 text-slate-950 shadow'
              : 'bg-[#181d26] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          ALL ({frequencies.length})
        </button>

        <button
          type="button"
          onClick={() => setShowNewBankModal(true)}
          className="px-2.5 py-1.5 rounded-lg bg-[#181d26] hover:bg-[#222936] text-slate-400 hover:text-cyan-300 border border-dashed border-slate-700 text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ml-auto"
        >
          <Plus className="w-3 h-3" />
          <span>New Bank</span>
        </button>
      </div>

      {/* BANK DESCRIPTION & SEARCH FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-300 flex items-center gap-2 flex-wrap">
          <strong className="text-white font-semibold">{activeBank.name}:</strong>
          <span className="text-slate-400 text-[11px]">{activeBank.description}</span>
          <button
            type="button"
            onClick={() => handleStartAddFrequency(false)}
            className="px-2.5 py-0.5 rounded-md bg-cyan-950 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
            title={`Add a new channel to ${activeBank.name}`}
          >
            <Plus className="w-3 h-3 text-cyan-400" />
            <span>+ Add / Edit in {activeBank.shortLabel}</span>
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search frequency, station, callsign..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0e1117] border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* ADD NEW BANK MODAL / FORM */}
      {showNewBankModal && (
        <form
          onSubmit={handleCommitNewBank}
          className="p-4 rounded-xl bg-[#0b0e14] border border-cyan-500/40 flex flex-col gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-300">Create New Memory Bank</h3>
            <button
              type="button"
              onClick={() => setShowNewBankModal(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                required
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="e.g. Queensland Ham Net"
                className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Short Tab Code (Max 8 chars)
              </label>
              <input
                type="text"
                maxLength={8}
                value={newBankShort}
                onChange={(e) => setNewBankShort(e.target.value)}
                placeholder="e.g. QLD HAM"
                className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Region / Focus
              </label>
              <input
                type="text"
                value={newBankRegion}
                onChange={(e) => setNewBankRegion(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newBankDesc}
                onChange={(e) => setNewBankDesc(e.target.value)}
                placeholder="Notes on frequencies in this bank..."
                className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowNewBankModal(false)}
              className="px-3 py-1.5 rounded bg-slate-800 text-xs text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Create Bank</span>
            </button>
          </div>
        </form>
      )}

      {/* ADD / EDIT FREQUENCY MODAL PANEL (Opens whenever EDIT or ADD is clicked) */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleCommitFrequencyForm}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1017] border border-cyan-500/60 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-150 scrollbar-thin"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-300 text-xs font-mono font-bold">
                  {isCreatingNewEntry ? 'ADD CHANNEL' : 'EDIT CHANNEL'}
                </span>
                <span>
                  {isCreatingNewEntry
                    ? 'Add New Frequency Channel to Bank'
                    : `Editing Channel: ${editingEntry.callsign} (${editingEntry.freqKhz} kHz)`}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                title="Close editing panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Helper to load from Current Radio VFO */}
            <div className="bg-[#141923] p-2.5 rounded-lg border border-slate-700/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-400">Current VFO: <strong className="text-cyan-300 font-mono">{(currentFreqHz / 1000).toFixed(3)} kHz ({currentMode})</strong></span>
              <button
                type="button"
                onClick={() => {
                  setEditingEntry({
                    ...editingEntry,
                    freqKhz: Number((currentFreqHz / 1000).toFixed(3)),
                    mode: currentMode,
                  });
                }}
                className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Use Current Radio VFO Freq &amp; Mode
              </button>
            </div>

            {/* STATION IDENTIFICATION & TRANSMITTER LOCATION (Highlighted per user requirement) */}
            <div className="bg-[#121722] p-4 rounded-xl border border-cyan-500/30 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300 border-b border-white/10 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>STATION IDENTIFICATION &amp; LOCATION</span>
                </span>
                <span className="text-[10px] text-slate-400">Directly Editable</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Station ID / Callsign */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-amber-300 mb-1 flex items-center justify-between">
                    <span>Station ID / Callsign *</span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g. 4QR, WWV</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editingEntry.callsign}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, callsign: e.target.value })
                    }
                    placeholder="e.g. 4QR or RFDS"
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0d14] border border-amber-500/50 text-sm font-mono font-extrabold text-amber-300 uppercase focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                {/* Station / Service Name */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-200 mb-1 flex items-center justify-between">
                    <span>Station / Service Name *</span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g. ABC Radio</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEntry.stationName}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, stationName: e.target.value })
                    }
                    placeholder="e.g. ABC Radio Brisbane"
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0d14] border border-slate-600 text-sm text-white font-medium focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                {/* Location / Transmitter Site */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-200 mb-1 flex items-center justify-between">
                    <span>Location / Transmitter Site *</span>
                    <span className="text-[10px] text-slate-400 font-normal">City / Region</span>
                  </label>
                  <input
                    type="text"
                    value={editingEntry.location}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, location: e.target.value })
                    }
                    placeholder="e.g. Bald Hills, Brisbane, QLD"
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0d14] border border-slate-600 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* FREQUENCY & OPERATING PARAMETERS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#10141d] p-3.5 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Memory Bank *
                </label>
                <select
                  value={editingEntry.bankId}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, bankId: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs text-white"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.shortLabel} — {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Frequency (kHz) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="150"
                  max="29999.999"
                  required
                  value={editingEntry.freqKhz}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      freqKhz: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs font-mono font-bold text-cyan-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Mode (CAT) *
                </label>
                <select
                  value={editingEntry.mode}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      mode: e.target.value as RadioMode,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs font-mono text-white"
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Power (kW)
                </label>
                <input
                  type="text"
                  value={editingEntry.powerKw || ''}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, powerKw: e.target.value })
                  }
                  placeholder="e.g. 50 kW"
                  className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs text-white font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Schedule / Operating Notes
                </label>
                <input
                  type="text"
                  value={editingEntry.notes}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, notes: e.target.value })
                  }
                  placeholder="e.g. Primary regional emergency news broadcast hub"
                  className="w-full px-2.5 py-1.5 rounded bg-[#111621] border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isCreatingNewEntry ? 'Save Channel to Bank' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STRUCTURED ALIGNED ROWS WITH NAMED COLUMNS (Per user requirement)         */}
      {/* Scrollable container with sticky header so all frequencies can be reached */}
      {/* ========================================================================= */}
      <div className="overflow-x-auto overflow-y-auto max-h-[520px] rounded-lg border border-slate-700/80 bg-[#0a0d13] shadow-inner scrollbar-thin">
        <table className="w-full text-left border-collapse font-sans">
          <thead className="sticky top-0 z-10 bg-[#141822] shadow">
            <tr className="border-b border-slate-700 text-[11px] font-mono uppercase tracking-wider text-slate-200 bg-[#141822] select-none">
              {/* Column 1: Channel # */}
              <th className="py-3 px-3.5 w-16 text-center border-r border-slate-800">
                <span>CH #</span>
              </th>

              {/* Column 2: Frequency (Sortable) */}
              <th
                onClick={() => handleSort('freq')}
                className="py-3 px-3.5 w-36 cursor-pointer hover:text-cyan-300 border-r border-slate-800 transition-colors"
                title="Click to sort by Frequency"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>Frequency</span>
                  {sortField === 'freq' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  )}
                </div>
              </th>

              {/* Column 3: Mode (Sortable) */}
              <th
                onClick={() => handleSort('mode')}
                className="py-3 px-3 w-24 text-center cursor-pointer hover:text-cyan-300 border-r border-slate-800 transition-colors"
                title="Click to sort by Mode"
              >
                <div className="flex items-center justify-center gap-1 font-bold">
                  <span>Mode</span>
                  {sortField === 'mode' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
              </th>

              {/* Column 4: Callsign (Sortable) */}
              <th
                onClick={() => handleSort('callsign')}
                className="py-3 px-3.5 w-28 cursor-pointer hover:text-cyan-300 border-r border-slate-800 transition-colors"
                title="Click to sort by Callsign"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>Callsign</span>
                  {sortField === 'callsign' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
              </th>

              {/* Column 5: Station / Service Name (Sortable) */}
              <th
                onClick={() => handleSort('station')}
                className="py-3 px-3.5 min-w-[220px] cursor-pointer hover:text-cyan-300 border-r border-slate-800 transition-colors"
                title="Click to sort by Station Name"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>Station / Service Name</span>
                  {sortField === 'station' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
              </th>

              {/* Column 6: Location / Region (Sortable) */}
              <th
                onClick={() => handleSort('location')}
                className="py-3 px-3.5 min-w-[180px] hidden md:table-cell cursor-pointer hover:text-cyan-300 border-r border-slate-800 transition-colors"
                title="Click to sort by Location"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span>Location / Coverage</span>
                  {sortField === 'location' && (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
              </th>

              {/* Column 7: Schedule & Notes */}
              <th className="py-3 px-3.5 hidden lg:table-cell min-w-[200px] border-r border-slate-800">
                <span className="font-bold">Schedule & Notes</span>
              </th>

              {/* Column 8: Actions (Tune & Edit per user requirement) */}
              <th className="py-3 px-3.5 w-56 text-center">
                <span className="font-bold text-cyan-300">ACTIONS (TUNE / EDIT)</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80 text-xs">
            {filteredAndSortedFrequencies.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm">No memory channels found in this bank.</span>
                    <button
                      type="button"
                      onClick={() => handleStartAddFrequency(false)}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Frequency Channel</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedFrequencies.map((item, idx) => {
                const itemHz = Math.round(item.freqKhz * 1000);
                const isTuned = Math.abs(currentFreqHz - itemHz) <= 50;
                const chNum = String(idx + 1).padStart(2, '0');

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors group ${
                      isTuned
                        ? 'bg-cyan-950/45 hover:bg-cyan-950/60'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Column 1: CH # */}
                    <td className="py-3 px-3.5 text-center font-mono text-[11px] border-r border-slate-800/80 whitespace-nowrap">
                      {isTuned ? (
                        <span className="font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40">
                          CH {chNum}
                        </span>
                      ) : (
                        <span className="text-slate-400">CH {chNum}</span>
                      )}
                    </td>

                    {/* Column 2: Frequency */}
                    <td className="py-3 px-3.5 font-mono font-bold tabular-nums whitespace-nowrap border-r border-slate-800/80">
                      <span
                        className="text-sm cursor-pointer hover:underline"
                        style={{ color: isTuned ? vfdColor : '#f1f5f9' }}
                        onClick={() => onTuneEntry(item)}
                        title="Click frequency to Tune"
                      >
                        {item.freqKhz.toFixed(item.freqKhz % 1 === 0 ? 1 : 3)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">kHz</span>
                    </td>

                    {/* Column 3: Mode */}
                    <td className="py-3 px-3 font-mono text-center whitespace-nowrap border-r border-slate-800/80">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getModeBadgeClass(
                          item.mode
                        )}`}
                      >
                        {item.mode}
                      </span>
                    </td>

                    {/* Column 4: Callsign */}
                    <td className="py-3 px-3.5 font-mono font-bold text-amber-300 whitespace-nowrap border-r border-slate-800/80">
                      {item.callsign}
                    </td>

                    {/* Column 5: Station / Service */}
                    <td className="py-3 px-3.5 font-medium text-slate-100 border-r border-slate-800/80">
                      <div className="flex items-center gap-2">
                        {isTuned && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                        )}
                        <span className={isTuned ? 'text-cyan-200 font-semibold' : ''}>
                          {item.stationName}
                        </span>
                      </div>
                    </td>

                    {/* Column 6: Location */}
                    <td className="py-3 px-3.5 text-slate-300 hidden md:table-cell text-xs border-r border-slate-800/80">
                      {item.location}
                    </td>

                    {/* Column 7: Schedule & Notes */}
                    <td className="py-3 px-3.5 text-slate-400 hidden lg:table-cell text-xs max-w-xs truncate border-r border-slate-800/80">
                      <span>{item.schedule}</span>
                      {item.powerKw && (
                        <span className="text-slate-500 font-mono ml-1">({item.powerKw})</span>
                      )}
                      {item.notes && (
                        <span className="text-slate-400 ml-1.5 truncate">— {item.notes}</span>
                      )}
                    </td>

                    {/* Column 8: Actions (Tune, Edit, Delete per user requirement) */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {/* TUNE BUTTON (Prominent and explicit) */}
                        <button
                          type="button"
                          onClick={() => onTuneEntry(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                            isTuned
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-400'
                              : 'bg-cyan-500/25 hover:bg-cyan-500 text-cyan-200 hover:text-slate-950 border border-cyan-400/60'
                          }`}
                          title="Tune receiver to this frequency and mode"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>{isTuned ? 'TUNED' : 'TUNE'}</span>
                        </button>

                        {/* EDIT BUTTON (Prominent and explicit per user requirement) */}
                        <button
                          type="button"
                          onClick={() => handleStartEditFrequency(item)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1 bg-[#1e232d] hover:bg-[#2c3444] text-slate-200 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer shadow-sm"
                          title="Edit this frequency channel (callsign, name, frequency, mode)"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>EDIT</span>
                        </button>

                        {/* DELETE BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete ${item.callsign} (${item.freqKhz} kHz) from this memory bank?`)) {
                              onDeleteFrequency(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer border border-transparent hover:border-rose-800"
                          title="Delete frequency channel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER STATS */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
        <div>
          Showing <strong>{filteredAndSortedFrequencies.length}</strong> of{' '}
          {frequencies.length} total channels across {banks.length} banks
        </div>
        <div className="flex items-center gap-3">
          <span>Sort: <strong className="text-slate-300">{sortField.toUpperCase()} ({sortOrder})</strong></span>
          <span>•</span>
          <span className="text-cyan-300">Click &apos;TUNE&apos; to send CAT command to FRG-8800</span>
        </div>
      </div>
    </section>
  );
};
