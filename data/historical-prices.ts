// Historical price data from IBJA
// Gold prices are in 10 grams rate (AM = Opening, PM = Closing)
// Silver prices are in 1kg rate (AM = Opening, PM = Closing)
// Source: India Bullion and Jewellers Association Ltd.

export interface HistoricalPrice {
  date: string; // Format: "YYYY-MM-DD"
  goldPriceAM: number; // 10 grams rate (AM/Opening)
  goldPricePM: number; // 10 grams rate (PM/Closing)
  silverPriceAM: number; // 1kg rate (AM/Opening)
  silverPricePM: number; // 1kg rate (PM/Closing)
}

// Historical prices - Last 30 trading days (with AM and PM rates)
// Dates in DD-MM-YY format converted to YYYY-MM-DD
export const historicalPrices: HistoricalPrice[] = [
  // January 2026
  { date: '2026-01-16', goldPriceAM: 141717, goldPricePM: 141593, silverPriceAM: 282720, silverPricePM: 281890 }, // 16-01-26
  { date: '2026-01-14', goldPriceAM: 142152, goldPricePM: 142015, silverPriceAM: 277175, silverPricePM: 277512 }, // 14-01-26
  { date: '2026-01-13', goldPriceAM: 140482, goldPricePM: 140284, silverPriceAM: 262742, silverPricePM: 263032 }, // 13-01-26
  { date: '2026-01-12', goldPriceAM: 140005, goldPricePM: 140449, silverPriceAM: 257283, silverPricePM: 256776 }, // 12-01-26
  { date: '2026-01-09', goldPriceAM: 137195, goldPricePM: 137122, silverPriceAM: 239994, silverPricePM: 242808 }, // 09-01-26
  { date: '2026-01-08', goldPriceAM: 135443, goldPricePM: 135773, silverPriceAM: 235775, silverPricePM: 235826 }, // 08-01-26
  { date: '2026-01-07', goldPriceAM: 136615, goldPricePM: 136675, silverPriceAM: 246044, silverPricePM: 248000 }, // 07-01-26
  { date: '2026-01-06', goldPriceAM: 136909, goldPricePM: 136660, silverPriceAM: 244788, silverPricePM: 243150 }, // 06-01-26
  { date: '2026-01-05', goldPriceAM: 135721, goldPricePM: 136168, silverPriceAM: 236775, silverPricePM: 237063 }, // 05-01-26
  { date: '2026-01-02', goldPriceAM: 134415, goldPricePM: 134782, silverPriceAM: 234906, silverPricePM: 234550 }, // 02-01-26
  { date: '2026-01-01', goldPriceAM: 133151, goldPricePM: 133461, silverPriceAM: 227900, silverPricePM: 229250 }, // 01-01-26
  
  // December 2025
  { date: '2025-12-31', goldPriceAM: 133099, goldPricePM: 133195, silverPriceAM: 229433, silverPricePM: 230420 }, // 31-12-25
  { date: '2025-12-30', goldPriceAM: 134362, goldPricePM: 134599, silverPriceAM: 231467, silverPricePM: 232329 }, // 30-12-25
  { date: '2025-12-29', goldPriceAM: 138161, goldPricePM: 136781, silverPriceAM: 243483, silverPricePM: 235440 }, // 29-12-25
  { date: '2025-12-26', goldPriceAM: 137914, goldPricePM: 137956, silverPriceAM: 232100, silverPricePM: 228107 }, // 26-12-25
  { date: '2025-12-24', goldPriceAM: 136635, goldPricePM: 136627, silverPriceAM: 218954, silverPricePM: 218983 }, // 24-12-25
  { date: '2025-12-23', goldPriceAM: 136133, goldPricePM: 136283, silverPriceAM: 209250, silverPricePM: 211000 }, // 23-12-25
  { date: '2025-12-22', goldPriceAM: 133584, goldPricePM: 133049, silverPriceAM: 207550, silverPricePM: 207727 }, // 22-12-25
  { date: '2025-12-19', goldPriceAM: 132394, goldPricePM: 131779, silverPriceAM: 200336, silverPricePM: 200067 }, // 19-12-25
  { date: '2025-12-18', goldPriceAM: 132454, goldPricePM: 132474, silverPriceAM: 201250, silverPricePM: 201120 }, // 18-12-25
  { date: '2025-12-17', goldPriceAM: 132713, goldPricePM: 132317, silverPriceAM: 200750, silverPricePM: 199641 }, // 17-12-25
  { date: '2025-12-16', goldPriceAM: 132136, goldPricePM: 131777, silverPriceAM: 191971, silverPricePM: 191975 }, // 16-12-25
  { date: '2025-12-15', goldPriceAM: 133442, goldPricePM: 133249, silverPriceAM: 192222, silverPricePM: 193417 }, // 15-12-25
];
