import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Eye,
  Sliders,
  HelpCircle,
  Check,
  ChevronRight,
  Usb,
  Download,
  Upload,
  RefreshCw,
  Power,
  RotateCcw,
  Sparkles,
  Info,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { SerialStatus } from '../utils/webSerialManager';
import { VFD_COLOR_PRESETS } from '../data/swPacificBanks';

interface WindowsMenuBarProps {
  serialStatus: SerialStatus;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  onExportJson: () => void;
  onDownloadCppZip: () => void;
  onResetDefaults: () => void;
  showMemoryBanks: boolean;
  onToggleMemoryBanks: () => void;
  showCatLogs: boolean;
  onToggleCatLogs: () => void;
  showHelpModal: boolean;
  onToggleHelpModal: () => void;
  showOptionsModal: boolean;
  onToggleOptionsModal: () => void;
  vfdColor: string;
  onSelectVfdColor: (hex: string) => void;
  vfdBrightness: number;
  onSelectVfdBrightness: (val: number) => void;
  lcdTextColor?: string;
  onSelectLcdTextColor?: (color: string) => void;
  dtrEnabled: boolean;
  onToggleDtr: () => void;
  rtsEnabled: boolean;
  onToggleRts: () => void;
}

export const WindowsMenuBar: React.FC<WindowsMenuBarProps> = ({
  serialStatus,
  onConnectSerial,
  onDisconnectSerial,
  onExportJson,
  onDownloadCppZip,
  onResetDefaults,
  showMemoryBanks,
  onToggleMemoryBanks,
  showCatLogs,
  onToggleCatLogs,
  showHelpModal,
  onToggleHelpModal,
  showOptionsModal,
  onToggleOptionsModal,
  vfdColor,
  onSelectVfdColor,
  vfdBrightness,
  onSelectVfdBrightness,
  lcdTextColor,
  onSelectLcdTextColor,
  dtrEnabled,
  onToggleDtr,
  rtsEnabled,
  onToggleRts,
}) => {
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'options' | 'help' | null>(null);
  const [colorSubmenuOpen, setColorSubmenuOpen] = useState(false);
  const [brightSubmenuOpen, setBrightSubmenuOpen] = useState(false);
  const [lcdColorSubmenuOpen, setLcdColorSubmenuOpen] = useState(false);
  const menuBarRef = useRef<HTMLDivElement | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setColorSubmenuOpen(false);
        setBrightSubmenuOpen(false);
        setLcdColorSubmenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: 'file' | 'view' | 'options' | 'help') => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
    setColorSubmenuOpen(false);
    setBrightSubmenuOpen(false);
    setLcdColorSubmenuOpen(false);
  };

  const handleMouseEnter = (menu: 'file' | 'view' | 'options' | 'help') => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
      setColorSubmenuOpen(false);
      setBrightSubmenuOpen(false);
      setLcdColorSubmenuOpen(false);
    }
  };

  const closeMenus = () => {
    setActiveMenu(null);
    setColorSubmenuOpen(false);
    setBrightSubmenuOpen(false);
    setLcdColorSubmenuOpen(false);
  };

  return (
    <div
      ref={menuBarRef}
      className="relative z-50 bg-[#1e2229] border-b border-[#363c48] text-xs font-sans select-none text-slate-200 flex items-center shadow-sm"
    >
      {/* Windows Application Icon & Title snippet */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-[#363c48] text-[#94a3b8] font-mono text-[11px] font-bold">
        <Radio className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-slate-300">FRG-8800</span>
      </div>

      {/* 1. FILE MENU BUTTON */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('file')}
          onMouseEnter={() => handleMouseEnter('file')}
          className={`px-3 py-1.5 cursor-pointer text-xs font-medium transition-colors ${
            activeMenu === 'file'
              ? 'bg-[#2d3440] text-white'
              : 'hover:bg-[#282e38] text-slate-200'
          }`}
        >
          <span className="underline decoration-slate-400 decoration-1">F</span>ile
        </button>

        {activeMenu === 'file' && (
          <div className="absolute top-full left-0 min-w-[260px] bg-[#1a1e24] border border-[#3e4654] rounded-b-md shadow-2xl py-1 text-slate-200 text-xs">
            <button
              type="button"
              onClick={() => {
                onExportJson();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Export Memories to JSON...</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDownloadCppZip();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold text-cyan-300">Download VS2022 C++ Solution (.ZIP)...</span>
              </span>
            </button>

            <div className="my-1 border-t border-[#313742]" />

            <button
              type="button"
              onClick={() => {
                onResetDefaults();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#28313f] hover:text-amber-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Receiver to Factory Defaults</span>
            </button>

            <div className="my-1 border-t border-[#313742]" />

            <button
              type="button"
              onClick={() => {
                closeMenus();
                window.location.reload();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-rose-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Power className="w-3.5 h-3.5 text-slate-400" />
                <span>Restart Session / Exit</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Alt+F4</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. VIEW MENU BUTTON */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('view')}
          onMouseEnter={() => handleMouseEnter('view')}
          className={`px-3 py-1.5 cursor-pointer text-xs font-medium transition-colors ${
            activeMenu === 'view'
              ? 'bg-[#2d3440] text-white'
              : 'hover:bg-[#282e38] text-slate-200'
          }`}
        >
          <span className="underline decoration-slate-400 decoration-1">V</span>iew
        </button>

        {activeMenu === 'view' && (
          <div className="absolute top-full left-0 min-w-[280px] bg-[#1a1e24] border border-[#3e4654] rounded-b-md shadow-2xl py-1 text-slate-200 text-xs">
            {/* Memory Banks Window Toggle */}
            <button
              type="button"
              onClick={() => {
                onToggleMemoryBanks();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 text-center">
                  {showMemoryBanks ? <Check className="w-3.5 h-3.5 text-cyan-400 inline" /> : null}
                </span>
                <span className="font-medium">Memory Banks & Station Guide Window</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">F2</span>
            </button>

            {/* CAT Packet Traffic Inspector */}
            <button
              type="button"
              onClick={() => {
                onToggleCatLogs();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 text-center">
                  {showCatLogs ? <Check className="w-3.5 h-3.5 text-cyan-400 inline" /> : null}
                </span>
                <span>CAT Packet Traffic Log & Hex Inspector</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">F3</span>
            </button>

            <div className="my-1 border-t border-[#313742]" />

            {/* VFD Color Submenu */}
            <div
              className="relative"
              onMouseEnter={() => {
                setColorSubmenuOpen(true);
                setBrightSubmenuOpen(false);
              }}
            >
              <div className="px-3 py-1.5 flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-4" />
                  <span>VFD Phosphor Color</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {colorSubmenuOpen && (
                <div className="absolute top-0 left-full min-w-[240px] bg-[#1a1e24] border border-[#3e4654] rounded-md shadow-2xl py-1 text-slate-200 text-xs">
                  {VFD_COLOR_PRESETS.map((preset) => {
                    const active = vfdColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          onSelectVfdColor(preset.hex);
                          closeMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-center">
                            {active ? <Check className="w-3.5 h-3.5 text-cyan-400 inline" /> : null}
                          </span>
                          <span
                            className="w-3 h-3 rounded-full border border-black/40"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.name}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{preset.hex}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* VFD Brightness Submenu */}
            <div
              className="relative"
              onMouseEnter={() => {
                setBrightSubmenuOpen(true);
                setColorSubmenuOpen(false);
                setLcdColorSubmenuOpen(false);
              }}
            >
              <div className="px-3 py-1.5 flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-4" />
                  <span>VFD Display Brightness</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {brightSubmenuOpen && (
                <div className="absolute top-0 left-full min-w-[180px] bg-[#1a1e24] border border-[#3e4654] rounded-md shadow-2xl py-1 text-slate-200 text-xs">
                  {[
                    { label: '100% Brightness', val: 1.0 },
                    { label: '75% Brightness', val: 0.75 },
                    { label: '50% Medium', val: 0.5 },
                    { label: '25% Dim Night', val: 0.25 },
                  ].map((item) => {
                    const active = Math.abs(vfdBrightness - item.val) < 0.1;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          onSelectVfdBrightness(item.val);
                          closeMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-center">
                            {active ? <Check className="w-3.5 h-3.5 text-cyan-400 inline" /> : null}
                          </span>
                          <span>{item.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="my-1 border-t border-[#313742]" />

            {/* LCD Frequency Readout Digits Color Submenu (Default Black per user request) */}
            <div
              className="relative"
              onMouseEnter={() => {
                setLcdColorSubmenuOpen(true);
                setColorSubmenuOpen(false);
                setBrightSubmenuOpen(false);
              }}
            >
              <div className="px-3 py-1.5 flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer">
                <span className="flex items-center gap-2">
                  <span className="w-4" />
                  <span>LCD Digits Readout Color</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {lcdColorSubmenuOpen && (
                <div className="absolute top-0 left-full min-w-[220px] bg-[#1a1e24] border border-[#3e4654] rounded-md shadow-2xl py-1 text-slate-200 text-xs">
                  {[
                    { name: 'Black (Default Authentic)', color: '#000000', badge: 'Original' },
                    { name: 'Dark Charcoal Liquid Crystal', color: '#111827' },
                    { name: 'Phosphor Green Glow', color: '#00F5D4' },
                    { name: 'Vintage Amber Phosphor', color: '#FFB703' },
                    { name: 'Crisp White Backlit', color: '#FFFFFF' },
                  ].map((item) => {
                    const currentLcd = lcdTextColor || '#000000';
                    const active = currentLcd.toLowerCase() === item.color.toLowerCase();
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          if (onSelectLcdTextColor) onSelectLcdTextColor(item.color);
                          closeMenus();
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-center">
                            {active ? <Check className="w-3.5 h-3.5 text-cyan-400 inline" /> : null}
                          </span>
                          <span
                            className="w-3 h-3 rounded-full border border-white/30"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. OPTIONS MENU BUTTON (COM Port connections & Radio setup options) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('options')}
          onMouseEnter={() => handleMouseEnter('options')}
          className={`px-3 py-1.5 cursor-pointer text-xs font-medium transition-colors ${
            activeMenu === 'options'
              ? 'bg-[#2d3440] text-white'
              : 'hover:bg-[#282e38] text-slate-200'
          }`}
        >
          <span className="underline decoration-slate-400 decoration-1">O</span>ptions
        </button>

        {activeMenu === 'options' && (
          <div className="absolute top-full left-0 min-w-[320px] bg-[#1a1e24] border border-[#3e4654] rounded-b-md shadow-2xl py-1 text-slate-200 text-xs">
            {/* Header: COM Port Connections */}
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              COM Port & Serial Connections
            </div>

            {serialStatus.connected ? (
              <button
                type="button"
                onClick={() => {
                  onDisconnectSerial();
                  closeMenus();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-rose-300 cursor-pointer text-emerald-300 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  <span>Disconnect from {serialStatus.portName || 'COM Port'}</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onConnectSerial();
                  closeMenus();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-emerald-300 cursor-pointer text-slate-100 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Usb className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Connect to FTDI USB Cable (4800 8N2)...</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400">Ctrl+O</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onToggleOptionsModal();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>COM Port Settings & Connection Dialog...</span>
              </span>
            </button>

            <div className="my-1 border-t border-[#313742]" />

            {/* Hardware Flow Control Signals (User specified: RTS and DTR disabled) */}
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Hardware Signals (Disabled by default)
            </div>

            <button
              type="button"
              onClick={() => {
                onToggleRts();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 text-center">
                  {!rtsEnabled ? <Check className="w-3.5 h-3.5 text-cyan-400 inline" /> : null}
                </span>
                <span>RTS Line: {!rtsEnabled ? 'Disabled (Low - Recommended)' : 'Enabled (Asserted)'}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleDtr();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 text-center">
                  {!dtrEnabled ? <Check className="w-3.5 h-3.5 text-cyan-400 inline" /> : null}
                </span>
                <span>DTR Line: {!dtrEnabled ? 'Disabled (Low - Recommended)' : 'Enabled (Asserted)'}</span>
              </span>
            </button>

            <div className="my-1 border-t border-[#313742]" />

            {/* Fixed Specifications Info */}
            <div className="px-3 py-1 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>Baud Rate:</span>
              <span className="text-slate-200 font-bold">4800 bps</span>
            </div>
            <div className="px-3 py-1 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>Framing:</span>
              <span className="text-slate-200 font-bold">8 Data Bits, No Parity, 2 Stop Bits (8N2)</span>
            </div>
            <div className="px-3 py-1 text-[11px] text-slate-400 font-mono flex items-center justify-between pb-2">
              <span>Command Pacing:</span>
              <span className="text-slate-200 font-bold">65 ms delay</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. HELP MENU BUTTON */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick('help')}
          onMouseEnter={() => handleMouseEnter('help')}
          className={`px-3 py-1.5 cursor-pointer text-xs font-medium transition-colors ${
            activeMenu === 'help'
              ? 'bg-[#2d3440] text-white'
              : 'hover:bg-[#282e38] text-slate-200'
          }`}
        >
          <span className="underline decoration-slate-400 decoration-1">H</span>elp
        </button>

        {activeMenu === 'help' && (
          <div className="absolute top-full left-0 min-w-[280px] bg-[#1a1e24] border border-[#3e4654] rounded-b-md shadow-2xl py-1 text-slate-200 text-xs">
            <button
              type="button"
              onClick={() => {
                onToggleHelpModal();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Yaesu FRG-8800 CAT Manual & Specifications...</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">F1</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleHelpModal();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>FTDI Cable DIN Pinout & Wiring Diagram...</span>
            </button>

            <div className="my-1 border-t border-[#313742]" />

            <button
              type="button"
              onClick={() => {
                onToggleHelpModal();
                closeMenus();
              }}
              className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#28313f] hover:text-cyan-300 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-slate-400" />
              <span>About Yaesu FRG-8800 CAT Controller</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT SIDE OF MENU BAR: Quick Status Pill */}
      <div className="ml-auto px-3 flex items-center gap-3 text-[11px] font-mono">
        {serialStatus.connected ? (
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ONLINE: {serialStatus.portName || 'FTDI'} (4800 8N2) [RTS/DTR: OFF]</span>
          </span>
        ) : (
          <span className="text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>OFFLINE — Connect via Options Menu</span>
          </span>
        )}
      </div>
    </div>
  );
};
