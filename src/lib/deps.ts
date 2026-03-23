export interface Fetcher {
  fetch(path: string, page: number, region: string): Promise<string>;
}

export interface Output {
  write(data: string): void;
}

export interface Deps {
  fetcher: Fetcher;
  output: Output;
}
