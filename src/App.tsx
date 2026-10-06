import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  CatPacketLog,
  FrequencyEntry,
  MemoryBank,
  RadioState,
} from './types/radio';
import {
  INITIAL_FREQUENCIES,
  INITIAL_MEMORY_BANKS,
  VFD_COLOR_PRESETS,
} from './data/swPacificBanks';
import {
  encodeBcdFrequencyPacket,
  encodeModePacket,
  formatPacketHex,
} from './utils/catProtocol';
import { webSerialManager, SerialStatus } from './utils/webSerialManager';
import { downloadVisualStudioZip } from './utils/cppSolutionGenerator';
import { WindowsMenuBar } from './components/WindowsMenuBar';
import { SerialOptionsModal } from './components/SerialOptionsModal';
import { HelpManualModal } from './components/HelpManualModal';
import { YaesuFRG8800Panel } from './components/YaesuFRG8800Panel';
import { MemoryBanksManager } from './components/MemoryBanksManager';
import { CppVisualStudioBuilder } from './components/CppVisualStudioBuilder';
import { Terminal, Trash2, Eye, Download, Code2, Layers } from 'lucide-react';

const STORAGE_KEY_BANKS = 'yaesu_frg8800_win11_banks';
const STORAGE_KEY_FREQS = 'yaesu_frg8800_win11_freqs';

export function App() {
  const [banks, setBanks] = useState<MemoryBank[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BANKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_MEMORY_BANKS;
  });

  const [frequencies, setFrequencies] = useState<FrequencyEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FREQS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_FREQUENCIES;
  });

  const [activeBankId, setActiveBankId] = useState<string>('mw-qld');

  // Serial status and explicit RTS/DTR state (Disabled by default as requested by user)
  const [dtrEnabled, setDtrEnabled] = useState<boolean>(false);
  const [rtsEnabled, setRtsEnabled] = useState<boolean>(false);

  const [serialStatus, setSerialStatus] = useState<SerialStatus>({
    connected: false,
    baudRate: 4800,
    dtr: false,
    rts: false,
  });

  // Windows Menu Bar Window Toggles
  const [showMemoryBanks, setShowMemoryBanks] = useState<boolean>(true);
  const [showCatLogs, setShowCatLogs] = useState<boolean>(false);
  const [showCppBuilder, setShowCppBuilder] = useState<boolean>(false);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Auto-Scan Priority Bank state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const scanTimerRef = useRef<number | null>(null);

  // User notification toast for MR frequency addition
  const [mrToast, setMrToast] = useState<{ message: string; channelId?: string } | null>(null);

  const handleStopScan = useCallback(() => {
    if (scanTimerRef.current !== null) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    const unsubscribe = webSerialManager.subscribe(setSerialStatus);
    return () => unsubscribe();
  }, []);

  const [radioState, setRadioState] = useState<RadioState>({
    powerOn: true,
    freqHz: 612000, // 612 kHz 4QR ABC Radio Brisbane
    mode: 'AM-W',
    stepHz: 9000,   // 9 kHz Australian MW spacing default
    vfoMode: 'VFO',
    memoryChannel: 1,
    dialLocked: false,
    vfdColor: VFD_COLOR_PRESETS[0].hex,
    vfdColorName: VFD_COLOR_PRESETS[0].name,
    vfdBrightness: 0.95,
    afGain: 70,
    rfGain: 90,
    sqlLevel: 15,
    toneLevel: 0,
    notchPos: 0,
    clarifierHz: 0,
    noiseBlanker: false,
    agcMode: 'FAST',
    attenuator: 'DX',
    recStandby: false,
    clockMode: 'AEST',
    lcdTextColor: '#000000', // Default black LCD digits readout as per authentic FRG-8800
    displaySelect: 'FREQ',
  });

  const [catLogs, setCatLogs] = useState<CatPacketLog[]>(() => {
    const initPkt = encodeBcdFrequencyPacket(612000);
    return [
      {
        id: 'init-1',
        timestamp: new Date().toISOString().slice(11, 19),
        commandName: 'OPCODE 0x01 (SET FREQ)',
        hexBytes: formatPacketHex(initPkt),
        description: 'Tune 612.000 kHz (4QR ABC Radio Brisbane, QLD)',
        transport: 'FTDI_USB_SERIAL',
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify(banks));
    } catch {
      // ignore
    }
  }, [banks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FREQS, JSON.stringify(frequencies));
    } catch {
      // ignore
    }
  }, [frequencies]);

  const matchedStation = useMemo(() => {
    let best: FrequencyEntry | null = null;
    let bestDiff = Infinity;
    for (const entry of frequencies) {
      const entryHz = Math.round(entry.freqKhz * 1000);
      const diff = Math.abs(radioState.freqHz - entryHz);
      if (diff <= 2500 && diff < bestDiff) {
        best = entry;
        bestDiff = diff;
      }
    }
    return best;
  }, [frequencies, radioState.freqHz]);

  const dispatchCatPacket = useCallback(
    (packet: Uint8Array, commandName: string, description: string) => {
      const hexBytes = formatPacketHex(packet);
      const nowStr = new Date().toISOString().slice(11, 19);

      setCatLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowStr,
          commandName,
          hexBytes,
          description,
          transport: 'FTDI_USB_SERIAL',
        },
        ...prev.slice(0, 49),
      ]);
    },
    []
  );

  const handleConnectSerial = useCallback(async () => {
    const ok = await webSerialManager.connect();
    if (ok) {
      await webSerialManager.setSignals(dtrEnabled, rtsEnabled);
      await webSerialManager.sendFrequency(radioState.freqHz);
      await webSerialManager.sendMode(radioState.mode);
      dispatchCatPacket(
        encodeBcdFrequencyPacket(radioState.freqHz),
        'CAT INIT + FREQ',
        `Radio synced to ${(radioState.freqHz / 1000).toFixed(3)} kHz`
      );
    }
  }, [radioState.freqHz, radioState.mode, dtrEnabled, rtsEnabled, dispatchCatPacket]);

  const handleDisconnectSerial = useCallback(async () => {
    await webSerialManager.disconnect();
  }, []);

  const handleToggleDtr = useCallback(async () => {
    const next = !dtrEnabled;
    setDtrEnabled(next);
    await webSerialManager.setSignals(next, rtsEnabled);
  }, [dtrEnabled, rtsEnabled]);

  const handleToggleRts = useCallback(async () => {
    const next = !rtsEnabled;
    setRtsEnabled(next);
    await webSerialManager.setSignals(dtrEnabled, next);
  }, [dtrEnabled, rtsEnabled]);

  const handleSendTestPing = useCallback(async () => {
    const hex = await webSerialManager.sendTestPing();
    dispatchCatPacket(
      new Uint8Array([0, 0, 0, 0, 0xd0]),
      'TEST PING (0xD0)',
      `External Control ON [${hex}]`
    );
  }, [dispatchCatPacket]);

  const handleUpdateRadioState = useCallback(
    (patch: Partial<RadioState>, triggerCat?: 'freq' | 'mode' | 'both') => {
      setRadioState((prev) => {
        const next = { ...prev, ...patch };
        if (triggerCat === 'freq' || triggerCat === 'both') {
          const pkt = encodeBcdFrequencyPacket(next.freqHz);
          dispatchCatPacket(
            pkt,
            'OPCODE 0x01 (SET FREQ)',
            `VFO ${(next.freqHz / 1000).toFixed(3)} kHz`
          );
          if (serialStatus.connected) {
            webSerialManager.sendFrequency(next.freqHz);
          }
        }
        if (triggerCat === 'mode' || triggerCat === 'both') {
          const pkt = encodeModePacket(next.mode);
          dispatchCatPacket(
            pkt,
            'OPCODE 0x80 (SET MODE)',
            `Mode ${next.mode}`
          );
          if (serialStatus.connected) {
            webSerialManager.sendMode(next.mode);
          }
        }
        return next;
      });
    },
    [dispatchCatPacket, serialStatus.connected]
  );

  const handleStepFrequency = useCallback(
    (deltaHz: number) => {
      handleStopScan();
      setRadioState((prev) => {
        if (!prev.powerOn || prev.dialLocked) return prev;
        const nextHz = Math.max(150000, Math.min(29999999, prev.freqHz + deltaHz));
        const pkt = encodeBcdFrequencyPacket(nextHz);
        dispatchCatPacket(
          pkt,
          'OPCODE 0x01 (SET FREQ)',
          `VFO ${(nextHz / 1000).toFixed(3)} kHz (${deltaHz > 0 ? '+' : ''}${deltaHz} Hz)`
        );
        if (serialStatus.connected) {
          webSerialManager.sendFrequency(nextHz);
        }
        return { ...prev, freqHz: nextHz };
      });
    },
    [dispatchCatPacket, serialStatus.connected, handleStopScan]
  );

  const handleDirectFrequencyHz = useCallback(
    (targetHz: number) => {
      handleStopScan();
      const clamped = Math.max(150000, Math.min(29999999, targetHz));
      const pkt = encodeBcdFrequencyPacket(clamped);
      dispatchCatPacket(
        pkt,
        'OPCODE 0x01 (DIRECT ENTRY)',
        `Direct Keypad Tune ${(clamped / 1000).toFixed(3)} kHz`
      );
      if (serialStatus.connected) {
        webSerialManager.sendFrequency(clamped);
      }
      setRadioState((prev) => ({
        ...prev,
        powerOn: true,
        freqHz: clamped,
      }));
    },
    [dispatchCatPacket, serialStatus.connected, handleStopScan]
  );

  const handleTuneMemoryEntry = useCallback(
    (entry: FrequencyEntry) => {
      const targetHz = Math.round(entry.freqKhz * 1000);
      const freqPkt = encodeBcdFrequencyPacket(targetHz);
      const modePkt = encodeModePacket(entry.mode);

      dispatchCatPacket(
        freqPkt,
        'OPCODE 0x01 (SET FREQ)',
        `${entry.callsign} — ${entry.freqKhz.toFixed(3)} kHz`
      );
      dispatchCatPacket(
        modePkt,
        'OPCODE 0x80 (SET MODE)',
        `Mode ${entry.mode} (${entry.stationName})`
      );

      if (serialStatus.connected) {
        webSerialManager.sendFrequency(targetHz);
        webSerialManager.sendMode(entry.mode);
      }

      setRadioState((prev) => ({
        ...prev,
        powerOn: true,
        freqHz: targetHz,
        mode: entry.mode,
      }));
    },
    [dispatchCatPacket, serialStatus.connected]
  );

  const handleStepMemoryChannel = useCallback(
    (delta: number) => {
      setShowMemoryBanks(true);
      const bankList = frequencies
        .filter((f) => activeBankId === 'ALL' || f.bankId === activeBankId)
        .sort((a, b) => a.freqKhz - b.freqKhz);
      if (bankList.length === 0) return;

      const nextChannelIdx =
        (radioState.memoryChannel + delta + bankList.length) % bankList.length;
      const target = bankList[nextChannelIdx];
      setRadioState((prev) => ({
        ...prev,
        vfoMode: 'MEM',
        memoryChannel: nextChannelIdx,
      }));
      handleTuneMemoryEntry(target);
    },
    [frequencies, activeBankId, radioState.memoryChannel, handleTuneMemoryEntry]
  );

  const handleAddFreqToOpenBank = useCallback(
    (directHz?: number) => {
      const targetHz = directHz ?? radioState.freqHz;
      const targetKhz = Number((targetHz / 1000).toFixed(3));
      const targetBankId = activeBankId === 'ALL' ? banks[0].id : activeBankId;
      const targetBank = banks.find((b) => b.id === targetBankId) || banks[0];

      const bankChCount = frequencies.filter((f) => f.bankId === targetBankId).length;
      const newEntry: FrequencyEntry = {
        id: `mr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        bankId: targetBankId,
        freqKhz: targetKhz,
        callsign: `MEM-${String(bankChCount + 1).padStart(2, '0')}`,
        stationName: `Stored ${(targetKhz).toFixed(1)} kHz`,
        location: targetBank.region || 'Queensland, Australia',
        stateOrRegion: 'QLD',
        mode: radioState.mode,
        schedule: '24h Continuous',
        notes: `Added via MR button at ${new Date().toLocaleTimeString()}`,
        powerKw: '—',
        signalStrength: 9,
      };

      setFrequencies((prev) => [...prev, newEntry]);
      setActiveBankId(targetBankId);
      setShowMemoryBanks(true);
      setMrToast({
        message: `✓ Stored ${(targetKhz).toFixed(3)} kHz (${radioState.mode}) to [${targetBank.shortLabel} — ${targetBank.name}] via MR`,
        channelId: newEntry.id,
      });
      setTimeout(() => setMrToast(null), 4000);

      dispatchCatPacket(
        encodeBcdFrequencyPacket(targetHz),
        'MR STORE FREQ',
        `MR: Added ${(targetKhz).toFixed(3)} kHz (${radioState.mode}) to [${targetBank.shortLabel}]`
      );
    },
    [radioState.freqHz, radioState.mode, activeBankId, banks, frequencies, dispatchCatPacket]
  );

  const handleToggleVfoMem = useCallback(() => {
    setShowMemoryBanks(true);
    setRadioState((prev) => {
      const bankList = frequencies
        .filter((f) => activeBankId === 'ALL' || f.bankId === activeBankId)
        .sort((a, b) => a.freqKhz - b.freqKhz);
      if (bankList.length === 0) return { ...prev, vfoMode: 'MEM' };

      // Step to next channel in open bank when toggled
      const nextIdx = (prev.memoryChannel + 1) % bankList.length;
      const ch = bankList[nextIdx];
      handleTuneMemoryEntry(ch);
      return { ...prev, vfoMode: 'MEM', memoryChannel: nextIdx };
    });
  }, [frequencies, activeBankId, handleTuneMemoryEntry]);

  const handleTriggerScan = useCallback(() => {
    if (isScanning) {
      handleStopScan();
      return;
    }

    setShowMemoryBanks(true);

    // User requirement: "The SCAN button should scan the freqs in the open memory bank"
    const scanList = frequencies
      .filter((f) => activeBankId === 'ALL' || f.bankId === activeBankId)
      .sort((a, b) => a.freqKhz - b.freqKhz);

    if (scanList.length === 0) return;

    setIsScanning(true);
    let scanIdx = 0;
    handleTuneMemoryEntry(scanList[0]);

    if (scanTimerRef.current !== null) {
      clearInterval(scanTimerRef.current);
    }

    scanTimerRef.current = window.setInterval(() => {
      scanIdx = (scanIdx + 1) % scanList.length;
      handleTuneMemoryEntry(scanList[scanIdx]);
    }, 1800);
  }, [isScanning, frequencies, activeBankId, handleStopScan, handleTuneMemoryEntry]);

  // Clean up scan timer on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current !== null) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, []);

  const handleSaveFrequency = (entry: FrequencyEntry, isNew: boolean) => {
    setFrequencies((prev) => {
      if (isNew) return [...prev, entry];
      return prev.map((f) => (f.id === entry.id ? entry : f));
    });
  };

  const handleDeleteFrequency = (id: string) => {
    setFrequencies((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCreateBank = (newBank: MemoryBank) => {
    setBanks((prev) => [...prev, newBank]);
    setActiveBankId(newBank.id);
  };

  const handleDeleteBank = (bankId: string) => {
    setBanks((prev) => prev.filter((b) => b.id !== bankId));
    setFrequencies((prev) => prev.filter((f) => f.bankId !== bankId));
    setActiveBankId('mw-qld');
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify({ banks, frequencies }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FRG8800_Frequencies_Win11.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetDefaults = () => {
    setBanks(INITIAL_MEMORY_BANKS);
    setFrequencies(INITIAL_FREQUENCIES);
    setActiveBankId('mw-qld');
    setRadioState((prev) => ({
      ...prev,
      freqHz: 612000,
      mode: 'AM-W',
      stepHz: 9000,
    }));
  };

  const lastCatHex = catLogs[0]?.hexBytes || '00 61 20 00 01';

  return (
    <div className="min-h-screen bg-[#0e1014] text-slate-100 flex flex-col font-sans">
      {/* 1. STANDARD WINDOWS MENU BAR AT TOP (File, View, Options, Help) */}
      <WindowsMenuBar
        serialStatus={serialStatus}
        onConnectSerial={handleConnectSerial}
        onDisconnectSerial={handleDisconnectSerial}
        onExportJson={handleExportJson}
        onDownloadCppZip={() => downloadVisualStudioZip(banks, frequencies, radioState, radioState.lcdTextColor)}
        onResetDefaults={handleResetDefaults}
        showMemoryBanks={showMemoryBanks}
        onToggleMemoryBanks={() => setShowMemoryBanks((prev) => !prev)}
        showCatLogs={showCatLogs}
        onToggleCatLogs={() => setShowCatLogs((prev) => !prev)}
        showHelpModal={showHelpModal}
        onToggleHelpModal={() => setShowHelpModal((prev) => !prev)}
        showOptionsModal={showOptionsModal}
        onToggleOptionsModal={() => setShowOptionsModal((prev) => !prev)}
        vfdColor={radioState.vfdColor}
        onSelectVfdColor={(hex) => setRadioState((p) => ({ ...p, vfdColor: hex }))}
        vfdBrightness={radioState.vfdBrightness}
        onSelectVfdBrightness={(val) => setRadioState((p) => ({ ...p, vfdBrightness: val }))}
        lcdTextColor={radioState.lcdTextColor}
        onSelectLcdTextColor={(col) => setRadioState((p) => ({ ...p, lcdTextColor: col }))}
        dtrEnabled={dtrEnabled}
        onToggleDtr={handleToggleDtr}
        rtsEnabled={rtsEnabled}
        onToggleRts={handleToggleRts}
      />

      {/* QUICK VIEW SHORTCUT STRIP */}
      <div className="bg-[#14171d] border-b border-[#29303c] px-4 py-1.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMemoryBanks((p) => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
              showMemoryBanks
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'hover:bg-white/5 text-slate-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Memory Banks (View)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCatLogs((p) => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
              showCatLogs
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'hover:bg-white/5 text-slate-400'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>CAT Hex Traffic Log</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCppBuilder((p) => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
              showCppBuilder
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'hover:bg-white/5 text-slate-400'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>VS2022 C++ Project Viewer</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadVisualStudioZip(banks, frequencies, radioState, radioState.lcdTextColor)}
            className="flex items-center gap-1 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download VS2022 Solution (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* WORKSPACE MAIN CONTENT - Widened for full hardware front panel reproduction */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-2 sm:px-4 py-4 flex flex-col gap-6">
        {/* 2. AUTHENTIC FRONT PANEL REPLICA (Cleaned up, no COM buttons) */}
        <div id="receiver">
          <YaesuFRG8800Panel
            state={radioState}
            matchedStation={matchedStation}
            lastCatHex={lastCatHex}
            serialConnected={serialStatus.connected}
            isScanning={isScanning}
            availableBanks={banks}
            frequencies={frequencies}
            activeBankId={activeBankId}
            onSelectBank={(bId) => {
              setActiveBankId(bId);
              setShowMemoryBanks(true);
            }}
            onUpdateState={handleUpdateRadioState}
            onStepFrequency={handleStepFrequency}
            onDirectFrequencyHz={handleDirectFrequencyHz}
            onStepMemoryChannel={handleStepMemoryChannel}
            onAddFreqToOpenBank={handleAddFreqToOpenBank}
            onToggleVfoMem={handleToggleVfoMem}
            onTriggerScan={handleTriggerScan}
          />
        </div>

        {/* 3. OPTIONAL DOCKED WINDOW: MEMORY BANKS & FREQUENCY DATABASE */}
        {showMemoryBanks && (
          <div id="memory-banks" className="transition-all animate-in fade-in duration-200 flex flex-col gap-2">
            {mrToast && (
              <div className="bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-mono font-bold animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{mrToast.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMrToast(null)}
                  className="text-emerald-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-200">
                  Queensland MW & South West Pacific Memory Banks
                </span>
                <span className="text-xs text-slate-400">
                  (MR adds freqs to open bank · SCAN scans open bank · VFO/M steps memories)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMemoryBanks(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
              >
                Hide Panel (F2)
              </button>
            </div>
            <MemoryBanksManager
              banks={banks}
              frequencies={frequencies}
              activeBankId={activeBankId}
              currentFreqHz={radioState.freqHz}
              currentMode={radioState.mode}
              vfdColor={radioState.vfdColor}
              isScanning={isScanning}
              onSelectBank={setActiveBankId}
              onTuneEntry={handleTuneMemoryEntry}
              onSaveFrequency={handleSaveFrequency}
              onDeleteFrequency={handleDeleteFrequency}
              onCreateBank={handleCreateBank}
              onDeleteBank={handleDeleteBank}
              onExportJson={handleExportJson}
              onTriggerScan={handleTriggerScan}
            />
          </div>
        )}

        {/* 4. OPTIONAL DOCKED WINDOW: CAT PACKET TRAFFIC LOG */}
        {showCatLogs && (
          <div className="bg-[#14171d] border border-[#2b3342] rounded-xl p-4 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3 border-b border-[#2b3342] pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">
                  CAT Serial Packet Traffic Log (4800 8N2)
                </span>
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                  65ms Paced
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCatLogs([])}
                  className="px-2 py-1 rounded bg-[#202530] hover:bg-[#2c3342] text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-slate-400" />
                  <span>Clear Log</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatLogs(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
                >
                  Close (F3)
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-xs pr-1">
              {catLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-4">No CAT packets sent yet.</div>
              ) : (
                catLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded bg-[#0d0f13] border border-white/5 flex items-center justify-between gap-3 hover:border-cyan-500/30"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                      <span className="font-bold text-cyan-400">{log.commandName}</span>
                      <span className="text-slate-300 text-[11px] truncate">{log.description}</span>
                    </div>
                    <div className="text-teal-300 font-bold shrink-0 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                      [{log.hexBytes}]
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. OPTIONAL DOCKED WINDOW: VISUAL STUDIO C++ CODE INSPECTOR */}
        {showCppBuilder && (
          <div className="animate-in fade-in duration-200">
            <CppVisualStudioBuilder
              banks={banks}
              frequencies={frequencies}
              radioState={radioState}
              catLogs={catLogs}
              lcdTextColor={radioState.lcdTextColor}
              onClearCatLogs={() => setCatLogs([])}
            />
          </div>
        )}
      </main>

      {/* 6. NATIVE WINDOWS STATUS BAR (Clean and unobtrusive at bottom) */}
      <footer className="mt-auto bg-[#181b22] border-t border-[#313845] px-4 py-1 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>FRG-8800: {(radioState.freqHz / 1000).toFixed(3)} kHz ({radioState.mode})</span>
          </span>

          <span className="hidden sm:inline text-slate-600">|</span>

          {serialStatus.connected ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE: {serialStatus.portName || 'FTDI USB'} (4800 8N2) [RTS/DTR: OFF]</span>
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>SERIAL OFFLINE (Connect in Options Menu)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-slate-400">
            LAST CAT: <strong className="text-cyan-300">[{lastCatHex}]</strong>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="text-slate-300">
            QUEENSLAND AEST / PACIFIC DX CONTROLLER
          </span>
        </div>
      </footer>

      {/* 7. MODALS (Options Setup Dialog & Help Manual) */}
      <SerialOptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        serialStatus={serialStatus}
        onConnectSerial={handleConnectSerial}
        onDisconnectSerial={handleDisconnectSerial}
        dtrEnabled={dtrEnabled}
        onToggleDtr={handleToggleDtr}
        rtsEnabled={rtsEnabled}
        onToggleRts={handleToggleRts}
        onSendTestPing={handleSendTestPing}
      />

      <HelpManualModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
export default App;
