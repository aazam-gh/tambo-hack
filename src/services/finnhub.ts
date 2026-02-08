const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

const FALLBACK_FINNHUB_TOKEN = "d646mq1r01ql6dj2d1t0d646mq1r01ql6dj2d1tg";

export function getFinnhubToken(): string {
  return import.meta.env.VITE_FINNHUB_API_KEY ?? FALLBACK_FINNHUB_TOKEN;
}

function buildFinnhubUrl(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set("token", getFinnhubToken());
  return url.toString();
}

export async function finnhubGetJson<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const response = await fetch(buildFinnhubUrl(path, params));
  if (!response.ok) {
    throw new Error(`Finnhub request failed (${response.status}) for ${path}`);
  }
  return (await response.json()) as T;
}

export type FinnhubCandleResolution =
  | "1"
  | "5"
  | "15"
  | "30"
  | "60"
  | "D"
  | "W"
  | "M";

type FinnhubCandleResponse = {
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  t?: number[];
  v?: number[];
  s: "ok" | "no_data";
};

export type FinnhubCandle = {
  timestamp: number;
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
};

export async function fetchFinnhubCandles(args: {
  symbol: string;
  resolution: FinnhubCandleResolution;
  from: number;
  to: number;
}): Promise<FinnhubCandle[]> {
  const data = await finnhubGetJson<FinnhubCandleResponse>("/stock/candle", args);
  if (data.s !== "ok") {
    return [];
  }

  const timestamps = data.t ?? [];
  const close = data.c ?? [];
  const high = data.h ?? [];
  const low = data.l ?? [];
  const open = data.o ?? [];
  const volume = data.v ?? [];
  const length = Math.min(
    timestamps.length,
    close.length,
    high.length,
    low.length,
    open.length,
    volume.length,
  );

  const candles: FinnhubCandle[] = [];
  for (let i = 0; i < length; i += 1) {
    candles.push({
      timestamp: timestamps[i]!,
      close: close[i]!,
      high: high[i]!,
      low: low[i]!,
      open: open[i]!,
      volume: volume[i]!,
    });
  }
  return candles;
}

export type FinnhubInsiderSentiment = {
  year: number;
  month: number;
  mspr: number;
  change: number;
};

type FinnhubInsiderSentimentResponse = {
  symbol: string;
  data: FinnhubInsiderSentiment[];
};

export async function fetchFinnhubInsiderSentiment(args: {
  symbol: string;
  from: string;
}): Promise<FinnhubInsiderSentiment[]> {
  const data = await finnhubGetJson<FinnhubInsiderSentimentResponse>(
    "/stock/insider-sentiment",
    args,
  );
  return data.data ?? [];
}
