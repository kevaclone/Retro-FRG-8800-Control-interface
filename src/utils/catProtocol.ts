import { RadioMode } from '../types/radio';

/**
 * Authentic Yaesu FRG-8800 CAT Protocol Implementation
 * Baud Rate: 4800 Baud, 8 Data bits, No Parity, 2 Stop bits (8N2)
 *
 * 1. External Control ON Command:
 *    [0x00, 0x00, 0x00, 0x00, 0xD0]  (Byte 4 = 0x00, Byte 5 = 0xD0)
 *    Must be sent to activate CAT control on the receiver!
 *
 * 2. External Control OFF Command:
 *    [0x00, 0x00, 0x00, 0xB0, 0xD0]  (Byte 4 = 0xB0, Byte 5 = 0xD0)
 *
 * 3. Frequency Set Command:
 *    Byte 1: (100Hz << 4) | 25Hz_code
 *            25Hz_code: 1 = 0Hz, 2 = 25Hz, 4 = 50Hz, 8 = 75Hz (0x00 is invalid!)
 *    Byte 2: (10kHz << 4) | 1kHz
 *    Byte 3: (1MHz << 4)  | 100kHz
 *    Byte 4: (100MHz << 4) | 10MHz
 *    Byte 5: 0x01 (Opcode)
 *
 *    Example from Yaesu Operating Manual: 14.25400 MHz:
 *    - Byte 1 = 0x01 (0 100Hz, 0 25Hz -> code 1)
 *    - Byte 2 = 0x54 (5 10kHz, 4 1kHz)
 *    - Byte 3 = 0x42 (4 1MHz, 2 100kHz)
 *    - Byte 4 = 0x01 (0 100MHz, 1 10MHz)
 *    - Byte 5 = 0x01 (Frequency Set Opcode)
 *    Sequence: [0x01, 0x54, 0x42, 0x01, 0x01]
 *
 * 4. Mode Set Command:
 *    Byte 1, 2, 3: 0x00, 0x00, 0x00
 *    Byte 4: Mode Code
 *            0x00 = AM-W (Wide)
 *            0x08 = AM-N (Narrow)
 *            0x01 = LSB
 *            0x02 = USB
 *            0x03 = CW
 *            0x04 = FM
 *    Byte 5: 0x80 (Mode Set Opcode)
 */

export const MODE_TO_CAT_BYTE: Record<RadioMode, number> = {
  'AM-W': 0x00,
  'AM-N': 0x08,
  LSB:    0x01,
  USB:    0x02,
  CW:     0x03,
  FM:     0x04,
};

export function encodeBcdFrequencyPacket(freqHz: number): Uint8Array {
  const clamped = Math.max(150000, Math.min(29999999, Math.round(freqHz)));

  const hundredMhz = Math.floor(clamped / 100000000) % 10;
  const tenMhz     = Math.floor(clamped / 10000000) % 10;
  const oneMhz     = Math.floor(clamped / 1000000) % 10;
  const hundredKhz = Math.floor(clamped / 100000) % 10;
  const tenKhz     = Math.floor(clamped / 10000) % 10;
  const oneKhz     = Math.floor(clamped / 1000) % 10;
  const hundredHz  = Math.floor(clamped / 100) % 10;

  // 25 Hz step coding (1=0Hz, 2=25Hz, 4=50Hz, 8=75Hz)
  const remainderHz = clamped % 100;
  let code25Hz = 1;
  if (remainderHz >= 75) code25Hz = 8;
  else if (remainderHz >= 50) code25Hz = 4;
  else if (remainderHz >= 25) code25Hz = 2;

  const byte1 = ((hundredHz & 0x0f) << 4) | (code25Hz & 0x0f);
  const byte2 = ((tenKhz & 0x0f) << 4) | (oneKhz & 0x0f);
  const byte3 = ((oneMhz & 0x0f) << 4) | (hundredKhz & 0x0f);
  const byte4 = ((hundredMhz & 0x0f) << 4) | (tenMhz & 0x0f);
  const byte5 = 0x01; // Frequency Set Opcode

  return new Uint8Array([byte1, byte2, byte3, byte4, byte5]);
}

export function encodeModePacket(mode: RadioMode): Uint8Array {
  const modeCode = MODE_TO_CAT_BYTE[mode] ?? 0x00;
  return new Uint8Array([0x00, 0x00, 0x00, modeCode, 0x80]);
}

export function encodeCatPowerOnPacket(): Uint8Array {
  // External Control ON for FRG-8800: [00, 00, 00, 00, D0]
  return new Uint8Array([0x00, 0x00, 0x00, 0x00, 0xd0]);
}

export function encodeCatPowerOffPacket(): Uint8Array {
  // External Control OFF for FRG-8800: [00, 00, 00, B0, D0]
  return new Uint8Array([0x00, 0x00, 0x00, 0xb0, 0xd0]);
}

export function formatPacketHex(packet: Uint8Array): string {
  return Array.from(packet)
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

export function formatFreqReadout(freqHz: number): {
  mhzDigits: string;
  khzDigits: string;
  subKhzDigits: string;
  hzSingleDigit: string;
} {
  const clamped = Math.max(150000, Math.min(29999999, Math.round(freqHz)));
  const mhz = Math.floor(clamped / 1000000);
  const khz = Math.floor((clamped % 1000000) / 1000);
  const hundredTenHz = Math.floor((clamped % 1000) / 10);
  const oneHz = clamped % 10;

  return {
    mhzDigits: mhz > 0 ? mhz.toString().padStart(2, ' ') : ' 0',
    khzDigits: khz.toString().padStart(3, '0'),
    subKhzDigits: hundredTenHz.toString().padStart(2, '0'),
    hzSingleDigit: oneHz.toString(),
  };
}
