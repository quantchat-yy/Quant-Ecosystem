import type { LaunchChecklist, LaunchGate } from '../types.js';

export class LaunchChecklistManager {
  private gates: Map<string, LaunchGate> = new Map();
  constructor() {
    const preset = [
      'pen-test-clean',
      'nps-gte-40',
      'd30-gte-25',
      'zero-p0-incidents',
      'app-store-approved',
    ];
    preset.forEach((name) => this.gates.set(name, { name, required: true, passed: false }));
  }
  addGate(name: string, required: boolean) {
    this.gates.set(name, { name, required, passed: false });
  }
  passGate(name: string) {
    const g = this.gates.get(name);
    if (g) g.passed = true;
  }
  failGate(name: string) {
    const g = this.gates.get(name);
    if (g) g.passed = false;
  }
  getStatus(): LaunchChecklist {
    const gates = [...this.gates.values()];
    const allHardGatesPassed = gates.filter((g) => g.required).every((g) => g.passed);
    return { gates, allHardGatesPassed, readyToLaunch: allHardGatesPassed };
  }
  isReadyToLaunch(): boolean {
    return this.getStatus().readyToLaunch;
  }
}
