#!/usr/bin/env node

/**
 * Script to delete a specific entry from market_prices table
 * Usage: 
 *   node scripts/delete-entry.js <entry_id>
 *   node scripts/delete-entry.js 67
 * 
 * With service role key (bypasses RLS):
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/delete-entry.js 67
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvnrafvsycvlqfmepqjv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bnJhZnZzeWN2bHFmbWVwcWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTk0OTgsImV4cCI6MjA4NDEzNTQ5OH0.39F_md2gcJw5yDxTXEdydwKLW-Yr-qfIbBmg9nXh_PM';

// Use service role key if provided (bypasses RLS), otherwise use anon key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const keyToUse = serviceRoleKey || supabaseAnonKey;

if (serviceRoleKey) {
  console.log('🔑 Using service role key (bypasses RLS)');
} else {
  console.log('⚠️  Using anon key (may be blocked by RLS)');
  console.log('💡 To use service role key, set SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabase = createClient(supabaseUrl, keyToUse);

async function deleteEntry(entryId) {
  try {
    console.log(`🗑️  Attempting to delete entry ID: ${entryId}...`);
    
    // First, check if the entry exists
    const { data: existingEntry, error: fetchError } = await supabase
      .from('market_prices')
      .select('*')
      .eq('id', entryId)
      .single();
    
    if (fetchError || !existingEntry) {
      console.error(`❌ Entry with ID ${entryId} not found or error:`, fetchError?.message);
      return;
    }
    
    console.log('📋 Entry to be deleted:');
    console.log('   ID:', existingEntry.id);
    console.log('   Gold (per gram):', existingEntry.gold_999_base);
    console.log('   Silver (per gram):', existingEntry.silver_base);
    console.log('   Updated at:', existingEntry.updated_at);
    
    // Delete the entry
    const { data, error } = await supabase
      .from('market_prices')
      .delete()
      .eq('id', entryId)
      .select(); // Return deleted rows for verification
    
    if (error) {
      console.error('❌ Error deleting entry:', error.message);
      console.error('   Error details:', error);
      console.log('\n💡 Note: If you see a permission error, you may need to:');
      console.log('   1. Use Supabase Dashboard to delete the entry directly');
      console.log('   2. Or disable RLS (Row Level Security) for this table temporarily');
      console.log('   3. Or use a service role key instead of anon key');
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Entry deleted successfully!');
      console.log('   Deleted entry ID:', entryId);
      console.log('   Deleted data:', data[0]);
    } else {
      console.log('⚠️  No rows were deleted. This might indicate:');
      console.log('   - Row Level Security (RLS) is blocking the delete');
      console.log('   - The entry does not exist');
      console.log('   - Permission issues');
    }
    
    // Verify deletion by checking if entry still exists
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms for DB to update
    
    const { data: verifyEntry, error: verifyError } = await supabase
      .from('market_prices')
      .select('id')
      .eq('id', entryId)
      .maybeSingle(); // Use maybeSingle to handle not found gracefully
    
    if (verifyError && verifyError.code !== 'PGRST116') {
      console.log('⚠️  Verification check error:', verifyError.message);
    } else if (verifyEntry) {
      console.log('⚠️  Warning: Entry still exists after deletion attempt');
      console.log('   This likely means RLS (Row Level Security) is blocking the delete');
      console.log('   Please delete entry 67 manually from Supabase Dashboard');
    } else {
      console.log('✅ Verification: Entry successfully removed from database');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Get entry ID from command line argument
const entryId = process.argv[2];

if (!entryId) {
  console.error('❌ Please provide an entry ID to delete');
  console.log('Usage: node scripts/delete-entry.js <entry_id>');
  console.log('Example: node scripts/delete-entry.js 67');
  process.exit(1);
}

const id = parseInt(entryId, 10);
if (isNaN(id)) {
  console.error('❌ Invalid entry ID. Please provide a number');
  process.exit(1);
}

deleteEntry(id)
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
