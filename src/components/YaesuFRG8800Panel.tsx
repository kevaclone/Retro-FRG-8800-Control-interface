import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  FrequencyEntry,
  MemoryBank,
  RadioMode,
  RadioState,
  AttenuatorMode,
} from '../types/radio';
import { formatFreqReadout } from '../utils/catProtocol';
import { Lock, Unlock, Radio, Power, Headphones, Sliders, Volume2, Disc } from 'lucide-react';

interface YaesuFRG8800PanelProps {
  state: RadioState;
  matchedStation: FrequencyEntry | null;
  lastCatHex: string;
  serialConnected: boolean;
  isScanning?: boolean;
  availableBanks?: MemoryBank[];
  frequencies?: FrequencyEntry[];
  activeBankId?: string;
  onSelectBank?: (bankId: string) => void;
  onUpdateState: (patch: Partial<RadioState>, triggerCat?: 'freq' | 'mode' | 'both') => void;
  onStepFrequency: (deltaHz: number) => void;
  onDirectFrequencyHz: (freqHz: number) => void;
  onStepMemoryChannel: (delta: number) => void;
  onAddFreqToOpenBank: (freqHz?: number) => void;
  onToggleVfoMem: () => void;
  onTriggerScan: () => void;
}

const STEP_OPTIONS: { label: string; hz: number; badge?: string }[] = [
  { label: '1 Hz', hz: 1 },
  { label: '10 Hz', hz: 10 },
  { label: '100 Hz', hz: 100 },
  { label: '1 kHz', hz: 1000 },
  { label: '5 kHz', hz: 5000 },
  { label: '9 kHz', hz: 9000, badge: 'MW AUS' },
  { label: '10 kHz', hz: 10000 },
  { label: '100 kHz', hz: 100000 },
  { label: '1 MHz', hz: 1000000 },
];

const MODES: RadioMode[] = ['AM-W', 'AM-N', 'LSB', 'USB', 'CW', 'FM'];

const DISPLAY_SELECT_OPTIONS: {
  id: 'SLEEP' | 'OFF' | 'ON' | 'CLOCK1' | 'FREQ' | 'CLOCK2';
  label: string;
  angle: number;
}[] = [
  { id: 'SLEEP', label: 'Sleep', angle: -150 }, // 7 o'clock
  { id: 'OFF', label: 'Off', angle: -114 },
  { id: 'ON', label: 'On', angle: -78 },
  { id: 'CLOCK1', label: 'Clock 1', angle: -42 },
  { id: 'FREQ', label: 'Freq', angle: -6 },
  { id: 'CLOCK2', label: 'Clock 2', angle: 30 }, // 1 o'clock
];

const ATT_OPTIONS: {
  id: AttenuatorMode;
  label: string;
  angle: number;
  db: string;
}[] = [
  { id: 'DX', label: 'DX', angle: -135, db: '0 dB' },
  { id: '10dB', label: '10 dB', angle: -45, db: '-10 dB' },
  { id: '20dB', label: '20 dB', angle: 45, db: '-20 dB' },
  { id: 'LOCAL', label: 'LOCAL', angle: 135, db: '-30 dB' },
];

const M_CHANNELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const YaesuFRG8800Panel: React.FC<YaesuFRG8800PanelProps> = ({
  state,
  matchedStation,
  lastCatHex,
  serialConnected,
  isScanning = false,
  availableBanks = [],
  frequencies = [],
  activeBankId,
  onSelectBank,
  onUpdateState,
  onStepFrequency,
  onDirectFrequencyHz,
  onStepMemoryChannel,
  onAddFreqToOpenBank,
  onToggleVfoMem,
  onTriggerScan,
}) => {
  const [dialAngle, setDialAngle] = useState<number>(35);
  const [isDraggingDial, setIsDraggingDial] = useState<boolean>(false);
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [clockStr, setClockStr] = useState<string>('12:00:00');
  const [sMeterFlutter, setSMeterFlutter] = useState<number>(0);

  // Synthesized mechanical click sound on button press
  const playKeyClick = (freq = 1100) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {
      // AudioContext unavailable or suspended
    }
  };

  // Live frequency preview of what the keypad buffer will tune to
  const previewFreqHz = useMemo(() => {
    if (!keypadBuffer) return null;
    const val = parseFloat(keypadBuffer);
    if (isNaN(val) || val <= 0) return null;
    if (keypadBuffer.includes('.')) return Math.round(val * 1000000);
    if (val <= 30) return Math.round(val * 1000000);
    if (val <= 30000) return Math.round(val * 1000);
    return Math.round(val);
  }, [keypadBuffer]);

  // Fine tune step selection: 1 Hz or 10 Hz per user specification
  const [fineTuneStep, setFineTuneStep] = useState<1 | 10>(10);

  const dialRef = useRef<HTMLDivElement | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const accumulatedDegRef = useRef<number>(0);
  const holdTimerRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number>(Date.now());

  // Update clock & subtle realistic S-meter jitter
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      if (state.clockMode === 'UTC') {
        const hh = String(now.getUTCHours()).padStart(2, '0');
        const mm = String(now.getUTCMinutes()).padStart(2, '0');
        const ss = String(now.getUTCSeconds()).padStart(2, '0');
        setClockStr(`${hh}:${mm}:${ss}`);
      } else if (state.clockMode === 'AEST') {
        const qldHours = (now.getUTCHours() + 10) % 24;
        const hh = String(qldHours).padStart(2, '0');
        const mm = String(now.getUTCMinutes()).padStart(2, '0');
        const ss = String(now.getUTCSeconds()).padStart(2, '0');
        setClockStr(`${hh}:${mm}:${ss}`);
      } else {
        const elapsedSec = Math.floor((Date.now() - startTimestampRef.current) / 1000);
        const hh = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
        const mm = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
        const ss = String(elapsedSec % 60).padStart(2, '0');
        setClockStr(`${hh}:${mm}:${ss}`);
      }
      setSMeterFlutter((Math.random() - 0.5) * 0.7);
    }, 250);
    return () => clearInterval(timer);
  }, [state.clockMode]);

  // Main Tuning Knob rotation mechanics
  const handleDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!state.powerOn || state.dialLocked) return;
    setIsDraggingDial(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
    lastAngleRef.current = (rad * 180) / Math.PI;
    accumulatedDegRef.current = 0;
  };

  const handleDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingDial || !dialRef.current || state.dialLocked) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
    const deg = (rad * 180) / Math.PI;

    if (lastAngleRef.current !== null) {
      let delta = deg - lastAngleRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      accumulatedDegRef.current += delta;
      setDialAngle((prev) => (prev + delta) % 360);

      // Trigger frequency step when rotated 7.5 degrees
      const stepThreshold = 7.5;
      if (Math.abs(accumulatedDegRef.current) >= stepThreshold) {
        const steps = Math.trunc(accumulatedDegRef.current / stepThreshold);
        accumulatedDegRef.current -= steps * stepThreshold;
        onStepFrequency(steps * state.stepHz);
      }
    }
    lastAngleRef.current = deg;
  };

  const handleDialPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingDial(false);
    lastAngleRef.current = null;
    accumulatedDegRef.current = 0;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleDialWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!state.powerOn || state.dialLocked) return;
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    setDialAngle((prev) => (prev + dir * 12) % 360);
    onStepFrequency(dir * state.stepHz);
  };

  // Fine Tune Dial: Direct tuning in 1 Hz or 10 Hz increments per user specification
  const handleFineTune = useCallback((deltaHz: number) => {
    if (!state.powerOn || state.dialLocked) return;
    onStepFrequency(deltaHz);
    onUpdateState({
      clarifierHz: Math.max(-990, Math.min(990, (state.clarifierHz || 0) + deltaHz)),
    });
  }, [state.powerOn, state.dialLocked, state.clarifierHz, onStepFrequency, onUpdateState]);

  // Fine Tune Dial Pointer Drag mechanics
  const handleFineDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!state.powerOn || state.dialLocked) return;
    const startY = e.clientY;
    const target = e.currentTarget;
    let accumulated = 0;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const onPointerMove = (ev: PointerEvent) => {
      const deltaY = startY - ev.clientY;
      const stepPixels = fineTuneStep === 1 ? 4 : 6;
      const currentSteps = Math.trunc(deltaY / stepPixels);
      const diff = currentSteps - accumulated;
      if (diff !== 0) {
        handleFineTune(diff * fineTuneStep);
        accumulated = currentSteps;
      }
    };

    const onPointerUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Continuous hold for fast/slow tuning buttons
  const startTuningHold = (deltaHz: number) => {
    if (!state.powerOn || state.dialLocked) return;
    onStepFrequency(deltaHz);
    setDialAngle((prev) => (prev + (deltaHz > 0 ? 15 : -15)) % 360);

    holdTimerRef.current = window.setInterval(() => {
      onStepFrequency(deltaHz);
      setDialAngle((prev) => (prev + (deltaHz > 0 ? 15 : -15)) % 360);
    }, 85);
  };

  const stopTuningHold = () => {
    if (holdTimerRef.current !== null) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Authentic Keypad Input Handler (0-9, ., CE, ENT, MHz, kHz, BACK)
  const handleKeypadPress = (key: string) => {
    // If radio power is off, clicking any keypad key automatically powers it on
    if (!state.powerOn) {
      onUpdateState({ powerOn: true });
    }

    setActiveKey(key);
    window.setTimeout(() => setActiveKey(null), 160);
    playKeyClick(key === 'ENT' || key === 'MHz' || key === 'kHz' ? 1400 : 1050);

    if (key >= '0' && key <= '9') {
      if (keypadBuffer.length < 8) {
        setKeypadBuffer((prev) => prev + key);
      }
    } else if (key === 'CE' || key === 'CLEAR') {
      setKeypadBuffer('');
    } else if (key === 'BACK' || key === 'BS') {
      setKeypadBuffer((prev) => prev.slice(0, -1));
    } else if (key === '.') {
      if (!keypadBuffer.includes('.') && keypadBuffer.length < 8) {
        setKeypadBuffer((prev) => (prev ? prev + '.' : '0.'));
      }
    } else if (key === 'MHz') {
      if (keypadBuffer.length > 0) {
        const val = parseFloat(keypadBuffer);
        if (!isNaN(val) && val > 0) {
          const targetHz = Math.round(val * 1000000);
          onDirectFrequencyHz(targetHz);
        }
        setKeypadBuffer('');
      }
    } else if (key === 'kHz') {
      if (keypadBuffer.length > 0) {
        const val = parseFloat(keypadBuffer);
        if (!isNaN(val) && val > 0) {
          const targetHz = Math.round(val * 1000);
          onDirectFrequencyHz(targetHz);
        }
        setKeypadBuffer('');
      }
    } else if (key === 'ENT') {
      if (keypadBuffer.length > 0) {
        const val = parseFloat(keypadBuffer);
        if (!isNaN(val) && val > 0) {
          let targetHz = 0;
          if (keypadBuffer.includes('.')) {
            targetHz = Math.round(val * 1000000);
          } else if (val <= 30) {
            targetHz = Math.round(val * 1000000);
          } else if (val <= 30000) {
            targetHz = Math.round(val * 1000);
          } else {
            targetHz = Math.round(val);
          }
          onDirectFrequencyHz(targetHz);
        }
        setKeypadBuffer('');
      }
    }
  };

  // Keyboard support: Allow typing numbers on physical keyboard / numpad directly into FRG-8800
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (!state.powerOn) return;

      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === '.') {
        handleKeypadPress('.');
      } else if (e.key === 'Backspace') {
        handleKeypadPress('BACK');
      } else if (e.key === 'Escape') {
        handleKeypadPress('CE');
      } else if (e.key === 'Enter') {
        handleKeypadPress('ENT');
      } else if (e.key.toLowerCase() === 'k') {
        handleKeypadPress('kHz');
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        handleKeypadPress('MHz');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.powerOn, keypadBuffer]);

  const currentDisplaySelect = state.displaySelect || 'FREQ';
  const currentDisplayAngle =
    DISPLAY_SELECT_OPTIONS.find((o) => o.id === currentDisplaySelect)?.angle ?? -6;

  const handleSelectDisplayMode = (mode: 'SLEEP' | 'OFF' | 'ON' | 'CLOCK1' | 'FREQ' | 'CLOCK2') => {
    if (mode === 'CLOCK1') {
      onUpdateState({ displaySelect: mode, clockMode: 'UTC' });
    } else if (mode === 'CLOCK2') {
      onUpdateState({ displaySelect: mode, clockMode: 'AEST' });
    } else if (mode === 'SLEEP') {
      onUpdateState({ displaySelect: mode, clockMode: 'TIMER' });
    } else {
      onUpdateState({ displaySelect: mode });
    }
  };

  const handleSelectMCh = (ch: number) => {
    const targetCh = Math.max(1, Math.min(12, ch));
    onUpdateState({ memoryChannel: targetCh });
    if (availableBanks && availableBanks.length > 0 && onSelectBank) {
      const bankIndex = (targetCh - 1) % availableBanks.length;
      const targetBank = availableBanks[bankIndex];
      if (targetBank) {
        onSelectBank(targetBank.id);
        const bankFreqs = frequencies.filter((f) => f.bankId === targetBank.id);
        if (bankFreqs.length > 0) {
          onUpdateState(
            {
              memoryChannel: targetCh,
              freqHz: bankFreqs[0].freqKhz * 1000,
              mode: bankFreqs[0].mode,
            },
            'freq'
          );
        }
      }
    }
  };

  const handleSelectAtt = (att: AttenuatorMode) => {
    onUpdateState({ attenuator: att });
  };

  const handleMemToVfo = () => {
    const bankFreqs = frequencies.filter((f) => f.bankId === activeBankId);
    if (bankFreqs.length > 0) {
      const curIdx = Math.max(0, (state.memoryChannel - 1) % bankFreqs.length);
      const entry = bankFreqs[curIdx];
      if (entry) {
        onUpdateState(
          { freqHz: entry.freqKhz * 1000, mode: entry.mode, vfoMode: 'VFO' },
          'freq'
        );
        return;
      }
    }
    onUpdateState({ vfoMode: 'VFO' });
  };

  const handleVfoToMem = () => {
    let targetHz = state.freqHz;
    if (keypadBuffer.length > 0) {
      const val = parseFloat(keypadBuffer);
      if (!isNaN(val) && val > 0) {
        targetHz = val <= 30 ? Math.round(val * 1000000) : Math.round(val * 1000);
      }
      setKeypadBuffer('');
    }
    onAddFreqToOpenBank(targetHz);
  };

  // S-Meter calculation
  const rawSignal = matchedStation ? matchedStation.signalStrength : 2;
  const attReduction =
    state.attenuator === 'LOCAL'
      ? 5
      : state.attenuator === '20dB'
      ? 4
      : state.attenuator === '10dB' || state.attenuator === 'NORM'
      ? 2
      : 0;
  const activeSegments = state.powerOn
    ? Math.max(
        1,
        Math.min(
          12,
          Math.round((rawSignal - attReduction + sMeterFlutter) * (state.rfGain / 100))
        )
      )
    : 0;

  const { mhzDigits, khzDigits, subKhzDigits, hzSingleDigit } = formatFreqReadout(
    state.freqHz
  );

  const createKnobWheelHandler =
    (key: keyof RadioState, min: number, max: number, step = 5) =>
    (e: React.WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      const cur = Number(state[key]);
      const next = Math.max(min, Math.min(max, cur + dir * step));
      onUpdateState({ [key]: next });
    };

  // Rotary Knob Drag Handler
  const createKnobPointerHandler = (key: keyof RadioState, min: number, max: number, step = 2) => {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      if (!state.powerOn) return;
      const startY = e.clientY;
      const startVal = Number(state[key]) || 0;
      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      const onPointerMove = (ev: PointerEvent) => {
        const deltaY = startY - ev.clientY;
        const nextVal = Math.max(min, Math.min(max, startVal + Math.round(deltaY / 2) * step));
        onUpdateState({ [key]: nextVal });
      };

      const onPointerUp = () => {
        try {
          target.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };
  };

  // Bandwidth toggle helper (Wide = AM-W, Narrow = AM-N)
  const isWideBandwidth = state.bandwidth ? state.bandwidth === 'WIDE' : state.mode !== 'AM-N';
  const handleToggleBandwidth = () => {
    if (!state.powerOn) return;
    const nextWide = !isWideBandwidth;
    const nextBw = nextWide ? 'WIDE' : 'NARROW';
    const nextMode: RadioMode = state.mode.startsWith('AM')
      ? (nextWide ? 'AM-W' : 'AM-N')
      : state.mode;
    onUpdateState({ bandwidth: nextBw, mode: nextMode }, 'mode');
  };

  const isAgcFast = state.agcMode === 'FAST';
  const handleToggleAgc = () => {
    if (!state.powerOn) return;
    onUpdateState({ agcMode: isAgcFast ? 'SLOW' : 'FAST' });
  };

  const isNbOn = state.noiseBlanker;
  const handleToggleNb = () => {
    if (!state.powerOn) return;
    onUpdateState({ noiseBlanker: !state.noiseBlanker });
  };

  const isDimHigh = state.vfdBrightness >= 0.7;
  const handleToggleDim = () => {
    if (!state.powerOn) return;
    const nextDim = isDimHigh ? 0.35 : 0.95;
    onUpdateState({ vfdBrightness: nextDim });
  };

  return (
    <section aria-label="Yaesu FRG-8800 Hardware Front Panel" className="w-full select-none">
      {/* AUTHENTIC HARDWARE CHASSIS - Genuine Yaesu Satin Lighter Grey Anodized Aluminum */}
      {/* Made lighter grey per user requirement */}
      <div className="relative rounded-2xl border-4 border-[#4d535f] p-4 sm:p-6 lg:p-7 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.95)] bg-gradient-to-b from-[#3e444e] via-[#373c45] to-[#31363e] w-full">
        {/* CORNER HARDWARE HEX SCREWS */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 rounded-full bg-[#1b1e23] border border-white/20 flex items-center justify-center shadow-inner">
          <div className="w-2 h-0.5 bg-white/40 rotate-45" />
        </div>
        <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 rounded-full bg-[#1b1e23] border border-white/20 flex items-center justify-center shadow-inner">
          <div className="w-2 h-0.5 bg-white/40 -rotate-45" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 rounded-full bg-[#1b1e23] border border-white/20 flex items-center justify-center shadow-inner">
          <div className="w-2 h-0.5 bg-white/40 -rotate-12" />
        </div>
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 rounded-full bg-[#1b1e23] border border-white/20 flex items-center justify-center shadow-inner">
          <div className="w-2 h-0.5 bg-white/40 rotate-30" />
        </div>

        {/* TOP METAL TRIM BAR (Clean Yaesu Branding) */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-3">
            <span className="font-extrabold tracking-[0.25em] text-[#f1f3ee] text-sm font-[var(--font-display)]">
              YAESU MUSEN CO., LTD. — TOKYO JAPAN
            </span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-[#d5ba7d] font-semibold tracking-wider hidden sm:inline">
              COMMUNICATIONS RECEIVER FRG-8800
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-widest text-[#d5ba7d] font-bold uppercase">
              CAT SYSTEM
            </span>
            {serialConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>ONLINE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>OFFLINE</span>
              </span>
            )}
          </div>
        </div>

        {/* MAIN PANEL GRID: WIDENED THREE-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          {/* ========================================================================================= */}
          {/* 1. LEFT COLUMN: EXPANDED ACOUSTIC SPEAKER GRILL & BOTTOM CONTROLS DECK                     */}
          {/* Made the exact same light grey as the rest of the face panel                               */}
          {/* ========================================================================================= */}
          <div className="lg:col-span-3 h-full flex flex-col justify-between gap-3.5 bg-gradient-to-b from-[#3e444e] via-[#373c45] to-[#31363e] p-3 sm:p-3.5 pb-2.5 sm:pb-3 rounded-2xl border border-[#4d535f]/90">
            {/* ENLARGED AUTHENTIC ACOUSTIC SPEAKER GRILL (MATCHING FACE PANEL GREY) */}
            <div className="flex-1 flex flex-col justify-between p-4 rounded-xl bg-gradient-to-b from-[#3e444e] via-[#373c45] to-[#31363e] border border-[#4d535f] shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] min-h-[300px]">
              {/* YAESU METAL BADGE & LEGEND */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-[0.2em] text-slate-100 text-lg sm:text-xl font-[var(--font-display)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    YAESU
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300">
                    FRG-8800
                  </span>
                </div>
                <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase">
                  ACOUSTIC MONITOR
                </span>
              </div>

              {/* TALL & WIDE ACOUSTIC HORIZONTAL SLATS (EMBEDDED IN FACE PANEL GREY) */}
              <div className="flex-1 flex flex-col justify-evenly py-3 gap-1.5 sm:gap-2">
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-2.5 sm:h-3 rounded-full bg-gradient-to-r from-[#202329] via-[#2a2e36] to-[#202329] border-t border-black/50 border-b border-white/10 shadow-[inset_0_2px_3px_rgba(0,0,0,0.8)] flex items-center px-3"
                  >
                    <div className="w-full h-0.5 bg-black/80 rounded-full" />
                  </div>
                ))}
              </div>

              {/* BOTTOM EMBOSSED BADGE */}
              <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-[10px] font-mono tracking-widest text-slate-300">
                <span>SOLID STATE COMMUNICATIONS RECEIVER</span>
                <span className="text-[#d5ba7d] font-bold">150 kHz - 30 MHz</span>
              </div>
            </div>

            {/* ===================================================================================== */}
            {/* BOTTOM CONTROLS DECK: POWER -> PHONES -> TONE -> AF GAIN -> SQUELCH                   */}
            {/* Matching Face Panel Grey Subpanel                                                     */}
            {/* ===================================================================================== */}
            <div className="p-3 bg-gradient-to-b from-[#2e333b] via-[#262930] to-[#1f2227] rounded-xl border border-[#4d535f]/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] flex flex-wrap items-center justify-between gap-3">
              {/* 1. POWER BUTTON: Placed to the left of the PHONES connector */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onUpdateState({ powerOn: !state.powerOn })}
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border shadow-lg active:scale-95 ${
                    state.powerOn
                      ? 'bg-gradient-to-b from-[#ea580c] to-[#b91c1c] text-white border-orange-400/80 shadow-[0_0_16px_rgba(234,88,12,0.7)]'
                      : 'bg-gradient-to-b from-[#3a201a] to-[#201310] text-orange-400/40 border-black'
                  }`}
                  title="Radio Main Power ON / OFF"
                >
                  <Power className={`w-5 h-5 ${state.powerOn ? 'animate-pulse text-white' : 'text-orange-400/50'}`} />
                  <span className="text-[8px] font-mono font-black tracking-wider uppercase">
                    {state.powerOn ? 'ON' : 'OFF'}
                  </span>
                </button>
                <span className="mt-1 text-[9px] font-mono font-bold tracking-wider text-slate-300">
                  POWER
                </span>
              </div>

              {/* 2. 1/4" PHONES CONNECTOR */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className="w-11 h-11 rounded-full bg-gradient-to-b from-[#949da6] via-[#4d5257] to-[#25282b] p-1 shadow-lg border border-black flex items-center justify-center"
                  title="1/4-inch Stereo Headphone Jack"
                >
                  <div className="w-7 h-7 rounded-full bg-[#08090b] border-2 border-white/30 shadow-inner flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-black border border-white/20 shadow-inner flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#050607]" />
                    </div>
                  </div>
                </div>
                <span className="mt-1 text-[9px] font-mono font-bold tracking-wider text-slate-400">
                  PHONES
                </span>
              </div>

              {/* 3. TONE ROTARY DIAL (Placed to the right of Phones) */}
              <div
                onPointerDown={createKnobPointerHandler('toneLevel', 0, 100, 2)}
                onWheel={createKnobWheelHandler('toneLevel', 0, 100, 5)}
                className="flex flex-col items-center cursor-ns-resize group select-none"
                title="TONE Control: Drag up/down or mouse wheel (0 to 100)"
              >
                {/* Silver Outer Ring matching right side front panel dials */}
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#d4d8e0] via-[#9da3af] to-[#5a606d] border border-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center group-hover:ring-1 group-hover:ring-amber-400/50 transition-all">
                  <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-b from-[#8f96a3] to-[#454a54] border border-white/20 shadow-inner flex items-center justify-center">
                    <div
                      className="w-7 h-7 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner flex items-center justify-center"
                      style={{
                        transform: `rotate(${((state.toneLevel ?? 50) / 100) * 270 - 135}deg)`,
                        transition: 'transform 0.05s ease-out',
                      }}
                    >
                      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-amber-400 rounded-full shadow-[0_0_3px_#fbbf24]" />
                    </div>
                  </div>
                </div>
                <span className="mt-1 text-[9px] font-mono font-bold tracking-wider text-slate-300">
                  TONE
                </span>
                <span className="text-[8px] font-mono text-amber-300/80 tabular-nums">
                  {state.toneLevel ?? 50}%
                </span>
              </div>

              {/* 4. AF GAIN (VOLUME) DIAL (Placed on the other side of Tone) */}
              <div
                onPointerDown={createKnobPointerHandler('afGain', 0, 100, 2)}
                onWheel={createKnobWheelHandler('afGain', 0, 100, 5)}
                className="flex flex-col items-center cursor-ns-resize group select-none"
                title="AF GAIN (Volume): Drag up/down or mouse wheel (0 to 100)"
              >
                {/* Silver Outer Ring matching right side front panel dials */}
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#d4d8e0] via-[#9da3af] to-[#5a606d] border border-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center group-hover:ring-1 group-hover:ring-teal-400/50 transition-all">
                  <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-b from-[#8f96a3] to-[#454a54] border border-white/20 shadow-inner flex items-center justify-center">
                    <div
                      className="w-7 h-7 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner flex items-center justify-center"
                      style={{
                        transform: `rotate(${(state.afGain / 100) * 270 - 135}deg)`,
                        transition: 'transform 0.05s ease-out',
                      }}
                    >
                      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white rounded-full shadow-[0_0_2px_#ffffff]" />
                    </div>
                  </div>
                </div>
                <span className="mt-1 text-[9px] font-mono font-bold tracking-wider text-slate-300">
                  AF GAIN
                </span>
                <span className="text-[8px] font-mono text-cyan-300/80 tabular-nums">
                  {state.afGain}%
                </span>
              </div>

              {/* 5. DEDICATED SQUELCH DIAL (Placed to the right of Tone & AF Gain) */}
              <div
                onPointerDown={createKnobPointerHandler('sqlLevel', 0, 100, 2)}
                onWheel={createKnobWheelHandler('sqlLevel', 0, 100, 5)}
                className="flex flex-col items-center cursor-ns-resize group select-none"
                title="SQUELCH Dial: Drag up/down or mouse wheel (0 to 100)"
              >
                {/* Silver Outer Ring matching right side front panel dials */}
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#d4d8e0] via-[#9da3af] to-[#5a606d] border border-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center group-hover:ring-1 group-hover:ring-emerald-400/50 transition-all">
                  <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-b from-[#8f96a3] to-[#454a54] border border-white/20 shadow-inner flex items-center justify-center">
                    <div
                      className="w-7 h-7 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner flex items-center justify-center"
                      style={{
                        transform: `rotate(${(state.sqlLevel / 100) * 270 - 135}deg)`,
                        transition: 'transform 0.05s ease-out',
                      }}
                    >
                      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-emerald-400 rounded-full shadow-[0_0_3px_#34d399]" />
                    </div>
                  </div>
                </div>
                <span className="mt-1 text-[9px] font-mono font-bold tracking-wider text-slate-300">
                  SQUELCH
                </span>
                <span className="text-[8px] font-mono text-emerald-300/80 tabular-nums">
                  {state.sqlLevel}%
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================================= */}
          {/* 2. CENTER COLUMN: VFD DISPLAY, MODES, VERTICAL SWITCHES & FLYWHEEL MAIN TUNING DIAL        */}
          {/* Per user specification:                                                                   */}
          {/* - "Band Width", "AGC", "NB", and "DIM" switches placed next to main tuning dial          */}
          {/* - Their orientation changed to VERTICAL                                                   */}
          {/* - Fine Tune Dial tunes in 1 Hz and 10 Hz increments with dedicated controls              */}
          {/* ========================================================================================= */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            {/* AUTHENTIC BACKLIT GREEN LCD DISPLAY WINDOW */}
            <div className="relative rounded-xl border-4 border-[#1c1f24] bg-[#0c0e11] p-3.5 sm:p-4 shadow-[inset_0_2px_10px_rgba(0,0,0,0.95)] overflow-hidden">
              {/* Outer LCD Bezel Glass Glare */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-transparent z-20" />
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/[0.04] to-transparent z-20" />

              {/* ACTIVE LCD DISPLAY PANEL - BACKLIT GREEN AS PER ORIGINAL FRG-8800 */}
              <div
                className="relative rounded-lg p-3.5 sm:p-4 transition-all duration-300 overflow-hidden"
                style={{
                  background:
                    !state.powerOn || state.displaySelect === 'OFF'
                      ? 'linear-gradient(180deg, #131b15 0%, #0d130f 100%)'
                      : 'linear-gradient(180deg, #5eb87a 0%, #4ea96a 45%, #3e9859 100%)',
                  boxShadow:
                    !state.powerOn || state.displaySelect === 'OFF'
                      ? 'inset 0 0 16px rgba(0,0,0,0.85)'
                      : 'inset 0 0 24px rgba(18, 70, 35, 0.65), 0 0 16px rgba(78, 169, 106, 0.4)',
                  opacity: state.powerOn && state.displaySelect !== 'OFF' ? state.vfdBrightness : 0.2,
                }}
              >
                {/* Header: S-Meter Bar Graph & Dual Clock Readout */}
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"
                  style={{
                    borderColor:
                      state.lcdTextColor && state.lcdTextColor !== '#000000'
                        ? `${state.lcdTextColor}33`
                        : 'rgba(0,0,0,0.25)',
                  }}
                >
                  {/* Multi-Segment Calibrated S-Meter Bar Graph */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[9px] font-mono tracking-widest uppercase">
                      <span
                        className="font-black"
                        style={{ color: state.lcdTextColor || '#050705' }}
                      >
                        SIGNAL
                      </span>
                      <span
                        className="font-bold opacity-75"
                        style={{ color: state.lcdTextColor || '#0c120d' }}
                      >
                        S 1 · 3 · 5 · 7 · 9 · +10 · +20 · +40 dB
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const active = idx < activeSegments;
                        const isHigh = idx >= 8;
                        const defaultSegmentColor = isHigh ? '#991b1b' : '#050705';
                        const segColor =
                          state.lcdTextColor && state.lcdTextColor !== '#000000'
                            ? isHigh
                              ? '#ef4444'
                              : state.lcdTextColor
                            : defaultSegmentColor;
                        return (
                          <div
                            key={idx}
                            className="h-2.5 rounded-[2px] transition-all"
                            style={{
                              width: idx >= 8 ? '15px' : '13px',
                              backgroundColor: active ? segColor : 'rgba(0,0,0,0.12)',
                              boxShadow: active
                                ? state.lcdTextColor && state.lcdTextColor !== '#000000'
                                  ? `0 0 6px ${segColor}88`
                                  : 'inset 0 1px 0 rgba(255,255,255,0.2)'
                                : 'none',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Dual Clock Readout */}
                  <div className="text-right font-mono">
                    <div
                      className="text-[9px] font-bold uppercase tracking-wider opacity-85"
                      style={{ color: state.lcdTextColor || '#0a0f0b' }}
                    >
                      {state.clockMode === 'AEST'
                        ? 'QLD AEST (UTC+10)'
                        : state.clockMode === 'UTC'
                        ? 'WORLD UTC / GMT'
                        : 'ELAPSED TIMER'}
                    </div>
                    <div
                      className="text-sm font-extrabold tracking-widest tabular-nums"
                      style={{
                        color: state.lcdTextColor || '#000000',
                        textShadow:
                          state.lcdTextColor && state.lcdTextColor !== '#000000'
                            ? `0 0 8px ${state.lcdTextColor}88`
                            : '0 1px 0 rgba(255,255,255,0.2)',
                      }}
                    >
                      {clockStr}
                    </div>
                  </div>
                </div>

                {/* Main Digital LCD Readout */}
                <div className="my-2.5 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2 font-mono tracking-tighter">
                    {keypadBuffer ? (
                      <div className="flex flex-wrap items-baseline gap-3">
                        <div
                          className="text-4xl sm:text-5xl lg:text-6xl font-black tabular-nums animate-pulse"
                          style={{
                            color: state.lcdTextColor || '#000000',
                            textShadow:
                              state.lcdTextColor && state.lcdTextColor !== '#000000'
                                ? `0 0 16px ${state.lcdTextColor}`
                                : '0 1px 0 rgba(255,255,255,0.25)',
                          }}
                        >
                          {keypadBuffer}_
                        </div>
                        {previewFreqHz && (
                          <div
                            className="text-xs sm:text-sm font-extrabold uppercase px-2 py-0.5 rounded bg-black/30 border border-black/40 flex items-baseline gap-1"
                            style={{ color: state.lcdTextColor || '#000000' }}
                          >
                            <span className="opacity-70 text-[10px]">TUNE &gt;</span>
                            <span>{(previewFreqHz / 1000).toFixed(3)} kHz</span>
                          </div>
                        )}
                      </div>
                    ) : state.displaySelect === 'SLEEP' ? (
                      <div
                        className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-widest"
                        style={{
                          color: state.lcdTextColor || '#000000',
                          textShadow:
                            state.lcdTextColor && state.lcdTextColor !== '#000000'
                              ? `0 0 14px ${state.lcdTextColor}`
                              : '0 1px 0 rgba(255,255,255,0.25)',
                        }}
                      >
                        SLEEP 60<span className="text-xl ml-1">MIN</span>
                      </div>
                    ) : state.displaySelect === 'CLOCK1' ? (
                      <div
                        className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-wider"
                        style={{
                          color: state.lcdTextColor || '#000000',
                          textShadow:
                            state.lcdTextColor && state.lcdTextColor !== '#000000'
                              ? `0 0 14px ${state.lcdTextColor}`
                              : '0 1px 0 rgba(255,255,255,0.25)',
                        }}
                      >
                        {clockStr} <span className="text-lg uppercase">UTC</span>
                      </div>
                    ) : state.displaySelect === 'CLOCK2' ? (
                      <div
                        className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-wider"
                        style={{
                          color: state.lcdTextColor || '#000000',
                          textShadow:
                            state.lcdTextColor && state.lcdTextColor !== '#000000'
                              ? `0 0 14px ${state.lcdTextColor}`
                              : '0 1px 0 rgba(255,255,255,0.25)',
                        }}
                      >
                        {clockStr} <span className="text-lg uppercase">AEST</span>
                      </div>
                    ) : (
                      <>
                        <span
                          className="text-4xl sm:text-5xl lg:text-6xl font-black tabular-nums"
                          style={{
                            color: state.lcdTextColor || '#000000',
                            textShadow:
                              state.lcdTextColor && state.lcdTextColor !== '#000000'
                                ? `0 0 16px ${state.lcdTextColor}`
                                : '0 1px 0 rgba(255,255,255,0.25)',
                          }}
                        >
                          {mhzDigits}
                        </span>
                        <span
                          className="text-3xl sm:text-4xl font-black"
                          style={{ color: state.lcdTextColor || '#000000' }}
                        >
                          .
                        </span>
                        <span
                          className="text-4xl sm:text-5xl lg:text-6xl font-black tabular-nums"
                          style={{
                            color: state.lcdTextColor || '#000000',
                            textShadow:
                              state.lcdTextColor && state.lcdTextColor !== '#000000'
                                ? `0 0 16px ${state.lcdTextColor}`
                                : '0 1px 0 rgba(255,255,255,0.25)',
                          }}
                        >
                          {khzDigits}
                        </span>
                        <span
                          className="text-3xl sm:text-4xl font-black"
                          style={{ color: state.lcdTextColor || '#000000' }}
                        >
                          .
                        </span>
                        <span
                          className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums opacity-95"
                          style={{
                            color: state.lcdTextColor || '#000000',
                            textShadow:
                              state.lcdTextColor && state.lcdTextColor !== '#000000'
                                ? `0 0 12px ${state.lcdTextColor}`
                                : '0 1px 0 rgba(255,255,255,0.25)',
                          }}
                        >
                          {subKhzDigits}
                        </span>
                        <span
                          className="text-xl sm:text-2xl font-black opacity-90"
                          style={{
                            color: state.lcdTextColor || '#000000',
                          }}
                        >
                          {hzSingleDigit}
                        </span>
                        <span
                          className="text-sm font-mono font-black uppercase ml-1.5"
                          style={{ color: state.lcdTextColor || '#000000' }}
                        >
                          MHz
                        </span>
                      </>
                    )}
                  </div>

                  <div className="text-right font-mono">
                    <div
                      className="text-sm sm:text-base font-black tabular-nums"
                      style={{ color: state.lcdTextColor || '#000000' }}
                    >
                      {(state.freqHz / 1000).toFixed(3)} kHz
                    </div>
                    <div
                      className="text-[10px] font-bold opacity-80"
                      style={{ color: state.lcdTextColor || '#080c09' }}
                    >
                      STEP:{' '}
                      {state.stepHz >= 1000
                        ? `${state.stepHz / 1000} kHz`
                        : `${state.stepHz} Hz`}
                    </div>
                  </div>
                </div>

                {/* Station Name & CAT Status Footer inside LCD Panel */}
                <div
                  className="mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
                  style={{
                    borderColor:
                      state.lcdTextColor && state.lcdTextColor !== '#000000'
                        ? `${state.lcdTextColor}33`
                        : 'rgba(0,0,0,0.25)',
                  }}
                >
                  <div className="truncate max-w-[360px]">
                    {matchedStation ? (
                      <span
                        className="font-black"
                        style={{ color: state.lcdTextColor || '#000000' }}
                      >
                        ★ {matchedStation.callsign} — {matchedStation.stationName} (
                        {matchedStation.location})
                      </span>
                    ) : (
                      <span
                        className="font-bold opacity-85"
                        style={{ color: state.lcdTextColor || '#090e0a' }}
                      >
                        VFO TUNING ·{' '}
                        {state.freqHz < 530000
                          ? 'LW / NDB BEACON'
                          : state.freqHz <= 1710000
                          ? 'MW BROADCAST'
                          : 'HF SHORTWAVE'}
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color: state.lcdTextColor || '#000000' }}
                  >
                    FTDI CAT: [{lastCatHex}]
                  </div>
                </div>
              </div>
            </div>

            {/* HORIZONTAL MODE SELECTION ROW (Matching Darker Cream Color Buttons) */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#191c21] p-2.5 rounded-xl border border-black/80 shadow">
              <div className="flex items-center gap-1.5 flex-1">
                {MODES.map((m) => {
                  const active = state.mode === m && state.powerOn;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onUpdateState({ mode: m }, 'mode')}
                      className={`flex-1 py-1.5 px-1 rounded-md border border-[#70664d] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] ${
                        active
                          ? 'bg-gradient-to-b from-[#baaE87] to-[#9e926e] border-[#554d37] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] translate-y-0.5'
                          : 'bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512]'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-1 rounded-full ${
                          active ? 'bg-emerald-600 shadow-[0_0_6px_#059669]' : 'bg-[#7a7157]'
                        }`}
                      />
                      <span className="text-[11px] font-mono font-black tracking-wider text-[#141512]">
                        {m}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* VFO / MEM Button & LOCK Button */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                <button
                  type="button"
                  onClick={onToggleVfoMem}
                  className={`py-1.5 px-2.5 rounded-md text-[11px] font-mono font-black border border-[#70664d] cursor-pointer flex items-center gap-1 shadow transition-all ${
                    state.vfoMode === 'MEM'
                      ? 'bg-gradient-to-b from-[#baaE87] to-[#9e926e] text-teal-950 border-[#554d37] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] ring-1 ring-teal-400'
                      : 'bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512]'
                  }`}
                  title="VFO / MEM: Toggle VFO & Memory Channels in active bank"
                >
                  <Radio className="w-3 h-3 text-[#141512]" />
                  <span>VFO/MEM</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateState({ dialLocked: !state.dialLocked })}
                  className={`py-1.5 px-2.5 rounded-md text-[11px] font-mono font-black border border-[#70664d] cursor-pointer flex items-center gap-1 shadow transition-all ${
                    state.dialLocked
                      ? 'bg-gradient-to-b from-[#baaE87] to-[#9e926e] text-rose-800 border-rose-800 shadow-inner'
                      : 'bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512]'
                  }`}
                  title="Dial Lock"
                >
                  {state.dialLocked ? (
                    <Lock className="w-3 h-3 text-rose-800" />
                  ) : (
                    <Unlock className="w-3 h-3 text-[#141512]" />
                  )}
                  <span>LOCK</span>
                </button>
              </div>
            </div>

            {/* ===================================================================================== */}
            {/* MAIN TUNING DIAL CLUSTER WITH VERTICAL SWITCHES NEXT TO DIAL & FINE TUNE CLARIFIER     */}
            {/* Per user requirements:                                                                */}
            {/* 1. "Place the 'Band Width', 'AGC', 'NB', and 'DIM' switches in the vacant space next   */}
            {/*    to the main tuning dial and change their orientation to Vertical"                   */}
            {/* 2. "Can you also make the fine tune dial work and tune in 1hz and 10hz incriments"    */}
            {/* ===================================================================================== */}
            <div className="bg-[#1a1c1f] p-4 rounded-xl border border-black/80 shadow flex flex-col items-center justify-center relative">
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between w-full px-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>MACHINED FLYWHEEL TUNING &amp; CONTROLS</span>
                </div>
                <span className="text-[10px] text-amber-300 font-bold">1 Hz &amp; 10 Hz FINE STEP</span>
              </div>

              {/* CLUSTER CONTAINER: VERTICAL SWITCHES BAY + MAIN DIAL + FINE TUNE (CLARIFIER) */}
              <div className="relative flex flex-wrap items-center justify-center gap-4 sm:gap-6 w-full my-1">
                {/* 1. VERTICAL SWITCHES BAY: BAND WIDTH, AGC, NB, DIM (Per user requirement) */}
                <div className="flex items-center gap-2 bg-[#121417] p-2.5 rounded-xl border border-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                  {/* SWITCH 1: BAND WIDTH (UP = WIDE, DOWN = NARROW) */}
                  <div
                    onClick={handleToggleBandwidth}
                    className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-gradient-to-b from-[#1c1f24] to-[#111316] border border-black/80 shadow-md cursor-pointer select-none hover:border-slate-600 transition-all min-w-[50px]"
                    title="BAND WIDTH: Toggle between WIDE and NARROW filter"
                  >
                    <span className="text-[8px] font-mono font-bold tracking-wider text-slate-300 uppercase mb-1">
                      BAND WIDTH
                    </span>
                    <span className={`text-[7px] font-mono font-bold transition-colors ${isWideBandwidth ? 'text-cyan-300 font-extrabold' : 'text-slate-500'}`}>
                      WIDE
                    </span>

                    {/* Vertical Switch Slot with Chrome Bat Lever */}
                    <div className="relative w-4 h-11 my-1 rounded-full bg-[#0a0c0e] border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center p-0.5">
                      <div className="w-1 h-8 rounded-full bg-black/70 shadow-inner" />
                      <div
                        className={`absolute w-3 h-4 rounded transition-all duration-150 shadow-md border border-white/40 flex items-center justify-center ${
                          isWideBandwidth
                            ? 'top-1 bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] -translate-y-0.5'
                            : 'bottom-1 bg-gradient-to-b from-[#94a3b8] to-[#475569] translate-y-0.5'
                        }`}
                      >
                        <div className="w-1.5 h-0.5 bg-black/40 rounded-full" />
                      </div>
                    </div>

                    <span className={`text-[7px] font-mono font-bold transition-colors ${!isWideBandwidth ? 'text-amber-300 font-extrabold' : 'text-slate-500'}`}>
                      NAR
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isWideBandwidth ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'}`} />
                  </div>

                  {/* SWITCH 2: AGC (UP = FAST, DOWN = SLOW) */}
                  <div
                    onClick={handleToggleAgc}
                    className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-gradient-to-b from-[#1c1f24] to-[#111316] border border-black/80 shadow-md cursor-pointer select-none hover:border-slate-600 transition-all min-w-[50px]"
                    title="AGC: Toggle between FAST and SLOW recovery"
                  >
                    <span className="text-[8px] font-mono font-bold tracking-wider text-slate-300 uppercase mb-1">
                      AGC
                    </span>
                    <span className={`text-[7px] font-mono font-bold transition-colors ${isAgcFast ? 'text-cyan-300 font-extrabold' : 'text-slate-500'}`}>
                      FAST
                    </span>

                    <div className="relative w-4 h-11 my-1 rounded-full bg-[#0a0c0e] border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center p-0.5">
                      <div className="w-1 h-8 rounded-full bg-black/70 shadow-inner" />
                      <div
                        className={`absolute w-3 h-4 rounded transition-all duration-150 shadow-md border border-white/40 flex items-center justify-center ${
                          isAgcFast
                            ? 'top-1 bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] -translate-y-0.5'
                            : 'bottom-1 bg-gradient-to-b from-[#94a3b8] to-[#475569] translate-y-0.5'
                        }`}
                      >
                        <div className="w-1.5 h-0.5 bg-black/40 rounded-full" />
                      </div>
                    </div>

                    <span className={`text-[7px] font-mono font-bold transition-colors ${!isAgcFast ? 'text-amber-300 font-extrabold' : 'text-slate-500'}`}>
                      SLOW
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isAgcFast ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-700'}`} />
                  </div>

                  {/* SWITCH 3: NB (NOISE BLANKER) (UP = ON, DOWN = OFF) */}
                  <div
                    onClick={handleToggleNb}
                    className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-gradient-to-b from-[#1c1f24] to-[#111316] border border-black/80 shadow-md cursor-pointer select-none hover:border-slate-600 transition-all min-w-[50px]"
                    title="NOISE BLANKER (NB): Toggle ON / OFF"
                  >
                    <span className="text-[8px] font-mono font-bold tracking-wider text-slate-300 uppercase mb-1">
                      NB
                    </span>
                    <span className={`text-[7px] font-mono font-bold transition-colors ${isNbOn ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}`}>
                      ON
                    </span>

                    <div className="relative w-4 h-11 my-1 rounded-full bg-[#0a0c0e] border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center p-0.5">
                      <div className="w-1 h-8 rounded-full bg-black/70 shadow-inner" />
                      <div
                        className={`absolute w-3 h-4 rounded transition-all duration-150 shadow-md border border-white/40 flex items-center justify-center ${
                          isNbOn
                            ? 'top-1 bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] -translate-y-0.5'
                            : 'bottom-1 bg-gradient-to-b from-[#94a3b8] to-[#475569] translate-y-0.5'
                        }`}
                      >
                        <div className="w-1.5 h-0.5 bg-black/40 rounded-full" />
                      </div>
                    </div>

                    <span className={`text-[7px] font-mono font-bold transition-colors ${!isNbOn ? 'text-slate-400' : 'text-slate-500'}`}>
                      OFF
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isNbOn ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-700'}`} />
                  </div>

                  {/* SWITCH 4: DIM (DIMMER) (UP = BRIGHT, DOWN = DIM) */}
                  <div
                    onClick={handleToggleDim}
                    className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-gradient-to-b from-[#1c1f24] to-[#111316] border border-black/80 shadow-md cursor-pointer select-none hover:border-slate-600 transition-all min-w-[50px]"
                    title="VFD DIMMER: Toggle between BRIGHT and DIM"
                  >
                    <span className="text-[8px] font-mono font-bold tracking-wider text-slate-300 uppercase mb-1">
                      DIM
                    </span>
                    <span className={`text-[7px] font-mono font-bold transition-colors ${isDimHigh ? 'text-amber-300 font-extrabold' : 'text-slate-500'}`}>
                      HI
                    </span>

                    <div className="relative w-4 h-11 my-1 rounded-full bg-[#0a0c0e] border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center p-0.5">
                      <div className="w-1 h-8 rounded-full bg-black/70 shadow-inner" />
                      <div
                        className={`absolute w-3 h-4 rounded transition-all duration-150 shadow-md border border-white/40 flex items-center justify-center ${
                          isDimHigh
                            ? 'top-1 bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] -translate-y-0.5'
                            : 'bottom-1 bg-gradient-to-b from-[#94a3b8] to-[#475569] translate-y-0.5'
                        }`}
                      >
                        <div className="w-1.5 h-0.5 bg-black/40 rounded-full" />
                      </div>
                    </div>

                    <span className={`text-[7px] font-mono font-bold transition-colors ${!isDimHigh ? 'text-cyan-300 font-extrabold' : 'text-slate-500'}`}>
                      LO
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isDimHigh ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-cyan-500/50'}`} />
                  </div>
                </div>

                {/* 2. MAIN MACHINED FLYWHEEL DIAL WITH SILVER OUTER RING AND SILVER CENTRE LIKE ACTUAL RADIO */}
                <div
                  ref={dialRef}
                  onPointerDown={handleDialPointerDown}
                  onPointerMove={handleDialPointerMove}
                  onPointerUp={handleDialPointerUp}
                  onWheel={handleDialWheel}
                  className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full p-1 sm:p-1.5 bg-gradient-to-br from-[#e6eaef] via-[#a8b1bf] to-[#58606e] border-2 border-black shadow-[0_12px_28px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.85)] flex items-center justify-center transition-all ${
                    state.dialLocked
                      ? 'cursor-not-allowed opacity-80'
                      : 'cursor-grab active:cursor-grabbing hover:shadow-[0_0_24px_rgba(255,255,255,0.2)]'
                  }`}
                  title="Main VFO Flywheel Tuning Dial: Drag to rotate or use mouse wheel (silver outer ring & silver centre like actual radio)"
                >
                  {/* Concentric Silver Beveled Collar Ring */}
                  <div className="w-full h-full rounded-full bg-gradient-to-b from-[#9aa1ae] to-[#454b55] p-1 border border-white/30 shadow-inner flex items-center justify-center">
                    {/* Rotating Knurled Rotor Body */}
                    <div
                      className="relative w-full h-full rounded-full bg-gradient-to-tr from-[#25282d] via-[#1a1c20] to-[#0d0e11] border border-black/80 shadow-inner flex items-center justify-center select-none"
                      style={{
                        transform: `rotate(${dialAngle}deg)`,
                        transition: isDraggingDial ? 'none' : 'transform 0.05s ease-out',
                      }}
                    >
                      {/* Knurled Outer Rubber Rim Grips */}
                      <div className="absolute inset-1 rounded-full border-4 border-[#32363e] border-dashed opacity-60" />

                      {/* Finger Dimple for Rapid Spinning */}
                      <div className="absolute top-1.5 sm:top-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#181a1d] to-[#2a2d33] border border-white/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-[#121416] shadow-inner border border-black/80" />
                      </div>

                      {/* AUTHENTIC SILVER CENTRE CAP / HUB LIKE ACTUAL RADIO */}
                      <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-[#f1f4f8] via-[#bcc4d0] to-[#5c6472] border border-black/80 shadow-[0_3px_6px_rgba(0,0,0,0.8),inset_0_1.5px_2px_rgba(255,255,255,0.9)] flex items-center justify-center z-10">
                        {/* Lathe-Turned Spun Silver Disc */}
                        <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#d4d9e2] via-[#eef2f7] to-[#99a2b0] border border-white/50 shadow-inner flex items-center justify-center">
                          {/* Center Aluminum Spindle Pin */}
                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#8c94a2] to-[#3a3f47] border border-black/80 shadow-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. FINE TUNE DIAL (CLARIFIER) WITH 1 Hz & 10 Hz DIRECT TUNING CONTROLS */}
                {/* Per user specification: "redo the fine tune dial with a silver outer ring same as the dials on the right side" */}
                <div className="flex flex-col items-center gap-2 bg-[#121417] p-2.5 rounded-xl border border-white/10 shadow-lg min-w-[130px]">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] font-mono font-bold tracking-wider text-slate-300">
                      FINE TUNE
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-300 tabular-nums">
                      {state.clarifierHz >= 0 ? `+${state.clarifierHz}` : state.clarifierHz} Hz
                    </span>
                  </div>

                  {/* Fine Dial Knob + Step Indicator */}
                  <div className="flex items-center gap-3">
                    <div
                      onPointerDown={handleFineDialPointerDown}
                      onWheel={(e) => {
                        e.preventDefault();
                        const dir = e.deltaY < 0 ? 1 : -1;
                        handleFineTune(dir * fineTuneStep);
                      }}
                      className="cursor-ns-resize group select-none"
                      title={`Drag up/down or mouse wheel to fine tune in ${fineTuneStep} Hz increments`}
                    >
                      {/* Silver Outer Ring matching right side front panel dials */}
                      <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#d4d8e0] via-[#9da3af] to-[#5a606d] border border-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center group-hover:ring-1 group-hover:ring-cyan-400/50 transition-all">
                        <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-b from-[#8f96a3] to-[#454a54] border border-white/20 shadow-inner flex items-center justify-center">
                          <div
                            className="w-7 h-7 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner flex items-center justify-center"
                            style={{
                              transform: `rotate(${((state.clarifierHz || 0) / 990) * 180}deg)`,
                            }}
                          >
                            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 1 Hz vs 10 Hz Step Toggle */}
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setFineTuneStep(1)}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer transition-all border ${
                          fineTuneStep === 1
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_6px_#06b6d4]'
                            : 'bg-[#20242b] text-slate-400 border-black hover:text-white'
                        }`}
                        title="Set Fine Tune Dial to 1 Hz increments"
                      >
                        1 Hz
                      </button>

                      <button
                        type="button"
                        onClick={() => setFineTuneStep(10)}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer transition-all border ${
                          fineTuneStep === 10
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_6px_#f59e0b]'
                            : 'bg-[#20242b] text-slate-400 border-black hover:text-white'
                        }`}
                        title="Set Fine Tune Dial to 10 Hz increments"
                      >
                        10 Hz
                      </button>
                    </div>
                  </div>

                  {/* Quick Nudge & Reset Buttons */}
                  <div className="grid grid-cols-4 gap-1 w-full pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleFineTune(-10)}
                      className="px-1 py-0.5 rounded bg-[#20242b] hover:bg-[#2c323c] text-[8px] font-mono font-bold text-amber-300 border border-black cursor-pointer text-center"
                      title="Tune -10 Hz"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFineTune(-1)}
                      className="px-1 py-0.5 rounded bg-[#20242b] hover:bg-[#2c323c] text-[8px] font-mono font-bold text-cyan-300 border border-black cursor-pointer text-center"
                      title="Tune -1 Hz"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFineTune(1)}
                      className="px-1 py-0.5 rounded bg-[#20242b] hover:bg-[#2c323c] text-[8px] font-mono font-bold text-cyan-300 border border-black cursor-pointer text-center"
                      title="Tune +1 Hz"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFineTune(10)}
                      className="px-1 py-0.5 rounded bg-[#20242b] hover:bg-[#2c323c] text-[8px] font-mono font-bold text-amber-300 border border-black cursor-pointer text-center"
                      title="Tune +10 Hz"
                    >
                      +10
                    </button>
                  </div>

                  {/* Reset Clarifier / Offset to 0 */}
                  <button
                    type="button"
                    onClick={() => onUpdateState({ clarifierHz: 0 })}
                    className="w-full py-0.5 rounded bg-[#20242b] hover:bg-[#2c323c] text-[8px] font-mono font-bold text-slate-300 border border-black cursor-pointer text-center"
                    title="Reset Fine Clarifier to 0 Hz"
                  >
                    RESET (0 Hz)
                  </button>
                </div>
              </div>

              {/* TUNING BUTTONS ROW 1: Up / Down Tuning Buttons (Centered) */}
              <div className="grid grid-cols-4 gap-2 w-full max-w-md mt-3">
                <button
                  type="button"
                  onMouseDown={() => startTuningHold(-state.stepHz * 10)}
                  onMouseUp={stopTuningHold}
                  onMouseLeave={stopTuningHold}
                  onTouchStart={() => startTuningHold(-state.stepHz * 10)}
                  onTouchEnd={stopTuningHold}
                  className="py-2 rounded-lg bg-gradient-to-b from-[#34383e] to-[#202327] hover:from-[#3e444b] hover:to-[#26292d] active:from-[#1b1d21] active:to-[#121315] border border-black shadow text-xs font-mono font-bold text-amber-300 cursor-pointer flex items-center justify-center"
                  title="Fast Tune Down (Hold down for rapid scan)"
                >
                  &lt;&lt; FAST DN
                </button>

                <button
                  type="button"
                  onMouseDown={() => startTuningHold(-state.stepHz)}
                  onMouseUp={stopTuningHold}
                  onMouseLeave={stopTuningHold}
                  onTouchStart={() => startTuningHold(-state.stepHz)}
                  onTouchEnd={stopTuningHold}
                  className="py-2 rounded-lg bg-gradient-to-b from-[#34383e] to-[#202327] hover:from-[#3e444b] hover:to-[#26292d] active:from-[#1b1d21] active:to-[#121315] border border-black shadow text-xs font-mono font-bold text-slate-200 cursor-pointer flex items-center justify-center"
                  title="Slow Tune Down"
                >
                  &lt; SLOW DN
                </button>

                <button
                  type="button"
                  onMouseDown={() => startTuningHold(state.stepHz)}
                  onMouseUp={stopTuningHold}
                  onMouseLeave={stopTuningHold}
                  onTouchStart={() => startTuningHold(state.stepHz)}
                  onTouchEnd={stopTuningHold}
                  className="py-2 rounded-lg bg-gradient-to-b from-[#34383e] to-[#202327] hover:from-[#3e444b] hover:to-[#26292d] active:from-[#1b1d21] active:to-[#121315] border border-black shadow text-xs font-mono font-bold text-slate-200 cursor-pointer flex items-center justify-center"
                  title="Slow Tune Up"
                >
                  SLOW UP &gt;
                </button>

                <button
                  type="button"
                  onMouseDown={() => startTuningHold(state.stepHz * 10)}
                  onMouseUp={stopTuningHold}
                  onMouseLeave={stopTuningHold}
                  onTouchStart={() => startTuningHold(state.stepHz * 10)}
                  onTouchEnd={stopTuningHold}
                  className="py-2 rounded-lg bg-gradient-to-b from-[#34383e] to-[#202327] hover:from-[#3e444b] hover:to-[#26292d] active:from-[#1b1d21] active:to-[#121315] border border-black shadow text-xs font-mono font-bold text-amber-300 cursor-pointer flex items-center justify-center"
                  title="Fast Tune Up (Hold down for rapid scan)"
                >
                  FAST UP &gt;&gt;
                </button>
              </div>

              {/* TUNING BUTTONS ROW 2: Frequency Step Buttons (1Hz .. 1MHz, Centered) */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 w-full">
                {STEP_OPTIONS.map((opt) => {
                  const active = state.stepHz === opt.hz;
                  return (
                    <button
                      key={opt.hz}
                      type="button"
                      onClick={() => onUpdateState({ stepHz: opt.hz })}
                      className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold border border-black cursor-pointer transition-all ${
                        active
                          ? 'bg-gradient-to-b from-[#0f766e] to-[#115e59] text-teal-200 border-teal-400/50 shadow-[0_0_8px_rgba(20,184,166,0.3)]'
                          : 'bg-gradient-to-b from-[#2a2d33] to-[#1c1e22] text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. RIGHT COLUMN: AUTHENTIC YAESU FRG-8800 CONTROLS (MATCHES IMAGE 1 PHOTO) */}
          {/* Top: Timer/Set buttons (Left) + Display Select Rotary Switch (Right)       */}
          {/* Middle: Numeric Keypad (Left, 7 8 9 / 4 5 6 / 1 2 3 / 0 MHz kHz)           */}
          {/*         + Memory & Scan Buttons (Right, Charcoal Grey with White Labels)    */}
          {/* Bottom: M CH Switch (Left, 1-6 & 7-12) + ATT Switch (Right, OFF/MIN to DX) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 h-full flex flex-col justify-between gap-3 sm:gap-3.5 bg-gradient-to-b from-[#3e444e] via-[#373c45] to-[#31363e] p-3 sm:p-3.5 pb-2.5 sm:pb-3 rounded-2xl border border-[#4d535f]/90">
            {/* --------------------------------------------------------------------- */}
            {/* TOP DECK: TIMER / SET CONTROLS (LEFT) + DISPLAY SELECT ROTARY (RIGHT) */}
            {/* Matching Face Panel Grey Subpanel                                     */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-b from-[#2e333b] via-[#262930] to-[#1f2227] border border-[#4d535f]/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] flex flex-row items-center justify-between gap-2 select-none w-full flex-shrink-0">
              {/* LEFT HALF: 2x2 TIMER & SET BUTTONS */}
              <div className="flex-1 flex flex-col justify-between pr-2 border-r border-[#4d535f]/70">
                {/* 1. TIMER Section */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 w-full">
                    <div className="h-[1px] bg-slate-400/60 flex-1" />
                    <span className="text-[9px] font-mono font-bold tracking-widest text-slate-200 uppercase">
                      TIMER
                    </span>
                    <div className="h-[1px] bg-slate-400/60 flex-1" />
                  </div>
                  {/* Sublabels: ON (boxed) & CLEAR */}
                  <div className="grid grid-cols-2 gap-2 text-center items-end py-0.5">
                    <div className="flex justify-center">
                      <span className="border border-slate-300/80 px-1 py-0.2 rounded-xs text-[8px] font-mono font-bold text-slate-200">
                        ON
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <span className="text-[8px] font-mono font-bold text-slate-200">
                        CLEAR
                      </span>
                    </div>
                  </div>
                  {/* Buttons Row 1 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState({ clockMode: 'TIMER', displaySelect: 'SLEEP' })
                      }
                      className="h-6 sm:h-6.5 w-full rounded-sm bg-gradient-to-b from-[#dfd7bd] via-[#d2c8aa] to-[#baae8d] hover:from-[#e8e0c8] border border-[#766c54] shadow-[0_2px_3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.45)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                      title="Timer ON"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        startTimestampRef.current = Date.now();
                        onUpdateState({ clockMode: 'AEST', displaySelect: 'FREQ' });
                      }}
                      className="h-6 sm:h-6.5 w-full rounded-sm bg-gradient-to-b from-[#dfd7bd] via-[#d2c8aa] to-[#baae8d] hover:from-[#e8e0c8] border border-[#766c54] shadow-[0_2px_3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.45)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                      title="Clear Timer"
                    />
                  </div>
                </div>

                {/* 2. SET Section */}
                <div className="flex flex-col gap-0.5 mt-2">
                  <div className="flex items-center gap-1.5 w-full">
                    <div className="h-[1px] bg-slate-400/60 flex-1" />
                    <span className="text-[9px] font-mono font-bold tracking-widest text-slate-200 uppercase">
                      SET
                    </span>
                    <div className="h-[1px] bg-slate-400/60 flex-1" />
                  </div>
                  {/* Sublabels: HOUR & TIME */}
                  <div className="grid grid-cols-2 gap-2 text-center items-end py-0.5">
                    <div className="flex justify-center">
                      <span className="text-[8px] font-mono font-bold text-slate-200">
                        HOUR
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <span className="text-[8px] font-mono font-bold text-slate-200">
                        TIME
                      </span>
                    </div>
                  </div>
                  {/* Buttons Row 2 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState({
                          clockMode: state.clockMode === 'UTC' ? 'AEST' : 'UTC',
                        })
                      }
                      className="h-6 sm:h-6.5 w-full rounded-sm bg-gradient-to-b from-[#dfd7bd] via-[#d2c8aa] to-[#baae8d] hover:from-[#e8e0c8] border border-[#766c54] shadow-[0_2px_3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.45)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                      title="Advance Hour"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState({
                          clockMode: state.clockMode === 'AEST' ? 'UTC' : 'AEST',
                        })
                      }
                      className="h-6 sm:h-6.5 w-full rounded-sm bg-gradient-to-b from-[#dfd7bd] via-[#d2c8aa] to-[#baae8d] hover:from-[#e8e0c8] border border-[#766c54] shadow-[0_2px_3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.45)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                      title="Toggle Time (UTC / AEST)"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT HALF: DISPLAY SELECT ROTARY SWITCH (POINTER KNOB WITH AUTHENTIC SILKSCREEN) */}
              <div
                className="w-[140px] sm:w-[155px] h-[115px] relative flex items-center justify-center select-none"
                title="DISPLAY SELECT: Click label or scroll wheel to rotate switch"
              >
                {/* Dial Center is at (70, 58) */}
                {/* 1. FREQ (Top 12 o'clock) */}
                <button
                  type="button"
                  onClick={() => handleSelectDisplayMode('FREQ')}
                  className={`absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold tracking-wider cursor-pointer transition-colors ${
                    currentDisplaySelect === 'FREQ'
                      ? 'text-amber-300 font-black drop-shadow-[0_0_4px_#f59e0b]'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  FREQ
                </button>
                {/* Tick under FREQ */}
                <span className="absolute top-4 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-slate-300/80" />

                {/* 2. CLOCK 1 (~10:45) */}
                <button
                  type="button"
                  onClick={() => handleSelectDisplayMode('CLOCK1')}
                  className={`absolute top-2 left-2 text-[8px] font-mono font-bold tracking-wider cursor-pointer transition-colors ${
                    currentDisplaySelect === 'CLOCK1'
                      ? 'text-amber-300 font-black drop-shadow-[0_0_4px_#f59e0b]'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  CLOCK 1
                </button>
                {/* Radial Tick CLOCK 1 */}
                <span
                  className="absolute top-7 left-12 w-[1px] h-2.5 bg-slate-300/80 origin-bottom"
                  style={{ transform: 'rotate(-45deg)' }}
                />

                {/* 3. CLOCK 2 (~1:45) */}
                <button
                  type="button"
                  onClick={() => handleSelectDisplayMode('CLOCK2')}
                  className={`absolute top-2 right-2 text-[8px] font-mono font-bold tracking-wider cursor-pointer transition-colors ${
                    currentDisplaySelect === 'CLOCK2'
                      ? 'text-amber-300 font-black drop-shadow-[0_0_4px_#f59e0b]'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  CLOCK 2
                </button>
                {/* Radial Tick CLOCK 2 */}
                <span
                  className="absolute top-7 right-12 w-[1px] h-2.5 bg-slate-300/80 origin-bottom"
                  style={{ transform: 'rotate(45deg)' }}
                />

                {/* 4. ON (Boxed, ~9:45) */}
                <button
                  type="button"
                  onClick={() => handleSelectDisplayMode('ON')}
                  className={`absolute top-10 left-3 border px-1 py-0.2 rounded-xs text-[7.5px] font-mono font-bold cursor-pointer transition-colors ${
                    currentDisplaySelect === 'ON'
                      ? 'text-amber-300 border-amber-400 font-black drop-shadow-[0_0_4px_#f59e0b]'
                      : 'text-slate-200 border-slate-300/80 hover:text-white'
                  }`}
                >
                  ON
                </button>
                {/* Radial Tick ON */}
                <span
                  className="absolute top-12 left-10 w-2.5 h-[1px] bg-slate-300/80"
                  style={{ transform: 'rotate(-15deg)' }}
                />

                {/* 5. OFF (Boxed, ~8:15) */}
                <button
                  type="button"
                  onClick={() => handleSelectDisplayMode('OFF')}
                  className={`absolute top-17 left-2 border px-1 py-0.2 rounded-xs text-[7.5px] font-mono font-bold cursor-pointer transition-colors ${
                    currentDisplaySelect === 'OFF'
                      ? 'text-amber-300 border-amber-400 font-black drop-shadow-[0_0_4px_#f59e0b]'
                      : 'text-slate-200 border-slate-300/80 hover:text-white'
                  }`}
                >
                  OFF
                </button>
                {/* Radial Tick OFF */}
                <span
                  className="absolute top-19 left-11 w-2.5 h-[1px] bg-slate-300/80"
                  style={{ transform: 'rotate(20deg)' }}
                />

                {/* 6. SLEEP (~7 o'clock) */}
                <button
                  type="button"
                  onClick={() => handleSelectDisplayMode('SLEEP')}
                  className={`absolute bottom-0 left-2 text-[8px] font-mono font-bold tracking-wider cursor-pointer transition-colors ${
                    currentDisplaySelect === 'SLEEP'
                      ? 'text-amber-300 font-black drop-shadow-[0_0_4px_#f59e0b]'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  SLEEP
                </button>
                {/* Radial Tick SLEEP */}
                <span
                  className="absolute bottom-4 left-14 w-[1px] h-2.5 bg-slate-300/80 origin-top"
                  style={{ transform: 'rotate(35deg)' }}
                />

                {/* CENTER KNOB: Pointer Knob with Silver Beveled Skirt */}
                <div
                  onWheel={(e) => {
                    e.preventDefault();
                    const curIdx = DISPLAY_SELECT_OPTIONS.findIndex(
                      (o) => o.id === currentDisplaySelect
                    );
                    const nextIdx = Math.max(
                      0,
                      Math.min(
                        DISPLAY_SELECT_OPTIONS.length - 1,
                        curIdx + (e.deltaY < 0 ? 1 : -1)
                      )
                    );
                    handleSelectDisplayMode(DISPLAY_SELECT_OPTIONS[nextIdx].id);
                  }}
                  className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#d4d8e0] via-[#9da3af] to-[#5a606d] border border-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center cursor-pointer mt-3"
                  title="DISPLAY SELECT Switch: Scroll wheel or click surrounding labels"
                >
                  {/* Concentric silver inner ring */}
                  <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-b from-[#8f96a3] to-[#454a54] border border-white/20 shadow-inner flex items-center justify-center">
                    {/* Rotating Pointer Head */}
                    <div
                      className="w-7 h-7 relative flex items-center justify-center transition-transform duration-150"
                      style={{
                        transform: `rotate(${currentDisplayAngle}deg)`,
                      }}
                    >
                      {/* Teardrop Pointer Body */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-6 bg-gradient-to-b from-[#1b1c20] to-[#0d0e10] rounded-t-full rounded-b-md shadow-md border border-black/80 flex items-start justify-center pt-0.5">
                        {/* White indicator line on pointer */}
                        <span className="w-0.5 h-3.5 bg-white rounded-full shadow-[0_0_2px_#ffffff]" />
                      </div>
                      {/* Center Hub */}
                      <div className="w-4 h-4 rounded-full bg-gradient-to-b from-[#2a2d33] to-[#121316] border border-black relative z-10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* MIDDLE DECK: NUMERIC KEYPAD (LEFT) + MEMORY & SCAN BUTTONS (RIGHT)     */}
            {/* Keypad: 4 Rows x 3 Cols (7 8 9 / 4 5 6 / 1 2 3 / 0 MHz kHz)          */}
            {/* Memory: 2 Cols x 4 Rows + Wide VFO (Dark Grey with White Labels Above) */}
            {/* Matching Face Panel Grey Subpanel - Expanded to close vertical gap    */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-3 sm:p-4 py-3.5 sm:py-4.5 rounded-xl bg-gradient-to-b from-[#2e333b] via-[#262930] to-[#1f2227] border border-[#4d535f]/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] flex flex-row items-stretch justify-between gap-3 select-none flex-1 min-h-[420px]">
              {/* LEFT HALF: 3-COL NUMERIC KEYPAD */}
              <div className="flex-1 flex flex-col justify-between pr-2.5 border-r border-[#4d535f]/70">
                {/* Buffer status banner if user is actively entering a frequency */}
                {keypadBuffer ? (
                  <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-amber-950/90 border border-amber-500/70 flex flex-wrap items-center justify-between gap-1 text-xs font-mono font-bold animate-in fade-in duration-100 shadow-md">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-amber-400 text-[10px] uppercase tracking-wider font-extrabold">ENTRY:</span>
                      <span className="text-white text-base font-black tracking-widest">{keypadBuffer}_</span>
                      {previewFreqHz && (
                        <span className="text-cyan-300 text-[11px] font-bold">
                          &rarr; {(previewFreqHz / 1000).toFixed(3)} kHz
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('ENT')}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-black cursor-pointer shadow-xs"
                        title="Tune directly to this frequency"
                      >
                        ENT
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('kHz')}
                        className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[10px] font-black cursor-pointer shadow-xs"
                        title="Commit in kHz (e.g. 7100 -> 7100 kHz)"
                      >
                        kHz
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('MHz')}
                        className="px-1.5 py-0.5 rounded bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-[10px] font-black cursor-pointer shadow-xs"
                        title="Commit in MHz (e.g. 7.1 -> 7.1 MHz)"
                      >
                        MHz
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('CE')}
                        className="px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 active:scale-95 text-rose-200 border border-rose-500/50 text-[10px] font-bold cursor-pointer"
                        title="Clear Entry"
                      >
                        CE
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Row 1: 7, 8, 9 */}
                <div className="flex flex-col gap-0.5">
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {['7', '8', '9'].map((n) => (
                      <span key={`lbl-${n}`} className="text-[8px] font-mono font-bold text-slate-300">
                        {n}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['7', '8', '9'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleKeypadPress(n)}
                        className={`h-8 sm:h-8.5 rounded-sm bg-gradient-to-b from-[#e5dcbe] via-[#d6ccaa] to-[#baa983] hover:from-[#f0e7cb] border border-[#6f644b] text-[#1c1810] font-black font-mono text-xs sm:text-sm shadow-[0_2px_3px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.7)] cursor-pointer active:translate-y-0.5 active:shadow-inner flex items-center justify-center transition-all select-none ${
                          activeKey === n ? 'ring-2 ring-amber-400 brightness-125 translate-y-0.5 shadow-inner' : ''
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 2: 4, 5, 6 */}
                <div className="flex flex-col gap-0.5 mt-1 sm:mt-1.5">
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {['4', '5', '6'].map((n) => (
                      <span key={`lbl-${n}`} className="text-[8px] font-mono font-bold text-slate-300">
                        {n}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['4', '5', '6'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleKeypadPress(n)}
                        className={`h-8 sm:h-8.5 rounded-sm bg-gradient-to-b from-[#e5dcbe] via-[#d6ccaa] to-[#baa983] hover:from-[#f0e7cb] border border-[#6f644b] text-[#1c1810] font-black font-mono text-xs sm:text-sm shadow-[0_2px_3px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.7)] cursor-pointer active:translate-y-0.5 active:shadow-inner flex items-center justify-center transition-all select-none ${
                          activeKey === n ? 'ring-2 ring-amber-400 brightness-125 translate-y-0.5 shadow-inner' : ''
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 3: 1, 2, 3 */}
                <div className="flex flex-col gap-0.5 mt-1 sm:mt-1.5">
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {['1', '2', '3'].map((n) => (
                      <span key={`lbl-${n}`} className="text-[8px] font-mono font-bold text-slate-300">
                        {n}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleKeypadPress(n)}
                        className={`h-8 sm:h-8.5 rounded-sm bg-gradient-to-b from-[#e5dcbe] via-[#d6ccaa] to-[#baa983] hover:from-[#f0e7cb] border border-[#6f644b] text-[#1c1810] font-black font-mono text-xs sm:text-sm shadow-[0_2px_3px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.7)] cursor-pointer active:translate-y-0.5 active:shadow-inner flex items-center justify-center transition-all select-none ${
                          activeKey === n ? 'ring-2 ring-amber-400 brightness-125 translate-y-0.5 shadow-inner' : ''
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 4: 0, MHz (Orange), kHz (Blue) */}
                <div className="flex flex-col gap-0.5 mt-1 sm:mt-1.5">
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <span className="text-[8px] font-mono font-bold text-slate-300">0</span>
                    <span className="text-[8px] font-mono font-bold text-orange-400">MHz</span>
                    <span className="text-[8px] font-mono font-bold text-blue-400">kHz</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* 0 (Beige) */}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      className={`h-8 sm:h-8.5 rounded-sm bg-gradient-to-b from-[#e5dcbe] via-[#d6ccaa] to-[#baa983] hover:from-[#f0e7cb] border border-[#6f644b] text-[#1c1810] font-black font-mono text-xs sm:text-sm shadow-[0_2px_3px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.7)] cursor-pointer active:translate-y-0.5 active:shadow-inner flex items-center justify-center transition-all select-none ${
                        activeKey === '0' ? 'ring-2 ring-amber-400 brightness-125 translate-y-0.5 shadow-inner' : ''
                      }`}
                    >
                      0
                    </button>
                    {/* MHz (Vibrant Amber Orange) */}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('MHz')}
                      className={`h-8 sm:h-8.5 rounded-sm bg-gradient-to-b from-[#f97316] via-[#ea580c] to-[#c2410c] hover:from-[#fb923c] border border-[#9a3412] text-white font-black font-mono text-xs shadow-[0_2px_3px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.45)] cursor-pointer active:translate-y-0.5 active:shadow-inner flex items-center justify-center transition-all select-none ${
                        activeKey === 'MHz' ? 'ring-2 ring-white brightness-125 translate-y-0.5 shadow-inner' : ''
                      }`}
                      title="Commit entry in MHz (e.g. 14 -> 14.000 MHz)"
                    >
                      MHz
                    </button>
                    {/* kHz (Vibrant Cobalt Blue) */}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('kHz')}
                      className={`h-8 sm:h-8.5 rounded-sm bg-gradient-to-b from-[#3b82f6] via-[#2563eb] to-[#1d4ed8] hover:from-[#60a5fa] border border-[#1e40af] text-white font-black font-mono text-xs shadow-[0_2px_3px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.45)] cursor-pointer active:translate-y-0.5 active:shadow-inner flex items-center justify-center transition-all select-none ${
                        activeKey === 'kHz' ? 'ring-2 ring-white brightness-125 translate-y-0.5 shadow-inner' : ''
                      }`}
                      title="Commit entry in kHz (e.g. 612 -> 612.000 kHz)"
                    >
                      kHz
                    </button>
                  </div>
                </div>

                {/* Row 5: Quick Utility Keys [. Dot, CE Clear, ENT Enter] */}
                <div className="flex flex-col gap-0.5 mt-1.5 pt-1.5 border-t border-[#4d535f]/70">
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <span className="text-[7.5px] font-mono font-bold text-cyan-400">DOT</span>
                    <span className="text-[7.5px] font-mono font-bold text-amber-400">CLEAR</span>
                    <span className="text-[7.5px] font-mono font-bold text-emerald-400">ENTER</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('.')}
                      className={`h-6.5 sm:h-7 rounded-sm bg-[#222730] hover:bg-[#2d3440] active:bg-[#1a1e24] border border-[#3e4655] text-cyan-300 font-black font-mono text-xs cursor-pointer active:translate-y-0.5 flex items-center justify-center transition-all ${
                        activeKey === '.' ? 'ring-2 ring-cyan-400 brightness-125 translate-y-0.5' : ''
                      }`}
                      title="Decimal Point (e.g. 7.1 MHz)"
                    >
                      .
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('CE')}
                      className={`h-6.5 sm:h-7 rounded-sm bg-[#222730] hover:bg-[#2d3440] active:bg-[#1a1e24] border border-[#3e4655] text-amber-300 font-black font-mono text-[10px] cursor-pointer active:translate-y-0.5 flex items-center justify-center transition-all ${
                        activeKey === 'CE' ? 'ring-2 ring-amber-400 brightness-125 translate-y-0.5' : ''
                      }`}
                      title="Clear Entry (Backspace/Reset)"
                    >
                      CE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('ENT')}
                      className={`h-6.5 sm:h-7 rounded-sm bg-[#222730] hover:bg-[#2d3440] active:bg-[#1a1e24] border border-[#3e4655] text-emerald-300 font-black font-mono text-[10px] cursor-pointer active:translate-y-0.5 flex items-center justify-center transition-all ${
                        activeKey === 'ENT' ? 'ring-2 ring-emerald-400 brightness-125 translate-y-0.5' : ''
                      }`}
                      title="Direct Enter (Auto-tune entry)"
                    >
                      ENT
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT HALF: 2-COL MEMORY & SCAN BUTTONS + WIDE VFO */}
              {/* Dark Charcoal Grey buttons with White Silkscreen Labels Above */}
              <div className="w-[140px] sm:w-[155px] flex flex-col justify-between">
                {/* Row 1: M SELECT & M > VFO */}
                <div className="flex flex-col gap-0.5">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <span className="text-[8px] font-mono font-bold text-slate-200 truncate">
                      M SELECT
                    </span>
                    <span className="text-[8px] font-mono font-bold text-slate-200 truncate">
                      M &gt; VFO
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onStepMemoryChannel(1)}
                      className="h-6.5 sm:h-7.5 rounded-xs bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-2 border-[#788599] shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f]"
                      title="M Select (Advance Memory Channel)"
                    />
                    <button
                      type="button"
                      onClick={handleMemToVfo}
                      className="h-6.5 sm:h-7.5 rounded-xs bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-2 border-[#788599] shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f]"
                      title="M > VFO (Transfer Memory Channel to VFO)"
                    />
                  </div>
                </div>

                {/* Row 2: P SCAN & PAUSE */}
                <div className="flex flex-col gap-0.5 mt-1.5 sm:mt-2">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <span className="text-[8px] font-mono font-bold text-slate-200 truncate">
                      P SCAN
                    </span>
                    <span className="text-[8px] font-mono font-bold text-slate-200 truncate">
                      PAUSE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onTriggerScan}
                      className={`h-6.5 sm:h-7.5 rounded-xs border-2 shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f] ${
                        isScanning
                          ? 'bg-amber-500 animate-pulse border-amber-300'
                          : 'bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-[#788599]'
                      }`}
                      title="P Scan (Programmed Scan)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (isScanning) onTriggerScan();
                      }}
                      className="h-6.5 sm:h-7.5 rounded-xs bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-2 border-[#788599] shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f]"
                      title="Pause Scan"
                    />
                  </div>
                </div>

                {/* Row 3: M SCAN & S SCAN */}
                <div className="flex flex-col gap-0.5 mt-1.5 sm:mt-2">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <span className="text-[8px] font-mono font-bold text-slate-200 truncate">
                      M SCAN
                    </span>
                    <span className="text-[8px] font-mono font-bold text-slate-200 truncate">
                      S SCAN
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onTriggerScan}
                      className="h-6.5 sm:h-7.5 rounded-xs bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-2 border-[#788599] shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f]"
                      title="M Scan (Memory Scan)"
                    />
                    <button
                      type="button"
                      onClick={onTriggerScan}
                      className="h-6.5 sm:h-7.5 rounded-xs bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-2 border-[#788599] shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f]"
                      title="S Scan (Search Scan)"
                    />
                  </div>
                </div>

                {/* Row 4: MR & VFO > M */}
                <div className="flex flex-col gap-0.5 mt-1.5 sm:mt-2">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <span className="text-[8px] font-mono font-bold text-slate-200 truncate">
                      MR
                    </span>
                    <span className="text-[8px] font-mono font-bold text-slate-200 truncate">
                      VFO &gt; M
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onToggleVfoMem}
                      className={`h-6.5 sm:h-7.5 rounded-xs border-2 shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f] ${
                        state.vfoMode === 'MEM'
                          ? 'bg-gradient-to-b from-[#1b434a] to-[#0f2a2e] border-teal-300 ring-1 ring-cyan-400/50'
                          : 'bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-[#788599]'
                      }`}
                      title="MR (Memory Recall / Step)"
                    />
                    <button
                      type="button"
                      onClick={handleVfoToMem}
                      className="h-6.5 sm:h-7.5 rounded-xs bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-2 border-[#788599] shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f]"
                      title="VFO > M (Store VFO to Memory)"
                    />
                  </div>
                </div>

                {/* Row 5: Full Width VFO Button */}
                <div className="flex flex-col gap-0.5 mt-1.5 sm:mt-2">
                  <div className="text-center">
                    <span className="text-[8px] font-mono font-bold text-slate-200">
                      VFO
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateState({ vfoMode: 'VFO' })}
                    className={`w-full h-6.5 sm:h-7.5 rounded-xs border-2 shadow-[0_2px_4px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 outline-1 outline-[#181a1f] ${
                      state.vfoMode === 'VFO'
                        ? 'bg-gradient-to-b from-[#4d535f] to-[#343841] border-cyan-400 ring-1 ring-cyan-400/50'
                        : 'bg-gradient-to-b from-[#3a3f47] via-[#2c3037] to-[#1f2227] hover:from-[#454a53] border-[#788599]'
                    }`}
                    title="VFO Mode"
                  />
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* BOTTOM DECK: M CH (LEFT, 1-6 & 7-12) + ATT (RIGHT, MIN/OFF TO DX)      */}
            {/* Moved down and aligned with bottom of face panel (matches speaker deck)*/}
            {/* Matching Face Panel Grey Subpanel                                     */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-3 rounded-xl bg-gradient-to-b from-[#2e333b] via-[#262930] to-[#1f2227] border border-[#4d535f]/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] flex flex-row items-center justify-between gap-3 select-none flex-shrink-0 w-full">
              {/* 1. M CH ROTARY SWITCH (Header: ─── M CH ───, Left: 1..6, Right: 7..12) */}
              <div
                className="flex-1 flex flex-col items-center select-none"
                title="M CH: Select Memory Channel 1-12 (opens and tunes to linked memory bank)"
              >
                {/* Header Line ─── M CH ─── */}
                <div className="flex items-center gap-1.5 w-full mb-1">
                  <div className="h-[1px] bg-slate-400/60 flex-1" />
                  <span className="text-[9px] font-mono font-bold tracking-widest text-slate-200 uppercase">
                    M CH
                  </span>
                  <div className="h-[1px] bg-slate-400/60 flex-1" />
                </div>

                <div className="relative w-full h-[85px] flex items-center justify-between px-2">
                  {/* Left Column: Channels 6, 5, 4, 3, 2, 1 with horizontal tick marks */}
                  <div className="flex flex-col justify-between h-full py-0.5">
                    {[6, 5, 4, 3, 2, 1].map((ch) => {
                      const active = state.memoryChannel === ch;
                      return (
                        <div
                          key={ch}
                          onClick={() => handleSelectMCh(ch)}
                          className="flex items-center gap-1 cursor-pointer group"
                        >
                          <span
                            className={`text-[8px] font-mono font-bold transition-colors w-3 text-right ${
                              active
                                ? 'text-amber-300 font-black drop-shadow-[0_0_3px_#f59e0b]'
                                : 'text-slate-300 group-hover:text-white'
                            }`}
                          >
                            {ch}
                          </span>
                          <span
                            className={`w-3.5 h-[1px] transition-colors ${
                              active ? 'bg-amber-400' : 'bg-slate-400/60 group-hover:bg-slate-200'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Center Rotary Knob (Silver Skirt with Pointer Knob) */}
                  <div
                    onWheel={(e) => {
                      e.preventDefault();
                      const dir = e.deltaY < 0 ? 1 : -1;
                      const nextCh = Math.max(
                        1,
                        Math.min(12, state.memoryChannel + dir)
                      );
                      handleSelectMCh(nextCh);
                    }}
                    className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#d4d8e0] via-[#9da3af] to-[#5a606d] border border-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center cursor-pointer"
                    title="M CH Dial: Scroll wheel or click number to select channel"
                  >
                    <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-b from-[#8f96a3] to-[#454a54] border border-white/20 shadow-inner flex items-center justify-center">
                      <div
                        className="w-7 h-7 relative flex items-center justify-center transition-transform duration-150"
                        style={{
                          // Map channels 1-6 to left ticks (-140° to -220°), channels 7-12 to right ticks (40° to -40°)
                          transform: `rotate(${
                            state.memoryChannel <= 6
                              ? 220 - (state.memoryChannel - 1) * 16
                              : 40 - (state.memoryChannel - 7) * 16
                          }deg)`,
                        }}
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-6 bg-gradient-to-b from-[#1b1c20] to-[#0d0e10] rounded-t-full rounded-b-md shadow-md border border-black/80 flex items-start justify-center pt-0.5">
                          <span className="w-0.5 h-3.5 bg-white rounded-full shadow-[0_0_2px_#ffffff]" />
                        </div>
                        <div className="w-4 h-4 rounded-full bg-gradient-to-b from-[#2a2d33] to-[#121316] border border-black relative z-10" />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Channels 7, 8, 9, 10, 11, 12 with horizontal tick marks */}
                  <div className="flex flex-col justify-between h-full py-0.5">
                    {[7, 8, 9, 10, 11, 12].map((ch) => {
                      const active = state.memoryChannel === ch;
                      return (
                        <div
                          key={ch}
                          onClick={() => handleSelectMCh(ch)}
                          className="flex items-center gap-1 cursor-pointer group"
                        >
                          <span
                            className={`w-3.5 h-[1px] transition-colors ${
                              active ? 'bg-amber-400' : 'bg-slate-400/60 group-hover:bg-slate-200'
                            }`}
                          />
                          <span
                            className={`text-[8px] font-mono font-bold transition-colors w-3.5 text-left ${
                              active
                                ? 'text-amber-300 font-black drop-shadow-[0_0_3px_#f59e0b]'
                                : 'text-slate-300 group-hover:text-white'
                            }`}
                          >
                            {ch}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. ATT (ATTENUATOR) ROTARY SWITCH (Header: ATT, Left: MIN & OFF, Right: DX) */}
              <div
                className="w-[140px] sm:w-[155px] flex flex-col items-center select-none pl-2 border-l border-[#4d535f]/70"
                title="ATT: Attenuator Switch (OFF/MIN to DX)"
              >
                {/* Header ATT */}
                <div className="flex items-center gap-1.5 w-full mb-1">
                  <div className="h-[1px] bg-slate-400/60 flex-1" />
                  <span className="text-[9px] font-mono font-bold tracking-widest text-slate-200 uppercase">
                    ATT
                  </span>
                  <div className="h-[1px] bg-slate-400/60 flex-1" />
                </div>

                <div className="relative w-full h-[85px] flex items-center justify-center">
                  {/* Top Tick mark (12 o'clock) */}
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-slate-300/80" />

                  {/* Left: MIN & Boxed OFF */}
                  <div
                    onClick={() => handleSelectAtt('LOCAL')}
                    className="absolute bottom-1 left-1 flex flex-col items-center cursor-pointer group"
                  >
                    <span className="text-[7px] font-mono font-bold text-slate-300 group-hover:text-white">
                      MIN
                    </span>
                    <span
                      className={`border px-1 py-0.2 rounded-xs text-[7px] font-mono font-bold ${
                        state.attenuator === 'LOCAL'
                          ? 'text-cyan-300 border-cyan-400 font-black'
                          : 'text-slate-200 border-slate-300/80 group-hover:text-white'
                      }`}
                    >
                      OFF
                    </span>
                  </div>

                  {/* Intermediate Ticks: 10 dB and 20 dB */}
                  <button
                    type="button"
                    onClick={() => handleSelectAtt('20dB')}
                    className={`absolute top-2 left-4 text-[7px] font-mono font-bold cursor-pointer ${
                      state.attenuator === '20dB'
                        ? 'text-cyan-300 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    20 dB
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAtt('10dB')}
                    className={`absolute top-2 right-4 text-[7px] font-mono font-bold cursor-pointer ${
                      state.attenuator === '10dB'
                        ? 'text-cyan-300 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    10 dB
                  </button>

                  {/* Right: DX */}
                  <div
                    onClick={() => handleSelectAtt('DX')}
                    className="absolute bottom-1 right-2 flex flex-col items-center cursor-pointer group"
                  >
                    <span
                      className={`text-[8px] font-mono font-bold ${
                        state.attenuator === 'DX'
                          ? 'text-cyan-300 font-black drop-shadow-[0_0_3px_#22d3ee]'
                          : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      DX
                    </span>
                  </div>

                  {/* Center Knob: Fluted Cylindrical Knob with Silver Skirt */}
                  <div
                    onWheel={(e) => {
                      e.preventDefault();
                      const curIdx = ATT_OPTIONS.findIndex(
                        (o) => o.id === state.attenuator
                      );
                      const nextIdx = Math.max(
                        0,
                        Math.min(
                          ATT_OPTIONS.length - 1,
                          curIdx + (e.deltaY < 0 ? 1 : -1)
                        )
                      );
                      handleSelectAtt(ATT_OPTIONS[nextIdx].id);
                    }}
                    className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#d4d8e0] via-[#9da3af] to-[#5a606d] border border-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.7)] flex items-center justify-center cursor-pointer"
                    title="ATT Switch: Scroll wheel or click surrounding levels"
                  >
                    {/* Fluted cylindrical knob head */}
                    <div
                      className="w-7 h-7 rounded-full bg-gradient-to-b from-[#34383d] to-[#141517] border border-white/20 relative shadow-inner flex items-center justify-center transition-transform duration-150"
                      style={{
                        transform: `rotate(${
                          state.attenuator === 'LOCAL'
                            ? -135
                            : state.attenuator === '20dB'
                            ? -45
                            : state.attenuator === '10dB'
                            ? 45
                            : 135
                        }deg)`,
                      }}
                    >
                      {/* Indicator dot and groove */}
                      <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-[0_0_2px_#ffffff]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
