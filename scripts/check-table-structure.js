// Script to check the table structure
// Run with: node scripts/check-table-structure.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvnrafvsycvlqfmepqjv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStructure() {
  try {
    console.log('\n=== CHECKING TABLE STRUCTURE ===\n');
    
    // Get current entry to see structure
    const { data: entry, error } = await supabase
      .from('market_prices')
      .select('*')
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Current entry structure:');
    console.log(JSON.stringify(entry, null, 2));
    console.log('');
    
    // Try to get all entries to see IDs
    const { data: allEntries } = await supabase
      .from('market_prices')
      .select('id, gold_999_base, silver_base, updated_at')
      .order('updated_at', { ascending: false });
    
    console.log('All entries (showing IDs):');
    allEntries?.forEach((e, i) => {
      console.log(`  Entry ${i + 1}: ID=${e.id}, Gold=${e.gold_999_base}, Updated=${e.updated_at}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStructure();

