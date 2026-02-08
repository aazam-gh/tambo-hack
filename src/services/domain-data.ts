import type { DomainId } from "@/lib/domains";

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildDayLabels(days: number): string[] {
  const now = new Date();
  const labels: string[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(
      d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    );
  }

  return labels;
}

function buildSeries({
  length,
  base,
  trend,
  seasonality,
  noise,
  spikeAt,
  spikeMagnitude,
  rng,
}: {
  length: number;
  base: number;
  trend: number;
  seasonality: number;
  noise: number;
  spikeAt?: number;
  spikeMagnitude?: number;
  rng: () => number;
}): number[] {
  const values: number[] = [];
  let stateNoise = 0;
  const normalizedSpikeAt =
    typeof spikeAt === "number" ? clamp(spikeAt, 0, length - 1) : undefined;

  for (let i = 0; i < length; i += 1) {
    stateNoise = stateNoise * 0.75 + (rng() - 0.5) * noise;
    const seasonal = Math.sin((i / length) * Math.PI * 2) * seasonality;
    const spike =
      typeof normalizedSpikeAt === "number" && normalizedSpikeAt === i
        ? spikeMagnitude ?? 0
        : 0;
    values.push(base + trend * i + seasonal + stateNoise + spike);
  }

  return values;
}

export type SalesQuery = {
  rangeDays?: number;
  region?: "na" | "emea" | "apac";
  plan?: "starter" | "pro" | "enterprise";
};

export type SalesData = {
  revenue: { labels: string[]; values: number[] };
  byRegion: { region: string; revenue: number }[];
};

export function fetchSalesData(query: SalesQuery = {}): SalesData {
  const rangeDays = clamp(query.rangeDays ?? 14, 7, 30);
  const regionWeight =
    query.region === "emea" ? 0.92 : query.region === "apac" ? 0.78 : 1;
  const planWeight =
    query.plan === "enterprise" ? 1.35 : query.plan === "pro" ? 1.1 : 0.85;

  const rng = mulberry32(
    seedFromString(`sales:${query.region ?? "all"}:${query.plan ?? "all"}`),
  );
  const labels = buildDayLabels(rangeDays);

  const values = buildSeries({
    length: labels.length,
    base: 120_000 * regionWeight * planWeight,
    trend: 2_100 * regionWeight,
    seasonality: 9_000,
    noise: 11_000,
    rng,
  }).map((v) => Math.round(Math.max(10_000, v)));

  const regions = [
    { region: "North America", w: 1.0 },
    { region: "EMEA", w: 0.85 },
    { region: "APAC", w: 0.72 },
  ];

  const last = values.at(-1) ?? 0;
  const byRegion = regions.map((r) => ({
    region: r.region,
    revenue: Math.round(last * r.w * (0.9 + rng() * 0.25)),
  }));

  return { revenue: { labels, values }, byRegion };
}

export type InfraQuery = {
  rangeDays?: number;
  service?: "api" | "worker" | "db";
};

export type InfraAlert = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
};

export type InfraLogLine = {
  at: string;
  level: "info" | "warn" | "error";
  message: string;
};

export type InfraData = {
  errorRate: { labels: string[]; values: number[] };
  alerts: InfraAlert[];
  logs: InfraLogLine[];
};

export function fetchInfraData(query: InfraQuery = {}): InfraData {
  const rangeDays = clamp(query.rangeDays ?? 14, 7, 30);
  const serviceWeight =
    query.service === "db" ? 1.15 : query.service === "worker" ? 0.95 : 1;

  const rng = mulberry32(
    seedFromString(`infra:${query.service ?? "all"}:${rangeDays}`),
  );
  const labels = buildDayLabels(rangeDays);

  const spikeAt = Math.max(2, Math.floor(labels.length * 0.6));
  const values = buildSeries({
    length: labels.length,
    base: 0.7 * serviceWeight,
    trend: -0.01,
    seasonality: 0.12,
    noise: 0.15,
    spikeAt,
    spikeMagnitude: 0.95,
    rng,
  }).map((v) => Math.round(clamp(v, 0.05, 3.5) * 100) / 100);

  const latest = values.at(-1) ?? 0;
  const alerts: InfraAlert[] = [];
  if (latest > 1.2) {
    alerts.push({
      id: "alert-error-rate",
      title: "Elevated error rate",
      severity: latest > 2.2 ? "high" : "medium",
    });
  }
  if (rng() > 0.55) {
    alerts.push({
      id: "alert-latency",
      title: "p95 latency regression",
      severity: rng() > 0.75 ? "high" : "medium",
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: "alert-ok",
      title: "No active alerts",
      severity: "low",
    });
  }

  const logs: InfraLogLine[] = [];
  const logBase = Math.round(18 + rng() * 8);
  const errorMultiplier = latest > 1.5 ? 2.2 : 1;

  for (let i = 0; i < logBase; i += 1) {
    const isError = rng() < 0.08 * errorMultiplier;
    const isWarn = !isError && rng() < 0.18;
    const level: InfraLogLine["level"] = isError
      ? "error"
      : isWarn
        ? "warn"
        : "info";

    const timestamp = new Date(Date.now() - (logBase - i) * 45_000).toISOString();
    const message = isError
      ? "Upstream request failed with 502"
      : isWarn
        ? "Retrying request after transient timeout"
        : "Request processed";
    logs.push({ at: timestamp, level, message });
  }

  return {
    errorRate: { labels, values },
    alerts,
    logs,
  };
}

export type MarketingQuery = {
  rangeDays?: number;
  channel?: "paid" | "organic" | "email";
};

export type MarketingData = {
  ctr: { labels: string[]; values: number[] };
  topCampaigns: { campaign: string; ctr: number; spend: number }[];
};

export function fetchMarketingData(query: MarketingQuery = {}): MarketingData {
  const rangeDays = clamp(query.rangeDays ?? 14, 7, 30);
  const channelWeight =
    query.channel === "email" ? 1.35 : query.channel === "organic" ? 0.95 : 1;
  const rng = mulberry32(
    seedFromString(`marketing:${query.channel ?? "all"}:${rangeDays}`),
  );
  const labels = buildDayLabels(rangeDays);

  const values = buildSeries({
    length: labels.length,
    base: 2.4 * channelWeight,
    trend: 0.02,
    seasonality: 0.55,
    noise: 0.45,
    rng,
  }).map((v) => Math.round(clamp(v, 0.3, 7.5) * 100) / 100);

  const campaigns = [
    "Search - Brand",
    "Search - Competitors",
    "Newsletter",
    "Retargeting",
    "Product launch",
  ];
  const topCampaigns = campaigns
    .map((campaign) => ({
      campaign,
      ctr: Math.round((1.4 + rng() * 3.5) * 100) / 100,
      spend: Math.round((2_000 + rng() * 22_000) * channelWeight),
    }))
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, 4);

  return { ctr: { labels, values }, topCampaigns };
}

export type LegalQuery = {
  topic?: "privacy" | "contracts" | "compliance";
};

export type LegalData = {
  summary: string[];
  checklist: { item: string; status: "open" | "done" }[];
};

export function fetchLegalData(query: LegalQuery = {}): LegalData {
  const rng = mulberry32(seedFromString(`legal:${query.topic ?? "all"}`));
  const topic = query.topic ?? "privacy";

  const toStatus = (done: boolean): "open" | "done" => (done ? "done" : "open");

  const summaryByTopic: Record<typeof topic, string[]> = {
    privacy: [
      "Cookie banner language needs review.",
      "Update DPA template for new subprocessors.",
      "Add retention policy reference to onboarding docs.",
    ],
    contracts: [
      "Renewal clauses vary across top 10 accounts.",
      "MSA redlines pending for 2 enterprise customers.",
      "Standardize signature blocks for EU entities.",
    ],
    compliance: [
      "SOC2 evidence collection is in progress.",
      "Vendor risk reviews are mostly complete.",
      "Prepare Q2 audit packet and access logs.",
    ],
  };

  const baseSummary = summaryByTopic[topic];
  const summary = baseSummary
    .map((s) => (rng() > 0.82 ? `${s} (priority)` : s))
    .slice(0, 3);

  const checklist = [
    { item: "Review new vendor terms", status: toStatus(rng() > 0.6) },
    { item: "Finalize policy updates", status: toStatus(rng() > 0.45) },
    { item: "Sync with security team", status: toStatus(rng() > 0.5) },
  ];

  return { summary, checklist };
}

export type DevQuery = {
  pipeline?: "main" | "release" | "hotfix";
};

export type PipelineStep = {
  name: string;
  status: "pending" | "running" | "success" | "failed";
  durationSeconds?: number;
};

export type PipelineRun = {
  id: string;
  branch: string;
  status: "running" | "success" | "failed";
  steps: PipelineStep[];
};

export type DevData = {
  pipelines: PipelineRun[];
};

export function fetchDevData(query: DevQuery = {}): DevData {
  const pipeline = query.pipeline ?? "main";
  const rng = mulberry32(seedFromString(`dev:${pipeline}`));

  const stepTemplates = [
    "Install",
    "Typecheck",
    "Lint",
    "Build",
    "Deploy",
  ];

  const makeSteps = (hasFailure: boolean): PipelineStep[] => {
    let failed = false;
    return stepTemplates.map((name) => {
      if (failed) {
        return { name, status: "pending" };
      }

      const shouldFail = hasFailure && !failed && rng() > 0.72 && name === "Build";
      if (shouldFail) {
        failed = true;
        return { name, status: "failed", durationSeconds: Math.round(30 + rng() * 50) };
      }

      const isRunning = !hasFailure && name === "Deploy" && rng() > 0.55;
      const status: PipelineStep["status"] = isRunning
        ? "running"
        : "success";

      return {
        name,
        status,
        durationSeconds: Math.round(25 + rng() * 70),
      };
    });
  };

  const pipelines: PipelineRun[] = [
    {
      id: `run-${pipeline}-1`,
      branch: pipeline === "release" ? "release/1.3" : "main",
      status: rng() > 0.75 ? "failed" : "success",
      steps: makeSteps(rng() > 0.75),
    },
    {
      id: `run-${pipeline}-2`,
      branch: pipeline === "hotfix" ? "hotfix/login" : "feature/ui",
      status: rng() > 0.55 ? "running" : "success",
      steps: makeSteps(false),
    },
  ];

  return { pipelines };
}

export type DomainDataResult =
  | { domain: "sales"; data: SalesData }
  | { domain: "infra"; data: InfraData }
  | { domain: "marketing"; data: MarketingData }
  | { domain: "legal"; data: LegalData }
  | { domain: "dev"; data: DevData };

// Convenience helper for sampling default (unfiltered) data per domain.
export function fetchDomainData(domain: DomainId): DomainDataResult {
  switch (domain) {
    case "sales":
      return { domain: "sales", data: fetchSalesData() };
    case "infra":
      return { domain: "infra", data: fetchInfraData() };
    case "marketing":
      return { domain: "marketing", data: fetchMarketingData() };
    case "legal":
      return { domain: "legal", data: fetchLegalData() };
    case "dev":
      return { domain: "dev", data: fetchDevData() };
    case "stripe":
      return { domain: "sales", data: fetchSalesData() };
  }
}
