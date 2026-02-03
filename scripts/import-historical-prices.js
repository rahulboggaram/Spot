const { createClient } = require('@supabase/supabase-js');

// Use the same credentials as update-database-prices.js
const supabaseUrl = 'https://jvnrafvsycvlqfmepqjv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Historical price data from PDF (Dec 15, 2025 to Jan 16, 2026)
// Format: { date: 'YYYY-MM-DD', gold999_am: price_10gms, gold999_pm: price_10gms, silver999_am: price_1kg, silver999_pm: price_1kg }
const historicalData = [
  { date: '2025-12-15', gold999_am: 133442, gold999_pm: 133249, silver999_am: 192222, silver999_pm: 193417 },
  { date: '2025-12-16', gold999_am: 132136, gold999_pm: 131777, silver999_am: 191971, silver999_pm: 191975 },
  { date: '2025-12-17', gold999_am: 132713, gold999_pm: 132317, silver999_am: 200750, silver999_pm: 199641 },
  { date: '2025-12-18', gold999_am: 132454, gold999_pm: 132474, silver999_am: 201250, silver999_pm: 201120 },
  { date: '2025-12-19', gold999_am: 132394, gold999_pm: 131779, silver999_am: 200336, silver999_pm: 200067 },
  // 20-Dec and 21-Dec are weekends (SAT/SUN)
  { date: '2025-12-22', gold999_am: 133584, gold999_pm: 133970, silver999_am: 207550, silver999_pm: 207727 },
  { date: '2025-12-23', gold999_am: 136133, gold999_pm: 136283, silver999_am: 209250, silver999_pm: 211000 },
  { date: '2025-12-24', gold999_am: 136635, gold999_pm: 136627, silver999_am: 218954, silver999_pm: 218983 },
  // 25-Dec is Market Holiday
  // 27-Dec and 28-Dec are weekends (SAT/SUN)
  { date: '2025-12-26', gold999_am: 137914, gold999_pm: 137956, silver999_am: 232100, silver999_pm: 228107 },
  { date: '2025-12-29', gold999_am: 138161, gold999_pm: 136781, silver999_am: 243483, silver999_pm: 235440 },
  { date: '2025-12-30', gold999_am: 134362, gold999_pm: 134599, silver999_am: 231467, silver999_pm: 232329 },
  { date: '2025-12-31', gold999_am: 133099, gold999_pm: 133195, silver999_am: 229433, silver999_pm: 230420 },
  { date: '2026-01-01', gold999_am: 133151, gold999_pm: 133461, silver999_am: 227900, silver999_pm: 229250 },
  { date: '2026-01-02', gold999_am: 134415, gold999_pm: 134782, silver999_am: 234906, silver999_pm: 234550 },
  // 03-Jan and 04-Jan are weekends (SAT/SUN)
  { date: '2026-01-05', gold999_am: 135721, gold999_pm: 136168, silver999_am: 236775, silver999_pm: 237063 },
  { date: '2026-01-06', gold999_am: 136909, gold999_pm: 136660, silver999_am: 244788, silver999_pm: 243150 },
  { date: '2026-01-07', gold999_am: 136615, gold999_pm: 136675, silver999_am: 246044, silver999_pm: 248000 },
  { date: '2026-01-08', gold999_am: 135443, gold999_pm: 135773, silver999_am: 235775, silver999_pm: 235826 },
  { date: '2026-01-09', gold999_am: 137195, gold999_pm: 137122, silver999_am: 239994, silver999_pm: 242808 },
  // 10-Jan and 11-Jan are weekends (SAT/SUN)
  { date: '2026-01-12', gold999_am: 140005, gold999_pm: 140449, silver999_am: 257283, silver999_pm: 256776 },
  { date: '2026-01-13', gold999_am: 140482, gold999_pm: 140284, silver999_am: 262742, silver999_pm: 263032 },
  { date: '2026-01-14', gold999_am: 142152, gold999_pm: 142015, silver999_am: 277175, silver999_pm: 277512 },
  // 15-Jan is Market Holiday
  { date: '2026-01-16', gold999_am: 141717, gold999_pm: 141593, silver999_am: 282720, silver999_pm: 281890 },
];

async function importHistoricalPrices() {
  console.log('📥 Starting historical price import...');
  console.log(`📊 Total entries to import: ${historicalData.length * 2} (AM + PM for each date)`);
  
  const entries = [];
  
  for (const day of historicalData) {
    // AM entry (12:00 PM IST / noon on the same day)
    // For 12:00 PM IST, we need 6:30 AM UTC (IST is UTC+5:30)
    entries.push({
      gold_999_base: day.gold999_am / 10, // Convert 10g to per gram
      silver_base: day.silver999_am / 1000, // Convert 1kg to per gram
      updated_at: new Date(`${day.date}T06:30:00.000Z`).toISOString(), // 12:00 PM IST
    });
    
    // PM entry (5:00 PM IST on the same day)
    // For 5:00 PM IST, we need 11:30 AM UTC (IST is UTC+5:30)
    entries.push({
      gold_999_base: day.gold999_pm / 10, // Convert 10g to per gram
      silver_base: day.silver999_pm / 1000, // Convert 1kg to per gram
      updated_at: new Date(`${day.date}T11:30:00.000Z`).toISOString(), // 5:00 PM IST
    });
  }
  
  console.log(`\n📝 Inserting ${entries.length} entries...`);
  
  // Insert in batches to avoid overwhelming the database
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      } else {
        inserted += data.length;
        console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data.length} entries`);
      }
    } catch (err) {
      console.error(`❌ Exception in batch ${Math.floor(i / batchSize) + 1}:`, err.message);
      errors += batch.length;
    }
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Successfully inserted: ${inserted} entries`);
  console.log(`   ❌ Failed: ${errors} entries`);
  console.log(`   📅 Date range: ${historicalData[0].date} to ${historicalData[historicalData.length - 1].date}`);
}

importHistoricalPrices()
  .then(() => {
    console.log('\n✨ Import completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
