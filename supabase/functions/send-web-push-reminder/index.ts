// Sends Web Push reminders at 12pm and 5pm to PWA subscribers.
// Uses npm:web-push for proper encryption in Deno.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Your VAPID keys
const VAPID_PUBLIC_KEY = 'BAXLXgLJsuPNz19ye9iQRGd20aiNUiruzLtgISpvXHx78SdB8bJeTgTOO_qFMG_DH1SXuO7RmwS0Q326soghI3I';
const VAPID_PRIVATE_KEY = 'b1fXBJ1hl7wbenTxYvFLW4uF_nVR_I_09jHAVaZybAc';
const VAPID_SUBJECT = 'mailto:rahulboggaram@gmail.com';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subs, error: subError } = await supabase
      .from("web_push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (subError || !subs?.length) {
      console.log("No web push subscriptions or error:", subError);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Determine message based on time
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();
    const day = istTime.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;

    let title = "Price Update Reminder";
    let body = "Time to update gold and silver prices.";

    if (hour === 12 && isWeekday) {
      body = "Time to update gold and silver prices (12:00 PM).";
    } else if (hour === 17 && isWeekday) {
      body = "Time to update gold and silver prices (5:00 PM).";
    }

    const payload = JSON.stringify({ title, body, tag: "web-push-reminder" });
    let sent = 0;
    const goneEndpoints: string[] = [];
    const errors: string[] = [];

    for (const row of subs) {
      try {
        const subscription = {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.p256dh,
            auth: row.auth,
          },
        };

        await webpush.sendNotification(subscription, payload);
        sent++;
        console.log("Push sent to:", row.endpoint.slice(0, 60));
      } catch (err: any) {
        const statusCode = err?.statusCode;
        console.warn("Push failed:", row.endpoint?.slice(0, 60), "status:", statusCode, "msg:", err?.message);
        errors.push(`${row.endpoint?.slice(0, 40)}: ${statusCode || err?.message}`);
        if (statusCode === 410 || statusCode === 404) {
          goneEndpoints.push(row.endpoint);
        }
      }
    }

    // Clean up expired subscriptions
    if (goneEndpoints.length > 0) {
      await supabase.from("web_push_subscriptions").delete().in("endpoint", goneEndpoints);
      console.log("Removed expired subscriptions:", goneEndpoints.length);
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: subs.length, removed: goneEndpoints.length, errors }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-web-push-reminder error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
