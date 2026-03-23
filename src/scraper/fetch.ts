const BASE_URL = "https://salefinder.co.nz";
const DELAY_MS = 1000;
const USER_AGENT = "nz-grocery-api/0.1 (github.com/mariuscwium/nz-grocery-api)";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPage(path: string, page: number, region: string): Promise<string> {
  const url = `${BASE_URL}${path}?qs=${String(page)},,,,`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: `regionName=${region}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)} fetching ${url}`);
  }

  await sleep(DELAY_MS);
  return response.text();
}
