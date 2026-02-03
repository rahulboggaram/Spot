// Script to update database with latest historical prices
// Run with: node scripts/update-database-prices.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvnrafvsycvlqfmepqjv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Latest historical prices (Jan 16, 2026 PM closing)
const latestPrices = {
  goldPricePM: 141593,  // 10 grams rate
  silverPricePM: 281890, // 1kg rate
};

// Convert to per gram for database storage
const goldPerGram = latestPrices.goldPricePM / 10;    // 14159.3 per gram
const silverPerGram = latestPrices.silverPricePM / 1000; // 281.89 per gram

async function updateDatabasePrices() {
  try {
    console.log('Updating database with latest historical prices...');
    console.log(`Gold: ${latestPrices.goldPricePM} (10g) = ${goldPerGram} per gram`);
    console.log(`Silver: ${latestPrices.silverPricePM} (1kg) = ${silverPerGram} per gram`);
    
    const { data, error } = await supabase
      .from('market_prices')
      .update({ 
        gold_999_base: goldPerGram,
        silver_base: silverPerGram,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ Database updated successfully!');
    console.log('Updated data:', data);
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    process.exit(1);
  }
}

updateDatabasePrices();

