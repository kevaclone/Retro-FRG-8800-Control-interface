import React from 'react';
import { X, HelpCircle, Radio, Cable, Terminal, Cpu } from 'lucide-react';

interface HelpManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpManualModal: React.FC<HelpManualModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#171a21] border border-[#3b4352] rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#202530] border-b border-[#3b4352] select-none shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-100 tracking-wide">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Yaesu FRG-8800 CAT Serial Specifications & Wiring Guide</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: CAT Parameters */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>1. Serial Communication Parameters</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="p-2.5 rounded bg-[#101216] border border-[#2b313d]">
                <div className="text-[10px] text-slate-400">Baud Rate</div>
                <div className="text-sm font-bold text-white mt-0.5">4800 bps</div>
              </div>
              <div className="p-2.5 rounded bg-[#101216] border border-[#2b313d]">
                <div className="text-[10px] text-slate-400">Data / Framing</div>
                <div className="text-sm font-bold text-white mt-0.5">8 Data Bits</div>
              </div>
              <div className="p-2.5 rounded bg-[#101216] border border-[#2b313d]">
                <div className="text-[10px] text-slate-400">Parity</div>
                <div className="text-sm font-bold text-white mt-0.5">None (N)</div>
              </div>
              <div className="p-2.5 rounded bg-[#101216] border border-[#2b313d]">
                <div className="text-[10px] text-slate-400">Stop Bits</div>
                <div className="text-sm font-bold text-white mt-0.5">2 Stop Bits (8N2)</div>
              </div>
            </div>
            <div className="p-2.5 rounded bg-[#101216] border border-[#2b313d] flex items-center justify-between font-mono">
              <span>Handshaking Lines (RTS / DTR):</span>
              <span className="text-emerald-400 font-bold">DISABLED / LOW (0V)</span>
            </div>
          </div>

          {/* Section 2: DIN Connector Pinout */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Cable className="w-4 h-4 text-cyan-400" />
              <span>2. Rear 8-Pin DIN CAT Interface Pinout</span>
            </h3>
            <p className="text-slate-400">
              The Yaesu FRG-8800 rear panel features an 8-pin circular DIN socket for computer control (active-LOW TTL level):
            </p>
            <div className="p-3 rounded bg-[#101216] border border-[#2b313d] font-mono text-[11px] space-y-1">
              <div>• <strong>Pin 1:</strong> Ground (GND) — Connect to FTDI Cable GND (Black)</div>
              <div>• <strong>Pin 2:</strong> Serial RXD (CAT In to Radio) — Connect to FTDI Cable TXD (Orange)</div>
              <div>• <strong>Pin 3:</strong> Serial TXD (Radio Out, optional)</div>
              <div>• <strong>Pin 4-8:</strong> NC / Logic Control lines</div>
            </div>
          </div>

          {/* Section 3: 5-Byte CAT Protocol Architecture */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>3. Yaesu 5-Byte CAT Command Architecture</span>
            </h3>
            <p className="text-slate-400">
              Every command sent to the FRG-8800 consists of 5 bytes. The 5th byte is the Instruction Opcode:
            </p>
            <div className="p-3 rounded bg-[#101216] border border-[#2b313d] font-mono text-[11px] space-y-2">
              <div>
                <span className="text-cyan-300 font-bold">Set Frequency: </span>
                <span className="text-slate-200">[Byte 1, Byte 2, Byte 3, Byte 4, 0x01]</span>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Frequency is formatted in packed BCD, 100 Hz resolution. E.g. 14.250.0 MHz is encoded as [01, 42, 50, 00, 01].
                </div>
              </div>
              <div className="border-t border-white/5 pt-1.5">
                <span className="text-cyan-300 font-bold">Set Mode: </span>
                <span className="text-slate-200">[0x00, 0x00, 0x00, ModeCode, 0x80]</span>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Modes: 00 = AM-W, 01 = AM-N, 02 = LSB, 03 = USB, 04 = CW, 05 = FM.
                </div>
              </div>
              <div className="border-t border-white/5 pt-1.5">
                <span className="text-cyan-300 font-bold">External Control ON: </span>
                <span className="text-slate-200">[0x00, 0x00, 0x00, 0x00, 0xD0]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#13161c] border-t border-[#3b4352] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
