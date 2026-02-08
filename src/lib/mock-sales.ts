import rawData from "@/lib/mock-data.json";

export type SalesRecord = {
  "Order Date": string;
  "Product Name": string;
  "Category": string;
  "Region": string;
  "Quantity": number;
  "Sales": number;
  "Profit": number;
};

export const salesData = rawData as SalesRecord[];

const preferredDefault = "Laptop";
const productNames = new Set(salesData.map((r) => r["Product Name"]));

export const DEFAULT_MOCK_PRODUCT_NAME = productNames.has(preferredDefault)
  ? preferredDefault
  : salesData[0]?.["Product Name"] ?? preferredDefault;
