import { RadioState } from '../types/radio';

export function getMainCppContent(
  radioState: RadioState,
  rVal: number,
  gVal: number,
  bVal: number,
  lcdTextColor: string = '#000000'
): string {
  const cleanLcd = lcdTextColor.replace('#', '');
  const lcdR = parseInt(cleanLcd.substring(0, 2) || '0c', 16) || 12;
  const lcdG = parseInt(cleanLcd.substring(2, 4) || '10', 16) || 16;
  const lcdB = parseInt(cleanLcd.substring(4, 6) || '14', 16) || 20;

  return `/**
 * Yaesu FRG-8800 Windows 11 Standalone C++ Visual Studio Application
 * Clean Front Panel replica with standard Windows Menu Bar (File, View, Options, Help).
 * - Standard Windows Menu: Options (COM Port, DTR/RTS, Pacing), View (Memory Banks, VFD Colors), File (Export, Exit), Help.
 * - RTS and DTR explicitly DISABLED by default as specified.
 * - Authentic Front Panel layout: Left speaker/controls, Center VFD display & flywheel dial, Right 21-button keypad.
 * - Status Bar at the bottom for serial & radio diagnostics (clean front panel faceplate).
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <windowsx.h>
#include <commdlg.h>
#include <objidl.h>
#include <gdiplus.h>
#include <cmath>
#include <cstdio>
#include <ctime>
#include <string>
#include <vector>
#include <algorithm>

#include "FtdiYaesuCat.h"
#include "MemoryBanksData.h"

#pragma comment(lib, "gdiplus.lib")
#pragma comment(lib, "winmm.lib")
#pragma comment(lib, "advapi32.lib")

using namespace Gdiplus;

// Menu Command IDs
enum MenuIds {
    IDM_FILE_EXPORT = 2001,
    IDM_FILE_EXIT,
    IDM_VIEW_BANKS_TOGGLE,
    IDM_VIEW_COLOR_YAESU,
    IDM_VIEW_COLOR_AMBER,
    IDM_VIEW_COLOR_GREEN,
    IDM_VIEW_COLOR_RED,
    IDM_VIEW_COLOR_CUSTOM,
    IDM_VIEW_BRIGHT_100,
    IDM_VIEW_BRIGHT_75,
    IDM_VIEW_BRIGHT_50,
    IDM_VIEW_BRIGHT_25,
    IDM_VIEW_LCD_BLACK = 2050,
    IDM_VIEW_LCD_CHARCOAL,
    IDM_VIEW_LCD_GREEN,
    IDM_VIEW_LCD_AMBER,
    IDM_VIEW_LCD_WHITE,
    IDM_VIEW_LCD_CUSTOM,
    IDM_OPTIONS_CONNECT,
    IDM_OPTIONS_DISCONNECT,
    IDM_OPTIONS_RESCAN,
    IDM_OPTIONS_TOGGLE_DTR,
    IDM_OPTIONS_TOGGLE_RTS,
    IDM_HELP_SPECS,
    IDM_HELP_ABOUT,
    IDM_PORT_BASE = 2100 // 2100 to 2132 for COM ports
};

// UI Button IDs
enum ButtonIds {
    BTN_POWER = 100,
    BTN_DIMMER,
    BTN_REC,
    BTN_ATT_DX,
    BTN_ATT_NORM,
    BTN_ATT_LOCAL,
    BTN_NB,
    BTN_AGC,
    BTN_MODE_AMW,
    BTN_MODE_AMN,
    BTN_MODE_LSB,
    BTN_MODE_USB,
    BTN_MODE_CW,
    BTN_MODE_FM,
    BTN_VFO_MEM,
    BTN_DIAL_LOCK,
    BTN_TUNE_FAST_DN,
    BTN_TUNE_SLOW_DN,
    BTN_TUNE_SLOW_UP,
    BTN_TUNE_FAST_UP,
    BTN_STEP_1HZ,
    BTN_STEP_10HZ,
    BTN_STEP_100HZ,
    BTN_STEP_1KHZ,
    BTN_STEP_5KHZ,
    BTN_STEP_9KHZ,
    BTN_STEP_10KHZ,
    BTN_STEP_100KHZ,
    BTN_STEP_1MHZ,
    BTN_SWITCH_BW,
    BTN_SWITCH_AGC,
    BTN_SWITCH_NB,
    BTN_SWITCH_DIM,
    BTN_FINE_TUNE_DN10,
    BTN_FINE_TUNE_DN1,
    BTN_FINE_TUNE_UP1,
    BTN_FINE_TUNE_UP10,
    // Authentic Right Column Controls
    BTN_TIMER_ON = 150,
    BTN_TIMER_CLEAR,
    BTN_SET_HOUR,
    BTN_SET_TIME,
    BTN_DISP_SLEEP,
    BTN_DISP_OFF,
    BTN_DISP_ON,
    BTN_DISP_CLK1,
    BTN_DISP_FREQ,
    BTN_DISP_CLK2,
    BTN_DISP_KNOB,
    BTN_M_SELECT,
    BTN_TO_VFO,
    BTN_P_SCAN,
    BTN_PAUSE,
    BTN_M_SCAN,
    BTN_S_SCAN,
    BTN_MR_MEM,
    BTN_VFO_TO_M,
    BTN_VFO_WIDE,
    BTN_KEY_DOT,
    BTN_MCH_DIAL_KNOB,
    BTN_ATT_DIAL_KNOB,
    BTN_ATT_DX_POS,
    BTN_ATT_10DB_POS,
    BTN_ATT_20DB_POS,
    BTN_ATT_LOCAL_POS,
    BTN_MCH_BASE = 250, // 250 to 261 for CH 1..12
    // Authentic Numeric Keypad Keys
    BTN_KEYPAD_1 = 301,
    BTN_KEYPAD_2,
    BTN_KEYPAD_3,
    BTN_KEYPAD_4,
    BTN_KEYPAD_5,
    BTN_KEYPAD_6,
    BTN_KEYPAD_7,
    BTN_KEYPAD_8,
    BTN_KEYPAD_9,
    BTN_KEYPAD_CE,
    BTN_KEYPAD_0,
    BTN_KEYPAD_ENT,
    BTN_KEYPAD_MHZ,
    BTN_KEYPAD_KHZ,
    BTN_KEYPAD_MR,
    BTN_KEYPAD_MW,
    BTN_KEYPAD_SCAN,
    BTN_KEYPAD_SKIP,
    BTN_KEYPAD_PRI,
    BTN_KEYPAD_TIME,
    BTN_KEYPAD_TIMER,
    BTN_KEYPAD_SET,
    BTN_CLAR_ZERO,
    BTN_BANK_ADD = 450,
    BTN_BANK_EDIT,
    BTN_BANK_SCAN,
    BTN_SCROLL_UP = 460,
    BTN_SCROLL_DOWN,
    BTN_MODAL_SAVE = 470,
    BTN_MODAL_CANCEL,
    BTN_MODAL_LOAD_VFO,
    BTN_MODAL_MODE_CYCLE,
    BTN_MODAL_FREQ_UP,
    BTN_MODAL_FREQ_DN,
    BTN_MODAL_EDIT_ID,
    BTN_MODAL_EDIT_NAME,
    BTN_MODAL_EDIT_LOC,
    BTN_BANK_BASE = 500,
    BTN_CHAN_TUNE_BASE = 1000,
    BTN_CHAN_EDIT_BASE = 2000,
    BTN_CHAN_DEL_BASE  = 3000
};

struct AppState {
    bool      powerOn       = true;
    uint64_t  freqHz        = ${radioState.freqHz}ULL;
    RadioMode mode          = RadioMode::AM_W;
    uint64_t  stepHz        = ${radioState.stepHz}ULL;
    double    dialAngleDeg  = 0.0;
    bool      draggingDial  = false;
    bool      dialLocked    = false;
    int       vfoMode       = 0; // 0=VFO, 1=MEM
    bool      isScanning    = false;

    // Authentic Backlit Green LCD Display with Default Black Digits
    BYTE      vfdR          = 60;
    BYTE      vfdG          = 208;
    BYTE      vfdB          = 112;
    BYTE      lcdTextR      = ${lcdR}; // Authentic Black Liquid Crystal default
    BYTE      lcdTextG      = ${lcdG};
    BYTE      lcdTextB      = ${lcdB};
    float     vfdBrightness = ${radioState.vfdBrightness.toFixed(2)}f;

    // Display Select Dial (0=Sleep, 1=Off, 2=On, 3=Clock1, 4=Freq, 5=Clock2)
    int       displaySelect = 4; // default Freq

    // Memory Channel (1..12) linked to memory banks
    int       memoryChannel = 1;

    // Front Panel Controls
    float     afGain        = 0.70f;
    float     rfGain        = 0.90f;
    float     squelch       = 0.15f;
    float     tone          = 0.50f;
    int       clarifierHz   = 0;
    bool      nbOn          = false;
    bool      agcFast       = true;
    int       attMode       = 0; // 0=DX (0dB), 1=10dB, 2=20dB, 3=LOCAL (30dB)
    bool      recStandby    = false;
    int       clockMode     = 0; // 0=QLD AEST, 1=UTC, 2=TIMER

    // Keypad entry buffer
    std::wstring keypadBuffer;

    // View Options (Clean front panel: memory banks toggled from View menu)
    bool      showMemoryBanks = false;

    // Memory Banks & Channels (Scrollable & Editable per user requirement)
    std::vector<MemoryBankDef>    banks;
    std::vector<FrequencyChannel> channels;
    size_t    selectedBankIdx = 0;
    int       bankScrollOffset = 0;

    // Modal Edit Panel
    bool         showEditModal = false;
    int          editingChannelIdx = -1;
    uint64_t     editFreqHz = 0;
    RadioMode    editMode = RadioMode::AM_W;
    std::wstring editCallsign;
    std::wstring editStationName;
    std::wstring editLocation;

    // FTDI USB Serial CAT Engine (DTR and RTS explicitly DISABLED by default)
    FtdiYaesuCat catSerial;
    std::vector<std::wstring> comPorts;
    int         selectedComIdx  = 0;
    bool        dtrEnabled      = false; // DISABLED
    bool        rtsEnabled      = false; // DISABLED
    std::string lastCatHex      = "00 61 20 00 01";
    std::wstring statusMessage  = L"CAT Ready (RTS/DTR OFF). Select COM port in 'Options' menu.";
    bool         hasError       = false;
};

static AppState g_app;
static ULONG_PTR g_gdiplusToken = 0;

struct HitButton {
    int id;
    RectF rect;
    std::wstring label;
};
static std::vector<HitButton> g_buttons;

// Flywheel dial centered in center section
static const RectF DIAL_RECT(560.0f, 215.0f, 150.0f, 150.0f);

void SyncRadioCat(bool modeChanged = false) {
    if (g_app.catSerial.IsConnected()) {
        g_app.catSerial.SendFrequencyHz(g_app.freqHz, &g_app.lastCatHex);
        if (modeChanged) {
            g_app.catSerial.SendMode(g_app.mode, &g_app.lastCatHex);
        }
    }
}

void StepFrequency(int64_t deltaHz) {
    if (!g_app.powerOn || g_app.dialLocked) return;
    int64_t next = static_cast<int64_t>(g_app.freqHz) + deltaHz;
    if (next < 150000LL) next = 150000LL;
    if (next > 29999999LL) next = 29999999LL;
    g_app.freqHz = static_cast<uint64_t>(next);
    g_app.dialAngleDeg = std::fmod(g_app.dialAngleDeg + (deltaHz > 0 ? 8.0 : -8.0) + 360.0, 360.0);
    SyncRadioCat(false);
}

void StepMemoryChannel(int delta) {
    if (g_app.banks.empty() || g_app.channels.empty()) return;
    if (g_app.selectedBankIdx >= g_app.banks.size()) g_app.selectedBankIdx = 0;
    std::wstring activeBankId = g_app.banks[g_app.selectedBankIdx].id;
    std::vector<size_t> bankIndices;
    for (size_t i = 0; i < g_app.channels.size(); ++i) {
        if (g_app.channels[i].bankId == activeBankId) {
            bankIndices.push_back(i);
        }
    }
    if (bankIndices.empty()) return;

    static size_t curSubIdx = 0;
    curSubIdx = (curSubIdx + delta + bankIndices.size()) % bankIndices.size();
    size_t targetIdx = bankIndices[curSubIdx];
    g_app.freqHz = g_app.channels[targetIdx].freqHz;
    g_app.mode   = g_app.channels[targetIdx].mode;
    SyncRadioCat(true);
}

void AddCurrentFreqToOpenBank() {
    if (g_app.banks.empty()) return;
    if (g_app.selectedBankIdx >= g_app.banks.size()) g_app.selectedBankIdx = 0;
    std::wstring bankId = g_app.banks[g_app.selectedBankIdx].id;

    uint64_t targetHz = g_app.freqHz;
    if (!g_app.keypadBuffer.empty()) {
        double v = _wtof(g_app.keypadBuffer.c_str());
        if (v > 0.0) {
            targetHz = (v <= 30.0) ? static_cast<uint64_t>(v * 1000000.0) : static_cast<uint64_t>(v * 1000.0);
            targetHz = std::clamp(targetHz, 150000ULL, 29999999ULL);
            g_app.freqHz = targetHz;
            SyncRadioCat(false);
        }
        g_app.keypadBuffer.clear();
    }

    wchar_t callsign[32];
    swprintf_s(callsign, 32, L"MEM-%02zu", g_app.channels.size() + 1);

    wchar_t name[64];
    swprintf_s(name, 64, L"Stored %8.3f kHz", targetHz / 1000.0);

    FrequencyChannel newCh;
    newCh.id = L"user-" + std::to_wstring(GetTickCount64());
    newCh.bankId = bankId;
    newCh.freqHz = targetHz;
    newCh.callsign = callsign;
    newCh.stationName = name;
    newCh.location = L"Queensland / Pacific";
    newCh.mode = g_app.mode;
    newCh.schedule = L"24h";
    newCh.notes = L"Stored via MR key";

    g_app.channels.push_back(newCh);
    g_app.showMemoryBanks = true;

    wchar_t msg[128];
    swprintf_s(msg, 128, L"MR: Added %8.3f kHz to %s", targetHz / 1000.0, g_app.banks[g_app.selectedBankIdx].shortLabel.c_str());
    g_app.statusMessage = msg;
}

void TriggerScan() {
    g_app.isScanning = !g_app.isScanning;
    g_app.showMemoryBanks = true;
    if (g_app.isScanning) {
        StepMemoryChannel(1);
    }
}

bool PromptUserString(HWND hParent, const wchar_t* title, const wchar_t* prompt, std::wstring& ioText) {
    WNDCLASSW wc = { 0 };
    wc.lpfnWndProc = [](HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) -> LRESULT {
        static std::wstring* pTarget = nullptr;
        static HWND hEdit = nullptr;
        static bool* pResult = nullptr;
        if (msg == WM_CREATE) {
            CREATESTRUCTW* cs = (CREATESTRUCTW*)lParam;
            void** pData = (void**)cs->lpCreateParams;
            pTarget = (std::wstring*)pData[0];
            pResult = (bool*)pData[1];
            const wchar_t* pPrompt = (const wchar_t*)pData[2];

            CreateWindowExW(0, L"STATIC", pPrompt, WS_CHILD | WS_VISIBLE, 20, 16, 380, 24, hWnd, nullptr, nullptr, nullptr);
            hEdit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", pTarget ? pTarget->c_str() : L"", WS_CHILD | WS_VISIBLE | ES_AUTOHSCROLL, 20, 48, 380, 28, hWnd, (HMENU)101, nullptr, nullptr);
            SendMessageW(hEdit, EM_SETSEL, 0, -1);
            SetFocus(hEdit);

            CreateWindowExW(0, L"BUTTON", L"OK", WS_CHILD | WS_VISIBLE | BS_DEFPUSHBUTTON, 200, 95, 90, 30, hWnd, (HMENU)IDOK, nullptr, nullptr);
            CreateWindowExW(0, L"BUTTON", L"Cancel", WS_CHILD | WS_VISIBLE, 310, 95, 90, 30, hWnd, (HMENU)IDCANCEL, nullptr, nullptr);
            return 0;
        }
        if (msg == WM_COMMAND) {
            WORD cmd = LOWORD(wParam);
            if (cmd == IDOK) {
                if (hEdit && pTarget) {
                    wchar_t buf[256];
                    GetWindowTextW(hEdit, buf, 256);
                    *pTarget = buf;
                    if (pResult) *pResult = true;
                }
                DestroyWindow(hWnd);
                return 0;
            } else if (cmd == IDCANCEL) {
                if (pResult) *pResult = false;
                DestroyWindow(hWnd);
                return 0;
            }
        }
        if (msg == WM_CLOSE) {
            DestroyWindow(hWnd);
            return 0;
        }
        return DefWindowProcW(hWnd, msg, wParam, lParam);
    };
    wc.hInstance = GetModuleHandleW(nullptr);
    wc.lpszClassName = L"FRG8800_PromptDialog";
    wc.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
    wc.hCursor = LoadCursorW(nullptr, IDC_ARROW);
    RegisterClassW(&wc);

    bool result = false;
    void* params[3] = { &ioText, &result, (void*)prompt };

    RECT rcParent;
    GetWindowRect(hParent, &rcParent);
    int px = rcParent.left + (rcParent.right - rcParent.left - 440) / 2;
    int py = rcParent.top + (rcParent.bottom - rcParent.top - 180) / 2;

    HWND hDlg = CreateWindowExW(
        WS_EX_DLGMODALFRAME | WS_EX_TOPMOST,
        L"FRG8800_PromptDialog",
        title,
        WS_POPUP | WS_CAPTION | WS_SYSMENU | WS_VISIBLE,
        px, py, 440, 180,
        hParent, nullptr, GetModuleHandleW(nullptr), params
    );

    EnableWindow(hParent, FALSE);
    MSG msg;
    while (IsWindow(hDlg) && GetMessageW(&msg, nullptr, 0, 0)) {
        if (!IsDialogMessageW(hDlg, &msg)) {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }
    EnableWindow(hParent, TRUE);
    SetForegroundWindow(hParent);
    UnregisterClassW(L"FRG8800_PromptDialog", GetModuleHandleW(nullptr));
    return result;
}

void DrawVerticalSwitch(Graphics& g, int id, RectF r, const wchar_t* title, const wchar_t* topLbl, const wchar_t* botLbl, bool isUp) {
    SolidBrush plateBrush(Color(255, 24, 27, 32));
    g.FillRectangle(&plateBrush, r);
    Pen borderPen(Color(255, 45, 50, 58), 1.0f);
    g.DrawRectangle(&borderPen, r);

    FontFamily ff(L"Segoe UI");
    Font tFont(&ff, 7.5f, FontStyleBold, UnitPoint);
    Font lFont(&ff, 7.0f, FontStyleBold, UnitPoint);
    SolidBrush tBrush(Color(255, 200, 205, 215));
    SolidBrush activeBrush(Color(255, 45, 212, 191));
    SolidBrush dimBrush(Color(255, 110, 115, 125));

    StringFormat sf;
    sf.SetAlignment(StringAlignmentCenter);
    g.DrawString(title, -1, &tFont, PointF(r.X + r.Width * 0.5f, r.Y + 3.0f), &sf, &tBrush);
    g.DrawString(topLbl, -1, &lFont, PointF(r.X + r.Width * 0.5f, r.Y + 16.0f), &sf, isUp ? &activeBrush : &dimBrush);

    // Slot
    float slotX = r.X + (r.Width - 10.0f) * 0.5f;
    float slotY = r.Y + 28.0f;
    float slotH = 32.0f;
    SolidBrush slotBrush(Color(255, 10, 12, 14));
    g.FillRectangle(&slotBrush, slotX, slotY, 10.0f, slotH);
    Pen slotRim(Color(255, 60, 65, 72), 1.0f);
    g.DrawRectangle(&slotRim, slotX, slotY, 10.0f, slotH);

    // Bat lever (flipping up or down)
    float batY = isUp ? (slotY + 2.0f) : (slotY + slotH - 12.0f);
    LinearGradientBrush batBrush(
        PointF(slotX, batY), PointF(slotX + 10.0f, batY + 10.0f),
        Color(255, 230, 235, 240), Color(255, 130, 135, 140)
    );
    g.FillRectangle(&batBrush, slotX - 1.0f, batY, 12.0f, 10.0f);
    Pen batBorder(Color(255, 40, 44, 50), 1.0f);
    g.DrawRectangle(&batBorder, slotX - 1.0f, batY, 12.0f, 10.0f);

    g.DrawString(botLbl, -1, &lFont, PointF(r.X + r.Width * 0.5f, r.Y + r.Height - 14.0f), &sf, !isUp ? &activeBrush : &dimBrush);

    g_buttons.push_back({ id, r, title });
}

void DrawKnob(Graphics& g, float cx, float cy, float radius, float normVal, const wchar_t* label, const wchar_t* sublabel = nullptr) {
    SolidBrush shadowBrush(Color(220, 8, 10, 12));
    g.FillEllipse(&shadowBrush, cx - radius + 2, cy - radius + 3, radius * 2, radius * 2);

    LinearGradientBrush rimBrush(
        PointF(cx - radius, cy - radius),
        PointF(cx + radius, cy + radius),
        Color(255, 95, 100, 105),
        Color(255, 28, 30, 32)
    );
    g.FillEllipse(&rimBrush, cx - radius, cy - radius, radius * 2, radius * 2);

    SolidBrush capBrush(Color(255, 38, 41, 44));
    g.FillEllipse(&capBrush, cx - radius * 0.78f, cy - radius * 0.78f, radius * 1.56f, radius * 1.56f);

    double angleRad = (-135.0 + normVal * 270.0 - 90.0) * 3.1415926535 / 180.0;
    float ix = cx + static_cast<float>(std::cos(angleRad) * (radius * 0.72f));
    float iy = cy + static_cast<float>(std::sin(angleRad) * (radius * 0.72f));
    Pen ptrPen(Color(255, 245, 245, 240), 2.0f);
    g.DrawLine(&ptrPen, cx, cy, ix, iy);

    FontFamily ff(L"Segoe UI");
    Font lblFont(&ff, 8.5f, FontStyleBold, UnitPoint);
    SolidBrush txtBrush(Color(220, 215, 220, 225));
    StringFormat sf;
    sf.SetAlignment(StringAlignmentCenter);
    g.DrawString(label, -1, &lblFont, PointF(cx, cy + radius + 4.0f), &sf, &txtBrush);
    if (sublabel) {
        Font subFont(&ff, 7.5f, FontStyleRegular, UnitPoint);
        SolidBrush subTxtBrush(Color(180, 160, 165, 170));
        g.DrawString(sublabel, -1, &subFont, PointF(cx, cy + radius + 17.0f), &sf, &subTxtBrush);
    }
}

void RenderFrontPanel(Graphics& g, int width, int height) {
    g.SetSmoothingMode(SmoothingModeAntiAlias);
    g_buttons.clear();

    // Background
    SolidBrush bgBrush(Color(255, 16, 18, 22));
    g.FillRectangle(&bgBrush, 0, 0, width, height);

    // Front Panel Height: exactly 460px (clean hardware replica)
    float panelHeight = 460.0f;

    // 1. CHASSIS - Genuine Yaesu Satin Lighter Grey Anodized Aluminum
    RectF chassisRect(12.0f, 6.0f, static_cast<float>(width - 24), panelHeight);
    LinearGradientBrush chassisBrush(
        PointF(chassisRect.X, chassisRect.Y),
        PointF(chassisRect.X, chassisRect.GetBottom()),
        Color(255, 76, 82, 92),
        Color(255, 52, 57, 65)
    );
    g.FillRectangle(&chassisBrush, chassisRect);
    Pen chassisBorder(Color(255, 105, 114, 126), 2.5f);
    g.DrawRectangle(&chassisBorder, chassisRect);

    // Inset bevel shadow
    Pen bezelPen(Color(180, 24, 28, 34), 1.5f);
    g.DrawRectangle(&bezelPen, chassisRect.X + 4.0f, chassisRect.Y + 4.0f, chassisRect.Width - 8.0f, chassisRect.Height - 8.0f);

    FontFamily ffSans(L"Segoe UI");
    FontFamily ffMono(L"Consolas");
    Font brandFont(&ffSans, 16.0f, FontStyleBold, UnitPoint);
    Font subFont(&ffSans, 11.5f, FontStyleBold, UnitPoint);
    Font subBrandFont(&ffSans, 8.5f, FontStyleBold, UnitPoint);
    Font smallFont(&ffSans, 8.5f, FontStyleBold, UnitPoint);
    Font tinyFont(&ffSans, 7.5f, FontStyleBold, UnitPoint);
    Font btnFont(&ffSans, 8.5f, FontStyleBold, UnitPoint);

    auto addButton = [&](int id, RectF r, const wchar_t* txt, Color fillCol, Color txtCol, Font* f = nullptr) {
        SolidBrush b(fillCol);
        g.FillRectangle(&b, r);
        Pen p(Color(220, 15, 17, 20), 1.2f);
        g.DrawRectangle(&p, r);
        StringFormat sf;
        sf.SetAlignment(StringAlignmentCenter);
        sf.SetLineAlignment(StringAlignmentCenter);
        SolidBrush tb(txtCol);
        g.DrawString(txt, -1, f ? f : &btnFont, r, &sf, &tb);
        g_buttons.push_back({ id, r, txt });
    };

    // =========================================================================
    // 2. LEFT SECTION (Enlarged Speaker Grill, Power, Phones, Tone, AF Gain, Squelch)
    // =========================================================================
    float leftWidth = 320.0f;
    RectF leftPanel(22.0f, 16.0f, leftWidth, panelHeight - 20.0f);
    SolidBrush panelRecess(Color(255, 38, 43, 50));
    g.FillRectangle(&panelRecess, leftPanel);
    Pen sectionBorder(Color(255, 62, 68, 77), 1.0f);
    g.DrawRectangle(&sectionBorder, leftPanel);

    // ENLARGED ACOUSTIC SPEAKER GRILL (x = 28, y = 24, w = 308, h = 345)
    RectF speakerBezel(28.0f, 24.0f, leftWidth - 12.0f, 345.0f);
    SolidBrush speakerDish(Color(255, 12, 14, 16));
    g.FillRectangle(&speakerDish, speakerBezel);

    SolidBrush slotBrush(Color(255, 6, 7, 8));
    Pen slotHighlight(Color(40, 255, 255, 255), 1.0f);
    for (int col = 0; col < 5; ++col) {
        for (int row = 0; row < 18; ++row) {
            float sx = 36.0f + col * 59.0f;
            float sy = 32.0f + row * 16.5f;
            g.FillRectangle(&slotBrush, sx, sy, 52.0f, 7.5f);
            g.DrawLine(&slotHighlight, sx, sy + 7.5f, sx + 52.0f, sy + 7.5f);
        }
    }

    // Classic YAESU Emblem & Badge
    SolidBrush silverBrush(Color(255, 240, 244, 250));
    SolidBrush champagneBrush(Color(255, 220, 190, 130));
    g.DrawString(L"YAESU", -1, &brandFont, PointF(36.0f, 335.0f), &silverBrush);
    g.DrawString(L"COMMUNICATIONS RECEIVER FRG-8800", -1, &tinyFont, PointF(110.0f, 342.0f), &champagneBrush);

    // =========================================================================
    // BOTTOM CONTROLS DECK: POWER -> PHONES -> TONE -> AF GAIN -> SQUELCH
    // =========================================================================
    // 1. POWER Button: Left of Phones connector per user requirement
    addButton(BTN_POWER, RectF(28.0f, 396.0f, 54.0f, 32.0f),
        g_app.powerOn ? L"POWER" : L"OFF",
        g_app.powerOn ? Color(255, 234, 88, 12) : Color(255, 80, 26, 16),
        Color(255, 255, 255, 255));

    // 2. Phones Jack Connector
    SolidBrush jackRing(Color(255, 110, 116, 124));
    g.FillEllipse(&jackRing, 96.0f, 399.0f, 26.0f, 26.0f);
    SolidBrush jackHole(Color(255, 6, 8, 10));
    g.FillEllipse(&jackHole, 102.0f, 405.0f, 14.0f, 14.0f);
    StringFormat phonesSf;
    phonesSf.SetAlignment(StringAlignmentCenter);
    g.DrawString(L"PHONES", -1, &tinyFont, PointF(109.0f, 428.0f), &phonesSf, &silverBrush);

    // 3. TONE Dial: To the right of Phones
    DrawKnob(g, 156.0f, 404.0f, 16.0f, g_app.tone, L"TONE");

    // 4. AF GAIN Dial: On the other side of Tone
    DrawKnob(g, 218.0f, 404.0f, 16.0f, g_app.afGain, L"AF GAIN");

    // 5. Dedicated SQUELCH Dial: Missing dial added per user requirement
    DrawKnob(g, 280.0f, 404.0f, 16.0f, g_app.squelch, L"SQUELCH");

    // =========================================================================
    // 3. CENTER SECTION: VFD DISPLAY, MODES, VERTICAL SWITCHES & FLYWHEEL DIAL
    // Per user specification:
    // - "Band Width", "AGC", "NB", and "DIM" switches in vacant space next to dial
    // - Orientation changed to VERTICAL
    // - Fine tune dial works and tunes in 1Hz and 10Hz increments
    // =========================================================================
    float centerLeft = 352.0f;
    float centerWidth = 550.0f;
    RectF centerPanel(centerLeft, 16.0f, centerWidth, panelHeight - 20.0f);
    g.FillRectangle(&panelRecess, centerPanel);
    g.DrawRectangle(&sectionBorder, centerPanel);

    // VFD / LCD DISPLAY WINDOW (Authentic Backlit Green with Default Black digits)
    RectF vfdWindow(centerLeft + 12.0f, 24.0f, centerWidth - 24.0f, 130.0f);
    SolidBrush vfdBg(Color(255, 14, 24, 18));
    g.FillRectangle(&vfdBg, vfdWindow);
    Pen vfdFrame(Color(255, 28, 34, 40), 3.0f);
    g.DrawRectangle(&vfdFrame, vfdWindow);

    if (g_app.powerOn) {
        // Backlit illuminated green diffuser layer
        LinearGradientBrush diffuserBrush(
            PointF(vfdWindow.X, vfdWindow.Y),
            PointF(vfdWindow.X, vfdWindow.GetBottom()),
            Color(255, 78, 178, 115),
            Color(255, 48, 138, 86)
        );
        g.FillRectangle(&diffuserBrush, vfdWindow.X + 2, vfdWindow.Y + 2, vfdWindow.Width - 4, vfdWindow.Height - 4);

        // Glass glare subtle highlight
        Pen glassGlare(Color(50, 255, 255, 255), 1.0f);
        g.DrawLine(&glassGlare, vfdWindow.X + 4.0f, vfdWindow.Y + 4.0f, vfdWindow.X + vfdWindow.Width - 4.0f, vfdWindow.Y + 4.0f);

        // Dark LCD segment color for non-lit segments & labels
        SolidBrush lcdLabelBrush(Color(220, 18, 32, 24));
        SolidBrush lcdDigitBrush(Color(255, g_app.lcdTextR, g_app.lcdTextG, g_app.lcdTextB));

        // Fluorescent S-Meter Bar Graph
        g.DrawString(L"SIGNAL   S 1   3   5   7   9  +10  +20  +30  +40 dB", -1, &smallFont, PointF(centerLeft + 24.0f, 30.0f), &lcdLabelBrush);
        for (int seg = 0; seg < 12; ++seg) {
            RectF segRect(centerLeft + 24.0f + seg * 18.0f, 46.0f, 14.0f, 8.0f);
            if (seg < 8) {
                SolidBrush segBrush(Color(230, 20, 42, 28));
                g.FillRectangle(&segBrush, segRect);
            } else {
                SolidBrush redSeg(Color(240, 220, 45, 35));
                g.FillRectangle(&redSeg, segRect);
            }
        }

        // Digital Frequency Readout (Default Black liquid crystal per user requirement)
        uint64_t mhz = g_app.freqHz / 1000000ULL;
        uint64_t khz = (g_app.freqHz % 1000000ULL) / 1000ULL;
        uint64_t hz100 = (g_app.freqHz % 1000ULL) / 100ULL;
        wchar_t freqBuf[64];
        if (!g_app.keypadBuffer.empty()) {
            swprintf_s(freqBuf, 64, L"%s_", g_app.keypadBuffer.c_str());
        } else if (g_app.displaySelect == 0) { // Sleep
            swprintf_s(freqBuf, 64, L"  SLEEP  ");
        } else if (g_app.displaySelect == 1) { // Off
            swprintf_s(freqBuf, 64, L"         ");
        } else if (g_app.displaySelect == 3) { // Clock 1
            time_t now = time(nullptr);
            tm utcTm;
            gmtime_s(&utcTm, &now);
            int qldHour = (utcTm.tm_hour + 10) % 24;
            swprintf_s(freqBuf, 64, L" %02d:%02d:%02d ", qldHour, utcTm.tm_min, utcTm.tm_sec);
        } else if (g_app.displaySelect == 5) { // Clock 2
            time_t now = time(nullptr);
            tm utcTm;
            gmtime_s(&utcTm, &now);
            swprintf_s(freqBuf, 64, L" %02d:%02d:%02d ", utcTm.tm_hour, utcTm.tm_min, utcTm.tm_sec);
        } else {
            swprintf_s(freqBuf, 64, L"%2llu.%03llu.%llu", mhz, khz, hz100);
        }

        Font vfdFreqFont(&ffMono, 30.0f, FontStyleBold, UnitPoint);
        g.DrawString(freqBuf, -1, &vfdFreqFont, PointF(centerLeft + 22.0f, 62.0f), &lcdDigitBrush);
        if (g_app.displaySelect == 4 || g_app.displaySelect == 2) {
            g.DrawString(L"MHz", -1, &subBrandFont, PointF(centerLeft + 285.0f, 86.0f), &lcdLabelBrush);
        }

        // Dual Clock
        time_t now = time(nullptr);
        tm utcTm;
        gmtime_s(&utcTm, &now);
        int qldHour = (utcTm.tm_hour + 10) % 24;
        wchar_t clkBuf[64];
        if (g_app.clockMode == 0) {
            swprintf_s(clkBuf, 64, L"QLD %02d:%02d:%02d AEST", qldHour, utcTm.tm_min, utcTm.tm_sec);
        } else if (g_app.clockMode == 1) {
            swprintf_s(clkBuf, 64, L"UTC %02d:%02d:%02d", utcTm.tm_hour, utcTm.tm_min, utcTm.tm_sec);
        } else {
            swprintf_s(clkBuf, 64, L"TIMER 00:00:00");
        }
        Font clkFont(&ffMono, 10.0f, FontStyleBold, UnitPoint);
        g.DrawString(clkBuf, -1, &clkFont, PointF(centerLeft + 350.0f, 34.0f), &lcdLabelBrush);

        // Mode & CAT status
        std::wstring modeStr = L"MODE: AM-W";
        if (g_app.mode == RadioMode::AM_N) modeStr = L"MODE: AM-N";
        else if (g_app.mode == RadioMode::LSB) modeStr = L"MODE: LSB";
        else if (g_app.mode == RadioMode::USB) modeStr = L"MODE: USB";
        else if (g_app.mode == RadioMode::CW) modeStr = L"MODE: CW";
        else if (g_app.mode == RadioMode::FM) modeStr = L"MODE: FM";
        g.DrawString(modeStr.c_str(), -1, &smallFont, PointF(centerLeft + 350.0f, 62.0f), &lcdLabelBrush);

        std::wstring statLine = L"CAT: " + std::wstring(g_app.lastCatHex.begin(), g_app.lastCatHex.end());
        g.DrawString(statLine.c_str(), -1, &smallFont, PointF(centerLeft + 350.0f, 88.0f), &lcdLabelBrush);
    }

    // HORIZONTAL ROW OF MODE BUTTONS - Darker Cream Color per user specification
    struct ModeBtnInfo { int id; RadioMode m; const wchar_t* label; };
    ModeBtnInfo modes[6] = {
        { BTN_MODE_AMW, RadioMode::AM_W, L"AM-W" },
        { BTN_MODE_AMN, RadioMode::AM_N, L"AM-N" },
        { BTN_MODE_LSB, RadioMode::LSB,  L"LSB"  },
        { BTN_MODE_USB, RadioMode::USB,  L"USB"  },
        { BTN_MODE_CW,  RadioMode::CW,   L"CW"   },
        { BTN_MODE_FM,  RadioMode::FM,   L"FM"   }
    };
    Color creamInactive(255, 214, 203, 178); // darker cream
    Color creamActive(255, 238, 226, 198);   // active lighter cream
    Color creamTxt(255, 24, 22, 20);
    for (int i = 0; i < 6; ++i) {
        bool active = (g_app.mode == modes[i].m);
        addButton(
            modes[i].id,
            RectF(centerLeft + 12.0f + i * 58.0f, 164.0f, 54.0f, 28.0f),
            modes[i].label,
            active ? creamActive : creamInactive,
            creamTxt
        );
    }
    addButton(BTN_VFO_MEM, RectF(centerLeft + 368.0f, 164.0f, 74.0f, 28.0f), L"VFO / MEM", creamInactive, creamTxt);
    addButton(BTN_DIAL_LOCK, RectF(centerLeft + 448.0f, 164.0f, 74.0f, 28.0f), g_app.dialLocked ? L"LOCKED" : L"LOCK", g_app.dialLocked ? Color(255, 180, 40, 40) : creamInactive, g_app.dialLocked ? Color(255, 255, 255, 255) : creamTxt);

    // =========================================================================
    // VERTICAL SWITCHES BAY NEXT TO MAIN TUNING DIAL (Per user requirement)
    // Place "Band Width", "AGC", "NB", and "DIM" switches in vacant space next to dial
    // Orientation: VERTICAL
    // =========================================================================
    DrawVerticalSwitch(g, BTN_SWITCH_BW,  RectF(centerLeft + 14.0f,  215.0f, 38.0f, 85.0f), L"BAND", L"WIDE", L"NAR", g_app.mode != RadioMode::AM_N);
    DrawVerticalSwitch(g, BTN_SWITCH_AGC, RectF(centerLeft + 56.0f,  215.0f, 38.0f, 85.0f), L"AGC",  L"FAST", L"SLOW", g_app.agcFast);
    DrawVerticalSwitch(g, BTN_SWITCH_NB,  RectF(centerLeft + 98.0f,  215.0f, 38.0f, 85.0f), L"NB",   L"ON",   L"OFF",  g_app.nbOn);
    DrawVerticalSwitch(g, BTN_SWITCH_DIM, RectF(centerLeft + 140.0f, 215.0f, 38.0f, 85.0f), L"DIM",  L"HI",   L"LO",   g_app.vfdBrightness >= 0.7f);

    // MAIN TUNING FLYWHEEL DIAL
    float dcx = centerLeft + 275.0f;
    float dcy = 258.0f;
    float dr  = 54.0f;

    SolidBrush dialShadow(Color(200, 6, 8, 10));
    g.FillEllipse(&dialShadow, dcx - dr + 2, dcy - dr + 4, dr * 2, dr * 2);

    LinearGradientBrush outerDial(
        PointF(dcx - dr, dcy - dr),
        PointF(dcx + dr, dcy + dr),
        Color(255, 110, 115, 120),
        Color(255, 24, 26, 28)
    );
    g.FillEllipse(&outerDial, dcx - dr, dcy - dr, dr * 2, dr * 2);

    SolidBrush knurlRing(Color(255, 18, 20, 22));
    g.FillEllipse(&knurlRing, dcx - dr * 0.88f, dcy - dr * 0.88f, dr * 1.76f, dr * 1.76f);

    LinearGradientBrush innerDisc(
        PointF(dcx - dr * 0.72f, dcy - dr * 0.72f),
        PointF(dcx + dr * 0.72f, dcy + dr * 0.72f),
        Color(255, 60, 64, 68),
        Color(255, 32, 35, 38)
    );
    g.FillEllipse(&innerDisc, dcx - dr * 0.72f, dcy - dr * 0.72f, dr * 1.44f, dr * 1.44f);

    double rad = (g_app.dialAngleDeg - 90.0) * 3.1415926535 / 180.0;
    float dimpleX = dcx + static_cast<float>(std::cos(rad) * (dr * 0.50f));
    float dimpleY = dcy + static_cast<float>(std::sin(rad) * (dr * 0.50f));
    SolidBrush dimpleBrush(Color(255, 16, 18, 20));
    g.FillEllipse(&dimpleBrush, dimpleX - 11.0f, dimpleY - 11.0f, 22.0f, 22.0f);
    Pen dimpleRim(Color(120, 220, 225, 230), 1.5f);
    g.DrawEllipse(&dimpleRim, dimpleX - 11.0f, dimpleY - 11.0f, 22.0f, 22.0f);

    // =========================================================================
    // FINE TUNE DIAL (CLARIFIER) WITH 1 Hz & 10 Hz STEPPING (Per user requirement)
    // =========================================================================
    float clarX = centerLeft + 415.0f;
    float clarY = 258.0f;
    DrawKnob(g, clarX, clarY, 16.0f, (g_app.clarifierHz + 990.0f) / 1980.0f, L"FINE TUNE", L"1Hz & 10Hz");

    // 1 Hz & 10 Hz Nudge & Reset Buttons
    addButton(BTN_FINE_TUNE_DN10, RectF(clarX + 30.0f, clarY - 26.0f, 40.0f, 20.0f), L"-10Hz", Color(255, 34, 38, 44), Color(255, 251, 191, 36));
    addButton(BTN_FINE_TUNE_DN1,  RectF(clarX + 30.0f, clarY - 2.0f,  40.0f, 20.0f), L"-1Hz",  Color(255, 34, 38, 44), Color(255, 45, 212, 191));
    addButton(BTN_FINE_TUNE_UP1,  RectF(clarX + 74.0f, clarY - 2.0f,  40.0f, 20.0f), L"+1Hz",  Color(255, 34, 38, 44), Color(255, 45, 212, 191));
    addButton(BTN_FINE_TUNE_UP10, RectF(clarX + 74.0f, clarY - 26.0f, 40.0f, 20.0f), L"+10Hz", Color(255, 34, 38, 44), Color(255, 251, 191, 36));
    addButton(BTN_CLAR_ZERO,      RectF(clarX + 36.0f, clarY + 22.0f, 72.0f, 18.0f), L"RESET (0)", Color(255, 34, 38, 44), Color(255, 220, 225, 230));

    // Centered Tuning Buttons Under Dial
    addButton(BTN_TUNE_FAST_DN, RectF(centerLeft + 40.0f,  334.0f, 110.0f, 26.0f), L"<< FAST DN", Color(255, 42, 46, 52), Color(255, 255, 200, 80));
    addButton(BTN_TUNE_SLOW_DN, RectF(centerLeft + 156.0f, 334.0f, 110.0f, 26.0f), L"< SLOW DN",  Color(255, 42, 46, 52), Color(255, 240, 240, 240));
    addButton(BTN_TUNE_SLOW_UP, RectF(centerLeft + 272.0f, 334.0f, 110.0f, 26.0f), L"SLOW UP >",  Color(255, 42, 46, 52), Color(255, 240, 240, 240));
    addButton(BTN_TUNE_FAST_UP, RectF(centerLeft + 388.0f, 334.0f, 110.0f, 26.0f), L"FAST UP >>", Color(255, 42, 46, 52), Color(255, 255, 200, 80));

    // Step Buttons
    struct StepBtnDef { int id; uint64_t step; const wchar_t* label; };
    StepBtnDef steps[9] = {
        { BTN_STEP_1HZ,    1ULL,       L"1Hz"   },
        { BTN_STEP_10HZ,   10ULL,      L"10Hz"  },
        { BTN_STEP_100HZ,  100ULL,     L"100Hz" },
        { BTN_STEP_1KHZ,   1000ULL,    L"1kHz"  },
        { BTN_STEP_5KHZ,   5000ULL,    L"5kHz"  },
        { BTN_STEP_9KHZ,   9000ULL,    L"9kHz"  },
        { BTN_STEP_10KHZ,  10000ULL,   L"10kHz" },
        { BTN_STEP_100KHZ, 100000ULL,  L"100kHz"},
        { BTN_STEP_1MHZ,   1000000ULL, L"1MHz"  }
    };
    for (int i = 0; i < 9; ++i) {
        bool isStep = (g_app.stepHz == steps[i].step);
        addButton(
            steps[i].id,
            RectF(centerLeft + 14.0f + i * 58.0f, 372.0f, 52.0f, 24.0f),
            steps[i].label,
            isStep ? Color(255, 14, 150, 130) : Color(255, 34, 38, 44),
            Color(255, 240, 245, 250)
        );
    }

    // =========================================================================
    // 4. RIGHT SECTION: AUTHENTIC YAESU FRG-8800 RIGHT DECK
    // - Display Select rotary dial (Sleep 7 o'clock .. Clock 2 1 o'clock)
    // - Timer & SET buttons ("On", "Clear", "Hour", "Time")
    // - Numeric Keypad (compact darker cream buttons matching mode buttons)
    // - Memory & Scan buttons placed to the right of numeric keypad:
    //   "M Select" " > VFO ", "P Scan" "Pause", "M Scan" "S Scan", "MR" "VFO > M", "VFO"
    // - Below keypads: "M Ch" dial (memories 1..12) and "ATT" dial (DX, 10dB, 20dB, LOCAL)
    // =========================================================================
    RectF rightPanel(904.0f, 16.0f, 430.0f, panelHeight - 20.0f);
    g.FillRectangle(&panelRecess, rightPanel);
    g.DrawRectangle(&sectionBorder, rightPanel);

    Color creamKeyFill(255, 214, 203, 178); // darker cream per user request
    Color creamKeyText(255, 24, 22, 20);
    Color goldText(255, 218, 185, 120);

    // -------------------------------------------------------------------------
    // TOP DECK: DISPLAY SELECT ROTARY DIAL & TIMER / SET CONTROLS
    // -------------------------------------------------------------------------
    RectF topDeck(914.0f, 22.0f, 410.0f, 84.0f);
    SolidBrush subPanelBg(Color(255, 26, 30, 36));
    g.FillRectangle(&subPanelBg, topDeck);
    Pen subPanelBorder(Color(255, 48, 54, 64), 1.0f);
    g.DrawRectangle(&subPanelBorder, topDeck);

    // 1. DISPLAY SELECT ROTARY DIAL
    float dispCx = 970.0f;
    float dispCy = 64.0f;
    float dispR  = 16.0f;
    struct DispOpt { int id; const wchar_t* label; float angle; };
    DispOpt dispOpts[6] = {
        { BTN_DISP_SLEEP, L"Sleep", -150.0f }, // 7 o'clock
        { BTN_DISP_OFF,   L"Off",   -114.0f },
        { BTN_DISP_ON,    L"On",    -78.0f  },
        { BTN_DISP_CLK1,  L"Clock 1", -42.0f },
        { BTN_DISP_FREQ,  L"Freq",   -6.0f   },
        { BTN_DISP_CLK2,  L"Clock 2", 30.0f  } // 1 o'clock
    };

    StringFormat centerSf;
    centerSf.SetAlignment(StringAlignmentCenter);
    centerSf.SetLineAlignment(StringAlignmentCenter);

    for (int i = 0; i < 6; ++i) {
        float rad = (dispOpts[i].angle - 90.0f) * 3.14159265f / 180.0f;
        float lx = dispCx + std::cos(rad) * 34.0f;
        float ly = dispCy + std::sin(rad) * 34.0f;
        bool active = (g_app.displaySelect == i);
        SolidBrush optBrush(active ? Color(255, 251, 191, 36) : Color(255, 160, 168, 180));
        g.DrawString(dispOpts[i].label, -1, &tinyFont, PointF(lx, ly), &centerSf, &optBrush);
        g_buttons.push_back({ dispOpts[i].id, RectF(lx - 16.0f, ly - 8.0f, 32.0f, 16.0f), dispOpts[i].label });
    }

    // Dial Knob
    float activeAngle = dispOpts[std::clamp(g_app.displaySelect, 0, 5)].angle;
    SolidBrush knobShadow(Color(200, 10, 12, 14));
    g.FillEllipse(&knobShadow, dispCx - dispR + 1, dispCy - dispR + 2, dispR * 2, dispR * 2);
    LinearGradientBrush knobBrush(
        PointF(dispCx - dispR, dispCy - dispR),
        PointF(dispCx + dispR, dispCy + dispR),
        Color(255, 75, 80, 88),
        Color(255, 28, 30, 34)
    );
    g.FillEllipse(&knobBrush, dispCx - dispR, dispCy - dispR, dispR * 2, dispR * 2);
    Pen knobBorder(Color(255, 12, 14, 16), 1.0f);
    g.DrawEllipse(&knobBorder, dispCx - dispR, dispCy - dispR, dispR * 2, dispR * 2);

    float ptrRad = (activeAngle - 90.0f) * 3.14159265f / 180.0f;
    Pen knobPtr(Color(255, 251, 191, 36), 2.0f);
    g.DrawLine(&knobPtr, dispCx, dispCy, dispCx + std::cos(ptrRad) * (dispR * 0.85f), dispCy + std::sin(ptrRad) * (dispR * 0.85f));
    g_buttons.push_back({ BTN_DISP_KNOB, RectF(dispCx - dispR, dispCy - dispR, dispR * 2, dispR * 2), L"DISP_KNOB" });

    SolidBrush titleBrush(Color(255, 200, 205, 215));
    g.DrawString(L"DISPLAY SELECT", -1, &tinyFont, PointF(dispCx, dispCy + dispR + 8.0f), &centerSf, &titleBrush);

    // 2. TIMER & SET CONTROLS
    float timerLeft = 1070.0f;
    g.DrawString(L"TIMER", -1, &tinyFont, PointF(timerLeft + 2.0f, 26.0f), &titleBrush);
    addButton(BTN_TIMER_ON,    RectF(timerLeft + 48.0f, 24.0f, 44.0f, 20.0f), L"On",    creamKeyFill, creamKeyText, &tinyFont);
    addButton(BTN_TIMER_CLEAR, RectF(timerLeft + 96.0f, 24.0f, 44.0f, 20.0f), L"Clear", creamKeyFill, creamKeyText, &tinyFont);

    g.DrawString(L"SET", -1, &tinyFont, PointF(timerLeft + 2.0f, 54.0f), &titleBrush);
    addButton(BTN_SET_HOUR, RectF(timerLeft + 48.0f, 52.0f, 44.0f, 20.0f), L"Hour", creamKeyFill, creamKeyText, &tinyFont);
    addButton(BTN_SET_TIME, RectF(timerLeft + 96.0f, 52.0f, 44.0f, 20.0f), L"Time", creamKeyFill, creamKeyText, &tinyFont);

    // -------------------------------------------------------------------------
    // MIDDLE DECK: NUMERIC KEYPAD (LEFT) + SCAN / MEMORY BUTTONS (RIGHT)
    // -------------------------------------------------------------------------
    RectF midDeck(914.0f, 114.0f, 410.0f, 158.0f);
    g.FillRectangle(&subPanelBg, midDeck);
    g.DrawRectangle(&subPanelBorder, midDeck);

    SolidBrush midHdrBrush(goldText);
    g.DrawString(L"NUMERIC KEYPAD", -1, &tinyFont, PointF(922.0f, 118.0f), &midHdrBrush);
    g.DrawString(L"MEMORY & SCAN", -1, &tinyFont, PointF(1054.0f, 118.0f), &midHdrBrush);

    // NUMERIC KEYPAD: 3 Columns x 5 Rows (Compact darker cream buttons)
    struct KeyDef { int id; const wchar_t* label; int col; int row; };
    KeyDef numKeys[15] = {
        { BTN_KEYPAD_1,   L"1",   0, 0 }, { BTN_KEYPAD_2,   L"2",   1, 0 }, { BTN_KEYPAD_3,   L"3",   2, 0 },
        { BTN_KEYPAD_4,   L"4",   0, 1 }, { BTN_KEYPAD_5,   L"5",   1, 1 }, { BTN_KEYPAD_6,   L"6",   2, 1 },
        { BTN_KEYPAD_7,   L"7",   0, 2 }, { BTN_KEYPAD_8,   L"8",   1, 2 }, { BTN_KEYPAD_9,   L"9",   2, 2 },
        { BTN_KEYPAD_CE,  L"CE",  0, 3 }, { BTN_KEYPAD_0,   L"0",   1, 3 }, { BTN_KEYPAD_ENT, L"ENT", 2, 3 },
        { BTN_KEYPAD_MHZ, L"MHz", 0, 4 }, { BTN_KEYPAD_KHZ, L"kHz", 1, 4 }, { BTN_KEY_DOT,    L".",   2, 4 }
    };
    for (int i = 0; i < 15; ++i) {
        float kx = 922.0f + numKeys[i].col * 40.0f;
        float ky = 134.0f + numKeys[i].row * 26.0f;
        addButton(numKeys[i].id, RectF(kx, ky, 36.0f, 22.0f), numKeys[i].label, creamKeyFill, creamKeyText, &tinyFont);
    }

    // MEMORY & SCAN BUTTONS (2 Columns x 5 Rows per user specification)
    // Row 1: "M Select" " > VFO "
    // Row 2: "P Scan" "Pause"
    // Row 3: "M Scan" "S Scan"
    // Row 4: "MR" "VFO > M"
    // Row 5: "VFO" (same width as the 2 columns of buttons above it)
    float memCol1 = 1054.0f;
    float memCol2 = 1114.0f;
    float memW    = 56.0f;
    float memH    = 22.0f;

    addButton(BTN_M_SELECT, RectF(memCol1, 134.0f, memW, memH), L"M Select", creamKeyFill, creamKeyText, &tinyFont);
    addButton(BTN_TO_VFO,   RectF(memCol2, 134.0f, memW, memH), L"> VFO",    creamKeyFill, creamKeyText, &tinyFont);

    addButton(BTN_P_SCAN,   RectF(memCol1, 160.0f, memW, memH), L"P Scan",   g_app.isScanning ? Color(255, 251, 191, 36) : creamKeyFill, creamKeyText, &tinyFont);
    addButton(BTN_PAUSE,    RectF(memCol2, 160.0f, memW, memH), L"Pause",    creamKeyFill, creamKeyText, &tinyFont);

    addButton(BTN_M_SCAN,   RectF(memCol1, 186.0f, memW, memH), L"M Scan",   creamKeyFill, creamKeyText, &tinyFont);
    addButton(BTN_S_SCAN,   RectF(memCol2, 186.0f, memW, memH), L"S Scan",   creamKeyFill, creamKeyText, &tinyFont);

    addButton(BTN_MR_MEM,   RectF(memCol1, 212.0f, memW, memH), L"MR",       (g_app.vfoMode == 1) ? Color(255, 45, 212, 191) : creamKeyFill, creamKeyText, &tinyFont);
    addButton(BTN_VFO_TO_M, RectF(memCol2, 212.0f, memW, memH), L"VFO > M", creamKeyFill, creamKeyText, &tinyFont);

    // Row 5: Full width "VFO" button spanning both columns
    addButton(BTN_VFO_WIDE, RectF(memCol1, 238.0f, memW * 2.0f + 4.0f, memH), L"VFO", (g_app.vfoMode == 0) ? Color(255, 238, 226, 198) : creamKeyFill, creamKeyText, &smallFont);

    // -------------------------------------------------------------------------
    // BOTTOM DECK: "M Ch" DIAL (LEFT) + "ATT" DIAL (RIGHT)
    // -------------------------------------------------------------------------
    RectF btmDeck(914.0f, 280.0f, 410.0f, 164.0f);
    g.FillRectangle(&subPanelBg, btmDeck);
    g.DrawRectangle(&subPanelBorder, btmDeck);

    // 1. "M Ch" ROTARY DIAL (Memories 1..12, linked to actual memory banks)
    float mchCx = 980.0f;
    float mchCy = 352.0f;
    float mchR  = 18.0f;

    for (int ch = 1; ch <= 12; ++ch) {
        float angleDeg = ((ch - 1) / 11.0f) * 270.0f - 135.0f;
        float rad = (angleDeg - 90.0f) * 3.14159265f / 180.0f;
        float nx = mchCx + std::cos(rad) * 38.0f;
        float ny = mchCy + std::sin(rad) * 38.0f;
        bool active = (g_app.memoryChannel == ch);
        SolidBrush chBrush(active ? Color(255, 251, 191, 36) : Color(255, 160, 168, 180));
        wchar_t chStr[8];
        swprintf_s(chStr, 8, L"%d", ch);
        g.DrawString(chStr, -1, &tinyFont, PointF(nx, ny), &centerSf, &chBrush);
        g_buttons.push_back({ BTN_MCH_BASE + (ch - 1), RectF(nx - 12.0f, ny - 8.0f, 24.0f, 16.0f), chStr });
    }

    // M CH Knob
    float mchActiveAngle = ((g_app.memoryChannel - 1) / 11.0f) * 270.0f - 135.0f;
    g.FillEllipse(&knobShadow, mchCx - mchR + 1, mchCy - mchR + 2, mchR * 2, mchR * 2);
    g.FillEllipse(&knobBrush, mchCx - mchR, mchCy - mchR, mchR * 2, mchR * 2);
    g.DrawEllipse(&knobBorder, mchCx - mchR, mchCy - mchR, mchR * 2, mchR * 2);

    float mchPtrRad = (mchActiveAngle - 90.0f) * 3.14159265f / 180.0f;
    g.DrawLine(&knobPtr, mchCx, mchCy, mchCx + std::cos(mchPtrRad) * (mchR * 0.85f), mchCy + std::sin(mchPtrRad) * (mchR * 0.85f));
    g_buttons.push_back({ BTN_MCH_DIAL_KNOB, RectF(mchCx - mchR, mchCy - mchR, mchR * 2, mchR * 2), L"MCH_KNOB" });

    g.DrawString(L"M CH", -1, &tinyFont, PointF(mchCx, mchCy + mchR + 10.0f), &centerSf, &titleBrush);

    // 2. "ATT" (ATTENUATOR) ROTARY DIAL (DX, 10dB, 20dB, LOCAL)
    float attCx = 1170.0f;
    float attCy = 352.0f;
    float attR  = 18.0f;
    struct AttOpt { int id; const wchar_t* label; float angle; };
    AttOpt attOpts[4] = {
        { BTN_ATT_DX_POS,    L"DX",    -135.0f },
        { BTN_ATT_10DB_POS,  L"10 dB", -45.0f  },
        { BTN_ATT_20DB_POS,  L"20 dB", 45.0f   },
        { BTN_ATT_LOCAL_POS, L"LOCAL", 135.0f  }
    };

    for (int i = 0; i < 4; ++i) {
        float rad = (attOpts[i].angle - 90.0f) * 3.14159265f / 180.0f;
        float ax = attCx + std::cos(rad) * 38.0f;
        float ay = attCy + std::sin(rad) * 38.0f;
        bool active = (g_app.attMode == i);
        SolidBrush attBrush(active ? Color(255, 251, 191, 36) : Color(255, 160, 168, 180));
        g.DrawString(attOpts[i].label, -1, &tinyFont, PointF(ax, ay), &centerSf, &attBrush);
        g_buttons.push_back({ attOpts[i].id, RectF(ax - 16.0f, ay - 8.0f, 32.0f, 16.0f), attOpts[i].label });
    }

    // ATT Knob
    float attActiveAngle = attOpts[std::clamp(g_app.attMode, 0, 3)].angle;
    g.FillEllipse(&knobShadow, attCx - attR + 1, attCy - attR + 2, attR * 2, attR * 2);
    g.FillEllipse(&knobBrush, attCx - attR, attCy - attR, attR * 2, attR * 2);
    g.DrawEllipse(&knobBorder, attCx - attR, attCy - attR, attR * 2, attR * 2);

    float attPtrRad = (attActiveAngle - 90.0f) * 3.14159265f / 180.0f;
    g.DrawLine(&knobPtr, attCx, attCy, attCx + std::cos(attPtrRad) * (attR * 0.85f), attCy + std::sin(attPtrRad) * (attR * 0.85f));
    g_buttons.push_back({ BTN_ATT_DIAL_KNOB, RectF(attCx - attR, attCy - attR, attR * 2, attR * 2), L"ATT_KNOB" });

    g.DrawString(L"ATT", -1, &tinyFont, PointF(attCx, attCy + attR + 10.0f), &centerSf, &titleBrush);

    // ==========================================
    // 5. OPTIONAL DOCKED MEMORY BANKS (When toggled via View menu or MR / SCAN)
    // Structured aligned rows with named columns & Tune button per user requirement
    // ==========================================
    if (g_app.showMemoryBanks) {
        float bankY = 475.0f;
        for (size_t b = 0; b < g_app.banks.size(); ++b) {
            bool sel = (b == g_app.selectedBankIdx);
            addButton(
                BTN_BANK_BASE + static_cast<int>(b),
                RectF(14.0f + b * 135.0f, bankY, 128.0f, 26.0f),
                g_app.banks[b].shortLabel.c_str(),
                sel ? Color(255, 14, 150, 130) : Color(255, 24, 30, 40),
                Color(255, 240, 245, 250)
            );
        }

        // Filter channels in active bank for scrollable rendering
        std::vector<size_t> bankIndices;
        if (g_app.selectedBankIdx < g_app.banks.size()) {
            std::wstring activeBankId = g_app.banks[g_app.selectedBankIdx].id;
            for (size_t i = 0; i < g_app.channels.size(); ++i) {
                if (g_app.channels[i].bankId == activeBankId) {
                    bankIndices.push_back(i);
                }
            }
        }
        int totalCh = static_cast<int>(bankIndices.size());
        if (g_app.bankScrollOffset > totalCh - 1) g_app.bankScrollOffset = std::max(0, totalCh - 1);
        if (g_app.bankScrollOffset < 0) g_app.bankScrollOffset = 0;

        // Action Buttons on Memory Bank Toolbar: Scroll UP/DN, ADD FREQ, EDIT, SCAN
        addButton(BTN_SCROLL_UP, RectF(static_cast<float>(width - 550), bankY, 52.0f, 26.0f), L"▲ UP", Color(255, 30, 36, 48), Color(255, 200, 220, 240));
        addButton(BTN_SCROLL_DOWN, RectF(static_cast<float>(width - 492), bankY, 52.0f, 26.0f), L"▼ DN", Color(255, 30, 36, 48), Color(255, 200, 220, 240));

        wchar_t scrollInfo[64];
        int visibleCount = std::max(1, (height - 540) / 27 + 5);
        swprintf_s(scrollInfo, 64, L"Row %d..%d of %d (Wheel to scroll)", 
            totalCh > 0 ? g_app.bankScrollOffset + 1 : 0, 
            std::min(totalCh, g_app.bankScrollOffset + visibleCount), 
            totalCh);
        SolidBrush scrollInfoBrush(Color(255, 140, 160, 180));
        g.DrawString(scrollInfo, -1, &tinyFont, PointF(static_cast<float>(width - 770), bankY + 6.0f), &scrollInfoBrush);

        addButton(BTN_BANK_ADD, RectF(static_cast<float>(width - 330), bankY, 100.0f, 26.0f), L"+ ADD FREQ", Color(255, 6, 182, 212), Color(255, 10, 15, 20));
        addButton(BTN_BANK_EDIT, RectF(static_cast<float>(width - 222), bankY, 86.0f, 26.0f), L"EDIT", Color(255, 30, 36, 48), Color(255, 45, 212, 191));
        addButton(BTN_BANK_SCAN, RectF(static_cast<float>(width - 128), bankY, 114.0f, 26.0f), g_app.isScanning ? L"STOP SCAN" : L"SCAN BANK", g_app.isScanning ? Color(255, 225, 29, 72) : Color(255, 245, 158, 11), Color(255, 10, 15, 20));

        if (!bankIndices.empty()) {
            float headerY = bankY + 32.0f;

            // Named Table Header Row
            RectF thRect(14.0f, headerY, static_cast<float>(width - 28), 24.0f);
            SolidBrush thBg(Color(255, 20, 24, 32));
            g.FillRectangle(&thBg, thRect);
            Pen thBorder(Color(255, 45, 52, 64), 1.0f);
            g.DrawRectangle(&thBorder, thRect);

            SolidBrush thTextBrush(Color(255, 180, 200, 220));
            g.DrawString(L"CH #", -1, &tinyFont, PointF(20.0f, headerY + 5.0f), &thTextBrush);
            g.DrawString(L"FREQUENCY (kHz)", -1, &tinyFont, PointF(70.0f, headerY + 5.0f), &thTextBrush);
            g.DrawString(L"MODE", -1, &tinyFont, PointF(185.0f, headerY + 5.0f), &thTextBrush);
            g.DrawString(L"CALLSIGN", -1, &tinyFont, PointF(245.0f, headerY + 5.0f), &thTextBrush);
            g.DrawString(L"STATION / SERVICE NAME", -1, &tinyFont, PointF(335.0f, headerY + 5.0f), &thTextBrush);
            g.DrawString(L"LOCATION / REGION", -1, &tinyFont, PointF(620.0f, headerY + 5.0f), &thTextBrush);
            g.DrawString(L"ACTIONS (TUNE / EDIT / DEL)", -1, &tinyFont, PointF(static_cast<float>(width - 180), headerY + 5.0f), &thTextBrush);

            float rowY = headerY + 28.0f;
            int chNum = g_app.bankScrollOffset + 1;
            for (size_t k = static_cast<size_t>(g_app.bankScrollOffset); k < bankIndices.size(); ++k) {
                if (rowY > height - 52.0f) break;
                size_t idx = bankIndices[k];
                const auto& ch = g_app.channels[idx];

                bool tuned = (g_app.freqHz == ch.freqHz);

                RectF rowRect(14.0f, rowY, static_cast<float>(width - 28), 24.0f);
                SolidBrush rowBg(tuned ? Color(255, 16, 45, 50) : Color(255, 14, 17, 23));
                g.FillRectangle(&rowBg, rowRect);
                Pen rowPen(Color(255, 30, 36, 46), 1.0f);
                g.DrawRectangle(&rowPen, rowRect);

                wchar_t chStr[16];
                swprintf_s(chStr, 16, L"CH %02d", chNum++);
                SolidBrush chBrush(tuned ? Color(255, 45, 212, 191) : Color(255, 140, 150, 165));
                g.DrawString(chStr, -1, &tinyFont, PointF(20.0f, rowY + 5.0f), &chBrush);

                wchar_t freqStr[32];
                swprintf_s(freqStr, 32, L"%8.3f kHz", ch.freqHz / 1000.0);
                SolidBrush freqBrush(tuned ? Color(255, g_app.vfdR, g_app.vfdG, g_app.vfdB) : Color(255, 240, 245, 250));
                g.DrawString(freqStr, -1, &smallFont, PointF(70.0f, rowY + 4.0f), &freqBrush);

                const wchar_t* modeStr = (ch.mode == RadioMode::AM_N ? L"AM-N" : (ch.mode == RadioMode::USB ? L"USB" : (ch.mode == RadioMode::LSB ? L"LSB" : (ch.mode == RadioMode::CW ? L"CW" : (ch.mode == RadioMode::FM ? L"FM" : L"AM-W")))));
                SolidBrush modeBrush(Color(255, 160, 210, 200));
                g.DrawString(modeStr, -1, &tinyFont, PointF(185.0f, rowY + 5.0f), &modeBrush);

                SolidBrush callBrush(Color(255, 251, 191, 36));
                g.DrawString(ch.callsign.c_str(), -1, &smallFont, PointF(245.0f, rowY + 4.0f), &callBrush);

                SolidBrush nameBrush(Color(255, 230, 235, 245));
                g.DrawString(ch.stationName.c_str(), -1, &smallFont, PointF(335.0f, rowY + 4.0f), &nameBrush);

                SolidBrush locBrush(Color(255, 160, 170, 185));
                g.DrawString(ch.location.c_str(), -1, &tinyFont, PointF(620.0f, rowY + 5.0f), &locBrush);

                // Dedicated Tune Button
                addButton(
                    BTN_CHAN_TUNE_BASE + static_cast<int>(idx),
                    RectF(static_cast<float>(width - 176), rowY + 2.0f, 56.0f, 20.0f),
                    tuned ? L"TUNED" : L"TUNE",
                    tuned ? Color(255, 16, 185, 129) : Color(255, 14, 116, 144),
                    tuned ? Color(255, 10, 15, 20) : Color(255, 240, 250, 255)
                );

                // Dedicated Edit Button (Opens editing panel)
                addButton(
                    BTN_CHAN_EDIT_BASE + static_cast<int>(idx),
                    RectF(static_cast<float>(width - 114), rowY + 2.0f, 52.0f, 20.0f),
                    L"EDIT",
                    Color(255, 32, 40, 52),
                    Color(255, 220, 230, 245)
                );

                // Dedicated Delete Button
                addButton(
                    BTN_CHAN_DEL_BASE + static_cast<int>(idx),
                    RectF(static_cast<float>(width - 56), rowY + 2.0f, 42.0f, 20.0f),
                    L"DEL",
                    Color(255, 60, 20, 20),
                    Color(255, 255, 180, 180)
                );

                rowY += 27.0f;
            }
        }
    }

    // ==========================================
    // 6. NATIVE WINDOWS STATUS BAR (Bottom of Window)
    // ==========================================
    RectF statusRect(0, static_cast<float>(height - 24), static_cast<float>(width), 24.0f);
    SolidBrush sbBrush(Color(255, 24, 27, 32));
    g.FillRectangle(&sbBrush, statusRect);
    Pen sbTopLine(Color(255, 45, 50, 60), 1.0f);
    g.DrawLine(&sbTopLine, 0, height - 24, width, height - 24);

    SolidBrush sbText(Color(255, 200, 205, 215));
    SolidBrush sbGreen(Color(255, 52, 211, 153));
    SolidBrush sbYellow(Color(255, 251, 191, 36));

    // Pane 1: Radio State
    wchar_t pane1[128];
    swprintf_s(pane1, 128, L"FRG-8800: %llu Hz | %s", g_app.freqHz, g_app.powerOn ? L"ON" : L"OFF");
    g.DrawString(pane1, -1, &tinyFont, PointF(10.0f, static_cast<float>(height - 20)), &sbText);

    // Pane 2: Serial Status
    std::wstring pane2 = g_app.catSerial.IsConnected()
        ? (L"ONLINE: " + g_app.catSerial.GetPortName() + L" (4800 8N2) [RTS/DTR: OFF]")
        : L"OFFLINE (Configure COM Port in Options Menu)";
    g.DrawString(pane2.c_str(), -1, &tinyFont, PointF(300.0f, static_cast<float>(height - 20)),
        g_app.catSerial.IsConnected() ? &sbGreen : &sbYellow);

    // Pane 3: Last Message / Diagnostic
    g.DrawString(g_app.statusMessage.c_str(), -1, &tinyFont, PointF(720.0f, static_cast<float>(height - 20)), &sbText);

    // ==========================================
    // 7. MODAL EDITING PANEL (Opens editing panel when EDIT is clicked per user requirement)
    // ==========================================
    if (g_app.showEditModal && g_app.editingChannelIdx >= 0 && g_app.editingChannelIdx < static_cast<int>(g_app.channels.size())) {
        SolidBrush dimBrush(Color(210, 0, 0, 0));
        g.FillRectangle(&dimBrush, 0, 0, width, height);

        float dlgW = 680.0f;
        float dlgH = 400.0f;
        float dlgX = (width - dlgW) * 0.5f;
        float dlgY = (height - dlgH) * 0.5f;

        RectF dlgRect(dlgX, dlgY, dlgW, dlgH);
        SolidBrush dlgBg(Color(255, 14, 18, 25));
        g.FillRectangle(&dlgBg, dlgRect);

        Pen dlgBorder(Color(255, 6, 182, 212), 2.0f);
        g.DrawRectangle(&dlgBorder, dlgRect);

        RectF hdrRect(dlgX, dlgY, dlgW, 36.0f);
        SolidBrush hdrBg(Color(255, 20, 26, 36));
        g.FillRectangle(&hdrBg, hdrRect);

        // Explicitly define fonts inside modal to avoid any scope or undefined identifier errors
        FontFamily ffSans(L"Segoe UI");
        Font subFont(&ffSans, 11.5f, FontStyleBold, UnitPoint);
        Font smallFont(&ffSans, 9.0f, FontStyleRegular, UnitPoint);
        Font tinyFont(&ffSans, 8.0f, FontStyleRegular, UnitPoint);

        SolidBrush titleBrush(Color(255, 6, 182, 212));
        g.DrawString(L"EDIT MEMORY CHANNEL — STATION & LOCATION", -1, &subFont, PointF(dlgX + 16.0f, dlgY + 8.0f), &titleBrush);

        SolidBrush lblBrush(Color(255, 148, 163, 184));
        SolidBrush valBrush(Color(255, 251, 191, 36));
        SolidBrush textWhite(Color(255, 255, 255, 255));

        // 1. Station ID / Callsign Section (Editable per user requirement)
        g.DrawString(L"STATION ID / CALLSIGN:", -1, &smallFont, PointF(dlgX + 24.0f, dlgY + 54.0f), &lblBrush);
        g.DrawString(g_app.editCallsign.c_str(), -1, &subFont, PointF(dlgX + 210.0f, dlgY + 50.0f), &valBrush);
        addButton(BTN_MODAL_EDIT_ID, RectF(dlgX + 460.0f, dlgY + 48.0f, 180.0f, 26.0f), L"EDIT STATION ID", Color(255, 30, 42, 60), Color(255, 251, 191, 36));

        // 2. Station Name Section (Editable per user requirement)
        g.DrawString(L"STATION / SERVICE NAME:", -1, &smallFont, PointF(dlgX + 24.0f, dlgY + 94.0f), &lblBrush);
        g.DrawString(g_app.editStationName.c_str(), -1, &smallFont, PointF(dlgX + 210.0f, dlgY + 94.0f), &textWhite);
        addButton(BTN_MODAL_EDIT_NAME, RectF(dlgX + 460.0f, dlgY + 88.0f, 180.0f, 26.0f), L"EDIT STATION NAME", Color(255, 30, 42, 60), Color(255, 255, 255, 255));

        // 3. Location / Transmitter Site Section (Editable per user requirement)
        g.DrawString(L"TRANSMITTER LOCATION:", -1, &smallFont, PointF(dlgX + 24.0f, dlgY + 134.0f), &lblBrush);
        g.DrawString(g_app.editLocation.c_str(), -1, &smallFont, PointF(dlgX + 210.0f, dlgY + 134.0f), &valBrush);
        addButton(BTN_MODAL_EDIT_LOC, RectF(dlgX + 460.0f, dlgY + 128.0f, 180.0f, 26.0f), L"EDIT LOCATION", Color(255, 30, 42, 60), Color(255, 148, 163, 184));

        // 4. Frequency Adjustment Section
        g.DrawString(L"FREQUENCY:", -1, &smallFont, PointF(dlgX + 24.0f, dlgY + 180.0f), &lblBrush);
        wchar_t fStr[32];
        swprintf_s(fStr, 32, L"%8.3f kHz", g_app.editFreqHz / 1000.0);
        SolidBrush freqValBrush(Color(255, g_app.vfdR, g_app.vfdG, g_app.vfdB));
        g.DrawString(fStr, -1, &subFont, PointF(dlgX + 210.0f, dlgY + 176.0f), &freqValBrush);

        addButton(BTN_MODAL_FREQ_DN, RectF(dlgX + 350.0f, dlgY + 174.0f, 65.0f, 26.0f), L"-10 kHz", Color(255, 30, 36, 48), Color(255, 230, 235, 245));
        addButton(BTN_MODAL_FREQ_UP, RectF(dlgX + 420.0f, dlgY + 174.0f, 65.0f, 26.0f), L"+10 kHz", Color(255, 30, 36, 48), Color(255, 230, 235, 245));
        addButton(BTN_MODAL_LOAD_VFO, RectF(dlgX + 490.0f, dlgY + 174.0f, 150.0f, 26.0f), L"LOAD FROM VFO", Color(255, 14, 116, 144), Color(255, 255, 255, 255));

        // 5. Receive Mode Section
        g.DrawString(L"RECEIVE MODE:", -1, &smallFont, PointF(dlgX + 24.0f, dlgY + 224.0f), &lblBrush);
        const wchar_t* mStr = (g_app.editMode == RadioMode::AM_N ? L"AM-N (Narrow 2.4k)" : (g_app.editMode == RadioMode::USB ? L"USB (Upper SB)" : (g_app.editMode == RadioMode::LSB ? L"LSB (Lower SB)" : (g_app.editMode == RadioMode::CW ? L"CW (500Hz)" : (g_app.editMode == RadioMode::FM ? L"FM (Broadcast)" : L"AM-W (Standard 6k)")))));
        g.DrawString(mStr, -1, &smallFont, PointF(dlgX + 210.0f, dlgY + 224.0f), &titleBrush);
        addButton(BTN_MODAL_MODE_CYCLE, RectF(dlgX + 490.0f, dlgY + 218.0f, 150.0f, 26.0f), L"CYCLE MODE", Color(255, 30, 36, 48), Color(255, 230, 235, 245));

        // Footer Actions: SAVE & CANCEL
        addButton(BTN_MODAL_SAVE, RectF(dlgX + dlgW - 275.0f, dlgY + dlgH - 48.0f, 150.0f, 34.0f), L"SAVE CHANGES", Color(255, 16, 185, 129), Color(255, 10, 15, 20));
        addButton(BTN_MODAL_CANCEL, RectF(dlgX + dlgW - 110.0f, dlgY + dlgH - 48.0f, 90.0f, 34.0f), L"CANCEL", Color(255, 45, 52, 64), Color(255, 230, 235, 245));
    }
}

void BuildAppMenu(HWND hWnd) {
    HMENU hMenuBar = CreateMenu();
    HMENU hFileMenu = CreatePopupMenu();
    HMENU hViewMenu = CreatePopupMenu();
    HMENU hOptionsMenu = CreatePopupMenu();
    HMENU hHelpMenu = CreatePopupMenu();
    HMENU hPortsSubmenu = CreatePopupMenu();
    HMENU hColorSubmenu = CreatePopupMenu();
    HMENU hBrightSubmenu = CreatePopupMenu();

    // 1. File Menu
    AppendMenuW(hFileMenu, MF_STRING, IDM_FILE_EXPORT, L"&Export Frequencies to JSON...\\tCtrl+S");
    AppendMenuW(hFileMenu, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(hFileMenu, MF_STRING, IDM_FILE_EXIT, L"E&xit\\tAlt+F4");
    AppendMenuW(hMenuBar, MF_POPUP, (UINT_PTR)hFileMenu, L"&File");

    // 2. View Menu
    AppendMenuW(hViewMenu, g_app.showMemoryBanks ? (MF_STRING | MF_CHECKED) : MF_STRING, IDM_VIEW_BANKS_TOGGLE, L"&Memory Banks Window\\tF2");
    AppendMenuW(hViewMenu, MF_SEPARATOR, 0, nullptr);

    // Phosphor Color Submenu
    AppendMenuW(hColorSubmenu, MF_STRING, IDM_VIEW_COLOR_YAESU, L"Yaesu Cyan-Teal (#00F5D4)");
    AppendMenuW(hColorSubmenu, MF_STRING, IDM_VIEW_COLOR_AMBER, L"Vintage Amber (#FFB703)");
    AppendMenuW(hColorSubmenu, MF_STRING, IDM_VIEW_COLOR_GREEN, L"Emerald Green (#10B981)");
    AppendMenuW(hColorSubmenu, MF_STRING, IDM_VIEW_COLOR_RED, L"Ruby Red (#FB7185)");
    AppendMenuW(hColorSubmenu, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(hColorSubmenu, MF_STRING, IDM_VIEW_COLOR_CUSTOM, L"Custom RGB Color...");
    AppendMenuW(hViewMenu, MF_POPUP, (UINT_PTR)hColorSubmenu, L"VFD Phosphor &Color");

    // Brightness Submenu
    AppendMenuW(hBrightSubmenu, MF_STRING, IDM_VIEW_BRIGHT_100, L"100% Brightness");
    AppendMenuW(hBrightSubmenu, MF_STRING, IDM_VIEW_BRIGHT_75,  L"75% Brightness");
    AppendMenuW(hBrightSubmenu, MF_STRING, IDM_VIEW_BRIGHT_50,  L"50% Brightness");
    AppendMenuW(hBrightSubmenu, MF_STRING, IDM_VIEW_BRIGHT_25,  L"25% Brightness");
    AppendMenuW(hViewMenu, MF_POPUP, (UINT_PTR)hBrightSubmenu, L"VFD &Brightness");

    // LCD Frequency Readout Digits Color Submenu (Default Black per user request)
    HMENU hLcdColorSubmenu = CreatePopupMenu();
    AppendMenuW(hLcdColorSubmenu, MF_STRING, IDM_VIEW_LCD_BLACK,    L"Black (Default Authentic)");
    AppendMenuW(hLcdColorSubmenu, MF_STRING, IDM_VIEW_LCD_CHARCOAL, L"Dark Charcoal Liquid Crystal");
    AppendMenuW(hLcdColorSubmenu, MF_STRING, IDM_VIEW_LCD_GREEN,    L"Phosphor Green Glow");
    AppendMenuW(hLcdColorSubmenu, MF_STRING, IDM_VIEW_LCD_AMBER,    L"Vintage Amber Phosphor");
    AppendMenuW(hLcdColorSubmenu, MF_STRING, IDM_VIEW_LCD_WHITE,    L"Crisp White Backlit");
    AppendMenuW(hLcdColorSubmenu, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(hLcdColorSubmenu, MF_STRING, IDM_VIEW_LCD_CUSTOM,   L"Custom LCD Color...");
    AppendMenuW(hViewMenu, MF_POPUP, (UINT_PTR)hLcdColorSubmenu,    L"LCD &Digits Readout Color");

    AppendMenuW(hMenuBar, MF_POPUP, (UINT_PTR)hViewMenu, L"&View");

    // 3. Options Menu (COM Port & Serial Configuration)
    g_app.comPorts = FtdiYaesuCat::EnumerateComPorts();
    for (size_t i = 0; i < g_app.comPorts.size() && i < 30; ++i) {
        UINT flags = MF_STRING;
        if (static_cast<int>(i) == g_app.selectedComIdx) flags |= MF_CHECKED;
        AppendMenuW(hPortsSubmenu, flags, IDM_PORT_BASE + static_cast<UINT>(i), g_app.comPorts[i].c_str());
    }
    AppendMenuW(hPortsSubmenu, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(hPortsSubmenu, MF_STRING, IDM_OPTIONS_RESCAN, L"&Rescan COM Ports");
    AppendMenuW(hOptionsMenu, MF_POPUP, (UINT_PTR)hPortsSubmenu, L"&Serial COM Port");

    if (g_app.catSerial.IsConnected()) {
        AppendMenuW(hOptionsMenu, MF_STRING, IDM_OPTIONS_DISCONNECT, L"&Disconnect from Radio");
    } else {
        std::wstring connLabel = L"&Connect to " + (g_app.comPorts.empty() ? L"COM4" : g_app.comPorts[g_app.selectedComIdx]) + L" (4800 8N2)";
        AppendMenuW(hOptionsMenu, MF_STRING, IDM_OPTIONS_CONNECT, connLabel.c_str());
    }

    AppendMenuW(hOptionsMenu, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(hOptionsMenu, g_app.dtrEnabled ? (MF_STRING | MF_CHECKED) : MF_STRING, IDM_OPTIONS_TOGGLE_DTR, L"DTR Line (Disabled by Default)");
    AppendMenuW(hOptionsMenu, g_app.rtsEnabled ? (MF_STRING | MF_CHECKED) : MF_STRING, IDM_OPTIONS_TOGGLE_RTS, L"RTS Line (Disabled by Default)");

    AppendMenuW(hMenuBar, MF_POPUP, (UINT_PTR)hOptionsMenu, L"&Options");

    // 4. Help Menu
    AppendMenuW(hHelpMenu, MF_STRING, IDM_HELP_SPECS, L"Yaesu FRG-8800 &CAT Manual & FTDI Wiring");
    AppendMenuW(hHelpMenu, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(hHelpMenu, MF_STRING, IDM_HELP_ABOUT, L"&About FRG-8800 Controller");
    AppendMenuW(hMenuBar, MF_POPUP, (UINT_PTR)hHelpMenu, L"&Help");

    SetMenu(hWnd, hMenuBar);
}

void DoExportJson(HWND hWnd) {
    OPENFILENAMEW ofn = { sizeof(OPENFILENAMEW) };
    wchar_t szFile[MAX_PATH] = L"FRG8800_Frequencies.json";
    ofn.hwndOwner = hWnd;
    ofn.lpstrFilter = L"JSON Files (*.json)\\0*.json\\0All Files (*.*)\\0*.*\\0";
    ofn.lpstrFile = szFile;
    ofn.nMaxFile = MAX_PATH;
    ofn.Flags = OFN_OVERWRITEPROMPT | OFN_PATHMUSTEXIST;
    ofn.lpstrDefExt = L"json";
    if (GetSaveFileNameW(&ofn)) {
        FILE* fp = nullptr;
        _wfopen_s(&fp, szFile, L"w, ccs=UTF-8");
        if (fp) {
            fwprintf(fp, L"{\\n  \\\"radio\\\": \\\"Yaesu FRG-8800\\\",\\n  \\\"channels\\\": [\\n");
            for (size_t i = 0; i < g_app.channels.size(); ++i) {
                const auto& ch = g_app.channels[i];
                fwprintf(fp, L"    { \\\"freqHz\\\": %llu, \\\"callsign\\\": \\\"%s\\\", \\\"name\\\": \\\"%s\\\", \\\"location\\\": \\\"%s\\\" }%s\\n",
                    ch.freqHz, ch.callsign.c_str(), ch.stationName.c_str(), ch.location.c_str(),
                    (i + 1 < g_app.channels.size() ? L"," : L""));
            }
            fwprintf(fp, L"  ]\\n}\\n");
            fclose(fp);
            MessageBoxW(hWnd, L"Frequency banks exported successfully!", L"Export Complete", MB_OK | MB_ICONINFORMATION);
        }
    }
}

LRESULT CALLBACK WndProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
    case WM_CREATE:
        g_app.banks    = GetDefaultMemoryBanks();
        g_app.channels = GetDefaultFrequencies();
        g_app.comPorts = FtdiYaesuCat::EnumerateComPorts();
        for (size_t i = 0; i < g_app.comPorts.size(); ++i) {
            if (g_app.comPorts[i] == L"COM9" || g_app.comPorts[i] == L"COM4") {
                g_app.selectedComIdx = static_cast<int>(i);
                break;
            }
        }
        BuildAppMenu(hWnd);
        SetTimer(hWnd, 1, 1000, nullptr);
        return 0;

    case WM_COMMAND: {
        int wmId = LOWORD(wParam);
        if (wmId >= IDM_PORT_BASE && wmId < IDM_PORT_BASE + 30) {
            g_app.selectedComIdx = wmId - IDM_PORT_BASE;
            BuildAppMenu(hWnd);
            InvalidateRect(hWnd, nullptr, FALSE);
            return 0;
        }

        switch (wmId) {
        case IDM_FILE_EXPORT:
            DoExportJson(hWnd);
            break;
        case IDM_FILE_EXIT:
            DestroyWindow(hWnd);
            break;
        case IDM_VIEW_BANKS_TOGGLE: {
            g_app.showMemoryBanks = !g_app.showMemoryBanks;
            BuildAppMenu(hWnd);
            // Resize window smoothly if memory banks toggled
            RECT r;
            GetWindowRect(hWnd, &r);
            int newH = g_app.showMemoryBanks ? 760 : 540;
            SetWindowPos(hWnd, nullptr, r.left, r.top, r.right - r.left, newH, SWP_NOZORDER | SWP_NOMOVE);
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        }
        case IDM_VIEW_COLOR_YAESU:
            g_app.vfdR = 0; g_app.vfdG = 245; g_app.vfdB = 212;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_COLOR_AMBER:
            g_app.vfdR = 255; g_app.vfdG = 183; g_app.vfdB = 3;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_COLOR_GREEN:
            g_app.vfdR = 16; g_app.vfdG = 185; g_app.vfdB = 129;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_COLOR_RED:
            g_app.vfdR = 251; g_app.vfdG = 113; g_app.vfdB = 133;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_COLOR_CUSTOM: {
            static COLORREF custCols[16] = { 0 };
            CHOOSECOLORW cc = { sizeof(CHOOSECOLORW) };
            cc.hwndOwner = hWnd;
            cc.lpCustColors = custCols;
            cc.rgbResult = RGB(g_app.vfdR, g_app.vfdG, g_app.vfdB);
            cc.Flags = CC_FULLOPEN | CC_RGBINIT;
            if (ChooseColorW(&cc)) {
                g_app.vfdR = GetRValue(cc.rgbResult);
                g_app.vfdG = GetGValue(cc.rgbResult);
                g_app.vfdB = GetBValue(cc.rgbResult);
                InvalidateRect(hWnd, nullptr, FALSE);
            }
            break;
        }
        case IDM_VIEW_BRIGHT_100: g_app.vfdBrightness = 1.0f; InvalidateRect(hWnd, nullptr, FALSE); break;
        case IDM_VIEW_BRIGHT_75:  g_app.vfdBrightness = 0.75f; InvalidateRect(hWnd, nullptr, FALSE); break;
        case IDM_VIEW_BRIGHT_50:  g_app.vfdBrightness = 0.50f; InvalidateRect(hWnd, nullptr, FALSE); break;
        case IDM_VIEW_BRIGHT_25:  g_app.vfdBrightness = 0.25f; InvalidateRect(hWnd, nullptr, FALSE); break;
        case IDM_VIEW_LCD_BLACK:
            g_app.lcdTextR = 12; g_app.lcdTextG = 16; g_app.lcdTextB = 20;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_LCD_CHARCOAL:
            g_app.lcdTextR = 24; g_app.lcdTextG = 30; g_app.lcdTextB = 38;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_LCD_GREEN:
            g_app.lcdTextR = 0; g_app.lcdTextG = 245; g_app.lcdTextB = 212;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_LCD_AMBER:
            g_app.lcdTextR = 255; g_app.lcdTextG = 183; g_app.lcdTextB = 3;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_LCD_WHITE:
            g_app.lcdTextR = 255; g_app.lcdTextG = 255; g_app.lcdTextB = 255;
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_VIEW_LCD_CUSTOM: {
            static COLORREF custColsLcd[16] = { 0 };
            CHOOSECOLORW cc = { sizeof(CHOOSECOLORW) };
            cc.hwndOwner = hWnd;
            cc.lpCustColors = custColsLcd;
            cc.rgbResult = RGB(g_app.lcdTextR, g_app.lcdTextG, g_app.lcdTextB);
            cc.Flags = CC_FULLOPEN | CC_RGBINIT;
            if (ChooseColorW(&cc)) {
                g_app.lcdTextR = GetRValue(cc.rgbResult);
                g_app.lcdTextG = GetGValue(cc.rgbResult);
                g_app.lcdTextB = GetBValue(cc.rgbResult);
                InvalidateRect(hWnd, nullptr, FALSE);
            }
            break;
        }
        case IDM_OPTIONS_RESCAN:
            g_app.comPorts = FtdiYaesuCat::EnumerateComPorts();
            g_app.selectedComIdx = 0;
            BuildAppMenu(hWnd);
            g_app.statusMessage = L"Rescanned COM ports list.";
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_OPTIONS_TOGGLE_DTR:
            g_app.dtrEnabled = !g_app.dtrEnabled;
            g_app.catSerial.SetDtr(g_app.dtrEnabled);
            BuildAppMenu(hWnd);
            break;
        case IDM_OPTIONS_TOGGLE_RTS:
            g_app.rtsEnabled = !g_app.rtsEnabled;
            g_app.catSerial.SetRts(g_app.rtsEnabled);
            BuildAppMenu(hWnd);
            break;
        case IDM_OPTIONS_CONNECT:
            if (!g_app.comPorts.empty()) {
                std::wstring portName = g_app.comPorts[g_app.selectedComIdx];
                std::wstring errMsg;
                if (g_app.catSerial.Connect(portName, g_app.dtrEnabled, g_app.rtsEnabled, errMsg)) {
                    SyncRadioCat(true);
                    g_app.statusMessage = L"CONNECTED to " + portName + L" at 4800 8N2 (DTR/RTS OFF). CAT Active!";
                    g_app.hasError = false;
                    BuildAppMenu(hWnd);
                    MessageBeep(MB_OK);
                } else {
                    g_app.statusMessage = errMsg;
                    g_app.hasError = true;
                    MessageBoxW(hWnd, errMsg.c_str(), L"FTDI Serial Connection Error", MB_OK | MB_ICONWARNING);
                }
                InvalidateRect(hWnd, nullptr, FALSE);
            }
            break;
        case IDM_OPTIONS_DISCONNECT:
            g_app.catSerial.Disconnect();
            g_app.statusMessage = L"Disconnected from COM port.";
            g_app.hasError = false;
            BuildAppMenu(hWnd);
            InvalidateRect(hWnd, nullptr, FALSE);
            break;
        case IDM_HELP_SPECS:
            MessageBoxW(hWnd,
                L"Yaesu FRG-8800 CAT Serial Specifications:\\n\\n"
                L"• Baud Rate: 4800 Baud\\n"
                L"• Data Bits: 8\\n"
                L"• Parity: None\\n"
                L"• Stop Bits: 2 (8N2)\\n"
                L"• RTS / DTR: Disabled (low)\\n"
                L"• Command Packet: 5 bytes BCD with 65ms pacing\\n"
                L"• Rear DIN Connector: Active-LOW TTL RXD on Pin 2",
                L"Yaesu FRG-8800 CAT Specifications", MB_OK | MB_ICONINFORMATION);
            break;
        case IDM_HELP_ABOUT:
            MessageBoxW(hWnd,
                L"Yaesu FRG-8800 CAT Controller for Windows 11\\n\\n"
                L"• Native Win32 / C++20 / GDI+ Hardware Simulation\\n"
                L"• Clean Front Panel with Standard Windows Menu Bar\\n"
                L"• Direct FTDI USB Serial Communication (4800 8N2)\\n"
                L"• Queensland MW & South West Pacific Memory Banks\\n\\n"
                L"Designed for Ham Radio & Shortwave DX Enthusiasts.",
                L"About FRG-8800 Controller", MB_OK | MB_ICONINFORMATION);
            break;
        }
        return 0;
    }

    case WM_GETMINMAXINFO: {
        LPMINMAXINFO lpMMI = (LPMINMAXINFO)lParam;
        lpMMI->ptMinTrackSize.x = 1050;
        lpMMI->ptMinTrackSize.y = 520;
        return 0;
    }

    case WM_SIZE:
        InvalidateRect(hWnd, nullptr, FALSE);
        return 0;

    case WM_TIMER:
        if (g_app.isScanning) {
            static DWORD lastScanTick = 0;
            DWORD now = GetTickCount();
            if (now - lastScanTick >= 1500) {
                lastScanTick = now;
                StepMemoryChannel(1);
            }
        }
        InvalidateRect(hWnd, nullptr, FALSE);
        return 0;

    case WM_MOUSEWHEEL: {
        int zDelta = GET_WHEEL_DELTA_WPARAM(wParam);
        POINT ptWheel = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };
        ScreenToClient(hWnd, &ptWheel);
        if (g_app.showMemoryBanks && ptWheel.y >= 460) {
            // Scroll through memory banks
            g_app.bankScrollOffset += (zDelta > 0 ? -1 : 1);
            if (g_app.bankScrollOffset < 0) g_app.bankScrollOffset = 0;
            InvalidateRect(hWnd, nullptr, FALSE);
            return 0;
        }
        StepFrequency(zDelta > 0 ? static_cast<int64_t>(g_app.stepHz) : -static_cast<int64_t>(g_app.stepHz));
        InvalidateRect(hWnd, nullptr, FALSE);
        return 0;
    }

    case WM_LBUTTONDOWN: {
        POINT pt = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };
        PointF ptf(static_cast<float>(pt.x), static_cast<float>(pt.y));

        // Dial hit test
        float dcx = DIAL_RECT.X + DIAL_RECT.Width * 0.5f;
        float dcy = DIAL_RECT.Y + DIAL_RECT.Height * 0.5f;
        float dist = std::hypot(ptf.X - dcx, ptf.Y - dcy);
        if (!g_app.showEditModal && dist <= DIAL_RECT.Width * 0.5f) {
            g_app.draggingDial = true;
            SetCapture(hWnd);
            return 0;
        }

        // Button hits
        for (const auto& btn : g_buttons) {
            if (btn.rect.Contains(ptf)) {
                // If edit modal is showing, only allow modal buttons
                if (g_app.showEditModal) {
                    switch (btn.id) {
                    case BTN_MODAL_SAVE:
                        if (g_app.editingChannelIdx >= 0 && g_app.editingChannelIdx < static_cast<int>(g_app.channels.size())) {
                            g_app.channels[g_app.editingChannelIdx].freqHz = g_app.editFreqHz;
                            g_app.channels[g_app.editingChannelIdx].mode = g_app.editMode;
                            g_app.channels[g_app.editingChannelIdx].callsign = g_app.editCallsign;
                            g_app.channels[g_app.editingChannelIdx].stationName = g_app.editStationName;
                            g_app.channels[g_app.editingChannelIdx].location = g_app.editLocation;
                            g_app.showEditModal = false;
                            wchar_t editMsg[128];
                            swprintf_s(editMsg, 128, L"Saved %s (%s) at %8.3f kHz", g_app.editCallsign.c_str(), g_app.editStationName.c_str(), g_app.editFreqHz / 1000.0);
                            g_app.statusMessage = editMsg;
                            SyncRadioCat(true);
                        }
                        break;
                    case BTN_MODAL_CANCEL:
                        g_app.showEditModal = false;
                        break;
                    case BTN_MODAL_EDIT_ID:
                        // Edit Station ID / Callsign per user requirement
                        PromptUserString(hWnd, L"Edit Station ID / Callsign", L"Enter Station ID / Callsign (e.g. 4QR, WWV, RFDS):", g_app.editCallsign);
                        break;
                    case BTN_MODAL_EDIT_NAME:
                        // Edit Station / Service Name per user requirement
                        PromptUserString(hWnd, L"Edit Station / Service Name", L"Enter Station Name (e.g. ABC Radio Brisbane):", g_app.editStationName);
                        break;
                    case BTN_MODAL_EDIT_LOC:
                        // Edit Transmitter Location per user requirement
                        PromptUserString(hWnd, L"Edit Transmitter Location", L"Enter Location (e.g. Bald Hills, Brisbane, QLD):", g_app.editLocation);
                        break;
                    case BTN_MODAL_LOAD_VFO:
                        g_app.editFreqHz = g_app.freqHz;
                        g_app.editMode = g_app.mode;
                        break;
                    case BTN_MODAL_FREQ_UP:
                        g_app.editFreqHz = std::min(29999999ULL, g_app.editFreqHz + 10000ULL);
                        break;
                    case BTN_MODAL_FREQ_DN:
                        g_app.editFreqHz = std::max(150000ULL, g_app.editFreqHz - 10000ULL);
                        break;
                    case BTN_MODAL_MODE_CYCLE:
                        if (g_app.editMode == RadioMode::AM_W) g_app.editMode = RadioMode::AM_N;
                        else if (g_app.editMode == RadioMode::AM_N) g_app.editMode = RadioMode::USB;
                        else if (g_app.editMode == RadioMode::USB) g_app.editMode = RadioMode::LSB;
                        else if (g_app.editMode == RadioMode::LSB) g_app.editMode = RadioMode::CW;
                        else if (g_app.editMode == RadioMode::CW) g_app.editMode = RadioMode::FM;
                        else g_app.editMode = RadioMode::AM_W;
                        break;
                    }
                    InvalidateRect(hWnd, nullptr, FALSE);
                    return 0;
                }

                switch (btn.id) {
                case BTN_POWER:
                    g_app.powerOn = !g_app.powerOn;
                    break;
                case BTN_DIMMER:
                    g_app.vfdBrightness = (g_app.vfdBrightness <= 0.35f) ? 1.0f : (g_app.vfdBrightness <= 0.70f ? 0.30f : 0.65f);
                    break;
                case BTN_REC:
                    g_app.recStandby = !g_app.recStandby;
                    break;
                case BTN_ATT_DX:    g_app.attMode = 0; break;
                case BTN_ATT_NORM:  g_app.attMode = 1; break;
                case BTN_ATT_LOCAL: g_app.attMode = 2; break;
                case BTN_NB:        g_app.nbOn = !g_app.nbOn; break;
                case BTN_AGC:       g_app.agcFast = !g_app.agcFast; break;
                // Vertical Switches
                case BTN_SWITCH_BW:
                    g_app.mode = (g_app.mode == RadioMode::AM_N) ? RadioMode::AM_W : RadioMode::AM_N;
                    SyncRadioCat(true);
                    break;
                case BTN_SWITCH_AGC:
                    g_app.agcFast = !g_app.agcFast;
                    break;
                case BTN_SWITCH_NB:
                    g_app.nbOn = !g_app.nbOn;
                    break;
                case BTN_SWITCH_DIM:
                    g_app.vfdBrightness = (g_app.vfdBrightness >= 0.70f) ? 0.35f : 0.95f;
                    break;
                // Fine Tune 1 Hz & 10 Hz stepping
                case BTN_FINE_TUNE_DN10:
                    StepFrequency(-10);
                    g_app.clarifierHz = std::clamp(g_app.clarifierHz - 10, -990, 990);
                    break;
                case BTN_FINE_TUNE_DN1:
                    StepFrequency(-1);
                    g_app.clarifierHz = std::clamp(g_app.clarifierHz - 1, -990, 990);
                    break;
                case BTN_FINE_TUNE_UP1:
                    StepFrequency(1);
                    g_app.clarifierHz = std::clamp(g_app.clarifierHz + 1, -990, 990);
                    break;
                case BTN_FINE_TUNE_UP10:
                    StepFrequency(10);
                    g_app.clarifierHz = std::clamp(g_app.clarifierHz + 10, -990, 990);
                    break;
                case BTN_MODE_AMW:  g_app.mode = RadioMode::AM_W; SyncRadioCat(true); break;
                case BTN_MODE_AMN:  g_app.mode = RadioMode::AM_N; SyncRadioCat(true); break;
                case BTN_MODE_LSB:  g_app.mode = RadioMode::LSB;  SyncRadioCat(true); break;
                case BTN_MODE_USB:  g_app.mode = RadioMode::USB;  SyncRadioCat(true); break;
                case BTN_MODE_CW:   g_app.mode = RadioMode::CW;   SyncRadioCat(true); break;
                case BTN_MODE_FM:   g_app.mode = RadioMode::FM;   SyncRadioCat(true); break;
                case BTN_DIAL_LOCK: g_app.dialLocked = !g_app.dialLocked; break;
                case BTN_TUNE_FAST_DN: StepFrequency(-static_cast<int64_t>(g_app.stepHz * 10)); break;
                case BTN_TUNE_SLOW_DN: StepFrequency(-static_cast<int64_t>(g_app.stepHz)); break;
                case BTN_TUNE_SLOW_UP: StepFrequency(static_cast<int64_t>(g_app.stepHz)); break;
                case BTN_TUNE_FAST_UP: StepFrequency(static_cast<int64_t>(g_app.stepHz * 10)); break;
                case BTN_STEP_1HZ:    g_app.stepHz = 1ULL; break;
                case BTN_STEP_10HZ:   g_app.stepHz = 10ULL; break;
                case BTN_STEP_100HZ:  g_app.stepHz = 100ULL; break;
                case BTN_STEP_1KHZ:   g_app.stepHz = 1000ULL; break;
                case BTN_STEP_5KHZ:   g_app.stepHz = 5000ULL; break;
                case BTN_STEP_9KHZ:   g_app.stepHz = 9000ULL; break;
                case BTN_STEP_10KHZ:  g_app.stepHz = 10000ULL; break;
                case BTN_STEP_100KHZ: g_app.stepHz = 100000ULL; break;
                case BTN_STEP_1MHZ:   g_app.stepHz = 1000000ULL; break;
                case BTN_CLAR_ZERO:   g_app.clarifierHz = 0; break;
                // Keypad direct entry
                case BTN_KEYPAD_1: case BTN_KEYPAD_2: case BTN_KEYPAD_3:
                case BTN_KEYPAD_4: case BTN_KEYPAD_5: case BTN_KEYPAD_6:
                case BTN_KEYPAD_7: case BTN_KEYPAD_8: case BTN_KEYPAD_9:
                case BTN_KEYPAD_0:
                    if (g_app.keypadBuffer.size() < 8) g_app.keypadBuffer += btn.label;
                    break;
                case BTN_KEYPAD_CE:
                    g_app.keypadBuffer.clear();
                    break;
                case BTN_KEYPAD_ENT:
                    if (!g_app.keypadBuffer.empty()) {
                        double v = _wtof(g_app.keypadBuffer.c_str());
                        if (v > 0.0) {
                            uint64_t target = v <= 30.0 ? static_cast<uint64_t>(v * 1000000.0) : static_cast<uint64_t>(v * 1000.0);
                            g_app.freqHz = std::clamp(target, 150000ULL, 29999999ULL);
                            SyncRadioCat(false);
                        }
                        g_app.keypadBuffer.clear();
                    }
                    break;
                case BTN_KEYPAD_MHZ:
                    if (!g_app.keypadBuffer.empty()) {
                        double v = _wtof(g_app.keypadBuffer.c_str());
                        if (v > 0.0) {
                            g_app.freqHz = std::clamp(static_cast<uint64_t>(v * 1000000.0), 150000ULL, 29999999ULL);
                            SyncRadioCat(false);
                        }
                        g_app.keypadBuffer.clear();
                    }
                    break;
                case BTN_KEYPAD_KHZ:
                    if (!g_app.keypadBuffer.empty()) {
                        double v = _wtof(g_app.keypadBuffer.c_str());
                        if (v > 0.0) {
                            g_app.freqHz = std::clamp(static_cast<uint64_t>(v * 1000.0), 150000ULL, 29999999ULL);
                            SyncRadioCat(false);
                        }
                        g_app.keypadBuffer.clear();
                    }
                    break;
                case BTN_KEY_DOT:
                    if (g_app.keypadBuffer.size() < 8 && g_app.keypadBuffer.find(L'.') == std::wstring::npos) {
                        g_app.keypadBuffer += L".";
                    }
                    break;
                // Display Select Dial
                case BTN_DISP_SLEEP: g_app.displaySelect = 0; g_app.clockMode = 2; break;
                case BTN_DISP_OFF:   g_app.displaySelect = 1; break;
                case BTN_DISP_ON:    g_app.displaySelect = 2; break;
                case BTN_DISP_CLK1:  g_app.displaySelect = 3; g_app.clockMode = 0; break;
                case BTN_DISP_FREQ:  g_app.displaySelect = 4; break;
                case BTN_DISP_CLK2:  g_app.displaySelect = 5; g_app.clockMode = 1; break;
                case BTN_DISP_KNOB:  g_app.displaySelect = (g_app.displaySelect + 1) % 6; break;
                // Timer & SET Controls
                case BTN_TIMER_ON:    g_app.displaySelect = 0; g_app.clockMode = 2; break;
                case BTN_TIMER_CLEAR: g_app.displaySelect = 4; g_app.clockMode = 0; break;
                case BTN_SET_HOUR:    g_app.clockMode = (g_app.clockMode == 1 ? 0 : 1); break;
                case BTN_SET_TIME:    g_app.clockMode = (g_app.clockMode == 0 ? 1 : 0); break;
                // Right Column Memory / Scan Buttons
                case BTN_M_SELECT:
                    StepMemoryChannel(1);
                    break;
                case BTN_TO_VFO:
                    if (!g_app.channels.empty()) {
                        size_t chIdx = (g_app.memoryChannel - 1) % g_app.channels.size();
                        g_app.freqHz = g_app.channels[chIdx].freqHz;
                        g_app.mode   = g_app.channels[chIdx].mode;
                        g_app.vfoMode = 0;
                        SyncRadioCat(true);
                    }
                    break;
                case BTN_P_SCAN:
                    TriggerScan();
                    break;
                case BTN_PAUSE:
                    g_app.isScanning = false;
                    break;
                case BTN_M_SCAN:
                case BTN_S_SCAN:
                    TriggerScan();
                    break;
                case BTN_MR_MEM:
                    g_app.vfoMode = 1;
                    g_app.showMemoryBanks = true;
                    AddCurrentFreqToOpenBank();
                    break;
                case BTN_VFO_TO_M:
                    AddCurrentFreqToOpenBank();
                    break;
                case BTN_VFO_WIDE:
                    g_app.vfoMode = 0;
                    break;
                // M CH and ATT Dials
                case BTN_MCH_DIAL_KNOB:
                    g_app.memoryChannel = (g_app.memoryChannel % 12) + 1;
                    if (!g_app.banks.empty()) {
                        g_app.selectedBankIdx = (g_app.memoryChannel - 1) % g_app.banks.size();
                        g_app.showMemoryBanks = true;
                    }
                    break;
                case BTN_ATT_DIAL_KNOB:
                    g_app.attMode = (g_app.attMode + 1) % 4;
                    break;
                case BTN_ATT_DX_POS:    g_app.attMode = 0; break;
                case BTN_ATT_10DB_POS:  g_app.attMode = 1; break;
                case BTN_ATT_20DB_POS:  g_app.attMode = 2; break;
                case BTN_ATT_LOCAL_POS: g_app.attMode = 3; break;
                case BTN_KEYPAD_MR:
                    // User requirement: "The MR should add freqs to the open memory bank"
                    g_app.showMemoryBanks = true;
                    AddCurrentFreqToOpenBank();
                    break;
                case BTN_KEYPAD_MW:
                    g_app.showMemoryBanks = true;
                    AddCurrentFreqToOpenBank();
                    break;
                case BTN_VFO_MEM:
                    // Link VFO/MEM button to memory banks to step through memories per user requirement
                    g_app.showMemoryBanks = true;
                    StepMemoryChannel(1);
                    break;
                case BTN_KEYPAD_SCAN:
                    // User requirement: "The SCAN button should scan the freqs in the open memory bank"
                    TriggerScan();
                    break;
                case BTN_KEYPAD_SKIP:
                case BTN_KEYPAD_PRI:
                    StepMemoryChannel(1);
                    break;
                case BTN_SCROLL_UP:
                    if (g_app.bankScrollOffset > 0) g_app.bankScrollOffset--;
                    break;
                case BTN_SCROLL_DOWN:
                    g_app.bankScrollOffset++;
                    break;
                case BTN_BANK_ADD:
                    AddCurrentFreqToOpenBank();
                    break;
                case BTN_BANK_EDIT: {
                    // Open edit modal for the currently tuned or first channel in open bank
                    std::wstring activeBankId = g_app.banks[g_app.selectedBankIdx].id;
                    int targetIdx = -1;
                    for (size_t i = 0; i < g_app.channels.size(); ++i) {
                        if (g_app.channels[i].bankId == activeBankId) {
                            if (targetIdx == -1 || g_app.channels[i].freqHz == g_app.freqHz) {
                                targetIdx = static_cast<int>(i);
                                if (g_app.channels[i].freqHz == g_app.freqHz) break;
                            }
                        }
                    }
                    if (targetIdx >= 0) {
                        g_app.editingChannelIdx = targetIdx;
                        g_app.editFreqHz = g_app.channels[targetIdx].freqHz;
                        g_app.editMode = g_app.channels[targetIdx].mode;
                        g_app.editCallsign = g_app.channels[targetIdx].callsign;
                        g_app.editStationName = g_app.channels[targetIdx].stationName;
                        g_app.editLocation = g_app.channels[targetIdx].location;
                        g_app.showEditModal = true;
                    }
                    break;
                }
                case BTN_BANK_SCAN:
                    TriggerScan();
                    break;
                case BTN_KEYPAD_TIME:
                    g_app.clockMode = (g_app.clockMode + 1) % 3;
                    break;
                default:
                    if (btn.id >= BTN_MCH_BASE && btn.id < BTN_MCH_BASE + 12) {
                        g_app.memoryChannel = (btn.id - BTN_MCH_BASE) + 1;
                        if (!g_app.banks.empty()) {
                            g_app.selectedBankIdx = (g_app.memoryChannel - 1) % g_app.banks.size();
                            g_app.showMemoryBanks = true;
                            std::wstring activeBId = g_app.banks[g_app.selectedBankIdx].id;
                            for (const auto& ch : g_app.channels) {
                                if (ch.bankId == activeBId) {
                                    g_app.freqHz = ch.freqHz;
                                    g_app.mode   = ch.mode;
                                    SyncRadioCat(true);
                                    break;
                                }
                            }
                        }
                    } else if (btn.id >= BTN_BANK_BASE && btn.id < BTN_BANK_BASE + 20) {
                        g_app.selectedBankIdx = btn.id - BTN_BANK_BASE;
                        g_app.bankScrollOffset = 0;
                    } else if (btn.id >= BTN_CHAN_TUNE_BASE && btn.id < BTN_CHAN_TUNE_BASE + 500) {
                        size_t chIdx = btn.id - BTN_CHAN_TUNE_BASE;
                        if (chIdx < g_app.channels.size()) {
                            g_app.freqHz = g_app.channels[chIdx].freqHz;
                            g_app.mode   = g_app.channels[chIdx].mode;
                            SyncRadioCat(true);
                        }
                    } else if (btn.id >= BTN_CHAN_EDIT_BASE && btn.id < BTN_CHAN_EDIT_BASE + 500) {
                        size_t chIdx = btn.id - BTN_CHAN_EDIT_BASE;
                        if (chIdx < g_app.channels.size()) {
                            // User requirement: Open editing panel when memory edit is clicked
                            g_app.editingChannelIdx = static_cast<int>(chIdx);
                            g_app.editFreqHz = g_app.channels[chIdx].freqHz;
                            g_app.editMode = g_app.channels[chIdx].mode;
                            g_app.editCallsign = g_app.channels[chIdx].callsign;
                            g_app.editStationName = g_app.channels[chIdx].stationName;
                            g_app.editLocation = g_app.channels[chIdx].location;
                            g_app.showEditModal = true;
                        }
                    } else if (btn.id >= BTN_CHAN_DEL_BASE && btn.id < BTN_CHAN_DEL_BASE + 500) {
                        size_t chIdx = btn.id - BTN_CHAN_DEL_BASE;
                        if (chIdx < g_app.channels.size()) {
                            g_app.channels.erase(g_app.channels.begin() + chIdx);
                            g_app.statusMessage = L"Deleted channel from memory bank.";
                        }
                    }
                    break;
                }
                InvalidateRect(hWnd, nullptr, FALSE);
                break;
            }
        }
        return 0;
    }

    case WM_MOUSEMOVE:
        if (g_app.draggingDial) {
            POINT pt = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };
            float dcx = DIAL_RECT.X + DIAL_RECT.Width * 0.5f;
            float dcy = DIAL_RECT.Y + DIAL_RECT.Height * 0.5f;
            double angle = std::atan2(pt.y - dcy, pt.x - dcx) * 180.0 / 3.1415926535;
            double delta = angle - g_app.dialAngleDeg;
            if (delta > 180.0) delta -= 360.0;
            if (delta < -180.0) delta += 360.0;
            if (std::abs(delta) >= 7.0) {
                StepFrequency(delta > 0 ? static_cast<int64_t>(g_app.stepHz) : -static_cast<int64_t>(g_app.stepHz));
                g_app.dialAngleDeg = angle;
                InvalidateRect(hWnd, nullptr, FALSE);
            }
        }
        return 0;

    case WM_LBUTTONUP:
        if (g_app.draggingDial) {
            g_app.draggingDial = false;
            ReleaseCapture();
        }
        return 0;

    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hWnd, &ps);
        RECT rc;
        GetClientRect(hWnd, &rc);
        int w = rc.right - rc.left;
        int h = rc.bottom - rc.top;

        HDC memDC = CreateCompatibleDC(hdc);
        HBITMAP memBmp = CreateCompatibleBitmap(hdc, w, h);
        HGDIOBJ oldBmp = SelectObject(memDC, memBmp);

        Graphics g(memDC);
        RenderFrontPanel(g, w, h);

        BitBlt(hdc, 0, 0, w, h, memDC, 0, 0, SRCCOPY);

        SelectObject(memDC, oldBmp);
        DeleteObject(memBmp);
        DeleteDC(memDC);

        EndPaint(hWnd, &ps);
        return 0;
    }

    case WM_DESTROY:
        g_app.catSerial.Disconnect();
        PostQuitMessage(0);
        return 0;
    }
    return DefWindowProcW(hWnd, msg, wParam, lParam);
}

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE, PWSTR, int nCmdShow) {
    GdiplusStartupInput gsi;
    GdiplusStartup(&g_gdiplusToken, &gsi, nullptr);

    WNDCLASSEXW wc = { sizeof(WNDCLASSEXW) };
    wc.lpfnWndProc   = WndProc;
    wc.hInstance     = hInstance;
    wc.lpszClassName = L"YaesuFRG8800Win11Class";
    wc.hCursor       = LoadCursor(nullptr, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    RegisterClassExW(&wc);

    HWND hWnd = CreateWindowExW(
        0,
        wc.lpszClassName,
        L"Yaesu FRG-8800 Communications Receiver - Windows 11 Native CAT",
        WS_OVERLAPPEDWINDOW | WS_VISIBLE, // Resizable with minimize, maximize, and drag borders per user requirement
        CW_USEDEFAULT, CW_USEDEFAULT,
        1360, 840,
        nullptr, nullptr, hInstance, nullptr
    );

    if (!hWnd) return 1;

    ShowWindow(hWnd, nCmdShow);
    UpdateWindow(hWnd);

    MSG msg;
    while (GetMessageW(&msg, nullptr, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    GdiplusShutdown(g_gdiplusToken);
    return static_cast<int>(msg.wParam);
}
`;
}
