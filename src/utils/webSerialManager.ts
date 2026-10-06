import {
  encodeBcdFrequencyPacket,
  encodeModePacket,
  encodeCatPowerOnPacket,
  formatPacketHex,
} from './catProtocol';
import { RadioMode } from '../types/radio';

export interface SerialStatus {
  connected: boolean;
  portName?: string;
  error?: string;
  baudRate: number;
  lastPacketHex?: string;
  dtr: boolean;
  rts: boolean;
}

class WebSerialManager {
  private port: any = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private lastTxTime: number = 0;
  private minIntervalMs: number = 65; // Pacing for FRG-8800 CPU
  private statusListeners: Set<(status: SerialStatus) => void> = new Set();

  private currentStatus: SerialStatus = {
    connected: false,
    baudRate: 4800,
    dtr: true,
    rts: true,
  };

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public subscribe(listener: (status: SerialStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener({ ...this.currentStatus });
    return () => this.statusListeners.delete(listener);
  }

  private notify() {
    for (const listener of this.statusListeners) {
      listener({ ...this.currentStatus });
    }
  }

  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      this.currentStatus.error = 'Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge on Windows 11.';
      this.notify();
      return false;
    }

    try {
      // Prompt user to pick their USB-to-FTDI/TTL COM Port
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      
      // Yaesu FRG-8800 CAT Specifications: 4800 baud, 8 data bits, 2 stop bits, no parity
      await port.open({
        baudRate: 4800,
        dataBits: 8,
        stopBits: 2,
        parity: 'none',
        bufferSize: 255,
        flowControl: 'none',
      });

      // User specification: RTS and DTR disabled by default
      try {
        await port.setSignals({
          dataTerminalReady: false,
          requestToSend: false,
        });
      } catch {
        // Some drivers don't expose signals, continue
      }

      this.port = port;
      this.writer = port.writable ? port.writable.getWriter() : null;

      // Extract port info if available
      const info = port.getInfo ? port.getInfo() : {};
      const portName = info.usbVendorId
        ? `FTDI (VID: 0x${info.usbVendorId.toString(16)}, PID: 0x${(info.usbProductId || 0).toString(16)})`
        : 'FTDI USB COM Port';

      this.currentStatus = {
        connected: true,
        portName,
        baudRate: 4800,
        dtr: false,
        rts: false,
        error: undefined,
      };
      this.notify();

      // Send initial frequency and mode to the radio
      await this.sendFrequency(612000);

      return true;
    } catch (err: any) {
      console.error('Serial connection error:', err);
      this.currentStatus.connected = false;
      this.currentStatus.error = err.message || 'Failed to open serial port.';
      this.notify();
      return false;
    }
  }

  public async setSignals(dtr: boolean, rts: boolean): Promise<void> {
    this.currentStatus.dtr = dtr;
    this.currentStatus.rts = rts;
    if (this.port && typeof this.port.setSignals === 'function') {
      try {
        await this.port.setSignals({
          dataTerminalReady: dtr,
          requestToSend: rts,
        });
      } catch (e) {
        console.warn('Could not set port signals:', e);
      }
    }
    this.notify();
  }

  public async sendTestPing(): Promise<string> {
    const packet = encodeCatPowerOnPacket();
    const hex = formatPacketHex(packet);
    await this.sendRawPacket(packet, 'Test Ping (00 00 00 00 D0)');
    return hex;
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        await this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (err: any) {
      console.warn('Error during disconnect:', err);
    } finally {
      this.currentStatus.connected = false;
      this.currentStatus.portName = undefined;
      this.notify();
    }
  }

  public async sendFrequency(freqHz: number): Promise<string> {
    const packet = encodeBcdFrequencyPacket(freqHz);
    const hex = formatPacketHex(packet);
    await this.sendRawPacket(packet, `Tune ${(freqHz / 1000).toFixed(3)} kHz`);
    return hex;
  }

  public async sendMode(mode: RadioMode): Promise<string> {
    const packet = encodeModePacket(mode);
    const hex = formatPacketHex(packet);
    await this.sendRawPacket(packet, `Mode ${mode}`);
    return hex;
  }

  private async sendRawPacket(packet: Uint8Array, _label: string): Promise<boolean> {
    if (!this.writer || !this.port) {
      return false;
    }

    try {
      // Enforce 65ms minimum pacing so the FRG-8800 internal 8-bit CPU is never overrun
      const now = performance.now();
      const elapsed = now - this.lastTxTime;
      if (elapsed < this.minIntervalMs) {
        await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
      }

      await this.writer.write(packet);
      this.lastTxTime = performance.now();
      this.currentStatus.lastPacketHex = formatPacketHex(packet);
      this.notify();
      return true;
    } catch (err: any) {
      console.error('Failed to write serial packet:', err);
      this.currentStatus.error = `Write failed: ${err.message || 'I/O error'}`;
      this.notify();
      return false;
    }
  }
}

export const webSerialManager = new WebSerialManager();
