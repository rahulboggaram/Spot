// Script to display all database entries
// Run with: node scripts/show-all-database-entries.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvnrafvsycvlqfmepqjv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function showAllEntries() {
  try {
    console.log('\n=== ALL MARKET PRICES ENTRIES ===\n');
    
    // Fetch all market_prices entries
    const { data: marketData, error: marketError } = await supabase
      .from('market_prices')
      .select('*')
      .order('updated_at', { ascending: false });

    if (marketError) {
      console.error('Error fetching market_prices:', marketError);
    } else {
      if (!marketData || marketData.length === 0) {
        console.log('No entries in market_prices table');
      } else {
        console.log(`Found ${marketData.length} entry/entries:\n`);
        marketData.forEach((entry, index) => {
          console.log(`Entry ${index + 1}:`);
          console.log(`  ID: ${entry.id}`);
          console.log(`  Gold (per gram): ₹${entry.gold_999_base?.toFixed(2) || 'N/A'}`);
          console.log(`  Gold (10g rate): ₹${(entry.gold_999_base * 10)?.toLocaleString('en-IN') || 'N/A'}`);
          console.log(`  Silver (per gram): ₹${entry.silver_base?.toFixed(2) || 'N/A'}`);
          console.log(`  Silver (1kg rate): ₹${(entry.silver_base * 1000)?.toLocaleString('en-IN') || 'N/A'}`);
          console.log(`  Created At: ${entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : 'N/A'}`);
          console.log(`  Updated At: ${entry.updated_at ? new Date(entry.updated_at).toLocaleString('en-IN') : 'N/A'}`);
          console.log('');
        });
      }
    }

    console.log('\n=== ALL HISTORICAL PRICES ENTRIES ===\n');
    
    // Fetch all historical_prices entries
    const { data: historicalData, error: historicalError } = await supabase
      .from('historical_prices')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    if (historicalError) {
      console.error('Error fetching historical_prices:', historicalError);
    } else {
      if (!historicalData || historicalData.length === 0) {
        console.log('No entries in historical_prices table');
      } else {
        console.log(`Found ${historicalData.length} entry/entries:\n`);
        historicalData.forEach((entry, index) => {
          console.log(`Entry ${index + 1}:`);
          console.log(`  ID: ${entry.id}`);
          console.log(`  Date: ${entry.date || entry.created_at?.split('T')[0] || 'N/A'}`);
          console.log(`  Gold AM (10g): ₹${entry.gold_price_am || entry.goldPriceAM || 'N/A'}`);
          console.log(`  Gold PM (10g): ₹${entry.gold_price_pm || entry.goldPricePM || 'N/A'}`);
          console.log(`  Silver AM (1kg): ₹${entry.silver_price_am || entry.silverPriceAM || 'N/A'}`);
          console.log(`  Silver PM (1kg): ₹${entry.silver_price_pm || entry.silverPricePM || 'N/A'}`);
          console.log(`  Created At: ${entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : 'N/A'}`);
          console.log(`  Updated At: ${entry.updated_at ? new Date(entry.updated_at).toLocaleString('en-IN') : 'N/A'}`);
          console.log('');
        });
      }
    }

    // Summary
    console.log('\n=== SUMMARY ===\n');
    console.log(`Market Prices Entries: ${marketData?.length || 0}`);
    console.log(`Historical Prices Entries: ${historicalData?.length || 0}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

showAllEntries();

