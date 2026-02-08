import { cn } from "@/lib/utils";
import { Globe, Link2, MapPin } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const companyProfileSchema = z.object({
    name: z.string().describe("Company name"),
    ticker: z.string().describe("Company ticker symbol"),
    logo: z.string().optional().describe("URL to company logo"),
    industry: z.string().describe("Industry category"),
    weburl: z.string().describe("Company website URL"),
    marketCapitalization: z.number().describe("Market capitalization in millions"),
    exchange: z.string().describe("Stock exchange"),
    country: z.string().describe("HQ country"),
});

export type CompanyProfileProps = z.infer<typeof companyProfileSchema>;

export const CompanyProfile = React.forwardRef<HTMLDivElement, CompanyProfileProps>(
    (
        {
            name,
            ticker,
            logo,
            industry,
            weburl,
            marketCapitalization,
            exchange,
            country,
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-6 text-foreground shadow-sm backdrop-blur"
            >
                <div className="flex items-start gap-4">
                    {logo && (
                        <div className="h-16 w-16 overflow-hidden rounded-xl bg-white p-2 border border-border/40 shrink-0">
                            <img src={logo} alt={name} className="h-full w-full object-contain" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold truncate">{name}</h3>
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            {ticker} • {exchange}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {industry}
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium border border-border/40">
                        <MapPin size={12} />
                        {country}
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
                        <span className="text-muted-foreground">Market Cap</span>
                        <span className="font-semibold">${(marketCapitalization / 1000).toFixed(2)}B</span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
                        <span className="text-muted-foreground">Exchange</span>
                        <span className="font-medium">{exchange}</span>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                    <a
                        href={weburl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
                    >
                        <Globe size={16} />
                        Website
                    </a>
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/50 hover:bg-background transition-colors">
                        <Link2 size={18} />
                    </button>
                </div>
            </div>
        );
    }
);

CompanyProfile.displayName = "CompanyProfile";
