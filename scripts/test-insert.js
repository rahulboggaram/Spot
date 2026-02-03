// Test script to try inserting a new entry
// Run with: node scripts/test-insert.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvnrafvsycvlqfmepqjv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  try {
    console.log('\n=== TESTING INSERT ===\n');
    
    // Test data: 144000 (10g) for gold, 300000 (1kg) for silver
    const testData = {
      gold_999_base: 144000 / 10,  // 14400 per gram
      silver_base: 300000 / 1000,  // 300 per gram
      updated_at: new Date().toISOString()
    };
    
    console.log('Attempting to insert:');
    console.log('  Gold (10g): 144000 → per gram:', testData.gold_999_base);
    console.log('  Silver (1kg): 300000 → per gram:', testData.silver_base);
    console.log('');
    
    const { data: insertedData, error } = await supabase
      .from('market_prices')
      .insert(testData)
      .select();
    
    if (error) {
      console.error('❌ INSERT FAILED:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Details:', error.details);
      console.error('  Hint:', error.hint);
      return;
    }
    
    console.log('✅ INSERT SUCCESSFUL!');
    console.log('Inserted data:', insertedData);
    console.log('');
    
    // Now check all entries
    console.log('=== CHECKING ALL ENTRIES ===\n');
    const { data: allEntries, error: fetchError } = await supabase
      .from('market_prices')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching entries:', fetchError);
      return;
    }
    
    console.log(`Found ${allEntries.length} entry/entries:\n`);
    allEntries.forEach((entry, index) => {
      console.log(`Entry ${index + 1}:`);
      console.log(`  ID: ${entry.id}`);
      console.log(`  Gold (per gram): ₹${entry.gold_999_base?.toFixed(2)}`);
      console.log(`  Gold (10g): ₹${(entry.gold_999_base * 10)?.toLocaleString('en-IN')}`);
      console.log(`  Silver (per gram): ₹${entry.silver_base?.toFixed(2)}`);
      console.log(`  Silver (1kg): ₹${(entry.silver_base * 1000)?.toLocaleString('en-IN')}`);
      console.log(`  Created: ${entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : 'N/A'}`);
      console.log(`  Updated: ${entry.updated_at ? new Date(entry.updated_at).toLocaleString('en-IN') : 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testInsert();

