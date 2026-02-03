// Supabase Edge Function to send push notifications when prices are updated
// This function is triggered by a database webhook or can be called directly

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all device tokens from database
    const { data: tokens, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token, platform')
    
    if (tokenError || !tokens || tokens.length === 0) {
      console.log('⚠️ No device tokens found or error:', tokenError)
      return new Response(
        JSON.stringify({ success: false, message: 'No device tokens found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get latest price from database
    const { data: latestPrice, error: priceError } = await supabase
      .from('market_prices')
      .select('gold_999_base, silver_base, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (priceError || !latestPrice) {
      console.log('⚠️ Error fetching latest price:', priceError)
      return new Response(
        JSON.stringify({ success: false, message: 'Error fetching price' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format prices for notification
    const gold10g = Math.round((latestPrice.gold_999_base || 0) * 10)
    const silver1kg = Math.round((latestPrice.silver_base || 0) * 1000)
    const goldFormatted = `₹${gold10g.toLocaleString('en-IN')}`
    const silverFormatted = `₹${silver1kg.toLocaleString('en-IN')}`

    // Prepare push notification messages
    // _contentAvailable: true lets iOS wake the app in background so it can refresh and update the widget
    const messages = tokens.map(({ token, platform }) => ({
      to: token,
      sound: 'default',
      title: 'Price Updated',
      body: `Gold: ${goldFormatted} (10g) | Silver: ${silverFormatted} (1kg)`,
      data: {
        type: 'price_update',
        goldPrice: latestPrice.gold_999_base,
        silverPrice: latestPrice.silver_base,
      },
      priority: 'high',
      ...(platform === 'ios' ? { _contentAvailable: true } : {}),
    }))

    // Send notifications via Expo Push API
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const result = await response.json()
    console.log('📱 Push notification result:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        tokensSent: tokens.length,
        result 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error sending push notifications:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
