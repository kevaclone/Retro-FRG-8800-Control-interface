import React from 'react';
import { SerialStatus } from '../utils/webSerialManager';
import {
  X,
  Sliders,
  Usb,
  CheckCircle2,
  AlertCircle,
  Activity,
  Send,
  ShieldAlert,
} from 'lucide-react';

interface SerialOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serialStatus: SerialStatus;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  dtrEnabled: boolean;
  onToggleDtr: () => void;
  rtsEnabled: boolean;
  onToggleRts: () => void;
  onSendTestPing: () => void;
}

export const SerialOptionsModal: React.FC<SerialOptionsModalProps> = ({
  isOpen,
  onClose,
  serialStatus,
  onConnectSerial,
  onDisconnectSerial,
  dtrEnabled,
  onToggleDtr,
  rtsEnabled,
  onToggleRts,
  onSendTestPing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#181b22] border border-[#3b4352] rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Win32 Dialog Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#202530] border-b border-[#3b4352] select-none">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-100 tracking-wide">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Options — Serial COM Port & CAT Hardware Setup</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 text-xs">
          {/* Connection Status Box */}
          <div className="p-3.5 rounded-lg bg-[#111317] border border-[#2e3542] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Connection Status
              </div>
              <div className="flex items-center gap-2 mt-1">
                {serialStatus.connected ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    <span className="font-bold text-sm text-emerald-300">
                      ONLINE ({serialStatus.portName || 'FTDI USB Serial'})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <span className="font-bold text-sm text-slate-300">
                      OFFLINE (Radio Disconnected)
                    </span>
                  </>
                )}
              </div>
            </div>

            <div>
              {serialStatus.connected ? (
                <button
                  type="button"
                  onClick={onDisconnectSerial}
                  className="px-3.5 py-1.5 rounded-md bg-rose-950 hover:bg-rose-900 border border-rose-500/60 text-xs font-bold text-rose-200 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConnectSerial}
                  className="px-4 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Usb className="w-4 h-4" />
                  <span>Connect Cable...</span>
                </button>
              )}
            </div>
          </div>

          {serialStatus.error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-bold">Serial Connection Error: </span>
                <span>{serialStatus.error}</span>
              </div>
            </div>
          )}

          {/* Hardware Flow Control Signals: RTS & DTR */}
          <div className="p-3.5 rounded-lg bg-[#111317] border border-[#2e3542] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">Hardware Handshake Lines</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                Disabled By Default
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              For most Yaesu CAT level shifters and TTL adapters, RTS and DTR must be <strong>disabled (kept LOW)</strong> to avoid pulling down the radio&apos;s serial lines.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 p-2 rounded bg-[#1b1f28] border border-[#323947] cursor-pointer hover:border-slate-500">
                <input
                  type="checkbox"
                  checked={rtsEnabled}
                  onChange={onToggleRts}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                />
                <div>
                  <div className="font-mono font-bold text-xs text-slate-200">RTS Line</div>
                  <div className="text-[10px] text-slate-400">
                    {rtsEnabled ? 'Asserted (+V)' : 'Disabled (0V / Low ✓)'}
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded bg-[#1b1f28] border border-[#323947] cursor-pointer hover:border-slate-500">
                <input
                  type="checkbox"
                  checked={dtrEnabled}
                  onChange={onToggleDtr}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                />
                <div>
                  <div className="font-mono font-bold text-xs text-slate-200">DTR Line</div>
                  <div className="text-[10px] text-slate-400">
                    {dtrEnabled ? 'Asserted (+V)' : 'Disabled (0V / Low ✓)'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Yaesu Communication Parameters (Fixed 8N2) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded bg-[#111317] border border-[#2e3542]">
              <div className="text-[10px] text-slate-400 font-mono">Baud Rate</div>
              <div className="font-mono font-bold text-sm text-cyan-300 mt-0.5">4800 bps</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Yaesu Hardware Standard</div>
            </div>

            <div className="p-2.5 rounded bg-[#111317] border border-[#2e3542]">
              <div className="text-[10px] text-slate-400 font-mono">Framing</div>
              <div className="font-mono font-bold text-sm text-cyan-300 mt-0.5">8-N-2</div>
              <div className="text-[9px] text-slate-400 mt-0.5">8 data, 0 parity, 2 stop</div>
            </div>

            <div className="p-2.5 rounded bg-[#111317] border border-[#2e3542]">
              <div className="text-[10px] text-slate-400 font-mono">Packet Pacing</div>
              <div className="font-mono font-bold text-sm text-cyan-300 mt-0.5">65 ms</div>
              <div className="text-[9px] text-slate-400 mt-0.5">FRG-8800 CPU cycle delay</div>
            </div>
          </div>

          {/* Test Ping */}
          <div className="p-3 rounded-lg bg-[#111317] border border-[#2e3542] flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-slate-200">Hardware Loop / CAT Ping</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Send [00 00 00 00 D0] (External Control ON)
              </div>
            </div>
            <button
              type="button"
              onClick={onSendTestPing}
              className="px-3 py-1.5 rounded bg-[#252b36] hover:bg-[#323a49] text-xs font-bold text-cyan-300 border border-[#3b4352] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Ping</span>
            </button>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="px-5 py-3 bg-[#13161c] border-t border-[#3b4352] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer shadow transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
