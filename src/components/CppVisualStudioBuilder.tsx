import React, { useState, useMemo } from 'react';
import {
  CatPacketLog,
  FrequencyEntry,
  MemoryBank,
  RadioState,
} from '../types/radio';
import {
  generateCppProjectFiles,
  downloadVisualStudioZip,
} from '../utils/cppSolutionGenerator';
import {
  Download,
  Copy,
  Check,
  Code2,
  Terminal,
  Cpu,
  ShieldCheck,
  FolderArchive,
  Layers,
} from 'lucide-react';

interface CppVisualStudioBuilderProps {
  banks: MemoryBank[];
  frequencies: FrequencyEntry[];
  radioState: RadioState;
  catLogs: CatPacketLog[];
  lcdTextColor?: string;
  onClearCatLogs: () => void;
}

export const CppVisualStudioBuilder: React.FC<CppVisualStudioBuilderProps> = ({
  banks,
  frequencies,
  radioState,
  catLogs,
  lcdTextColor,
  onClearCatLogs,
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);

  const activeLcdCol = lcdTextColor || radioState.lcdTextColor || '#000000';

  const projectFiles = useMemo(
    () => generateCppProjectFiles(banks, frequencies, radioState, activeLcdCol),
    [banks, frequencies, radioState, activeLcdCol]
  );

  const activeFile = projectFiles[selectedFileIndex] || projectFiles[0];

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(activeFile.content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleDownloadSolution = async () => {
    setDownloadingZip(true);
    try {
      await downloadVisualStudioZip(banks, frequencies, radioState, activeLcdCol);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <section
      aria-label="Windows 11 Visual Studio 2022 C++ Solution and FTDI CAT Telemetry"
      className="grid grid-cols-1 xl:grid-cols-12 gap-4"
    >
      {/* Visual Studio 2022 C++ Project Files Explorer */}
      <div className="xl:col-span-8 bg-[#111621] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-semibold text-slate-100">
                Visual Studio 2022 Solution for Windows 11 (C++20 Win32)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete native standalone Windows 11 application with zero dependencies. Pre-configured for your USB-to-FTDI/TTL cable (tested with correct polarity at 4800 8N2).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedFile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied {activeFile.filename}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadSolution}
              disabled={downloadingZip}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-semibold text-slate-950 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {downloadingZip
                  ? 'Packaging Win11 Solution...'
                  : 'Download VS2022 Solution (.ZIP)'}
              </span>
            </button>
          </div>
        </div>

        {/* Project Files Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {projectFiles.map((file, idx) => (
            <button
              key={file.filename}
              type="button"
              onClick={() => setSelectedFileIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                idx === selectedFileIndex
                  ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400/60 font-semibold'
                  : 'bg-[#0b0e14] text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {file.filename}
            </button>
          ))}
        </div>

        {/* File Description */}
        <div className="px-3 py-1.5 rounded bg-[#0b0e14] border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>{activeFile.description}</span>
          <span className="font-mono text-[11px] text-cyan-400">
            Target: Windows 11 x64 (MSVC 2022)
          </span>
        </div>

        {/* Code View */}
        <pre className="p-3.5 rounded-lg bg-[#080a0f] border border-slate-800/90 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-[420px] leading-relaxed">
          <code>{activeFile.content}</code>
        </pre>
      </div>

      {/* Right Column: FTDI Hardware Specifications & 5-Byte CAT Log */}
      <div className="xl:col-span-4 bg-[#111621] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-slate-100">
                FTDI / TTL Cable Configuration
              </h2>
            </div>
          </div>

          {/* Cable Specifics Callout */}
          <div className="p-3 rounded-lg bg-[#0b0e14] border border-emerald-500/30 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-emerald-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>FRG-8800 Dedicated FTDI Cable</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                Polarity: Correct
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono space-y-1 pt-1 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Baud Rate:</span>
                <span className="text-cyan-300">4800 bps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data / Parity / Stop:</span>
                <span className="text-cyan-300">8 Data, None, 2 Stop (8N2)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">DTR / RTS Lines:</span>
                <span className="text-cyan-300">Enabled (Transceiver Bias)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hardware Pacing:</span>
                <span className="text-cyan-300">65ms minimum delay</span>
              </div>
            </div>
          </div>

          {/* Windows 11 Build & Run Steps */}
          <div className="p-3 rounded-lg bg-[#0b0e14] border border-slate-800 text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-200 font-medium">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Building on Windows 11</span>
            </div>
            <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1">
              <li>Download the ZIP archive and extract it.</li>
              <li>Open <code className="text-slate-200">FRG8800_CAT_Win11.sln</code> in Visual Studio 2022.</li>
              <li>Select <code className="text-slate-200">Release | x64</code> and press <code className="text-cyan-300">Ctrl+Shift+B</code>.</li>
              <li>Or double-click <code className="text-slate-200">build_win11.bat</code> in the Developer Command Prompt!</li>
              <li>Executable will run with zero external DLL installations.</li>
            </ol>
          </div>

          {/* Outbound 5-Byte CAT Log */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Terminal className="w-3 h-3 text-cyan-400" />
              <span>Outbound 5-Byte CAT Command Stream</span>
            </div>
            <button
              type="button"
              onClick={onClearCatLogs}
              className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="rounded-lg bg-[#080a0f] border border-slate-800 p-2.5 h-[210px] overflow-y-auto font-mono text-[11px] space-y-1.5">
            {catLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-10">
                Tune the dial or click any station to inspect 5-byte CAT packets.
              </div>
            ) : (
              catLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-1.5 rounded bg-[#111621] border border-slate-800/80 flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-bold tracking-wider tabular-nums">
                      [{log.hexBytes}]
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {log.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{log.description}</span>
                    <span className="text-emerald-400">{log.commandName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#0b0e14] border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
            <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
            <span>Ready-to-Compile Solution Package</span>
          </div>
          Contains complete solution (<code className="text-slate-300">.sln</code>), project (<code className="text-slate-300">.vcxproj</code>), C++ source (<code className="text-slate-300">main.cpp, FtdiYaesuCat.cpp</code>), frequency header (<code className="text-slate-300">MemoryBanksData.h</code>), and one-click build script.
        </div>
      </div>
    </section>
  );
};
