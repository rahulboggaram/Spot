/**
 * Fetches latest prices from Supabase and updates the iOS widget.
 * Used by Background App Refresh so the widget can update when the app is in background
 * (not when force-quit - iOS limitation).
 */
import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { supabase } from './supabase';

const APP_GROUP = 'group.com.rahulboggaram.Spot.goldapp';

function calcChange(current: number, previous: number): { direction: string | null; difference: number; percentage: number } {
  if (!previous || previous === 0) return { direction: null, difference: 0, percentage: 0 };
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  return {
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : null,
    difference: Math.abs(diff),
    percentage: Math.abs(pct),
  };
}

export async function fetchAndUpdateWidget(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const { data: entries, error } = await supabase
      .from('market_prices')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(2);

    if (error || !entries?.length) return false;

    const latest = entries[0];
    const previous = entries.length > 1 ? entries[1] : entries[0];

    const gold10g = (latest.gold_999_base ?? 0) * 10;
    const goldPriceForWidget = typeof latest.gold_999_base === 'string'
      ? parseFloat(latest.gold_999_base)
      : latest.gold_999_base ?? 0;
    const silverPrice = typeof latest.silver_base === 'string'
      ? parseFloat(latest.silver_base)
      : latest.silver_base ?? 0;
    const silver1kg = silverPrice * 1000;

    if (!goldPriceForWidget || goldPriceForWidget <= 0) return false;

    const prevGold10g = (previous.gold_999_base ?? 0) * 10;
    const prevSilver1kg = (previous.silver_base ?? 0) * 1000;
    const goldCh = calcChange(gold10g, prevGold10g);
    const silverCh = calcChange(silver1kg, prevSilver1kg);

    const widgetPrice = `₹${gold10g.toLocaleString('en-IN')}`;
    const widgetSilverPrice = `₹${Math.round(silver1kg).toLocaleString('en-IN')}`;
    const goldDir = (goldCh.direction === 'up' || goldCh.direction === 'down') ? goldCh.direction : '';
    const silverDir = (silverCh.direction === 'up' || silverCh.direction === 'down') ? silverCh.direction : '';

    await SharedGroupPreferences.setItem('currentPrice', widgetPrice, APP_GROUP);
    await SharedGroupPreferences.setItem('silverPrice', widgetSilverPrice, APP_GROUP);
    await SharedGroupPreferences.setItem('goldChange', String(goldCh.percentage), APP_GROUP);
    await SharedGroupPreferences.setItem('silverChange', String(silverCh.percentage), APP_GROUP);
    await SharedGroupPreferences.setItem('goldChangeDiff', String(goldCh.difference), APP_GROUP);
    await SharedGroupPreferences.setItem('silverChangeDiff', String(silverCh.difference), APP_GROUP);
    await SharedGroupPreferences.setItem('goldChangeDirection', goldDir, APP_GROUP);
    await SharedGroupPreferences.setItem('silverChangeDirection', silverDir, APP_GROUP);
    await SharedGroupPreferences.setItem('widgetDataLoaded', 'true', APP_GROUP);

    if (ExtensionStorage && typeof ExtensionStorage.reloadWidget === 'function') {
      ExtensionStorage.reloadWidget();
    }
    return true;
  } catch (e) {
    console.warn('Widget background update failed:', e);
    return false;
  }
}
