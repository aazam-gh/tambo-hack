import * as React from "react";
import { z } from "zod/v3";
import { cn } from "@/lib/utils";
import {
    TrendingUp,
    TrendingDown,
    Package,
    MapPin,
    Calendar,
    DollarSign,
    BarChart3,
    PieChart,
    Layers,
    Filter,
    ArrowRight,
    Sparkles,
} from "lucide-react";
import type { HandGesture } from "@/lib/hand-gestures";
import rawData from "@/lib/mock-data.json";

// Type the JSON data
interface SalesRecord {
    "Order Date": string;
    "Product Name": string;
    Category: string;
    Region: string;
    Quantity: number;
    Sales: number;
    Profit: number;
}

const salesData = rawData as SalesRecord[];

// Gesture sequence to action mapping
type GestureAction =
    | "show_summary"
    | "show_by_category"
    | "show_by_region"
    | "show_top_products"
    | "show_trends"
    | "show_recent_orders"
    | "filter_profitable"
    | "compare_regions";

const gestureSequenceMapping: Record<string, GestureAction> = {
    // Single gestures
    openPalm: "show_summary",
    thumbsUp: "show_top_products",
    peaceSign: "show_by_category",
    // Double gesture combinations
    "openPalm_thumbsUp": "show_trends",
    "openPalm_peaceSign": "show_by_region",
    "thumbsUp_peaceSign": "filter_profitable",
    "peaceSign_thumbsUp": "compare_regions",
    "thumbsUp_openPalm": "show_recent_orders",
};

export const gestureDataExplorerSchema = z.object({
    gestureSequence: z
        .array(z.string())
        .optional()
        .describe("Sequence of gestures detected"),
    action: z.string().optional().describe("The derived action from gestures"),
});

export type GestureDataExplorerProps = z.infer<typeof gestureDataExplorerSchema>;

// Helper functions for data analysis
function getCategorySummary() {
    const summary = new Map<
        string,
        { sales: number; profit: number; count: number }
    >();
    salesData.forEach((r) => {
        const existing = summary.get(r.Category) || { sales: 0, profit: 0, count: 0 };
        existing.sales += r.Sales;
        existing.profit += r.Profit;
        existing.count += 1;
        summary.set(r.Category, existing);
    });
    return Array.from(summary.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.sales - a.sales);
}

function getRegionSummary() {
    const summary = new Map<
        string,
        { sales: number; profit: number; count: number }
    >();
    salesData.forEach((r) => {
        const existing = summary.get(r.Region) || { sales: 0, profit: 0, count: 0 };
        existing.sales += r.Sales;
        existing.profit += r.Profit;
        existing.count += 1;
        summary.set(r.Region, existing);
    });
    return Array.from(summary.entries())
        .map(([region, data]) => ({ region, ...data }))
        .sort((a, b) => b.sales - a.sales);
}

function getTopProducts(limit = 5) {
    const productSales = new Map<string, { sales: number; profit: number }>();
    salesData.forEach((r) => {
        const existing = productSales.get(r["Product Name"]) || {
            sales: 0,
            profit: 0,
        };
        existing.sales += r.Sales;
        existing.profit += r.Profit;
        productSales.set(r["Product Name"], existing);
    });
    return Array.from(productSales.entries())
        .map(([product, data]) => ({ product, ...data }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, limit);
}

function getRecentOrders(limit = 10) {
    return [...salesData]
        .sort(
            (a, b) =>
                new Date(b["Order Date"]).getTime() - new Date(a["Order Date"]).getTime()
        )
        .slice(0, limit);
}

function getProfitableItems() {
    const profitMargins = salesData.map((r) => ({
        ...r,
        margin: r.Sales > 0 ? (r.Profit / r.Sales) * 100 : 0,
    }));
    return profitMargins
        .filter((r) => r.margin > 20)
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 10);
}

function getMonthlyTrends() {
    const monthly = new Map<string, { sales: number; profit: number }>();
    salesData.forEach((r) => {
        const date = new Date(r["Order Date"]);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const existing = monthly.get(key) || { sales: 0, profit: 0 };
        existing.sales += r.Sales;
        existing.profit += r.Profit;
        monthly.set(key, existing);
    });
    return Array.from(monthly.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);
}

function getOverallSummary() {
    const totalSales = salesData.reduce((sum, r) => sum + r.Sales, 0);
    const totalProfit = salesData.reduce((sum, r) => sum + r.Profit, 0);
    const totalOrders = salesData.length;
    const avgOrderValue = totalSales / totalOrders;
    const categories = new Set(salesData.map((r) => r.Category)).size;
    const products = new Set(salesData.map((r) => r["Product Name"])).size;
    const regions = new Set(salesData.map((r) => r.Region)).size;

    return {
        totalSales,
        totalProfit,
        totalOrders,
        avgOrderValue,
        categories,
        products,
        regions,
        profitMargin: (totalProfit / totalSales) * 100,
    };
}

// Subcomponents for different views
function SummaryView() {
    const summary = getOverallSummary();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
                <BarChart3 className="h-5 w-5" />
                <h3 className="font-semibold">Sales Overview</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-4 border border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-400">
                        ${(summary.totalSales / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-muted-foreground">Total Sales</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-4 border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-400">
                        ${(summary.totalProfit / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-muted-foreground">Total Profit</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-4 border border-amber-500/20">
                    <div className="text-2xl font-bold text-amber-400">
                        {summary.totalOrders.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Orders</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-4 border border-purple-500/20">
                    <div className="text-2xl font-bold text-purple-400">
                        {summary.profitMargin.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Profit Margin</div>
                </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" /> {summary.products} products
                </span>
                <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" /> {summary.categories} categories
                </span>
                <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {summary.regions} regions
                </span>
            </div>
        </div>
    );
}

function CategoryView() {
    const categories = getCategorySummary();

    const colors = [
        "bg-emerald-500",
        "bg-blue-500",
        "bg-amber-500",
        "bg-purple-500",
        "bg-rose-500",
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
                <PieChart className="h-5 w-5" />
                <h3 className="font-semibold">Sales by Category</h3>
            </div>

            <div className="space-y-3">
                {categories.map((cat, idx) => (
                    <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">{cat.category}</span>
                            <span className="text-muted-foreground">
                                ${(cat.sales / 1000).toFixed(0)}K
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    colors[idx % colors.length]
                                )}
                                style={{
                                    width: `${(cat.sales / categories[0].sales) * 100}%`,
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{cat.count} orders</span>
                            <span className="flex items-center gap-1">
                                {cat.profit > 0 ? (
                                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-rose-400" />
                                )}
                                ${cat.profit.toFixed(0)} profit
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RegionView() {
    const regions = getRegionSummary();
    const regionColors: Record<string, string> = {
        North: "from-blue-500/30 to-blue-500/5 border-blue-500/30",
        South: "from-amber-500/30 to-amber-500/5 border-amber-500/30",
        East: "from-emerald-500/30 to-emerald-500/5 border-emerald-500/30",
        West: "from-purple-500/30 to-purple-500/5 border-purple-500/30",
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
                <MapPin className="h-5 w-5" />
                <h3 className="font-semibold">Sales by Region</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {regions.map((reg) => (
                    <div
                        key={reg.region}
                        className={cn(
                            "rounded-xl bg-gradient-to-br p-4 border",
                            regionColors[reg.region] || "from-gray-500/20 to-gray-500/5 border-gray-500/20"
                        )}
                    >
                        <div className="font-semibold text-foreground">{reg.region}</div>
                        <div className="text-xl font-bold text-foreground mt-1">
                            ${(reg.sales / 1000).toFixed(0)}K
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {reg.count} orders · {((reg.profit / reg.sales) * 100).toFixed(1)}%
                            margin
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TopProductsView() {
    const products = getTopProducts(5);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
                <Package className="h-5 w-5" />
                <h3 className="font-semibold">Top Products</h3>
            </div>

            <div className="space-y-2">
                {products.map((prod, idx) => (
                    <div
                        key={prod.product}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                    >
                        <div
                            className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm",
                                idx === 0
                                    ? "bg-amber-500/20 text-amber-400"
                                    : idx === 1
                                        ? "bg-slate-400/20 text-slate-400"
                                        : idx === 2
                                            ? "bg-amber-700/20 text-amber-600"
                                            : "bg-muted text-muted-foreground"
                            )}
                        >
                            #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">
                                {prod.product}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                ${prod.sales.toLocaleString()} sales
                            </div>
                        </div>
                        <div className="text-right">
                            <div
                                className={cn(
                                    "text-sm font-medium",
                                    prod.profit > 0 ? "text-emerald-400" : "text-rose-400"
                                )}
                            >
                                +${prod.profit.toFixed(0)}
                            </div>
                            <div className="text-xs text-muted-foreground">profit</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TrendsView() {
    const trends = getMonthlyTrends();

    const maxSales = Math.max(...trends.map((t) => t.sales));

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
                <h3 className="font-semibold">Monthly Trends</h3>
            </div>

            <div className="flex items-end gap-1 h-32">
                {trends.map((t) => (
                    <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all duration-500"
                            style={{ height: `${(t.sales / maxSales) * 100}%` }}
                        />
                        <div className="text-[9px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                            {t.month.slice(5)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                <span>Last 12 months</span>
                <span className="flex items-center gap-1">
                    Avg: ${(trends.reduce((s, t) => s + t.sales, 0) / trends.length / 1000).toFixed(0)}K/mo
                </span>
            </div>
        </div>
    );
}

function RecentOrdersView() {
    const orders = getRecentOrders(6);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
                <Calendar className="h-5 w-5" />
                <h3 className="font-semibold">Recent Orders</h3>
            </div>

            <div className="space-y-2">
                {orders.map((order, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 border border-border/30"
                    >
                        <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Package className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                                {order["Product Name"]}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {order["Order Date"]} · {order.Region}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-foreground">
                                ${order.Sales.toFixed(0)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                x{order.Quantity}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProfitableItemsView() {
    const items = getProfitableItems();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
                <DollarSign className="h-5 w-5" />
                <h3 className="font-semibold">Most Profitable</h3>
            </div>

            <div className="space-y-2">
                {items.slice(0, 5).map((item, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20"
                    >
                        <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">
                                {item["Product Name"]}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {item.Category} · {item.Region}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-amber-400">
                                {item.margin.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">margin</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CompareRegionsView() {
    const regions = getRegionSummary();
    const maxProfit = Math.max(...regions.map((r) => r.profit));

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
                <Filter className="h-5 w-5" />
                <h3 className="font-semibold">Region Comparison</h3>
            </div>

            <div className="space-y-4">
                {regions.map((reg) => (
                    <div key={reg.region} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{reg.region}</span>
                            <span className="text-sm text-muted-foreground">
                                ${(reg.profit / 1000).toFixed(0)}K profit
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <div
                                className="h-4 rounded-l bg-emerald-500/80 transition-all duration-500"
                                style={{ width: `${(reg.profit / maxProfit) * 70}%` }}
                            />
                            <div
                                className="h-4 rounded-r bg-blue-500/50"
                                style={{
                                    width: `${((reg.sales - reg.profit) / reg.sales) * 30}%`,
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                Profit
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                Cost
                            </span>
                            <span className="ml-auto">
                                {((reg.profit / reg.sales) * 100).toFixed(1)}% margin
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getActionFromSequence(sequence: string[]): GestureAction {
    if (sequence.length === 0) return "show_summary";

    // Check for 2-gesture combo first
    if (sequence.length >= 2) {
        const lastTwo = `${sequence[sequence.length - 2]}_${sequence[sequence.length - 1]}`;
        if (lastTwo in gestureSequenceMapping) {
            return gestureSequenceMapping[lastTwo];
        }
    }

    // Fall back to single gesture
    const lastGesture = sequence[sequence.length - 1];
    if (lastGesture in gestureSequenceMapping) {
        return gestureSequenceMapping[lastGesture];
    }

    return "show_summary";
}

function renderViewForAction(action: GestureAction) {
    switch (action) {
        case "show_summary":
            return <SummaryView />;
        case "show_by_category":
            return <CategoryView />;
        case "show_by_region":
            return <RegionView />;
        case "show_top_products":
            return <TopProductsView />;
        case "show_trends":
            return <TrendsView />;
        case "show_recent_orders":
            return <RecentOrdersView />;
        case "filter_profitable":
            return <ProfitableItemsView />;
        case "compare_regions":
            return <CompareRegionsView />;
        default:
            return <SummaryView />;
    }
}

const actionLabels: Record<GestureAction, string> = {
    show_summary: "Sales Overview",
    show_by_category: "Category Breakdown",
    show_by_region: "Regional Analysis",
    show_top_products: "Top Products",
    show_trends: "Monthly Trends",
    show_recent_orders: "Recent Orders",
    filter_profitable: "Most Profitable",
    compare_regions: "Region Comparison",
};

export const GestureDataExplorer = React.forwardRef<
    HTMLDivElement,
    GestureDataExplorerProps & { className?: string }
>(({ gestureSequence = [], action: propAction, className, ...props }, ref) => {
    const derivedAction = propAction as GestureAction || getActionFromSequence(gestureSequence);

    return (
        <div
            ref={ref}
            className={cn(
                "w-[380px] rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden",
                className
            )}
            {...props}
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/30 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold text-foreground text-sm">
                                {actionLabels[derivedAction]}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Gesture-driven data explorer
                            </div>
                        </div>
                    </div>
                </div>

                {gestureSequence.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Gestures:</span>
                        <div className="flex items-center gap-1">
                            {gestureSequence.map((g, idx) => (
                                <React.Fragment key={idx}>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                                        {g}
                                    </span>
                                    {idx < gestureSequence.length - 1 && (
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">{renderViewForAction(derivedAction)}</div>

            {/* Footer - gesture hints */}
            <div className="px-5 py-3 border-t border-border/30 bg-muted/20">
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Try gestures: </span>
                    ✋ Overview · 👍 Top Products · ✌️ Categories · ✋→👍 Trends
                </div>
            </div>
        </div>
    );
});

GestureDataExplorer.displayName = "GestureDataExplorer";
