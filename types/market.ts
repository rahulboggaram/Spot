/** A row from the market_prices table (prices stored per gram). */
export interface MarketPrice {
  id: number;
  gold_999_base: number;
  silver_base: number;
  updated_at: string;
}

/** A row from the historical_prices table (prices in 10g / 1kg units). */
export interface HistoricalPrice {
  date: string;
  goldPriceAM: number;
  goldPricePM: number;
  silverPriceAM: number;
  silverPricePM: number;
}

/** Direction and magnitude of a price change. */
export interface PriceChange {
  direction: 'up' | 'down' | null;
  difference: number;
  percentage: number;
}

/** Combined change data for gold and silver. */
export interface MetalPriceChange {
  gold: PriceChange;
  silver: PriceChange;
}

/** App-wide colour palette (light-mode only). */
export interface AppColors {
  background: string;
  cardBackground: string;
  cardBackgroundLight: string;
  cardBackgroundFooter: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  borderSubtle: string;
  borderVerySubtle: string;
  iconBackground: string;
  iconBackgroundDark: string;
  iconBorder: string;
  iconBorderDark: string;
  glassOverlay: string;
  statusBadgeBg: string;
  statusBadgeBorder: string;
  statusBadgeBorderOpen: string;
  statusGlow: string;
  divider: string;
  priceUp: string;
  priceDown: string;
}
