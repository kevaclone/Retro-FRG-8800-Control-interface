import runOperaBat from '../../Run_In_Opera.bat?raw';
import runBrowserBat from '../../Run_In_Browser.bat?raw';
import packageJson from '../../package.json?raw';
import tsconfigJson from '../../tsconfig.json?raw';
import viteConfig from '../../vite.config.ts?raw';
import indexHtml from '../../index.html?raw';
import readmeMd from '../../README.md?raw';
import batFilesRaw from './batFiles.ts?raw';

export const toCRLF = (str: string): string => str.replace(/\r?\n/g, '\r\n');

export const RUN_IN_OPERA_BAT = toCRLF(runOperaBat);
export const RUN_IN_BROWSER_BAT = toCRLF(runBrowserBat);
export const PACKAGE_JSON = packageJson;
export const TSCONFIG_JSON = tsconfigJson;
export const VITE_CONFIG_TS = viteConfig;
export const INDEX_HTML = indexHtml;
export const README_MD = readmeMd;

// Explicit glob of all source files in src/ from project root
export const srcModules = import.meta.glob<string>(
  '/src/**/*.{ts,tsx,css}',
  { query: '?raw', import: 'default', eager: true }
);

export const VERSION_INFO_TXT = toCRLF(`=========================================================================
YAESU FRG-8800 COMMUNICATIONS RECEIVER - CAT CONTROLLER & WIN11 SUITE
Version 1.1.3 Update
=========================================================================

RELEASE DATE: October 2026
TARGET PLATFORMS: Windows 11 / Windows 10 (Native C++ Win32 & Chromium Web Serial)

UPDATES IN THIS RELEASE:
1. Resolved Missing './batFiles' Import Error:
   - Fixed the build error where 'src/utils/batFiles.ts' was excluded from the
     packaged ZIP, causing Vite to fail with:
     "Failed to resolve import './batFiles' from 'src/utils/cppSolutionGenerator.ts'".
   - All files across the entire codebase are now bundled into the archive.

2. Path-with-Spaces & Direct Node Execution Fix:
   - Fixed the error where folder paths with spaces (e.g. '... Chirp\Yaesu\...')
     caused Windows cmd to split the path.
   - Batch files and package.json now directly invoke Node on 'node_modules\\vite\\bin\\vite.js'.

2. Fixed Modal Dialog 'Windows cannot find \\':
   - Cleaned up the browser launch command to open Opera directly without shell
     escaping glitches.

3. Native Non-Browser Desktop App (Visual Studio 2022 C++20 Win32 / GDI+):
   - Aligned M-CH and ATT rotary selector deck flush down with the bottom edge of the front panel.
   - Keypad and memory segment enlarged to provide uniform, balanced gaps (~6-8px) across all segments.
   - Gaps around all right-side segments matched to the authentic satin light grey anodized finish of the front panel (eliminated the dark recess fill).
   - Memory and Scan buttons (M SELECT, M > VFO, P SCAN, PAUSE, M SCAN, S SCAN, MR, VFO > M, VFO) restored with distinct lighter silver-grey surrounds/bezels and top highlights.
   - All rotary knobs rendered with authentic machined silver outer rings and spun aluminum center cap.

HOW TO RUN:
- Native Desktop App: Open 'FRG8800_CAT_Win11/FRG8800_CAT_Win11.sln' in Visual Studio 2022 and press F5 (Build & Run).
- Web Serial App: Double-click 'Run_In_Opera.bat' (or 'Run_In_Browser.bat')!
`);

export function getAllWebAppFiles(): { path: string; content: string }[] {
  const result: { path: string; content: string }[] = [];

  // Root files
  result.push({ path: 'Run_In_Opera.bat', content: toCRLF(RUN_IN_OPERA_BAT) });
  result.push({ path: 'Run_In_Browser.bat', content: toCRLF(RUN_IN_BROWSER_BAT) });
  result.push({ path: 'VERSION_INFO.txt', content: VERSION_INFO_TXT });
  result.push({ path: 'package.json', content: PACKAGE_JSON });
  result.push({ path: 'tsconfig.json', content: TSCONFIG_JSON });
  result.push({ path: 'vite.config.ts', content: VITE_CONFIG_TS });
  result.push({ path: 'index.html', content: INDEX_HTML });
  result.push({ path: 'README.md', content: README_MD });
  result.push({ path: 'src/utils/batFiles.ts', content: batFilesRaw });

  // Source files in src/
  for (const [key, content] of Object.entries(srcModules)) {
    // key is like '/src/components/YaesuFRG8800Panel.tsx' or '/src/utils/batFiles.ts'
    const normalized = key.replace(/^\//, '').replace(/^\.\.\//, 'src/').replace(/^\.\//, 'src/utils/');
    result.push({ path: normalized, content });
  }

  return result;
}
