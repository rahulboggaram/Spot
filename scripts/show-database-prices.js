// Script to display current database prices
// Run with: node scripts/show-database-prices.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvnrafvsycvlqfmepqjv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Historical prices for comparison (from Jan 16, 2026 PM closing)
const historicalLatest = {
  goldPM: 141593,  // 10 grams rate
  silverPM: 281890, // 1kg rate
  goldPerGram: 141593 / 10,    // 14159.3 per gram
  silverPerGram: 281890 / 1000, // 281.89 per gram
};

function formatTable(data) {
  // Calculate column widths
  const columns = {
    id: Math.max(2, 'ID'.length),
    goldPerGram: Math.max(15, 'Gold (per gram)'.length, data.gold_999_base.toFixed(2).length + 2),
    gold10g: Math.max(12, 'Gold (10g)'.length, (data.gold_999_base * 10).toLocaleString('en-IN').length + 2),
    silverPerGram: Math.max(16, 'Silver (per gram)'.length, data.silver_base.toFixed(2).length + 2),
    silver1kg: Math.max(13, 'Silver (1kg)'.length, (data.silver_base * 1000).toLocaleString('en-IN').length + 2),
    updatedAt: Math.max(23, 'Updated At'.length, new Date(data.updated_at).toLocaleString('en-IN').length),
  };

  // Create separator line
  const separator = '─'.repeat(Object.values(columns).reduce((a, b) => a + b, 0) + (Object.keys(columns).length * 3) + 1);

  // Format row
  const formatRow = (row) => {
    return `│ ${String(row.id).padEnd(columns.id)} │ ${row.goldPerGram.padEnd(columns.goldPerGram)} │ ${row.gold10g.padEnd(columns.gold10g)} │ ${row.silverPerGram.padEnd(columns.silverPerGram)} │ ${row.silver1kg.padEnd(columns.silver1kg)} │ ${row.updatedAt.padEnd(columns.updatedAt)} │`;
  };

  // Header row
  const header = formatRow({
    id: 'ID',
    goldPerGram: 'Gold (per gram)',
    gold10g: 'Gold (10g)',
    silverPerGram: 'Silver (per gram)',
    silver1kg: 'Silver (1kg)',
    updatedAt: 'Updated At'
  });

  // Data row
  const row = formatRow({
    id: String(data.id),
    goldPerGram: `₹${data.gold_999_base.toFixed(2)}`,
    gold10g: `₹${(data.gold_999_base * 10).toLocaleString('en-IN')}`,
    silverPerGram: `₹${data.silver_base.toFixed(2)}`,
    silver1kg: `₹${(data.silver_base * 1000).toLocaleString('en-IN')}`,
    updatedAt: new Date(data.updated_at).toLocaleString('en-IN')
  });

  return `
┌${'─'.repeat(columns.id + 2)}┬${'─'.repeat(columns.goldPerGram + 2)}┬${'─'.repeat(columns.gold10g + 2)}┬${'─'.repeat(columns.silverPerGram + 2)}┬${'─'.repeat(columns.silver1kg + 2)}┬${'─'.repeat(columns.updatedAt + 2)}┐
${header}
├${'─'.repeat(columns.id + 2)}┼${'─'.repeat(columns.goldPerGram + 2)}┼${'─'.repeat(columns.gold10g + 2)}┼${'─'.repeat(columns.silverPerGram + 2)}┼${'─'.repeat(columns.silver1kg + 2)}┼${'─'.repeat(columns.updatedAt + 2)}┤
${row}
└${'─'.repeat(columns.id + 2)}┴${'─'.repeat(columns.goldPerGram + 2)}┴${'─'.repeat(columns.gold10g + 2)}┴${'─'.repeat(columns.silverPerGram + 2)}┴${'─'.repeat(columns.silver1kg + 2)}┴${'─'.repeat(columns.updatedAt + 2)}┘
`;
}

async function showDatabasePrices() {
  try {
    console.log('\n=== DATABASE PRICES (Excel Sheet View) ===\n');
    
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      console.log('❌ No data found in database');
      return;
    }

    // Display as table
    console.log(formatTable(data));

    // Compare with historical data
    console.log('\n=== COMPARISON WITH HISTORICAL DATA (Jan 16, 2026 PM) ===\n');
    
    const goldMatch = (data.gold_999_base * 10) === historicalLatest.goldPM;
    const silverMatch = (data.silver_base * 1000) === historicalLatest.silverPM;
    
    console.log('┌──────────────────────┬──────────────────────┬─────────┐');
    console.log('│ Metal                │ Historical (10g/1kg) │ Match   │');
    console.log('├──────────────────────┼──────────────────────┼─────────┤');
    console.log(`│ Gold (10g rate)      │ ₹${String(historicalLatest.goldPM).padStart(17)} │ ${goldMatch ? '✅ YES' : '❌ NO'}  │`);
    console.log(`│ Silver (1kg rate)    │ ₹${String(historicalLatest.silverPM).padStart(17)} │ ${silverMatch ? '✅ YES' : '❌ NO'}  │`);
    console.log('└──────────────────────┴──────────────────────┴─────────┘\n');

  } catch (error) {
    console.error('❌ Error fetching database:', error.message);
    process.exit(1);
  }
}

showDatabasePrices();

