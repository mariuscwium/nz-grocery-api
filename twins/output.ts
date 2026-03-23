import type { Output } from "../src/lib/deps.js";

export class OutputTwin implements Output {
  public written: string[] = [];

  write(data: string): void {
    this.written.push(data);
  }

  get lastOutput(): string {
    return this.written.at(-1) ?? "";
  }

  reset(): void {
    this.written = [];
  }
}
