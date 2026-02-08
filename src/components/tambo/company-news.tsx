import { cn } from "@/lib/utils";
import { finnhubGetJson } from "@/services/finnhub";
import { Calendar, Newspaper, RefreshCcw } from "lucide-react";
import * as React from "react";
import { withInteractable } from "@tambo-ai/react";
import { z } from "zod/v3";

type FinnhubCompanyNewsItem = {
    datetime: number;
    headline: string;
    summary: string;
    url: string;
    source?: string;
    image?: string;
    related?: string;
    category?: string;
};

function formatYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
}

const TICKER_PATTERN = /^[A-Z0-9.]{1,10}$/i;

const tickerSymbolSchema = z
    .string()
    .trim()
    .regex(TICKER_PATTERN, "Enter a valid ticker symbol (e.g. AAPL)")
    .transform((value) => value.toUpperCase());

export const companyNewsSchema = z.object({
    symbol: tickerSymbolSchema.describe(
        "The stock symbol (e.g. AAPL) to fetch company news for",
    ),
    rangeDays: z
        .number()
        .int()
        .min(1)
        .max(60)
        .optional()
        .describe("Number of days of company news to fetch (default: 14)"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum number of news items to show (default: 6)"),
    className: z.string().optional().describe("Additional CSS classes"),
});

export type CompanyNewsProps = z.infer<typeof companyNewsSchema>;

export const CompanyNews = React.forwardRef<HTMLDivElement, CompanyNewsProps>(
    ({ symbol, rangeDays = 14, limit = 6, className }, ref) => {
        const [draftSymbol, setDraftSymbol] = React.useState(() => normalizeSymbol(symbol));
        const [draftRangeDays, setDraftRangeDays] = React.useState(rangeDays);
        const [applied, setApplied] = React.useState(() => ({
            symbol: normalizeSymbol(symbol),
            rangeDays,
        }));
        const [refreshIndex, setRefreshIndex] = React.useState(0);

        const [state, setState] = React.useState<
            | { status: "loading" }
            | { status: "error"; message: string }
            | { status: "ready"; news: FinnhubCompanyNewsItem[] }
        >({ status: "loading" });

        React.useEffect(() => {
            const normalized = normalizeSymbol(symbol);
            setDraftSymbol(normalized);
            setDraftRangeDays(rangeDays);
            setApplied({ symbol: normalized, rangeDays });
        }, [rangeDays, symbol]);

        React.useEffect(() => {
            let cancelled = false;

            async function load() {
                if (!TICKER_PATTERN.test(applied.symbol)) {
                    setState({
                        status: "error",
                        message: "Enter a valid ticker symbol (e.g. AAPL).",
                    });
                    return;
                }

                const toDate = new Date();
                const fromDate = new Date(Date.now() - applied.rangeDays * 24 * 60 * 60 * 1000);

                setState({ status: "loading" });

                try {
                    const data = await finnhubGetJson<FinnhubCompanyNewsItem[]>(
                        "/company-news",
                        {
                            symbol: applied.symbol,
                            from: formatYmd(fromDate),
                            to: formatYmd(toDate),
                        },
                    );

                    if (cancelled) {
                        return;
                    }

                    if (!Array.isArray(data)) {
                        console.warn("CompanyNews: unexpected Finnhub response", {
                            symbol: applied.symbol,
                            rangeDays: applied.rangeDays,
                            data,
                        });
                        setState({
                            status: "error",
                            message: "Unexpected response from news provider.",
                        });
                        return;
                    }

                    setState({
                        status: "ready",
                        news: data,
                    });
                } catch (error) {
                    if (cancelled) {
                        return;
                    }
                    console.warn("CompanyNews: Finnhub request failed", {
                        symbol: applied.symbol,
                        rangeDays: applied.rangeDays,
                        error,
                    });
                    setState({
                        status: "error",
                        message: "Unable to load company news right now.",
                    });
                }
            }

            void load();

            return () => {
                cancelled = true;
            };
        }, [applied.rangeDays, applied.symbol, refreshIndex]);

        const news = state.status === "ready" ? state.news.slice(0, limit) : [];

        return (
            <div
                ref={ref}
                className={cn(
                    "w-full max-w-xl rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur",
                    className,
                )}
            >
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Newspaper className="text-primary" size={20} />
                        <div>
                            <h3 className="text-lg font-bold">Company News</h3>
                            <div className="text-xs text-muted-foreground">
                                {applied.symbol} • last {applied.rangeDays}d
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRefreshIndex((v) => v + 1)}
                        className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                        aria-label="Refresh company news"
                    >
                        <RefreshCcw size={14} />
                        Refresh
                    </button>
                </div>

                <div className="flex flex-wrap items-end gap-3 mb-6">
                    <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Symbol
                        </span>
                        <input
                            value={draftSymbol}
                            onChange={(e) => setDraftSymbol(e.target.value)}
                            className="h-9 w-28 rounded-xl border border-border/60 bg-background/40 px-3 text-sm font-semibold tracking-wide uppercase outline-none focus:ring-2 focus:ring-emerald-500/40"
                            inputMode="text"
                            spellCheck={false}
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Range
                        </span>
                        <select
                            value={draftRangeDays}
                            onChange={(e) => setDraftRangeDays(Number(e.target.value))}
                            className="h-9 rounded-xl border border-border/60 bg-background/40 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                        </select>
                    </label>

                    <button
                        type="button"
                        onClick={() =>
                            setApplied({
                                symbol: normalizeSymbol(draftSymbol),
                                rangeDays: draftRangeDays,
                            })
                        }
                        className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
                    >
                        Load
                    </button>
                </div>

                {state.status === "loading" ? (
                    <div className="py-10 flex items-center justify-center text-muted-foreground text-sm">
                        Loading news…
                    </div>
                ) : state.status === "error" ? (
                    <div className="py-10 flex items-center justify-center text-muted-foreground text-sm text-center">
                        {state.message}
                    </div>
                ) : news.length === 0 ? (
                    <div className="py-10 flex items-center justify-center text-muted-foreground text-sm">
                        No news returned for {applied.symbol}.
                    </div>
                ) : (
                    <div className="space-y-5">
                        {news.map((item) => (
                            <div
                                key={`${item.datetime}-${item.url}`}
                                className="group flex gap-4 pb-5 border-b border-border/40 last:border-0 last:pb-0"
                            >
                                {item.image ? (
                                    <div className="h-16 w-16 overflow-hidden rounded-lg bg-muted shrink-0 border border-border/20">
                                        <img
                                            src={item.image}
                                            alt=""
                                            className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                                            loading="lazy"
                                        />
                                    </div>
                                ) : null}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                        <span className="text-primary font-semibold uppercase">
                                            {item.source ?? "Finnhub"}
                                        </span>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(item.datetime * 1000).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 block text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2"
                                    >
                                        {item.headline}
                                    </a>
                                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                        {item.summary}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    },
);

CompanyNews.displayName = "CompanyNews";

export const InteractableCompanyNews = withInteractable(CompanyNews, {
    componentName: "CompanyNewsWidget",
    description:
        "A pre-placed company news panel that can update its symbol and rangeDays to show recent company news from Finnhub.",
    propsSchema: companyNewsSchema,
});
