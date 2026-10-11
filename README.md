# Yaesu FRG-8800 CAT Controller & Windows 11 Suite

An authentic, precision-engineered Computer Aided Tuning (CAT) controller and front-panel emulation suite for the classic **Yaesu FRG-8800** communications receiver (150 kHz – 30 MHz / optional 118 – 174 MHz VHF converter).

This repository provides two complete solutions:
1. **Interactive Web Application (React + TypeScript + Tailwind CSS)**: Runs in modern Chromium browsers (Chrome, Edge, Opera) with Web Serial API support for zero-driver browser-to-radio tuning, interactive front panel, minimized toolbar mode, and Queensland/South Pacific HF frequency management.
2. **Native Windows 11 Visual Studio 2022 C++ Desktop Solution**: High-performance, standalone Win32/GDI+ desktop application with native FTDI serial communication, Windows menu bar, memory bank database, and one-click build script.

---

## Key Features

### 🎛️ Authentic Front Panel Design
- **Satin Lighter Grey Anodized Chassis**: Exact Yaesu styling matching original hardware photography.
- **Backlit Green LCD / VFD Readout**: Authentic illuminated fluorescent display with S-meter bar graph (S1 to +40 dB), frequency readout down to 10 Hz / 1 Hz, mode annunciators, and dual UTC/local clocks.
- **Flywheel Main Tuning Knob**: Smooth drag and scroll-wheel tuning with variable acceleration and inertia simulation.
- **Dedicated Fine Tuning Clarifier**: Precision adjustment in 1 Hz and 10 Hz increments with 0 Hz reset.
- **Vertical Panel Switches**: Functional toggles for Band Width (Wide / Narrow), AGC (Slow / Fast), Noise Blanker (NB ON / OFF), and VFD Dimmer (High / Low).
- **Expanded Acoustic Speaker Grill**: Distinctive horizontal slats with silver Yaesu badge.
- **Bottom Left Controls Deck**: Power switch, 6.35mm headphone jack, Tone dial, AF Gain (Volume) dial, and dedicated Squelch dial.
- **Bottom Right Deck (Aligned Flush with Power Deck)**:
  - **M CH Dial (Left)**: Authentic 12-channel memory selector (Channels 1–6 on left, 7–12 on right) with rotary pointer knob.
  - **ATT (Attenuator) Dial (Right)**: DX (0 dB), 10 dB, 20 dB, and MIN / OFF (Local -30 dB) attenuation.
- **Expanded Numeric Keypad & Memory Controls**:
  - Direct frequency entry keypad: `0`–`9`, `MHz`, `kHz`, decimal point `.`, `CE` (clear entry), and `ENT` (direct tune).
  - Memory and Scan buttons in authentic dark grey with white lettering: `M SELECT`, `M > VFO`, `P SCAN`, `PAUSE`, `M SCAN`, `S SCAN`, `MR`, `VFO > M`, and full-width `VFO`.
- **Compact Minimize Panel (Mini-Controller)**: Floating toolbar for unobtrusive screen usage while logging or running digital decoding programs (WSJT-X, FLDIGI, Sorcerer).

### 📻 Pre-Loaded Queensland & South Pacific HF Memory Banks
Fully populated with authentic, verified frequencies across 12 dedicated memory channels:
1. **MW-QLD (Bank 1)**: Queensland & Australian Mediumwave AM broadcast stations (4QR 612 kHz, 4VL 828 kHz, 4TAB 1008 kHz, 4BC 1116 kHz, 4KZ 1431 kHz, etc.).
2. **RFDS (Bank 2)**: Royal Flying Doctor Service emergency and primary HF frequencies (2020 kHz, 4010 kHz, 5110 kHz, 5410 kHz, 6880 kHz, 6920 kHz).
3. **ATC-SWP (Bank 3)**: South Pacific & Oceanic Aeronautical Air Traffic Control (Brisbane, Sydney, Auckland, Nadi HF MWARA).
4. **MARINE-SWP (Bank 4)**: Australian Marine Safety, Volunteer Marine Rescue (VMR), Coast Guard, and GMDSS distress frequencies.
5. **HF-MIL (Bank 5)**: Australian Defence Force (ADF) & Military HF tactical and command channels.
6. **HF-TIME (Bank 6)**: Standard time & frequency stations (WWV/WWVH, JJY, BPM, Chu).
7. **SW-BC (Bank 7)**: International Shortwave Broadcasters (Radio New Zealand Pacific, BBC World Service, Voice of America, NHK World).
8. **LW-NDB (Bank 8)**: Non-Directional Beacons for aeronautical longwave navigation across Queensland and Australia.
9. **HAM-AUS (Bank 9)**: Australian Amateur Radio HF bands (160m, 80m, 40m, 20m, 15m, 10m calling frequencies).
10. **SCAN (Bank 10)**: Programmable scanning bank for active monitoring.
11. **EMS/LAW (Bank 11)**: Queensland Police Service (QPS) HF, Queensland Ambulance Service (QAS), State Emergency Service (SES), and rural fire networks.
12. **DIGITAL (Bank 12)**: Australian Government & Commercial Digital Modes (Bureau of Meteorology Charleville & Wilpena Marine Radiofax charts, ADF Tactical RTTY, Australian Antarctic Division CW, Marine DSC, SITOR-B / NAVTEX).

---

## Part 1: Web Application Setup & Installation

The web app is built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS**. It can run locally or be hosted on any web server.

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- A modern web browser supporting the **Web Serial API** (Google Chrome, Microsoft Edge, Opera, Brave). *Note: Firefox and Safari do not currently support Web Serial.*

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/yaesu-frg8800-cat.git
   cd yaesu-frg8800-cat
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` (or the URL displayed in your terminal).

4. **Build for production:**
   ```bash
   npm run build
   ```
   The compiled static assets will be output to the `dist/` directory, ready to be deployed to GitHub Pages, Cloudflare Pages, Netlify, or Vercel.

### Connecting Your Radio via the Web Interface
1. Plug your USB-to-FTDI CAT cable into your PC and connect the 6-pin DIN plug to the **CAT** jack on the rear of your FRG-8800.
2. Ensure your FRG-8800 is powered on.
3. In the web interface, click **Connect Serial** (or **CONNECT FTDI**).
4. The browser will present a device picker. Select your USB Serial / FTDI COM port and click **Connect**.
5. The status badge will switch to **ONLINE (CAT SYNC ACTIVE)**.
6. Tuning via the flywheel dial, clicking memory entries, or entering numbers on the keypad will now instantly tune your physical radio!

---

## Part 2: Windows 11 Visual Studio 2022 C++ Standalone Application

If you prefer a native Windows 11 desktop executable that runs independently without a browser, the application includes a full C++ project generator.

### Generating the C++ Solution
In the web interface:
1. Navigate to the **C++ Solution** tab in the control deck.
2. Click **Download Visual Studio 2022 (.ZIP)**.
3. Extract the downloaded `FRG8800_CAT_Win11_VS2022.zip` archive onto your Windows 11 PC.

### Files Included in the C++ Project
- `FRG8800_CAT_Win11.sln`: Visual Studio 2022 solution file.
- `FRG8800_CAT_Win11.vcxproj`: Visual Studio C++ project configuration (C++20, x64, Unicode, Windows 11 SDK).
- `main.cpp`: Native Win32 front-panel GUI, GDI+ rendering engine, and event pump.
- `FtdiYaesuCat.h` & `FtdiYaesuCat.cpp`: Windows serial communications driver with FTDI registry auto-discovery, 5-byte CAT protocol packet builder, and 65ms pacing queue.
- `MemoryBanksData.h`: Compiled header containing all 12 memory banks and Queensland/Pacific frequency records.
- `build_win11.bat`: One-click command-line build script.
- `README_WIN11.md`: Detailed Windows-specific setup guide.

### Building in Visual Studio 2022

#### Option A: Visual Studio IDE
1. Open **Visual Studio 2022**.
2. Open `FRG8800_CAT_Win11.sln`.
3. In the top toolbar, select **Release** and **x64**.
4. Press `Ctrl + Shift + B` (or select **Build** → **Build Solution**).
5. Run the compiled executable at:
   ```
   x64\Release\FRG8800_CAT_Win11.exe
   ```

#### Option B: One-Click Developer Command Prompt
1. Open **Developer Command Prompt for VS 2022** from your Windows Start Menu.
2. Change directory into the project folder:
   ```cmd
   cd C:\path\to\FRG8800_CAT_Win11
   ```
3. Run the batch build script:
   ```cmd
   build_win11.bat
   ```
4. The script will invoke `msbuild`, compile in Release x64 mode, and automatically launch the application.

---

## Hardware CAT Cable & Serial Specifications

### Serial Port Parameters
| Parameter | Setting | Notes |
| :--- | :--- | :--- |
| **Baud Rate** | `4800 bps` | Fixed by FRG-8800 internal CAT ROM |
| **Data Bits** | `8` | Standard |
| **Parity** | `None` | No parity |
| **Stop Bits** | `2` | **8N2** requirement |
| **Flow Control**| `None` | Hardware flow control not used |
| **DTR Line** | **DISABLED / OFF** | Prevent holding radio in reset/PTT |
| **RTS Line** | **DISABLED / OFF** | Prevent holding radio in reset/PTT |
| **Command Pacing**| `65 ms` | Required minimum between 5-byte packets |

### Rear Panel CAT 6-Pin DIN Pinout
| Pin Number | Function | Description |
| :---: | :--- | :--- |
| **1** | **SERIAL DATA IN** | Connect to FTDI **TXD** (Active LOW TTL, 0–5V) |
| **2** | **GND** | Connect to FTDI **GND** |
| **3** | **STANDBY / NC** | Not connected |
| **4** | **+5V DC OUT** | Optional reference voltage from receiver |
| **5** | **NC / SHIELD** | Not connected |
| **6** | **CHASSIS GROUND**| Cable shield / ground |

> ⚠️ **Important Wiring Note**: The Yaesu FRG-8800 CAT input operates at **TTL 5V active LOW levels**. Ensure your USB serial converter is configured for **5V TTL logic levels** (or use an FTDI FT232R set to 5V I/O). Do not connect standard RS-232 (+/-12V) signals directly to the radio without an inverter/level shifter.

### CAT 5-Byte Instruction Packet Format
The receiver accepts 5-byte instruction blocks transmitted at 4800 baud:

1. **Set Frequency:**
   - 4 frequency bytes (packed BCD) followed by opcode `0x01` or `0x00`.
   - Example (7,100.0 kHz): `[0x07, 0x10, 0x00, 0x00, 0x01]`
2. **Set Operating Mode:**
   - Opcode `0x80`: `[0x00, 0x00, 0x00, ModeCode, 0x80]`
   - Mode codes:
     - AM-Wide: `0x00`
     - AM-Narrow: `0x01`
     - LSB: `0x02`
     - USB: `0x03`
     - CW: `0x04`
     - FM: `0x05`

---

## Operating Instructions

### Direct Keypad Frequency Tuning
- Click numbers `0`–`9` on the numeric keypad to build your entry (e.g., `7`, `1`, `0`, `0`).
- Press **kHz** to commit the frequency in kHz (`7100 kHz` → `7.100 MHz`).
- Press **MHz** to commit the frequency in MHz (`14.2` → `14.200 MHz`).
- Press **ENT** to auto-detect and commit (values < 30 are treated as MHz, values ≥ 100 are treated as kHz).
- Press **CE** to backspace or clear entry.

### Memory Channel Selection
- Turn the **M CH** dial on the bottom right to channels `1` through `12`.
- Each channel is mapped to its corresponding memory bank (e.g., Ch 1 = Queensland MW, Ch 2 = RFDS, Ch 11 = EMS/LAW, Ch 12 = Digital Modes).
- Clicking any channel automatically sets the radio mode and tunes to the primary frequency in that bank.

### Scanning Controls
- Press **P SCAN** to initiate programmed range scanning.
- Press **PAUSE** to halt scan at the current frequency.
- Press **M SCAN** to cycle through stored memory bank channels.
- Press **M > VFO** to transfer the current memory channel into the active VFO.

---

## Troubleshooting

- **FTDI Serial Port Access Denied**: Ensure no other program (such as Ham Radio Deluxe, Omnirig, or an open terminal) is using the COM port.
- **Radio Doesn't Respond to Commands**:
  - Verify your cable uses **8 data bits, no parity, and 2 stop bits (8N2)** at **4800 baud**.
  - Verify that **DTR** and **RTS** lines are set to **OFF** (the software disables them by default).
  - Verify that the FTDI TX pin is connected to Pin 1 of the FRG-8800 DIN jack, and FTDI GND is connected to Pin 2.
- **Web Serial Permission Prompt**: Chromium browsers require a user gesture (clicking the "Connect" button) to open the device selection dialog.

---

## License

Distributed under the **MIT License**. You are free to modify, distribute, and adapt this software for personal or amateur radio use.

---

*73 and Good DX!*
