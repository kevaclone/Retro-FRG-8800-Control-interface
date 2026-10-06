import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [clockStr, setClockStr] = useState<string>('12:00:00');
  const [sMeterFlutter, setSMeterFlutter] = useState<number>(0);

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

  // Authentic Keypad Input Handler (0-9, ., CE, ENT, MHz, kHz)
  const handleKeypadPress = (key: string) => {
    if (!state.powerOn) return;

    if (key >= '0' && key <= '9') {
      if (keypadBuffer.length < 8) {
        setKeypadBuffer((prev) => prev + key);
      }
    } else if (key === 'CE') {
      setKeypadBuffer('');
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
          const targetHz = val <= 30 ? Math.round(val * 1000000) : Math.round(val * 1000);
          onDirectFrequencyHz(targetHz);
        }
        setKeypadBuffer('');
      }
    }
  };

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
      <div className="relative rounded-2xl border-4 border-[#4d535f] p-4 sm:p-6 lg:p-7 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.95)] bg-gradient-to-b from-[#3a3f47] via-[#32363d] to-[#282b31] w-full">
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
          {/* Per user specification:                                                                   */}
          {/* - Speaker Grill made larger, wider, and covers the now vacant space below it             */}
          {/* - "Power" button moved down next to and on left side of "Phones" connector               */}
          {/* - "Phones" connector in middle                                                            */}
          {/* - To the right of Phones: "Tone", then "AF Gain" on other side, and dedicated "Squelch"   */}
          {/* ========================================================================================= */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-4 bg-[#23272e] p-3.5 sm:p-4 rounded-2xl border border-[#373c46] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            {/* ENLARGED AUTHENTIC ACOUSTIC SPEAKER GRILL */}
            <div className="flex-1 flex flex-col justify-between p-4 rounded-xl bg-[#0e1012] border border-black shadow-[inset_0_3px_10px_rgba(0,0,0,0.95)] min-h-[300px]">
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
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                  ACOUSTIC MONITOR
                </span>
              </div>

              {/* TALL & WIDE ACOUSTIC HORIZONTAL SLATS (Covers the now vacant space as requested) */}
              <div className="flex-1 flex flex-col justify-evenly py-3 gap-1.5 sm:gap-2">
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-2.5 sm:h-3 rounded-full bg-gradient-to-r from-[#030405] via-[#0b0d10] to-[#030405] border-b border-white/10 shadow-[inset_0_2px_3px_rgba(0,0,0,0.95)] flex items-center px-3"
                  >
                    <div className="w-full h-0.5 bg-black/80 rounded-full" />
                  </div>
                ))}
              </div>

              {/* BOTTOM EMBOSSED BADGE */}
              <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-[10px] font-mono tracking-widest text-slate-400">
                <span>SOLID STATE COMMUNICATIONS RECEIVER</span>
                <span className="text-[#d5ba7d] font-bold">150 kHz - 30 MHz</span>
              </div>
            </div>

            {/* ===================================================================================== */}
            {/* BOTTOM CONTROLS DECK: POWER -> PHONES -> TONE -> AF GAIN -> SQUELCH                   */}
            {/* Per user specification:                                                               */}
            {/* - "Power" button is moved down next to and on left side of "Phones" connector         */}
            {/* - "Phones" connector in middle                                                        */}
            {/* - Dedicated "Tone", "AF Gain" on other side of Tone, and dedicated "Squelch" dial     */}
            {/* ===================================================================================== */}
            <div className="p-3 bg-[#111316] rounded-xl border border-black shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)] flex flex-wrap items-center justify-between gap-3">
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
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-[#4a5057] to-[#1e2124] border-2 border-black shadow-lg flex items-center justify-center group-hover:border-cyan-500/50">
                  <div
                    className="w-7 h-7 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner"
                    style={{
                      transform: `rotate(${((state.toneLevel ?? 50) / 100) * 270 - 135}deg)`,
                      transition: 'transform 0.05s ease-out',
                    }}
                  >
                    <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-amber-400 rounded-full shadow-[0_0_3px_#fbbf24]" />
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
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-[#4a5057] to-[#1e2124] border-2 border-black shadow-lg flex items-center justify-center group-hover:border-teal-400/50">
                  <div
                    className="w-7 h-7 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner"
                    style={{
                      transform: `rotate(${(state.afGain / 100) * 270 - 135}deg)`,
                      transition: 'transform 0.05s ease-out',
                    }}
                  >
                    <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white rounded-full" />
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
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-[#4a5057] to-[#1e2124] border-2 border-black shadow-lg flex items-center justify-center group-hover:border-amber-400/50">
                  <div
                    className="w-7 h-7 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner"
                    style={{
                      transform: `rotate(${(state.sqlLevel / 100) * 270 - 135}deg)`,
                      transition: 'transform 0.05s ease-out',
                    }}
                  >
                    <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-emerald-400 rounded-full shadow-[0_0_3px_#34d399]" />
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
                  <div className="flex items-baseline gap-1 font-mono tracking-tighter">
                    {keypadBuffer ? (
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

              {/* LOCK Button */}
              <div className="flex items-center gap-1 pl-2 border-l border-white/10">
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

                {/* 2. MAIN MACHINED FLYWHEEL DIAL */}
                <div
                  ref={dialRef}
                  onPointerDown={handleDialPointerDown}
                  onPointerMove={handleDialPointerMove}
                  onPointerUp={handleDialPointerUp}
                  onWheel={handleDialWheel}
                  className={`relative w-36 h-36 sm:w-40 sm:h-40 rounded-full flex items-center justify-center transition-all ${
                    state.dialLocked
                      ? 'cursor-not-allowed opacity-80'
                      : 'cursor-grab active:cursor-grabbing hover:shadow-[0_0_24px_rgba(255,255,255,0.08)]'
                  }`}
                  style={{
                    background:
                      'radial-gradient(circle, #25282d 0%, #15171a 70%, #0a0b0d 100%)',
                    boxShadow:
                      '0 12px 28px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.15)',
                  }}
                >
                  {/* Knurled Outer Rubber Rim */}
                  <div className="absolute inset-1.5 rounded-full border-4 border-[#3a3f47] border-dashed opacity-50" />

                  {/* Brushed Satin Center Disc */}
                  <div
                    className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-[#3a3e45] via-[#525862] to-[#25282c] border border-white/20 shadow-inner flex items-center justify-center"
                    style={{
                      transform: `rotate(${dialAngle}deg)`,
                      transition: isDraggingDial ? 'none' : 'transform 0.05s ease-out',
                    }}
                  >
                    {/* Subtle Spoke Texture */}
                    <div className="absolute w-full h-0.5 bg-black/30" />
                    <div className="absolute h-full w-0.5 bg-black/30" />

                    {/* Finger Dimple for Spinning */}
                    <div className="absolute top-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#181a1d] to-[#2a2d33] border border-white/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-[#121416] shadow-inner" />
                    </div>

                    {/* Center Cap */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#42464e] to-[#22252a] border border-white/20 shadow flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#101214]" />
                    </div>
                  </div>
                </div>

                {/* 3. FINE TUNE DIAL (CLARIFIER) WITH 1 Hz & 10 Hz DIRECT TUNING CONTROLS */}
                {/* Per user specification: "make the fine tune dial work and tune in 1hz and 10hz incriments" */}
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
                      <div className="relative w-9 h-9 rounded-full bg-gradient-to-b from-[#4a5057] to-[#1e2124] border-2 border-black shadow flex items-center justify-center group-hover:border-cyan-500/50">
                        <div
                          className="w-6 h-6 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner"
                          style={{
                            transform: `rotate(${((state.clarifierHz || 0) / 990) * 180}deg)`,
                          }}
                        >
                          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24]" />
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
          {/* 3. RIGHT COLUMN: DISPLAY SELECT, TIMER/SET, KEYPAD, MEM/SCAN, M CH & ATT  */}
          {/* Authentic Yaesu FRG-8800 Right Deck as specified by user                  */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3 bg-[#23272e] p-3.5 sm:p-4 rounded-2xl border border-[#373c46] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            {/* TOP DECK: DISPLAY SELECT ROTARY DIAL & TIMER/SET CONTROLS */}
            <div className="p-2.5 rounded-xl bg-[#171a1f] border border-black/80 shadow-inner flex flex-wrap items-center justify-between gap-3">
              {/* 1. DISPLAY SELECT ROTARY DIAL */}
              <div
                className="flex flex-col items-center select-none"
                title="DISPLAY SELECT: Sleep (7 o'clock), Off, On, Clock 1, Freq, Clock 2 (1 o'clock)"
              >
                <div className="relative w-32 h-24 flex items-center justify-center">
                  {/* Radial Labels around the 7 o'clock to 1 o'clock arc */}
                  {DISPLAY_SELECT_OPTIONS.map((opt) => {
                    const rad = ((opt.angle - 90) * Math.PI) / 180;
                    const r = 38;
                    const x = 64 + r * Math.cos(rad);
                    const y = 50 + r * Math.sin(rad);
                    const active = (state.displaySelect || 'FREQ') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectDisplayMode(opt.id)}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute text-[8px] font-mono font-bold tracking-tight cursor-pointer whitespace-nowrap transition-all ${
                          active
                            ? 'text-amber-300 font-black scale-110 drop-shadow-[0_0_4px_#f59e0b]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}

                  {/* Center Rotary Knob */}
                  <div
                    onWheel={(e) => {
                      e.preventDefault();
                      const curIdx = DISPLAY_SELECT_OPTIONS.findIndex(
                        (o) => o.id === (state.displaySelect || 'FREQ')
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
                    className="relative w-10 h-10 rounded-full bg-gradient-to-b from-[#4a5057] to-[#1e2124] border-2 border-black shadow-lg flex items-center justify-center cursor-pointer group"
                    title="Display Select Dial: Turn wheel or click labels"
                  >
                    <div
                      className="w-6 h-6 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner transition-transform duration-150"
                      style={{
                        transform: `rotate(${currentDisplayAngle}deg)`,
                      }}
                    >
                      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24]" />
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold tracking-wider text-slate-300 uppercase -mt-0.5">
                  DISPLAY SELECT
                </span>
              </div>

              {/* 2. TIMER & SET CONTROLS */}
              <div className="flex flex-col gap-2 flex-1 min-w-[130px]">
                {/* Timer Section */}
                <div className="flex flex-col gap-1">
                  <div className="text-[9px] font-mono font-black tracking-widest text-[#d5ba7d] uppercase">
                    TIMER
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState({ clockMode: 'TIMER', displaySelect: 'SLEEP' })
                      }
                      className="py-1 px-1.5 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[10px] font-black border border-[#70664d] shadow active:translate-y-0.5 cursor-pointer"
                      title="Turn Timer ON"
                    >
                      On
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        startTimestampRef.current = Date.now();
                        onUpdateState({ clockMode: 'AEST', displaySelect: 'FREQ' });
                      }}
                      className="py-1 px-1.5 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[10px] font-black border border-[#70664d] shadow active:translate-y-0.5 cursor-pointer"
                      title="Clear Timer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* SET Section */}
                <div className="flex flex-col gap-1">
                  <div className="text-[9px] font-mono font-black tracking-widest text-[#d5ba7d] uppercase">
                    SET
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState({
                          clockMode: state.clockMode === 'UTC' ? 'AEST' : 'UTC',
                        })
                      }
                      className="py-1 px-1.5 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[10px] font-black border border-[#70664d] shadow active:translate-y-0.5 cursor-pointer"
                      title="Advance / Toggle Hour"
                    >
                      Hour
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateState({
                          clockMode: state.clockMode === 'AEST' ? 'UTC' : 'AEST',
                        })
                      }
                      className="py-1 px-1.5 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[10px] font-black border border-[#70664d] shadow active:translate-y-0.5 cursor-pointer"
                      title="Toggle Time (UTC / AEST)"
                    >
                      Time
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MIDDLE DECK: NUMERIC KEYPAD (LEFT) + SCAN / MEMORY BUTTONS (RIGHT) */}
            <div className="p-2.5 rounded-xl bg-[#171a1f] border border-black/80 shadow-inner flex flex-col gap-2">
              <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-slate-400 uppercase px-1">
                <span className="font-bold text-slate-300">NUMERIC KEYPAD</span>
                <span className="text-[#d5ba7d] font-bold">MEMORY &amp; SCAN</span>
              </div>

              {/* 5-Column Split: 3 Columns for Numeric Keypad, 2 Columns for Memory/Scan */}
              <div className="grid grid-cols-5 gap-2 items-start">
                {/* 3 COLS: NUMERIC KEYPAD (Small compact darker cream buttons) */}
                <div className="col-span-3 grid grid-cols-3 gap-1.5">
                  {/* Row 1: 1, 2, 3 */}
                  {['1', '2', '3'].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleKeypadPress(n)}
                      className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-xs font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                    >
                      {n}
                    </button>
                  ))}

                  {/* Row 2: 4, 5, 6 */}
                  {['4', '5', '6'].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleKeypadPress(n)}
                      className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-xs font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                    >
                      {n}
                    </button>
                  ))}

                  {/* Row 3: 7, 8, 9 */}
                  {['7', '8', '9'].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleKeypadPress(n)}
                      className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-xs font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                    >
                      {n}
                    </button>
                  ))}

                  {/* Row 4: CE, 0, ENT */}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('CE')}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-rose-900 font-mono text-[11px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                    title="Clear Entry"
                  >
                    CE
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-xs font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('ENT')}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[11px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                    title="Enter / Commit"
                  >
                    ENT
                  </button>

                  {/* Row 5: MHz, kHz, . */}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('MHz')}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-orange-950 font-mono text-[10px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                    title="Commit as MHz (e.g. 14 -> 14.000 MHz)"
                  >
                    MHz
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('kHz')}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-sky-950 font-mono text-[10px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                    title="Commit as kHz (e.g. 612 -> 612.000 kHz)"
                  >
                    kHz
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('.')}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-xs font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 active:shadow-inner"
                    title="Decimal Point"
                  >
                    .
                  </button>
                </div>

                {/* 2 COLS: MEMORY / SCAN BUTTONS (Exactly as per original radio panel) */}
                <div className="col-span-2 grid grid-cols-2 gap-1.5">
                  {/* Row 1: "M Select" " > VFO " */}
                  <button
                    type="button"
                    onClick={() => onStepMemoryChannel(1)}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[9px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center leading-tight whitespace-nowrap"
                    title="M Select (Advance / Select Memory Channel)"
                  >
                    M Select
                  </button>
                  <button
                    type="button"
                    onClick={handleMemToVfo}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[9px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center leading-tight whitespace-nowrap"
                    title="> VFO (Transfer current Memory Channel to VFO)"
                  >
                    &gt; VFO
                  </button>

                  {/* Row 2: "P Scan" "Pause" */}
                  <button
                    type="button"
                    onClick={onTriggerScan}
                    className={`py-1.5 px-1 rounded-md font-mono text-[9px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center leading-tight whitespace-nowrap ${
                      isScanning
                        ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                        : 'bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512]'
                    }`}
                    title="P Scan (Programmed / Memory Bank Scan)"
                  >
                    P Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isScanning) onTriggerScan();
                    }}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[9px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center leading-tight whitespace-nowrap"
                    title="Pause Scan"
                  >
                    Pause
                  </button>

                  {/* Row 3: "M Scan" "S Scan" */}
                  <button
                    type="button"
                    onClick={onTriggerScan}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[9px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center leading-tight whitespace-nowrap"
                    title="M Scan (Memory Scan)"
                  >
                    M Scan
                  </button>
                  <button
                    type="button"
                    onClick={onTriggerScan}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[9px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center leading-tight whitespace-nowrap"
                    title="S Scan (Search Scan)"
                  >
                    S Scan
                  </button>

                  {/* Row 4: "MR" "VFO > M" */}
                  <button
                    type="button"
                    onClick={onToggleVfoMem}
                    className={`py-1.5 px-1 rounded-md font-mono text-[9px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center leading-tight whitespace-nowrap ${
                      state.vfoMode === 'MEM'
                        ? 'bg-gradient-to-b from-[#baaE87] to-[#9e926e] text-teal-900 border-[#554d37] shadow-inner font-black'
                        : 'bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512]'
                    }`}
                    title="MR (Memory Recall)"
                  >
                    MR
                  </button>
                  <button
                    type="button"
                    onClick={handleVfoToMem}
                    className="py-1.5 px-1 rounded-md bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512] font-mono text-[9px] font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center leading-tight whitespace-nowrap"
                    title="VFO > M (Store active VFO frequency into current Memory Channel / Bank)"
                  >
                    VFO &gt; M
                  </button>

                  {/* Row 5: "VFO" - exactly the width of the 2 columns of buttons above it */}
                  <button
                    type="button"
                    onClick={() => onUpdateState({ vfoMode: 'VFO' })}
                    className={`col-span-2 py-1.5 px-2 rounded-md font-mono text-xs font-black border border-[#70664d] shadow-[0_2px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 text-center tracking-wider transition-all ${
                      state.vfoMode === 'VFO'
                        ? 'bg-gradient-to-b from-[#baaE87] to-[#9e926e] text-[#141512] border-[#554d37] shadow-inner font-black'
                        : 'bg-gradient-to-b from-[#d5caa8] via-[#c7bc96] to-[#b3a77f] hover:from-[#ded4b2] text-[#141512]'
                    }`}
                    title="VFO (Return to VFO Mode)"
                  >
                    VFO
                  </button>
                </div>
              </div>
            </div>

            {/* BOTTOM DECK: M CH DIAL (LEFT) + ATT DIAL (RIGHT) */}
            <div className="p-2.5 rounded-xl bg-[#171a1f] border border-black/80 shadow-inner grid grid-cols-2 gap-3 items-center">
              {/* 1. "M Ch" DIAL WITH NUMBERED MEMORIES (1..12, linked to actual memory banks) */}
              <div
                className="flex flex-col items-center select-none"
                title="M CH: Select Memory Channel 1-12 (opens and tunes to linked memory bank)"
              >
                <div className="relative w-28 h-24 flex items-center justify-center">
                  {M_CHANNELS.map((ch) => {
                    const angle = ((ch - 1) / 11) * 270 - 135;
                    const rad = ((angle - 90) * Math.PI) / 180;
                    const r = 38;
                    const x = 56 + r * Math.cos(rad);
                    const y = 48 + r * Math.sin(rad);
                    const active = state.memoryChannel === ch;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => handleSelectMCh(ch)}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute text-[9px] font-mono font-bold cursor-pointer transition-all ${
                          active
                            ? 'text-amber-300 font-black scale-125 drop-shadow-[0_0_4px_#f59e0b]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}

                  {/* Center Rotary Knob */}
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
                    className="relative w-10 h-10 rounded-full bg-gradient-to-b from-[#4a5057] to-[#1e2124] border-2 border-black shadow-lg flex items-center justify-center cursor-pointer group"
                    title="M CH Dial: Scroll wheel or click number (opens linked bank)"
                  >
                    <div
                      className="w-6 h-6 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner transition-transform duration-150"
                      style={{
                        transform: `rotate(${((state.memoryChannel - 1) / 11) * 270 - 135}deg)`,
                      }}
                    >
                      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_4px_#fbbf24]" />
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold tracking-wider text-slate-300 uppercase -mt-0.5">
                  M CH
                </span>
                <span className="text-[8px] font-mono text-amber-300/80 tabular-nums">
                  CH {state.memoryChannel}
                </span>
              </div>

              {/* 2. "ATT" (ATTENUATOR) DIAL (DX, 10dB, 20dB, LOCAL) */}
              <div
                className="flex flex-col items-center select-none"
                title="ATT: Attenuator Dial (DX 0dB, 10dB, 20dB, LOCAL 30dB)"
              >
                <div className="relative w-28 h-24 flex items-center justify-center">
                  {ATT_OPTIONS.map((opt) => {
                    const rad = ((opt.angle - 90) * Math.PI) / 180;
                    const r = 38;
                    const x = 56 + r * Math.cos(rad);
                    const y = 48 + r * Math.sin(rad);
                    const active = state.attenuator === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectAtt(opt.id)}
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute text-[8px] font-mono font-bold cursor-pointer whitespace-nowrap transition-all ${
                          active
                            ? 'text-cyan-300 font-black scale-125 drop-shadow-[0_0_4px_#22d3ee]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}

                  {/* Center Rotary Knob */}
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
                    className="relative w-10 h-10 rounded-full bg-gradient-to-b from-[#4a5057] to-[#1e2124] border-2 border-black shadow-lg flex items-center justify-center cursor-pointer group"
                    title="ATT Dial: Scroll wheel or click level"
                  >
                    <div
                      className="w-6 h-6 rounded-full bg-gradient-to-b from-[#34383d] to-[#181a1c] border border-white/20 relative shadow-inner transition-transform duration-150"
                      style={{
                        transform: `rotate(${ATT_OPTIONS.find((o) => o.id === state.attenuator)?.angle ?? -135}deg)`,
                      }}
                    >
                      <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_4px_#22d3ee]" />
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold tracking-wider text-slate-300 uppercase -mt-0.5">
                  ATT
                </span>
                <span className="text-[8px] font-mono text-cyan-300/80 tabular-nums">
                  {ATT_OPTIONS.find((o) => o.id === state.attenuator)?.db ?? '0 dB'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
