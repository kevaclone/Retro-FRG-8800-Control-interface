import React, { useState, useRef, useEffect } from 'react';
import {
  Radio,
  Maximize2,
  X,
  Pin,
  Power,
  Volume2,
  VolumeX,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Move,
  Lock,
  Unlock,
  Layers,
} from 'lucide-react';
import { FrequencyEntry, RadioMode, RadioState } from '../types/radio';

interface MinimizedFreqWindowProps {
  state: RadioState;
  matchedStation?: FrequencyEntry | null;
  serialConnected: boolean;
  onRestore: () => void;
  onUpdateState: (partial: Partial<RadioState>) => void;
  onStepFrequency: (deltaHz: number) => void;
  onToggleVfoMem: () => void;
}

const STEP_OPTIONS = [
  { label: '100Hz', hz: 100 },
  { label: '1kHz', hz: 1000 },
  { label: '5kHz', hz: 5000 },
  { label: '9kHz', hz: 9000 },
  { label: '10kHz', hz: 10000 },
];

const MODES: RadioMode[] = ['AM-W', 'AM-N', 'USB', 'LSB', 'CW', 'FM'];

export const MinimizedFreqWindow: React.FC<MinimizedFreqWindowProps> = ({
  state,
  matchedStation,
  serialConnected,
  onRestore,
  onUpdateState,
  onStepFrequency,
  onToggleVfoMem,
}) => {
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(true);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      const initX = Math.max(16, Math.round((window.innerWidth - 440) / 2));
      const initY = Math.max(30, Math.round((window.innerHeight - 340) / 3));
      return { x: initX, y: initY };
    }
    return { x: 30, y: 80 };
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Calculate formatted frequency
  const mhz = (state.freqHz / 1000000).toFixed(6);
  const khz = (state.freqHz / 1000).toFixed(3);

  // S-Meter calculation
  const sMeterUnits = Math.min(12, Math.max(1, Math.round((state.rfGain / 100) * 10) + 1));

  // Pointer drag handler for window movement
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header, ignore buttons
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - 440, dragRef.current.posX + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 260, dragRef.current.posY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Cycle radio mode
  const handleCycleMode = () => {
    if (!state.powerOn) return;
    const currentIdx = MODES.indexOf(state.mode);
    const nextMode = MODES[(currentIdx + 1) % MODES.length];
    onUpdateState({ mode: nextMode });
  };

  return (
    <div
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      className={`fixed top-0 left-0 w-[420px] rounded-xl border-2 border-[#4b5563] bg-[#161a22] text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(34,211,238,0.25)] select-none animate-in zoom-in-95 duration-150 ${
        alwaysOnTop ? 'z-[9999]' : 'z-50'
      }`}
    >
      {/* 1. WINDOWS 11 TITLE BAR WITH "FRG-8800 Freq" LABEL */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-[#202530] via-[#282f3d] to-[#202530] border-b border-[#3e4756] rounded-t-lg cursor-move"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shadow-xs">
            <Radio className="w-3 h-3 text-cyan-400" />
          </div>
          {/* USER SPECIFIED EXACT LABEL: "FRG-8800 Freq" */}
          <span className="text-xs font-bold font-mono tracking-wide text-white drop-shadow-xs">
            FRG-8800 Freq
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-semibold">
            MINI
          </span>
        </div>

        {/* Window controls: Always-on-top toggle, Restore button, Close button */}
        <div className="flex items-center gap-1.5">
          {/* Pin / Always on Top badge */}
          <button
            type="button"
            onClick={() => setAlwaysOnTop((p) => !p)}
            className={`p-1 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
              alwaysOnTop
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={alwaysOnTop ? 'Always on Top: ON (Stays on top of all windows)' : 'Always on Top: OFF'}
          >
            <Pin className={`w-3 h-3 ${alwaysOnTop ? 'rotate-45 fill-amber-300 text-amber-300' : ''}`} />
            <span className="text-[9px] font-mono font-bold">{alwaysOnTop ? 'TOP' : ''}</span>
          </button>

          {/* Restore Window Button (Maximizes back to full Yaesu FRG-8800 receiver panel) */}
          <button
            type="button"
            onClick={onRestore}
            className="p-1 rounded hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 cursor-pointer transition-colors"
            title="Restore Full FRG-8800 Hardware Front Panel (Maximize)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close mini window / Exit mini mode */}
          <button
            type="button"
            onClick={onRestore}
            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
            title="Close Mini Window (Return to Full View)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. AUTHENTIC BACKLIT GREEN / CYAN VFD FREQUENCY WINDOW */}
      <div className="p-3 flex flex-col gap-2.5">
        <div
          className="relative rounded-lg p-3 transition-all duration-300 overflow-hidden border-2 border-black/80 shadow-[inset_0_2px_12px_rgba(0,0,0,0.85)]"
          style={{
            background:
              !state.powerOn || state.displaySelect === 'OFF'
                ? 'linear-gradient(180deg, #131b15 0%, #0d130f 100%)'
                : 'linear-gradient(180deg, #5eb87a 0%, #4ea96a 45%, #3e9859 100%)',
            boxShadow:
              !state.powerOn || state.displaySelect === 'OFF'
                ? 'inset 0 0 16px rgba(0,0,0,0.85)'
                : 'inset 0 0 20px rgba(18, 70, 35, 0.65), 0 0 14px rgba(78, 169, 106, 0.35)',
            opacity: state.powerOn && state.displaySelect !== 'OFF' ? state.vfdBrightness : 0.3,
          }}
        >
          {/* Glass glare */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/[0.06] via-transparent to-transparent" />

          {/* Top Info Strip: VFO/MEM Status, Step & S-Meter */}
          <div
            className="flex items-center justify-between border-b pb-1.5 text-[10px] font-mono tracking-wider font-bold"
            style={{
              borderColor: state.lcdTextColor && state.lcdTextColor !== '#000000'
                ? `${state.lcdTextColor}33`
                : 'rgba(0,0,0,0.25)',
              color: state.lcdTextColor || '#070a07',
            }}
          >
            {/* Mode & VFO indicator */}
            <div className="flex items-center gap-2">
              <span className="px-1 py-0.2 rounded bg-black/20 font-black">
                {state.vfoMode === 'MEM' ? `MEM ${state.memoryChannel}` : 'VFO'}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-black/25 text-black font-extrabold uppercase">
                {state.mode}
              </span>
              <span className="text-[9px] opacity-80">
                STEP: {state.stepHz >= 1000 ? `${state.stepHz / 1000}k` : `${state.stepHz}Hz`}
              </span>
            </div>

            {/* S-Meter Bar */}
            <div className="flex items-center gap-0.5">
              <span className="text-[8px] mr-1 font-black">SIG</span>
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-2 rounded-xs ${
                    i < sMeterUnits
                      ? i >= 7
                        ? 'bg-rose-800'
                        : 'bg-black'
                      : 'bg-black/15'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* MAIN LARGE DIGITAL FREQUENCY READOUT */}
          <div className="py-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span
                className="text-3xl sm:text-4xl font-black tracking-tight select-all drop-shadow-sm"
                style={{
                  color: state.lcdTextColor || '#050705',
                  fontFamily: 'monospace',
                }}
              >
                {state.powerOn ? khz : '------'}
              </span>
              <span
                className="text-xs font-black uppercase"
                style={{ color: state.lcdTextColor || '#0c120d' }}
              >
                kHz
              </span>
            </div>

            {/* Serial & Power Status Pill */}
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="text-[9px] font-mono font-bold"
                style={{ color: state.lcdTextColor || '#050705' }}
              >
                {mhz} MHz
              </span>
              {serialConnected ? (
                <span className="text-[8px] font-mono font-bold text-emerald-900 bg-emerald-300/60 px-1 py-0.2 rounded">
                  CAT ONLINE
                </span>
              ) : (
                <span className="text-[8px] font-mono font-bold opacity-60">CAT SIM</span>
              )}
            </div>
          </div>

          {/* Station / Channel Description Banner */}
          <div
            className="border-t pt-1 flex items-center justify-between text-[9px] font-mono truncate"
            style={{
              borderColor: state.lcdTextColor && state.lcdTextColor !== '#000000'
                ? `${state.lcdTextColor}33`
                : 'rgba(0,0,0,0.2)',
              color: state.lcdTextColor || '#0c120d',
            }}
          >
            {matchedStation ? (
              <span className="font-bold truncate">
                {matchedStation.callsign} · {matchedStation.stationName} ({matchedStation.location})
              </span>
            ) : (
              <span className="opacity-70 truncate">
                Tuned VFO · Drag window anywhere to position
              </span>
            )}
            <span className="font-black shrink-0 ml-1">YAESU</span>
          </div>
        </div>

        {/* 3. COMPACT QUICK CONTROLS TOOLBAR */}
        <div className="flex flex-col gap-2 p-2 rounded-lg bg-[#11141a] border border-slate-800">
          {/* Row 1: Tuning Nudge Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => onStepFrequency(-state.stepHz * 10)}
              className="py-1 rounded bg-[#242933] hover:bg-[#323947] text-amber-300 text-xs font-mono font-bold border border-black cursor-pointer flex items-center justify-center gap-0.5"
              title="Fast Tune Down (10x step)"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
              <span>FAST</span>
            </button>
            <button
              type="button"
              onClick={() => onStepFrequency(-state.stepHz)}
              className="py-1 rounded bg-[#242933] hover:bg-[#323947] text-slate-200 text-xs font-mono font-bold border border-black cursor-pointer flex items-center justify-center gap-0.5"
              title="Tune Down (1x step)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>DN</span>
            </button>
            <button
              type="button"
              onClick={() => onStepFrequency(state.stepHz)}
              className="py-1 rounded bg-[#242933] hover:bg-[#323947] text-slate-200 text-xs font-mono font-bold border border-black cursor-pointer flex items-center justify-center gap-0.5"
              title="Tune Up (1x step)"
            >
              <span>UP</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onStepFrequency(state.stepHz * 10)}
              className="py-1 rounded bg-[#242933] hover:bg-[#323947] text-amber-300 text-xs font-mono font-bold border border-black cursor-pointer flex items-center justify-center gap-0.5"
              title="Fast Tune Up (10x step)"
            >
              <span>FAST</span>
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Row 2: Step Options Pills */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 flex-1">
              {STEP_OPTIONS.map((opt) => {
                const active = state.stepHz === opt.hz;
                return (
                  <button
                    key={opt.hz}
                    type="button"
                    onClick={() => onUpdateState({ stepHz: opt.hz })}
                    className={`flex-1 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer transition-colors border ${
                      active
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                        : 'bg-[#1a1f27] hover:bg-[#252b36] text-slate-400 border-black hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Mode Cycle Button */}
            <button
              type="button"
              onClick={handleCycleMode}
              className="px-2 py-0.5 rounded bg-[#242b36] hover:bg-[#323b4b] border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold cursor-pointer"
              title="Cycle Radio Mode (AM-W / AM-N / USB / LSB / CW / FM)"
            >
              MODE: {state.mode}
            </button>
          </div>

          {/* Row 3: Action Buttons (VFO/MEM, Power, Full Restore) */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 gap-2">
            <div className="flex items-center gap-1.5">
              {/* Power Toggle */}
              <button
                type="button"
                onClick={() => onUpdateState({ powerOn: !state.powerOn })}
                className={`px-2 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                  state.powerOn
                    ? 'bg-orange-600 hover:bg-orange-500 text-white border-orange-400 shadow-[0_0_8px_rgba(234,88,12,0.5)]'
                    : 'bg-[#20242c] text-slate-500 border-black'
                }`}
                title="Toggle Main Receiver Power"
              >
                <Power className="w-3 h-3" />
                <span className="text-[10px]">{state.powerOn ? 'ON' : 'OFF'}</span>
              </button>

              {/* VFO / MEM Toggle */}
              <button
                type="button"
                onClick={onToggleVfoMem}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                  state.vfoMode === 'MEM'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-xs'
                    : 'bg-[#202530] text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="Toggle VFO / Memory Channel"
              >
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>{state.vfoMode === 'MEM' ? `MEM ${state.memoryChannel}` : 'VFO'}</span>
              </button>
            </div>

            {/* Restore Full Front Panel Button */}
            <button
              type="button"
              onClick={onRestore}
              className="px-3 py-1 rounded bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              title="Expand back to full Yaesu FRG-8800 Hardware Receiver"
            >
              <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Restore Panel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
