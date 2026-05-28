import { TrainResult } from '../types.js';

export interface IRCTCProvider {
  searchTrains(from: string, to: string, date: string): Promise<TrainResult[]>;
  checkAvailability(trainId: string, trainClass: string, date: string): Promise<number>;
  getSeatMap(trainId: string, trainClass: string): Promise<string[]>;
}

export class TrainSearchEngine implements IRCTCProvider {
  private providers: IRCTCProvider[] = [];

  addProvider(provider: IRCTCProvider): void {
    this.providers.push(provider);
  }

  async searchTrains(from: string, to: string, date: string): Promise<TrainResult[]> {
    const all: TrainResult[] = [];
    for (const p of this.providers) all.push(...(await p.searchTrains(from, to, date)));
    return all;
  }

  async checkAvailability(trainId: string, trainClass: string, date: string): Promise<number> {
    for (const p of this.providers) {
      const a = await p.checkAvailability(trainId, trainClass, date);
      if (a >= 0) return a;
    }
    return -1;
  }

  async getSeatMap(trainId: string, trainClass: string): Promise<string[]> {
    for (const p of this.providers) {
      const m = await p.getSeatMap(trainId, trainClass);
      if (m.length > 0) return m;
    }
    return [];
  }

  supportsTatkal(currentTime: Date): { ac: boolean; sleeper: boolean } {
    const h = currentTime.getUTCHours();
    const m = currentTime.getUTCMinutes();
    const istMin = h * 60 + m + 330; // UTC + 5:30
    return {
      ac: istMin >= 600 && istMin < 720,
      sleeper: istMin >= 660 && istMin < 720,
    };
  }

  bookTatkal(
    _trainId: string,
    trainClass: string,
    currentTime: Date,
  ): { eligible: boolean; message: string } {
    const w = this.supportsTatkal(currentTime);
    const eligible = trainClass.toLowerCase().includes('ac') ? w.ac : w.sleeper;
    return eligible
      ? { eligible: true, message: 'Tatkal booking initiated' }
      : { eligible: false, message: 'Tatkal booking window is not open' };
  }
}

export class MockTrainProvider implements IRCTCProvider {
  private trains: TrainResult[] = [];
  setTrains(trains: TrainResult[]): void {
    this.trains = trains;
  }
  async searchTrains(_f: string, _t: string, _d: string): Promise<TrainResult[]> {
    return this.trains;
  }
  async checkAvailability(_id: string, _c: string, _d: string): Promise<number> {
    return 42;
  }
  async getSeatMap(_id: string, _c: string): Promise<string[]> {
    return ['A1', 'A2', 'A3', 'B1', 'B2'];
  }
}
