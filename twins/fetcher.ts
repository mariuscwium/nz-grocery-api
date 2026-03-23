import type { Fetcher } from "../src/lib/deps.js";

interface PageEntry {
  path: string;
  page: number;
  html: string;
}

export class FetcherTwin implements Fetcher {
  private pages: PageEntry[] = [];
  public calls: Array<{ path: string; page: number; region: string }> = [];

  addPage(path: string, page: number, html: string): void {
    this.pages.push({ path, page, html });
  }

  fetch(path: string, page: number, region: string): Promise<string> {
    this.calls.push({ path, page, region });

    const entry = this.pages.find((p) => p.path === path && p.page === page);
    return Promise.resolve(entry?.html ?? "");
  }

  reset(): void {
    this.pages = [];
    this.calls = [];
  }
}
