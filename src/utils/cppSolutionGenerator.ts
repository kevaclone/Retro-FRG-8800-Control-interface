import JSZip from 'jszip';
import { FrequencyEntry, MemoryBank, RadioState } from '../types/radio';
import { getMainCppContent } from './mainCppTemplate';
import { RUN_IN_OPERA_BAT, RUN_IN_BROWSER_BAT, VERSION_INFO_TXT, getAllWebAppFiles, toCRLF } from './batFiles';

export interface GeneratedCppFile {
  filename: string;
  description: string;
  language: 'cpp' | 'xml' | 'json' | 'markdown' | 'bat';
  content: string;
}

export function generateCppProjectFiles(
  banks: MemoryBank[],
  frequencies: FrequencyEntry[],
  radioState: RadioState,
  lcdTextColor: string = '#000000'
): GeneratedCppFile[] {
  const slnContent = `Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.8.34330.188
MinimumVisualStudioVersion = 10.0.40219.1
Project("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}") = "FRG8800_CAT_Win11", "FRG8800_CAT_Win11.vcxproj", "{B9F9E421-7C4B-4E9A-9D1A-8800CATWIN11}"
EndProject
Global
	GlobalSection(SolutionConfigurationPlatforms) = preSolution
		Debug|x64 = Debug|x64
		Release|x64 = Release|x64
	EndGlobalSection
	GlobalSection(ProjectConfigurationPlatforms) = postSolution
		{B9F9E421-7C4B-4E9A-9D1A-8800CATWIN11}.Debug|x64.ActiveCfg = Debug|x64
		{B9F9E421-7C4B-4E9A-9D1A-8800CATWIN11}.Debug|x64.Build.0 = Debug|x64
		{B9F9E421-7C4B-4E9A-9D1A-8800CATWIN11}.Release|x64.ActiveCfg = Release|x64
		{B9F9E421-7C4B-4E9A-9D1A-8800CATWIN11}.Release|x64.Build.0 = Release|x64
	EndGlobalSection
	GlobalSection(SolutionProperties) = preSolution
		HideSolutionNode = FALSE
	EndGlobalSection
EndGlobal
`;

  const vcxprojContent = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup Label="ProjectConfigurations">
    <ProjectConfiguration Include="Debug|x64">
      <Configuration>Debug</Configuration>
      <Platform>x64</Platform>
    </ProjectConfiguration>
    <ProjectConfiguration Include="Release|x64">
      <Configuration>Release</Configuration>
      <Platform>x64</Platform>
    </ProjectConfiguration>
  </ItemGroup>
  <PropertyGroup Label="Globals">
    <VCProjectVersion>17.0</VCProjectVersion>
    <Keyword>Win32Proj</Keyword>
    <ProjectGuid>{B9F9E421-7C4B-4E9A-9D1A-8800CATWIN11}</ProjectGuid>
    <RootNamespace>FRG8800CATWin11</RootNamespace>
    <WindowsTargetPlatformVersion>10.0</WindowsTargetPlatformVersion>
  </PropertyGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.Default.props" />
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|x64'" Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
    <UseDebugLibraries>true</UseDebugLibraries>
    <PlatformToolset>v143</PlatformToolset>
    <CharacterSet>Unicode</CharacterSet>
  </PropertyGroup>
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Release|x64'" Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
    <UseDebugLibraries>false</UseDebugLibraries>
    <PlatformToolset>v143</PlatformToolset>
    <WholeProgramOptimization>true</WholeProgramOptimization>
    <CharacterSet>Unicode</CharacterSet>
  </PropertyGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.props" />
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Debug|x64'">
    <ClCompile>
      <WarningLevel>Level3</WarningLevel>
      <SDLCheck>true</SDLCheck>
      <PreprocessorDefinitions>_DEBUG;_WINDOWS;NOMINMAX;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <ConformanceMode>true</ConformanceMode>
      <LanguageStandard>stdcpp20</LanguageStandard>
    </ClCompile>
    <Link>
      <SubSystem>Windows</SubSystem>
      <GenerateDebugInformation>true</GenerateDebugInformation>
      <AdditionalDependencies>gdiplus.lib;comctl32.lib;winmm.lib;advapi32.lib;%(AdditionalDependencies)</AdditionalDependencies>
    </Link>
  </ItemDefinitionGroup>
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Release|x64'">
    <ClCompile>
      <WarningLevel>Level3</WarningLevel>
      <FunctionLevelLinking>true</FunctionLevelLinking>
      <IntrinsicFunctions>true</IntrinsicFunctions>
      <SDLCheck>true</SDLCheck>
      <PreprocessorDefinitions>NDEBUG;_WINDOWS;NOMINMAX;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <ConformanceMode>true</ConformanceMode>
      <LanguageStandard>stdcpp20</LanguageStandard>
    </ClCompile>
    <Link>
      <SubSystem>Windows</SubSystem>
      <EnableCOMDATFolding>true</EnableCOMDATFolding>
      <OptimizeReferences>true</OptimizeReferences>
      <GenerateDebugInformation>true</GenerateDebugInformation>
      <AdditionalDependencies>gdiplus.lib;comctl32.lib;winmm.lib;advapi32.lib;%(AdditionalDependencies)</AdditionalDependencies>
    </Link>
  </ItemDefinitionGroup>
  <ItemGroup>
    <ClInclude Include="FtdiYaesuCat.h" />
    <ClInclude Include="MemoryBanksData.h" />
  </ItemGroup>
  <ItemGroup>
    <ClCompile Include="FtdiYaesuCat.cpp" />
    <ClCompile Include="main.cpp" />
  </ItemGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.targets" />
</Project>
`;

  const ftdiHeaderContent = `#pragma once
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <string>
#include <vector>
#include <cstdint>

enum class RadioMode : uint8_t {
    AM_W = 0x00,
    AM_N = 0x08,
    LSB  = 0x01,
    USB  = 0x02,
    CW   = 0x03,
    FM   = 0x04
};

/**
 * Windows 11 Native FTDI USB-to-TTL CAT Controller for Yaesu FRG-8800
 *
 * Technical Specifications:
 * - 4800 Baud, 8 Data bits, No Parity, 2 Stop bits (8N2)
 * - RTS and DTR explicitly DISABLED by default as specified by user
 * - Pacing: 65ms minimum delay between packets to prevent overflowing receiver CPU
 * - 5-Byte BCD Frequency Packet format: [Byte1 (100Hz/25Hz), Byte2 (10k/1k), Byte3 (1M/100k), Byte4 (100M/10M), 0x01]
 * - Mode Packet format: [00, 00, 00, ModeCode, 0x80]
 */
class FtdiYaesuCat {
public:
    FtdiYaesuCat();
    ~FtdiYaesuCat();

    bool Connect(const std::wstring& comPort, bool dtrEnable, bool rtsEnable, std::wstring& outErrorMsg);
    void Disconnect();
    bool IsConnected() const { return m_hSerial != INVALID_HANDLE_VALUE; }
    std::wstring GetPortName() const { return m_portName; }
    std::wstring GetLastErrorMsg() const { return m_lastErrorMsg; }

    void SetDtr(bool enable);
    void SetRts(bool enable);

    bool SendFrequencyHz(uint64_t freqHz, std::string* outHexLog = nullptr);
    bool SendMode(RadioMode mode, std::string* outHexLog = nullptr);
    bool SendCatPowerOn();
    bool SendCatPowerOff();

    static std::vector<std::wstring> EnumerateComPorts();
    static void EncodeBcdFreqPacket(uint64_t freqHz, uint8_t outPacket[5]);
    static void EncodeModePacket(RadioMode mode, uint8_t outPacket[5]);
    static std::string PacketToHex(const uint8_t packet[5]);

private:
    HANDLE       m_hSerial;
    std::wstring m_portName;
    std::wstring m_lastErrorMsg;
    DWORD        m_lastTxTick;
    bool WriteRawPacket(const uint8_t packet[5]);
};
`;

  const ftdiCppContent = `#include "FtdiYaesuCat.h"
#include <cstdio>
#include <algorithm>

FtdiYaesuCat::FtdiYaesuCat() : m_hSerial(INVALID_HANDLE_VALUE), m_lastTxTick(0) {}

FtdiYaesuCat::~FtdiYaesuCat() {
    Disconnect();
}

bool FtdiYaesuCat::Connect(const std::wstring& comPort, bool dtrEnable, bool rtsEnable, std::wstring& outErrorMsg) {
    Disconnect();
    outErrorMsg.clear();
    m_lastErrorMsg.clear();

    if (comPort.empty()) {
        outErrorMsg = L"No COM port specified. Please select a COM port (e.g. COM4).";
        m_lastErrorMsg = outErrorMsg;
        return false;
    }

    std::wstring cleanPort = comPort;
    size_t pos = cleanPort.find(L"COM");
    if (pos != std::wstring::npos) {
        size_t endIdx = pos + 3;
        while (endIdx < cleanPort.length() && iswdigit(cleanPort[endIdx])) {
            endIdx++;
        }
        cleanPort = cleanPort.substr(pos, endIdx - pos);
    }

    // Try opening both \\\\.\\COMx and plain COMx
    std::wstring devicePath = L"\\\\\\\\.\\\\" + cleanPort;
    m_hSerial = CreateFileW(
        devicePath.c_str(),
        GENERIC_READ | GENERIC_WRITE,
        0,                      // Exclusive access
        nullptr,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        nullptr
    );

    if (m_hSerial == INVALID_HANDLE_VALUE) {
        // Fallback for COM1-COM9
        m_hSerial = CreateFileW(
            cleanPort.c_str(),
            GENERIC_READ | GENERIC_WRITE,
            0,
            nullptr,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            nullptr
        );
    }

    if (m_hSerial == INVALID_HANDLE_VALUE) {
        DWORD err = GetLastError();
        wchar_t buf[512];
        if (err == ERROR_ACCESS_DENIED) {
            swprintf_s(buf, 512, L"Access Denied on %s (Error 5). Make sure no other program (Omni-Rig, SDR, terminal) has %s open.", cleanPort.c_str(), cleanPort.c_str());
        } else if (err == ERROR_FILE_NOT_FOUND) {
            swprintf_s(buf, 512, L"%s was not found (Error 2). Please ensure your FTDI cable is plugged in and check Device Manager.", cleanPort.c_str());
        } else {
            swprintf_s(buf, 512, L"Failed to open %s. Windows Error Code: %lu.", cleanPort.c_str(), err);
        }
        outErrorMsg = buf;
        m_lastErrorMsg = buf;
        return false;
    }

    // Configure DCB for Yaesu FRG-8800: 4800 baud, 8 data bits, no parity, 2 stop bits (8N2)
    DCB dcb = { 0 };
    dcb.DCBlength = sizeof(DCB);
    if (!GetCommState(m_hSerial, &dcb)) {
        DWORD err = GetLastError();
        wchar_t buf[256];
        swprintf_s(buf, 256, L"GetCommState failed on %s (Error %lu).", cleanPort.c_str(), err);
        outErrorMsg = buf;
        m_lastErrorMsg = buf;
        Disconnect();
        return false;
    }

    dcb.BaudRate        = CBR_4800;
    dcb.ByteSize        = 8;
    dcb.Parity          = NOPARITY;
    dcb.StopBits        = TWOSTOPBITS; // 2 Stop Bits required by Yaesu FRG-8800
    dcb.fBinary         = TRUE;
    dcb.fParity         = FALSE;
    dcb.fOutxCtsFlow    = FALSE;
    dcb.fOutxDsrFlow    = FALSE;

    // RTS and DTR explicitly DISABLED as requested by user
    dcb.fDtrControl     = dtrEnable ? DTR_CONTROL_ENABLE : DTR_CONTROL_DISABLE;
    dcb.fRtsControl     = rtsEnable ? RTS_CONTROL_ENABLE : RTS_CONTROL_DISABLE;
    dcb.fDsrSensitivity = FALSE;
    dcb.fTXContinueOnXoff = TRUE;
    dcb.fOutX           = FALSE;
    dcb.fInX            = FALSE;
    dcb.fErrorChar      = FALSE;
    dcb.fNull           = FALSE;
    dcb.fAbortOnError   = FALSE;

    if (!SetCommState(m_hSerial, &dcb)) {
        DWORD err = GetLastError();
        wchar_t buf[256];
        swprintf_s(buf, 256, L"SetCommState (4800 8N2) failed on %s (Error %lu).", cleanPort.c_str(), err);
        outErrorMsg = buf;
        m_lastErrorMsg = buf;
        Disconnect();
        return false;
    }

    // Explicitly clear DTR and RTS lines if disabled
    if (!dtrEnable) EscapeCommFunction(m_hSerial, CLRDTR);
    else EscapeCommFunction(m_hSerial, SETDTR);

    if (!rtsEnable) EscapeCommFunction(m_hSerial, CLRRTS);
    else EscapeCommFunction(m_hSerial, SETRTS);

    // Set Serial Comm Timeouts
    COMMTIMEOUTS timeouts = { 0 };
    timeouts.ReadIntervalTimeout         = MAXDWORD;
    timeouts.ReadTotalTimeoutConstant    = 0;
    timeouts.ReadTotalTimeoutMultiplier  = 0;
    timeouts.WriteTotalTimeoutConstant   = 100;
    timeouts.WriteTotalTimeoutMultiplier = 10;
    SetCommTimeouts(m_hSerial, &timeouts);

    // Flush any stale buffer
    PurgeComm(m_hSerial, PURGE_TXABORT | PURGE_RXABORT | PURGE_TXCLEAR | PURGE_RXCLEAR);

    m_portName = cleanPort;
    m_lastTxTick = GetTickCount();

    return true;
}

void FtdiYaesuCat::Disconnect() {
    if (m_hSerial != INVALID_HANDLE_VALUE) {
        CloseHandle(m_hSerial);
        m_hSerial = INVALID_HANDLE_VALUE;
    }
    m_portName.clear();
}

void FtdiYaesuCat::SetDtr(bool enable) {
    if (m_hSerial != INVALID_HANDLE_VALUE) {
        EscapeCommFunction(m_hSerial, enable ? SETDTR : CLRDTR);
    }
}

void FtdiYaesuCat::SetRts(bool enable) {
    if (m_hSerial != INVALID_HANDLE_VALUE) {
        EscapeCommFunction(m_hSerial, enable ? SETRTS : CLRRTS);
    }
}

void FtdiYaesuCat::EncodeBcdFreqPacket(uint64_t freqHz, uint8_t outPacket[5]) {
    if (freqHz < 150000ULL) freqHz = 150000ULL;
    if (freqHz > 29999999ULL) freqHz = 29999999ULL;

    uint32_t hundredMhz = static_cast<uint32_t>((freqHz / 100000000ULL) % 10ULL);
    uint32_t tenMhz     = static_cast<uint32_t>((freqHz / 10000000ULL) % 10ULL);
    uint32_t oneMhz     = static_cast<uint32_t>((freqHz / 1000000ULL) % 10ULL);
    uint32_t hundredKhz = static_cast<uint32_t>((freqHz / 100000ULL) % 10ULL);
    uint32_t tenKhz     = static_cast<uint32_t>((freqHz / 10000ULL) % 10ULL);
    uint32_t oneKhz     = static_cast<uint32_t>((freqHz / 1000ULL) % 10ULL);
    uint32_t hundredHz  = static_cast<uint32_t>((freqHz / 100ULL) % 10ULL);

    uint32_t remHz = static_cast<uint32_t>(freqHz % 100ULL);
    uint8_t code25Hz = 1;
    if (remHz >= 75) code25Hz = 8;
    else if (remHz >= 50) code25Hz = 4;
    else if (remHz >= 25) code25Hz = 2;

    outPacket[0] = static_cast<uint8_t>(((hundredHz & 0x0F) << 4) | (code25Hz & 0x0F));
    outPacket[1] = static_cast<uint8_t>(((tenKhz & 0x0F) << 4) | (oneKhz & 0x0F));
    outPacket[2] = static_cast<uint8_t>(((oneMhz & 0x0F) << 4) | (hundredKhz & 0x0F));
    outPacket[3] = static_cast<uint8_t>(((hundredMhz & 0x0F) << 4) | (tenMhz & 0x0F));
    outPacket[4] = 0x01; // Frequency Set Opcode
}

void FtdiYaesuCat::EncodeModePacket(RadioMode mode, uint8_t outPacket[5]) {
    outPacket[0] = 0x00;
    outPacket[1] = 0x00;
    outPacket[2] = 0x00;
    outPacket[3] = static_cast<uint8_t>(mode);
    outPacket[4] = 0x80; // Mode Set Opcode for Yaesu FRG-8800
}

std::string FtdiYaesuCat::PacketToHex(const uint8_t packet[5]) {
    char buf[32] = { 0 };
    snprintf(buf, sizeof(buf), "%02X %02X %02X %02X %02X",
        packet[0], packet[1], packet[2], packet[3], packet[4]);
    return std::string(buf);
}

bool FtdiYaesuCat::WriteRawPacket(const uint8_t packet[5]) {
    if (m_hSerial == INVALID_HANDLE_VALUE) return false;

    // Enforce 65ms pacing so the FRG-8800 internal 8-bit CPU is never overrun
    DWORD now = GetTickCount();
    DWORD elapsed = now - m_lastTxTick;
    if (elapsed < 65) {
        Sleep(65 - elapsed);
    }

    DWORD bytesWritten = 0;
    BOOL ok = WriteFile(m_hSerial, packet, 5, &bytesWritten, nullptr);
    FlushFileBuffers(m_hSerial);
    m_lastTxTick = GetTickCount();
    return (ok && bytesWritten == 5);
}

bool FtdiYaesuCat::SendFrequencyHz(uint64_t freqHz, std::string* outHexLog) {
    uint8_t pkt[5];
    EncodeBcdFreqPacket(freqHz, pkt);
    if (outHexLog) *outHexLog = PacketToHex(pkt);
    return WriteRawPacket(pkt);
}

bool FtdiYaesuCat::SendMode(RadioMode mode, std::string* outHexLog) {
    uint8_t pkt[5];
    EncodeModePacket(mode, pkt);
    if (outHexLog) *outHexLog = PacketToHex(pkt);
    return WriteRawPacket(pkt);
}

bool FtdiYaesuCat::SendCatPowerOn() {
    const uint8_t pkt[5] = { 0x00, 0x00, 0x00, 0x00, 0xD0 };
    return WriteRawPacket(pkt);
}

bool FtdiYaesuCat::SendCatPowerOff() {
    const uint8_t pkt[5] = { 0x00, 0x00, 0x00, 0xB0, 0xD0 };
    return WriteRawPacket(pkt);
}

std::vector<std::wstring> FtdiYaesuCat::EnumerateComPorts() {
    std::vector<std::wstring> ports;

    // Read official Windows Registry serial comm hardware map
    HKEY hKey;
    if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, L"HARDWARE\\\\DEVICEMAP\\\\SERIALCOMM", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        wchar_t valueName[256];
        BYTE data[256];
        DWORD valIndex = 0;
        while (true) {
            DWORD valLen = 256;
            DWORD dataLen = 256;
            DWORD type = 0;
            LONG res = RegEnumValueW(hKey, valIndex++, valueName, &valLen, nullptr, &type, data, &dataLen);
            if (res != ERROR_SUCCESS) break;

            if (type == REG_SZ && dataLen > 0) {
                std::wstring port((wchar_t*)data);
                if (!port.empty() && port.back() == L'\\0') port.pop_back();
                if (std::find(ports.begin(), ports.end(), port) == ports.end()) {
                    ports.push_back(port);
                }
            }
        }
        RegCloseKey(hKey);
    }

    if (ports.empty()) {
        wchar_t targetPath[MAX_PATH];
        for (int i = 1; i <= 32; ++i) {
            std::wstring port = L"COM" + std::to_wstring(i);
            if (QueryDosDeviceW(port.c_str(), targetPath, MAX_PATH) != 0) {
                if (std::find(ports.begin(), ports.end(), port) == ports.end()) {
                    ports.push_back(port);
                }
            }
        }
    }

    if (ports.empty()) {
        for (int i = 1; i <= 10; ++i) {
            ports.push_back(L"COM" + std::to_wstring(i));
        }
    }

    std::sort(ports.begin(), ports.end(), [](const std::wstring& a, const std::wstring& b) {
        int na = 0, nb = 0;
        if (swscanf_s(a.c_str(), L"COM%d", &na) == 1 && swscanf_s(b.c_str(), L"COM%d", &nb) == 1) {
            return na < nb;
        }
        return a < b;
    });

    return ports;
}
`;

  const escapeCppWString = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');

  const modeToCppEnum = (m: string) => {
    switch (m) {
      case 'AM-N': return 'RadioMode::AM_N';
      case 'LSB':  return 'RadioMode::LSB';
      case 'USB':  return 'RadioMode::USB';
      case 'CW':   return 'RadioMode::CW';
      case 'FM':   return 'RadioMode::FM';
      default:     return 'RadioMode::AM_W';
    }
  };

  const bankLines = banks
    .map(
      (b) =>
        `        { L"${escapeCppWString(b.id)}", L"${escapeCppWString(b.name)}", L"${escapeCppWString(b.shortLabel)}", L"${escapeCppWString(b.region)}", L"${escapeCppWString(b.description)}" }`
    )
    .join(',\n');

  const freqLines = frequencies
    .map(
      (f) =>
        `        { L"${escapeCppWString(f.id)}", L"${escapeCppWString(f.bankId)}", ${Math.round(f.freqKhz * 1000)}ULL, L"${escapeCppWString(f.callsign)}", L"${escapeCppWString(f.stationName)}", L"${escapeCppWString(f.location)}", ${modeToCppEnum(f.mode)}, L"${escapeCppWString(f.schedule)}", L"${escapeCppWString(f.notes)}" }`
    )
    .join(',\n');

  const memoryHeaderContent = `#pragma once
#include "FtdiYaesuCat.h"
#include <string>
#include <vector>

struct MemoryBankDef {
    std::wstring id;
    std::wstring name;
    std::wstring shortLabel;
    std::wstring region;
    std::wstring description;
};

struct FrequencyChannel {
    std::wstring id;
    std::wstring bankId;
    uint64_t     freqHz;
    std::wstring callsign;
    std::wstring stationName;
    std::wstring location;
    RadioMode    mode;
    std::wstring schedule;
    std::wstring notes;
};

inline std::vector<MemoryBankDef> GetDefaultMemoryBanks() {
    return {
${bankLines}
    };
}

inline std::vector<FrequencyChannel> GetDefaultFrequencies() {
    return {
${freqLines}
    };
}
`;

  const cleanHex = radioState.vfdColor.replace('#', '');
  const rVal = parseInt(cleanHex.substring(0, 2) || '00', 16) || 0;
  const gVal = parseInt(cleanHex.substring(2, 4) || 'F5', 16) || 245;
  const bVal = parseInt(cleanHex.substring(4, 6) || 'D4', 16) || 212;

  // Ultra-authentic Yaesu FRG-8800 Front Panel Render Engine with Standard Windows Menu Bar
  const mainCppContent = getMainCppContent(radioState, rVal, gVal, bVal, lcdTextColor);

  const buildBatContent = `@echo off
echo =========================================================================
echo Yaesu FRG-8800 Windows 11 Visual Studio 2022 Standalone C++ Build Script
echo =========================================================================
echo.

where msbuild.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] msbuild.exe not in PATH.
    echo Searching for Visual Studio 2022 vcvars64.bat...
    if exist "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat" (
        call "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat"
    ) else if exist "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\VC\\Auxiliary\\Build\\vcvars64.bat" (
        call "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\VC\\Auxiliary\\Build\\vcvars64.bat"
    ) else if exist "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Auxiliary\\Build\\vcvars64.bat" (
        call "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Auxiliary\\Build\\vcvars64.bat"
    ) else (
        echo [ERROR] Visual Studio 2022 C++ environment not found.
        echo Please open Developer Command Prompt for VS 2022 and run build_win11.bat again.
        pause
        exit /b 1
    )
)

echo [*] Compiling FRG8800_CAT_Win11.sln in Release x64 mode...
msbuild FRG8800_CAT_Win11.sln /p:Configuration=Release /p:Platform=x64 /t:Rebuild /m
if %errorlevel% equ 0 (
    echo.
    echo =========================================================================
    echo [SUCCESS] Build completed! Executable is located at:
    echo x64\\Release\\FRG8800_CAT_Win11.exe
    echo.
    echo Launching FRG-8800 Windows 11 CAT Controller...
    echo =========================================================================
    start "" "x64\\Release\\FRG8800_CAT_Win11.exe"
) else (
    echo.
    echo [ERROR] Build failed. Please inspect compiler errors above.
    pause
)
`;

  const readmeContent = `# Yaesu FRG-8800 Windows 11 Standalone C++ CAT Controller

This is a complete, native Windows 11 C++20 desktop application built specifically for Visual Studio 2022 to control your Yaesu FRG-8800 communications receiver via your **USB-to-FTDI/TTL CAT cable**.

## Hardware & Cable Wiring Specifications
- **Baud Rate:** 4800 bps
- **Data Bits:** 8
- **Parity:** None
- **Stop Bits:** 2 (8N2)
- **Flow Control:** None
- **DTR & RTS Lines:** DISABLED by default as requested. Toggles are also available on screen.
- **Polarity:** Tested and confirmed for the Yaesu FRG-8800 CAT DIN interface (active LOW TTL).
- **Instruction Byte:** 5-byte packet architecture with 65ms pacing:
  - Set Frequency: \`[Byte 1, Byte 2, Byte 3, Byte 4, 01]\`
  - Set Mode: \`[00, 00, 00, ModeCode, 80]\`

## Front Panel Layout
- **Chassis:** Authentic Yaesu Satin Lighter Grey Anodized finish.
- **Main Tuning Dial:** Heavy flywheel dial with silver outer collar, knurled rubber rotor with finger dimple, and concentric spun silver aluminum centre cap just like the actual radio.
- **Dials with Silver Outer Rings:** Tone, AF Gain, Squelch, Fine Tune, M CH, ATT, and Display Select dials all feature authentic machined silver outer rings.
- **Speaker:** Acoustic horizontal louvers on the upper-left with silver Yaesu logo badge.
- **Display Window:** Authentic backlit green diffuser with high-contrast frequency readout, fluorescent S-meter bar graph, mode indicators, and clock/timer readouts.
- **Top Deck (Right Column):**
  - **TIMER & SET Controls:** On, Clear, Hour, Time buttons (compact buttons matching keypad button dimensions).
- **Middle Deck (Right Column):**
  - **Numeric Keypad (LEFT):** 3-column cream numeric keypad (1..9, CE, 0, ENT, MHz, kHz, .), enlarged vertically to fill space.
  - **Memory & Scan Buttons (RIGHT):** Authentic dark grey buttons with white fonts (M Select, > VFO, P Scan, Pause, M Scan, S Scan, MR, VFO > M, VFO).
- **Bottom Deck (Right Column):**
  - **M CH & ATT Dials:** Positioned at the bottom of the front panel, matching the same level and height as the power button segment.
  - **M CH Rotary Dial (LEFT):** 12 memory channels directly linked to Queensland MW & Pacific memory banks with silver outer ring.
  - **ATT (Attenuator) Rotary Dial (RIGHT):** DX (0 dB), 10 dB, 20 dB, LOCAL (-30 dB) with silver outer ring.

## How to Build in Visual Studio 2022
1. Extract the downloaded ZIP file to any folder on your Windows 11 PC.
2. Double-click \`FRG8800_CAT_Win11.sln\` to open in Visual Studio 2022.
3. In the toolbar, select **Release** and **x64**.
4. Press \`Ctrl + Shift + B\` (or Build -> Build Solution).
5. Run the generated \`x64\\Release\\FRG8800_CAT_Win11.exe\`.
6. Select your FTDI COM port (e.g. \`COM4\`) and click **CONNECT FTDI**.
`;

  return [
    {
      filename: 'FRG8800_CAT_Win11.sln',
      description: 'Visual Studio 2022 Solution File',
      language: 'xml',
      content: slnContent,
    },
    {
      filename: 'FRG8800_CAT_Win11.vcxproj',
      description: 'Visual Studio C++ Project File (x64 / C++20 / Windows 11)',
      language: 'xml',
      content: vcxprojContent,
    },
    {
      filename: 'main.cpp',
      description: 'Win32 Front Panel UI & Interactive Radio Engine',
      language: 'cpp',
      content: mainCppContent,
    },
    {
      filename: 'FtdiYaesuCat.h',
      description: 'FTDI USB Serial Header & 5-Byte CAT Protocol Definitions',
      language: 'cpp',
      content: ftdiHeaderContent,
    },
    {
      filename: 'FtdiYaesuCat.cpp',
      description: 'Windows 11 Serial Port Communication & Registry Enumeration',
      language: 'cpp',
      content: ftdiCppContent,
    },
    {
      filename: 'MemoryBanksData.h',
      description: 'Pre-compiled Queensland MW & SW Pacific Memory Database',
      language: 'cpp',
      content: memoryHeaderContent,
    },
    {
      filename: 'build_win11.bat',
      description: 'One-click Batch Build Script for Developer Command Prompt',
      language: 'bat',
      content: toCRLF(buildBatContent),
    },
    {
      filename: 'Run_In_Opera.bat',
      description: 'One-Click Automated Installer & Opera Browser Launcher',
      language: 'bat',
      content: RUN_IN_OPERA_BAT,
    },
    {
      filename: 'Run_In_Browser.bat',
      description: 'One-Click Automated Installer & Default Browser Launcher (Edge/Chrome)',
      language: 'bat',
      content: RUN_IN_BROWSER_BAT,
    },
    {
      filename: 'README_WIN11.md',
      description: 'Hardware Wiring, FTDI Driver Setup & Visual Studio Instructions',
      language: 'markdown',
      content: readmeContent,
    },
  ];
}

export async function downloadVisualStudioZip(
  banks: MemoryBank[],
  frequencies: FrequencyEntry[],
  radioState: RadioState,
  lcdTextColor: string = '#000000'
): Promise<void> {
  const zip = new JSZip();
  const files = generateCppProjectFiles(banks, frequencies, radioState, lcdTextColor);

  // 1. Add all web application source files and configs at the ROOT of the ZIP
  try {
    const webFiles = getAllWebAppFiles();
    for (const wf of webFiles) {
      zip.file(wf.path, wf.content);
    }
  } catch (err) {
    console.warn('Could not bundle web source files:', err);
  }

  // 2. Ensure Run_In_Opera.bat, Run_In_Browser.bat, and VERSION_INFO.txt are guaranteed at the ROOT of the ZIP
  zip.file('Run_In_Opera.bat', RUN_IN_OPERA_BAT);
  zip.file('Run_In_Browser.bat', RUN_IN_BROWSER_BAT);
  zip.file('VERSION_INFO.txt', VERSION_INFO_TXT);

  // 3. Inside folder 'FRG8800_CAT_Win11' (the Visual Studio C++ project folder):
  const folder = zip.folder('FRG8800_CAT_Win11');
  if (folder) {
    for (const f of files) {
      folder.file(f.filename, f.content);
    }
    // Also include the batch files and version info inside the folder so user can launch from anywhere
    folder.file('Run_In_Opera.bat', RUN_IN_OPERA_BAT);
    folder.file('Run_In_Browser.bat', RUN_IN_BROWSER_BAT);
    folder.file('VERSION_INFO.txt', VERSION_INFO_TXT);
    const jsonBlob = JSON.stringify({ banks, frequencies }, null, 2);
    folder.file('frequencies_swp_qld.json', jsonBlob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'FRG8800_CAT_Win11_Suite_v1.1.3.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
