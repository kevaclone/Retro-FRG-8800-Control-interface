export type RadioMode = 'LSB' | 'USB' | 'AM-W' | 'AM-N' | 'CW' | 'FM';
export type AttenuatorMode = 'DX' | 'NORM' | 'LOCAL' | '10dB' | '20dB';
export type AgcMode = 'FAST' | 'SLOW';
export type ClockDisplayMode = 'AEST' | 'UTC' | 'TIMER';

export interface FrequencyEntry {
  id: string;
  bankId: string;
  freqKhz: number;
  callsign: string;
  stationName: string;
  location: string;
  stateOrRegion: string;
  mode: RadioMode;
  schedule: string;
  notes: string;
  powerKw?: string;
  morseId?: string;
  signalStrength: number;
}

export interface MemoryBank {
  id: string;
  name: string;
  shortLabel: string;
  region: string;
  description: string;
  category: 'MW_QLD' | 'RFDS' | 'ATC' | 'MARINE' | 'UTILITY' | 'SW_BC' | 'LW_NDB' | 'CUSTOM';
  isSystem?: boolean;
}

export interface CatPacketLog {
  id: string;
  timestamp: string;
  commandName: string;
  hexBytes: string;
  description: string;
  transport: 'FTDI_USB_SERIAL' | 'SIMULATED';
}

export interface RadioState {
  powerOn: boolean;
  freqHz: number;
  mode: RadioMode;
  stepHz: number;
  vfoMode: 'VFO' | 'MEM';
  memoryChannel: number;
  dialLocked: boolean;

  // Display customization
  vfdColor: string;
  vfdColorName: string;
  vfdBrightness: number;
  lcdTextColor?: string;
  displaySelect?: 'SLEEP' | 'OFF' | 'ON' | 'CLOCK1' | 'FREQ' | 'CLOCK2';

  // Non-CAT Hardware Front Panel Controls
  afGain: number;
  rfGain: number;
  sqlLevel: number;
  toneLevel: number;
  notchPos: number;
  clarifierHz: number;
  noiseBlanker: boolean;
  agcMode: AgcMode;
  attenuator: AttenuatorMode;
  bandwidth?: 'WIDE' | 'NARROW';
  recStandby: boolean;
  clockMode: ClockDisplayMode;
}

export interface VfdColorPreset {
  id: string;
  name: string;
  hex: string;
  glowRgba: string;
}
