// Script to update timestamps for all historical price entries
// AM prices should be at 12:00 PM (noon) and PM prices at 5:00 PM on the same day
// Run with: node scripts/update-historical-timestamps.js

const { createClient } = require('@supabase/supabase-js');

// Use the same credentials as other scripts
const supabaseUrl = 'https://jvnrafvsycvlqfmepqjv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Historical price data with correct dates
const historicalData = [
  { date: '2025-12-15', gold999_am: 133442, gold999_pm: 133249, silver999_am: 192222, silver999_pm: 193417 },
  { date: '2025-12-16', gold999_am: 132136, gold999_pm: 131777, silver999_am: 191971, silver999_pm: 191975 },
  { date: '2025-12-17', gold999_am: 132713, gold999_pm: 132317, silver999_am: 200750, silver999_pm: 199641 },
  { date: '2025-12-18', gold999_am: 132454, gold999_pm: 132474, silver999_am: 201250, silver999_pm: 201120 },
  { date: '2025-12-19', gold999_am: 132394, gold999_pm: 131779, silver999_am: 200336, silver999_pm: 200067 },
  { date: '2025-12-22', gold999_am: 133584, gold999_pm: 133970, silver999_am: 207550, silver999_pm: 207727 },
  { date: '2025-12-23', gold999_am: 136133, gold999_pm: 136283, silver999_am: 209250, silver999_pm: 211000 },
  { date: '2025-12-24', gold999_am: 136635, gold999_pm: 136627, silver999_am: 218954, silver999_pm: 218983 },
  { date: '2025-12-26', gold999_am: 137914, gold999_pm: 137956, silver999_am: 232100, silver999_pm: 228107 },
  { date: '2025-12-29', gold999_am: 138161, gold999_pm: 136781, silver999_am: 243483, silver999_pm: 235440 },
  { date: '2025-12-30', gold999_am: 134362, gold999_pm: 134599, silver999_am: 231467, silver999_pm: 232329 },
  { date: '2025-12-31', gold999_am: 133099, gold999_pm: 133195, silver999_am: 229433, silver999_pm: 230420 },
  { date: '2026-01-01', gold999_am: 133151, gold999_pm: 133461, silver999_am: 227900, silver999_pm: 229250 },
  { date: '2026-01-02', gold999_am: 134415, gold999_pm: 134782, silver999_am: 234906, silver999_pm: 234550 },
  { date: '2026-01-05', gold999_am: 135721, gold999_pm: 136168, silver999_am: 236775, silver999_pm: 237063 },
  { date: '2026-01-06', gold999_am: 136909, gold999_pm: 136660, silver999_am: 244788, silver999_pm: 243150 },
  { date: '2026-01-07', gold999_am: 136615, gold999_pm: 136675, silver999_am: 246044, silver999_pm: 248000 },
  { date: '2026-01-08', gold999_am: 135443, gold999_pm: 135773, silver999_am: 235775, silver999_pm: 235826 },
  { date: '2026-01-09', gold999_am: 137195, gold999_pm: 137122, silver999_am: 239994, silver999_pm: 242808 },
  { date: '2026-01-12', gold999_am: 140005, gold999_pm: 140449, silver999_am: 257283, silver999_pm: 256776 },
  { date: '2026-01-13', gold999_am: 140482, gold999_pm: 140284, silver999_am: 262742, silver999_pm: 263032 },
  { date: '2026-01-14', gold999_am: 142152, gold999_pm: 142015, silver999_am: 277175, silver999_pm: 277512 },
  { date: '2026-01-16', gold999_am: 141717, gold999_pm: 141593, silver999_am: 282720, silver999_pm: 281890 },
];

async function updateTimestamps() {
  console.log('🕐 Starting timestamp update...');
  console.log(`📊 Total dates to update: ${historicalData.length}`);
  
  let updated = 0;
  let errors = 0;
  
  // First, fetch all entries from the date range
  const startDate = new Date('2025-12-15T00:00:00.000Z').toISOString();
  const endDate = new Date('2026-01-17T00:00:00.000Z').toISOString();
  
  console.log('\n📥 Fetching all entries from database...');
  const { data: allEntries, error: fetchError } = await supabase
    .from('market_prices')
    .select('*')
    .gte('updated_at', startDate)
    .lt('updated_at', endDate)
    .order('updated_at', { ascending: true });
  
  if (fetchError) {
    console.error('❌ Error fetching entries:', fetchError.message);
    process.exit(1);
  }
  
  console.log(`✅ Found ${allEntries.length} entries to process\n`);
  
  // Create a map of expected prices for each date
  const priceMap = new Map();
  for (const day of historicalData) {
    const goldAmPerGram = day.gold999_am / 10;
    const goldPmPerGram = day.gold999_pm / 10;
    const silverAmPerGram = day.silver999_am / 1000;
    const silverPmPerGram = day.silver999_pm / 1000;
    
    // Set times in IST (UTC+5:30)
    // For 12:00 PM IST, we need 6:30 AM UTC (12:00 - 5:30 = 6:30)
    // For 5:00 PM IST, we need 11:30 AM UTC (17:00 - 5:30 = 11:30)
    priceMap.set(`${day.date}_am`, {
      date: day.date,
      gold_999_base: goldAmPerGram,
      silver_base: silverAmPerGram,
      timestamp: new Date(`${day.date}T06:30:00.000Z`).toISOString(), // 12:00 PM IST
    });
    
    priceMap.set(`${day.date}_pm`, {
      date: day.date,
      gold_999_base: goldPmPerGram,
      silver_base: silverPmPerGram,
      timestamp: new Date(`${day.date}T11:30:00.000Z`).toISOString(), // 5:00 PM IST
    });
  }
  
  // Match entries and update timestamps
  for (const entry of allEntries) {
    // Find matching price entry (with small tolerance for floating point)
    let matched = null;
    let matchKey = null;
    
    for (const [key, expected] of priceMap.entries()) {
      const goldMatch = Math.abs(entry.gold_999_base - expected.gold_999_base) < 0.01;
      const silverMatch = Math.abs(entry.silver_base - expected.silver_base) < 0.01;
      
      if (goldMatch && silverMatch) {
        matched = expected;
        matchKey = key;
        break;
      }
    }
    
    if (matched) {
      try {
        const { error: updateError } = await supabase
          .from('market_prices')
          .update({ updated_at: matched.timestamp })
          .eq('id', entry.id);
        
        if (updateError) {
          console.error(`❌ Error updating entry ${entry.id} (${matched.date}):`, updateError.message);
          errors++;
        } else {
          updated++;
          const timeType = matchKey.endsWith('_am') ? 'AM (12:00 PM)' : 'PM (5:00 PM)';
          console.log(`✅ Updated entry ${entry.id}: ${matched.date} ${timeType}`);
        }
      } catch (err) {
        console.error(`❌ Exception updating entry ${entry.id}:`, err.message);
        errors++;
      }
    } else {
      console.warn(`⚠️  No match found for entry ${entry.id} (Gold: ${entry.gold_999_base}, Silver: ${entry.silver_base})`);
    }
  }
  
  console.log(`\n📊 Update Summary:`);
  console.log(`   ✅ Successfully updated: ${updated} entries`);
  console.log(`   ❌ Failed: ${errors} entries`);
  console.log(`   ⚠️  Unmatched: ${allEntries.length - updated - errors} entries`);
}

updateTimestamps()
  .then(() => {
    console.log('\n✨ Timestamp update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Timestamp update failed:', error);
    process.exit(1);
  });
