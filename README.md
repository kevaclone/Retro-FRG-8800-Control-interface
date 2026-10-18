# Yaesu FRG-8800 CAT Controller & Windows 11 Suite

[![Platform](https://img.shields.io/badge/Platform-Windows%2011%20%7C%20Windows%2010%20%7C%20Web-blue.svg)](https://github.com)
[![Language](https://img.shields.io/badge/C%2B%2B-20%20Win32%20%2F%20GDI%2B-00599C.svg)](https://github.com)
[![Web](https://img.shields.io/badge/React%2019-TypeScript%20%2F%20Tailwind-61DAFB.svg)](https://github.com)
[![Serial](https://img.shields.io/badge/CAT%20Protocol-4800%20Baud%208N2-orange.svg)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An authentic, precision-engineered Computer Aided Tuning (CAT) controller and front-panel emulation suite for the classic **Yaesu FRG-8800** communications receiver (150 kHz – 30 MHz HF, plus optional 118 – 174 MHz VHF converter).

This project provides two complete, synchronized solutions:
1. **Native Windows 11 Standalone C++ Desktop App**: High-performance, zero-dependency Win32 / GDI+ application compiled with Visual Studio 2022 (C++20), featuring hardware-accurate front-panel graphics, native Win32 COM serial driver, and automated FTDI discovery.
2. **Interactive Web Serial Application (React 19 + TypeScript + Tailwind CSS)**: Runs locally in modern Chromium browsers (Opera, Opera GX, Chrome, Edge, Brave) using the Web Serial API for instant, driverless USB-to-radio tuning, an interactive acoustic simulator, and a floating mini-controller mode.

---

## Table of Contents
- [Key Features](#key-features)
  - [Hardware-Accurate Front Panel](#-hardware-accurate-front-panel)
  - [Queensland & South Pacific HF Memory Banks](#-pre-loaded-queensland--south-pacific-hf-memory-banks)
- [Quick Start Guide](#quick-start-guide)
  - [Option A: One-Click Windows Batch Launchers (Recommended)](#option-a-one-click-windows-batch-launchers-recommended)
  - [Option B: Native Windows 11 Desktop C++ Application](#option-b-native-windows-11-desktop-c-application)
  - [Option C: Manual Web Development Setup](#option-c-manual-web-development-setup)
- [Connecting to Your Yaesu FRG-8800](#connecting-to-your-yaesu-frg-8800)
  - [CAT Cable & Serial Parameters](#serial-port-parameters)
  - [Rear 6-Pin DIN Pinout & 5V TTL Wiring](#rear-panel-cat-6-pin-din-pinout)
  - [5-Byte CAT Protocol Specification](#cat-5-byte-instruction-packet-format)
- [Operating Guide](#operating-guide)
  - [Direct Keypad Tuning](#direct-keypad-frequency-tuning)
  - [Memory Channel Selection](#memory-channel-selection)
  - [Scanning Operations](#scanning-controls)
  - [Mini-Controller Floating Toolbar Mode](#mini-controller-floating-toolbar-mode)
- [Troubleshooting](#troubleshooting)
- [Project Architecture](#project-architecture)
- [Version History](#version-history)
- [License](#license)

---

## Key Features

### 🎛️ Hardware-Accurate Front Panel
- **Satin Light Grey Anodized Finish**: Meticulously rendered chassis texture matching original Yaesu production units, with authentic panel bezels and flush-aligned bottom control decks.
- **Backlit Fluorescent Green LCD/VFD**:
  - Precision 8-digit digital frequency readout down to 10 Hz and 1 Hz resolution.
  - Multi-segment digital S-meter bar graph (S1 to S9 and +10 to +40 dB over 9).
  - Operating mode annunciators (`AM`, `LSB`, `USB`, `CW`, `FM`) and filter bandwidth indicators (`WIDE`, `NARROW`).
  - Dual real-time digital clocks displaying synchronized UTC and Local time.
- **Machined Aluminum Knobs & Dials**:
  - Heavy flywheel main tuning knob with knurled rotor, machined silver outer ring, and spun aluminum center cap.
  - Fine tuning clarifier knob with 1 Hz / 10 Hz precision micro-steps and 0 Hz center-detent reset.
  - 12-position rotary **M CH** memory selector dial.
  - 4-position step **ATT** attenuator switch (`DX 0 dB`, `10 dB`, `20 dB`, `LOCAL -30 dB`).
  - Rotary **TONE**, **AF GAIN** (volume), and **SQUELCH** potentiometers.
- **Functional Vertical Toggle Switches**:
  - **Band Width**: `WIDE` (6 kHz AM / 2.7 kHz SSB) vs `NARROW` (2.4 kHz AM / 500 Hz CW).
  - **AGC**: `SLOW` vs `FAST` automatic gain recovery.
  - **Noise Blanker (NB)**: High-efficiency impulse blanking filter toggle.
  - **Dimmer**: High / Low vacuum fluorescent display brightness selector.
- **Tactile Numeric Keypad & Memory Controls**:
  - Numeric buttons (`0`–`9`, `.`, `MHz`, `kHz`, `CE`, `ENT`) with embossed keycaps.
  - Authentic dark grey memory operation buttons with **distinct lighter silver-grey surrounds/bezels**: `M SELECT`, `M > VFO`, `P SCAN`, `PAUSE`, `M SCAN`, `S SCAN`, `MR`, `VFO > M`, and full-width `VFO`.
- **Acoustic Speaker Grille & Audio Simulator**:
  - Horizontal acoustic slats with silver Yaesu brand badge.
  - Built-in Web Audio API synthesizer simulating realistic HF atmospheric background noise, selective fading, and heterodyne audio filtered according to the selected mode and bandwidth.

---

### 📻 Pre-Loaded Queensland & South Pacific HF Memory Banks
The suite comes fully configured with 12 authentic, verified radio monitoring memory banks covering Queensland, Australian maritime, aviation, emergency, and Pacific regional frequencies:

| Bank # | Name | Description | Example Frequencies |
|:---:|:---|:---|:---|
| **1** | **MW-QLD** | Queensland AM Broadcast Stations | 612 kHz (4QR Brisbane), 828 kHz (4VL), 1008 kHz (4TAB), 1116 kHz (4BC), 1431 kHz (4KZ) |
| **2** | **RFDS** | Royal Flying Doctor Service Networks | 2020 kHz, 4010 kHz, 5110 kHz, 5410 kHz, 6880 kHz, 6920 kHz (USB) |
| **3** | **ATC-SWP** | South Pacific Aeronautical MWARA / ATC | 3467 kHz, 5643 kHz, 8867 kHz, 13261 kHz (Brisbane, Sydney, Auckland, Nadi) |
| **4** | **MARINE-SWP** | Australian Coast Guard, VMR & GMDSS Distress | 2182 kHz, 4125 kHz, 6215 kHz, 8291 kHz, 12290 kHz, 16420 kHz |
| **5** | **HF-MIL** | Australian Defence Force (ADF) Tactical & Air | 3110 kHz, 5707 kHz, 8992 kHz, 11175 kHz (Global HF / RAAF) |
| **6** | **HF-TIME** | Standard Time & Frequency Stations | 5000 kHz, 10000 kHz, 15000 kHz, 20000 kHz (WWV/WWVH, JJY, BPM) |
| **7** | **SW-BC** | International Shortwave Broadcasters | 6115 kHz (RNZ Pacific), 9740 kHz (BBC), 12065 kHz, 15720 kHz |
| **8** | **LW-NDB** | Queensland & Pacific Non-Directional Beacons | 206 kHz (OK), 242 kHz (SW), 344 kHz (BD), 416 kHz (MK) |
| **9** | **HAM-AUS** | Australian Amateur Radio Calling Channels | 1840 kHz (160m), 3585 kHz (80m), 7125 kHz (40m), 14195 kHz (20m), 28490 kHz (10m) |
| **10** | **SCAN** | User Programmable Monitor Bank | Custom search ranges across HF bands |
| **11** | **EMS/LAW** | QPS Police, QAS Ambulance & SES Rural Fire | 2082 kHz, 4480 kHz, 5100 kHz, 7465 kHz |
| **12** | **DIGITAL** | Australian Weather Radiofax, Marine DSC & RTTY | 5100 kHz, 11030 kHz (Charleville BoM Fax), 8414.5 kHz (GMDSS DSC), 8040 kHz (AAD CW) |

---

## Quick Start Guide

### Option A: One-Click Windows Batch Launchers (Recommended)
The fastest and easiest way to run the controller on any Windows 10 or Windows 11 PC:

1. **Download the Suite**:
   Click **"Download Suite & .bat Launchers (.ZIP)"** in the top menu bar or download the latest release archive (`FRG8800_CAT_Win11_Suite_v1.1.zip`).
2. **Extract the ZIP**:
   Right-click the downloaded `.zip` file, select **Extract All...**, and extract to any folder (e.g. `C:\HamRadio\FRG-8800`).
3. **Run Your Preferred Launcher**:
   - For Opera / Opera GX: Double-click **`Run_In_Opera.bat`**
   - For Any Default Browser: Double-click **`Run_In_Browser.bat`**
4. **Automated Zero-Configuration**:
   - Checks for Node.js and scans both 64-bit and 32-bit `Program Files` automatically.
   - Installs dependencies automatically on first launch (`node_modules`).
   - Starts the local server and automatically launches your browser to **`http://127.0.0.1:3000`**.
   - Handles file paths containing spaces seamlessly.
5. **Keep the Command Prompt Window Open**:
   The web controller is hosted by this window. When you are finished, press `Ctrl + C` or close the window.

---

### Option B: Native Windows 11 Desktop C++ Application
For operators who prefer a standalone, native desktop executable that runs independently without a web browser:

1. In the web interface, click **C++ Solution** in the navigation header, then click **Download Visual Studio 2022 (.ZIP)** (or use the pre-packaged `FRG8800_CAT_Win11` folder inside the suite ZIP).
2. Extract the files to your computer.
3. **Building with Visual Studio 2022**:
   - Double-click **`FRG8800_CAT_Win11.sln`** to open the project in Visual Studio 2022.
   - Set the configuration to **Release** and platform to **x64**.
   - Press **F5** (or `Ctrl + Shift + B`) to build and run.
   - The compiled standalone executable is created at `x64\Release\FRG8800_CAT_Win11.exe`.
4. **Command-Line Build**:
   - Open **Developer Command Prompt for VS 2022**.
   - Navigate to the folder and run:
     ```cmd
     build_win11.bat
     ```
   - The script compiles via `msbuild` and launches the application automatically.

---

### Option C: Manual Web Development Setup
If you are running on macOS, Linux, or prefer using the command line:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/yaesu-frg8800-cat.git
cd yaesu-frg8800-cat

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Start local development server
npm run dev

# 4. Open in browser
# Navigate to: http://127.0.0.1:3000
```

---

## Connecting to Your Yaesu FRG-8800

### Serial Port Parameters
The Yaesu FRG-8800 receiver features an internal CAT microcontroller programmed with fixed communication parameters:

| Parameter | Required Value | Notes |
|:---|:---|:---|
| **Baud Rate** | **`4800 bps`** | Hardware fixed in receiver ROM |
| **Data Bits** | **`8`** | Standard 8-bit bytes |
| **Parity** | **`None`** | No parity bit |
| **Stop Bits** | **`2`** | **Must be 2 stop bits (8N2)** |
| **Flow Control**| **`None`** | RTS / CTS flow control is not supported |
| **DTR Line** | **`DISABLED` (OFF / Low)** | Must not assert reset line |
| **RTS Line** | **`DISABLED` (OFF / Low)** | Must not assert PTT/mute line |
| **Pacing Delay**| **`65 ms`** | Required delay between consecutive 5-byte packets |

---

### Rear Panel CAT 6-Pin DIN Pinout

Looking directly at the rear panel 6-pin female DIN socket:

```
          --- TOP ---
         /   (6)   \        Pin 1: SERIAL DATA IN (FTDI TXD - Inverted 5V TTL)
        / (1)   (5) \       Pin 2: GROUND (FTDI GND)
       | (2)     (4) |      Pin 3: STANDBY / NC (Do not connect)
        \    (3)    /       Pin 4: +5V DC OUTPUT (Optional reference)
         \         /        Pin 5: NC / SHIELD
          ---------         Pin 6: CHASSIS GROUND
```

| Pin # | Signal Name | Cable Connection | Notes |
|:---:|:---|:---|:---|
| **1** | **SERIAL DATA IN** | Connect to FTDI **TXD** | **Active-LOW 5V TTL Logic Levels** |
| **2** | **GROUND** | Connect to FTDI **GND** | Signal common ground |
| **3** | **STANDBY / NC** | *Not Connected* | Receiver squelch/mute control |
| **4** | **+5V DC OUT** | *Optional* | Max 50 mA reference voltage from receiver |
| **5** | **NC / SHIELD** | *Not Connected* | Internal shield tie |
| **6** | **CHASSIS GROUND**| Connect to Cable Braid | Outer metal casing / RF ground |

> ⚠️ **CRITICAL ELECTRICAL WARNING**:
> The Yaesu FRG-8800 CAT interface operates at **TTL 5V Active-LOW logic**, NOT standard RS-232 (+/-12V).
> - **DO NOT** connect a standard DB9 computer serial port directly to the radio, as +/-12V will damage the receiver's internal CAT CPU.
> - Use a USB-to-TTL serial adapter (such as an **FTDI FT232RL**, CP2102, or CH340) set to **5V logic level**.
> - Inverted TTL: The FRG-8800 serial input expects an active-low mark level. Many FTDI chips support hardware RX/TX polarity inversion via FT_PROG; alternatively, a standard single-transistor or 74HC04 inverter can be placed in series on Pin 1.

---

### CAT 5-Byte Instruction Packet Format
All commands sent to the FRG-8800 consist of exactly **5 bytes** sent with at least a 65 ms pause between packets:

#### 1. Set Operating Frequency
Frequency is transmitted as packed Binary Coded Decimal (BCD), 100 Hz per unit, followed by Opcode `0x01` or `0x00`:

$$\text{Packet Format} = [D_1 D_2,\, D_3 D_4,\, D_5 D_6,\, D_7 D_8,\, \text{Opcode}]$$

*Example: Tuning to 14,250.00 kHz (14.25 MHz):*
```
Frequency: 14.25000 MHz -> 14250.0 kHz
BCD Bytes: 0x01, 0x42, 0x50, 0x00
Opcode:    0x01
Packet:    [ 0x01, 0x42, 0x50, 0x00, 0x01 ]
```

#### 2. Set Operating Mode
Mode is set by sending Opcode `0x80` with the mode index placed in byte 4:

$$\text{Packet Format} = [0x00,\, 0x00,\, 0x00,\, \text{ModeCode},\, 0x80]$$

| Mode Code | Operating Mode |
|:---:|:---|
| `0x00` | AM - Wide (6 kHz filter) |
| `0x01` | AM - Narrow (2.4 kHz filter) |
| `0x02` | LSB (Lower Sideband) |
| `0x03` | USB (Upper Sideband) |
| `0x04` | CW (Continuous Wave) |
| `0x05` | FM (Narrowband FM with optional VHF unit) |

---

## Operating Guide

### Direct Keypad Frequency Tuning
1. Enter digits on the numeric keypad (`0` through `9`).
2. Press **`kHz`** to tune in kilohertz (e.g., `7` `1` `2` `5` `kHz` $\rightarrow$ `7.12500 MHz`).
3. Press **`MHz`** to tune in megahertz (e.g., `1` `4` `.` `2` `MHz` $\rightarrow$ `14.20000 MHz`).
4. Press **`ENT`** for smart tuning (values $< 30$ are evaluated as MHz, values $\ge 100$ as kHz).
5. Press **`CE`** to backspace or clear the current entry.

### Memory Channel Selection
- Turn the **M CH** rotary knob to select channels `1` through `12`.
- Each channel automatically loads the pre-configured mode and frequency from the active memory bank.
- You can switch memory banks on the fly using the **Memory Bank** dropdown tab or the Windows menu bar.

### Scanning Controls
- **`P SCAN`**: Starts programmed band scanning between the programmed lower and upper frequency limits.
- **`PAUSE`**: Temporarily halts an active scan when an interesting transmission is heard.
- **`M SCAN`**: Automatically scans through stored memory channels within the current bank.
- **`M > VFO`**: Copies the currently recalled memory channel frequency and mode into the active VFO.
- **`VFO > M`**: Saves the current VFO frequency and mode into the selected memory channel.
- **`VFO`**: Returns tuning control to the main VFO dial.

### Mini-Controller Floating Toolbar Mode
Click the **Mini Mode** button in the top menu to collapse the full front panel into a sleek, compact floating control strip. This mode is designed specifically for amateur radio operators and SWLs who need to keep the controller visible on-screen while running:
- **WSJT-X / JTDX** (FT8, FT4, WSPR)
- **FLDIGI** (PSK31, RTTY, Olivia)
- **Sorcerer / MultiPSK / Black Cat HF Weather Fax**
- Electronic logging programs (N1MM, Log4OM, DXKeeper)

---

## Troubleshooting

### Q: The browser shows "Unable to connect" or "127.0.0.1 refused to connect"
- **Wait 2 to 3 seconds**: On first launch, Vite takes a couple of seconds to compile dependencies. Refresh your browser window (`F5`).
- **Use `http://127.0.0.1:3000`**: Some Windows security settings block `localhost` while permitting `127.0.0.1`. The batch files automatically use `http://127.0.0.1:3000`.
- **Keep Command Prompt open**: Verify that the black Command Prompt window is still running in the background.

### Q: The batch file pops up and immediately closes
- **Extract the ZIP file**: Ensure you right-clicked the downloaded `.zip` file and chose **"Extract All..."**. Windows does not allow batch files to execute properly from inside a compressed folder.
- **Node.js Installation**: Ensure [Node.js (LTS)](https://nodejs.org/) is installed. The launcher will automatically detect 64-bit and 32-bit Node installations.

### Q: "Failed to open serial port" or "Access Denied"
- Verify that no other amateur radio software (such as Ham Radio Deluxe, OmniRig, or an open serial monitor) is holding the COM port open.
- In Chromium browsers, ensure you clicked **"Connect Serial"** and granted browser permission for your specific USB device.

### Q: Radio does not respond to CAT commands
1. Check that the USB-to-serial converter uses **5V TTL logic**, not RS-232 (+/-12V).
2. Check that the cable is wired for **Active-LOW** polarity on the DIN Pin 1.
3. Verify that your COM port is set to **4800 baud**, **8 data bits**, **no parity**, and **2 stop bits (8N2)**.
4. Ensure DTR and RTS are disabled (unchecked) in your serial adapter properties.

---

## Project Architecture

```
yaesu-frg8800-cat/
├── Run_In_Opera.bat               # Bulletproof one-click launcher for Opera / Opera GX
├── Run_In_Browser.bat             # Universal launcher for default web browser
├── package.json                   # Project dependencies and Vite build scripts
├── index.html                     # Web entry point with responsive viewport
├── src/
│   ├── main.tsx                   # React root mount
│   ├── App.tsx                    # Main controller layout, status bar, and audio sync
│   ├── types/
│   │   └── radio.ts               # Radio state, memory bank, and CAT protocol interfaces
│   ├── components/
│   │   ├── FrontPanel.tsx         # Photorealistic FRG-8800 front-panel GUI
│   │   ├── DisplaySection.tsx     # Green VFD display, S-meter bar, and dual UTC clocks
│   │   ├── TuningSection.tsx      # Main flywheel knob and clarifier fine tuning
│   │   ├── KeypadSection.tsx      # Numeric frequency keypad & tactile memory buttons
│   │   ├── LeftControls.tsx       # Power switch, phone jack, Tone, AF Gain, Squelch
│   │   ├── ModeFilterSection.tsx  # Mode selector buttons & bandwidth filter toggles
│   │   ├── MemoryBankDrawer.tsx   # Queensland & Pacific HF memory management drawer
│   │   ├── MiniController.tsx     # Floating compact toolbar for digital modes
│   │   ├── WindowsMenuBar.tsx     # Desktop style menu bar with ZIP download links
│   │   └── CppVisualStudioBuilder.tsx # C++ Win32 project export & code viewer
│   └── utils/
│       ├── catProtocol.ts         # 5-byte packed BCD CAT packet builder & command pacing
│       ├── batFiles.ts            # Dynamic asset packaging & root batch file generator
│       ├── mainCppTemplate.ts     # Visual Studio 2022 C++20 Win32 / GDI+ source generator
│       └── cppSolutionGenerator.ts # In-browser ZIP packager for the complete suite
└── README.md                      # Comprehensive documentation
```

---

## Version History

### Version 1.1.3 (Current Release)
- **Refined Non-Browser Desktop App (Visual Studio 2022 C++20 Win32 / GDI+)**:
  - Aligned the bottom right M-CH and ATT rotary selector deck flush with the bottom edge of the front panel.
  - Enlarged the keypad and memory subpanel deck for uniform, balanced spacing (~6–8px) across all modules.
  - Eliminated dark container recess fills; all panel spacing now matches the authentic satin light grey anodized finish.
  - Restored distinct lighter silver-grey surrounds/bezels and top highlights around all memory and scan buttons (`M SELECT`, `M > VFO`, `P SCAN`, `PAUSE`, `M SCAN`, `S SCAN`, `MR`, `VFO > M`, `VFO`).
  - Added machined silver outer rings and concentric spun aluminum center caps to all rotary dials.
- **Crash-Proof Windows Batch Launchers**:
  - Rewrote `Run_In_Opera.bat` and `Run_In_Browser.bat` using single-line commands without parenthesized blocks, eliminating Windows `cmd.exe` syntax parsing crashes.
  - Added multi-path scanning for Node.js across standard 64-bit and 32-bit Program Files and LocalAppData.
  - Native support for paths containing spaces.
  - Direct execution via Node to prevent port binding and path splitting issues.
- **Complete Suite Packaging**:
  - Downloadable archive renamed to `FRG8800_CAT_Win11_Suite_v1.1.zip` to prevent browser download duplication.
  - Integrated `VERSION_INFO.txt` at the root of the archive.
  - Verified bundle inclusion of all source files, C++ generators, and launcher scripts.

---

## License

This software is released under the **MIT License**. You are free to inspect, modify, distribute, and adapt this suite for personal or amateur radio use.

```
Copyright (c) 2026 Yaesu FRG-8800 CAT Controller Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

*73 and Good DX on the bands!*
