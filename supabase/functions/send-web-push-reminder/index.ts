// Sends Web Push reminders at 12pm and 5pm to PWA subscribers (iOS home screen).
// Call this from a cron at 12:00 and 17:00 on weekdays (e.g. cron-job.org or Supabase pg_cron + pg_net).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const vapidKeysJson = Deno.env.get("VAPID_KEYS_JSON");
    if (!vapidKeysJson) {
      console.error("VAPID_KEYS_JSON secret not set");
      return new Response(
        JSON.stringify({ success: false, error: "VAPID_KEYS_JSON not configured" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

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

    const exportedVapidKeys = JSON.parse(vapidKeysJson);
    const vapidKeys = await webpush.importVapidKeys(exportedVapidKeys, { extractable: false });
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:admin@spot.app",
      vapidKeys,
    });

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
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

    for (const row of subs) {
      try {
        const subscription: webpush.PushSubscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        const subscriber = appServer.subscribe(subscription);
        await subscriber.pushTextMessage(payload, {});
        sent++;
      } catch (err: unknown) {
        const isGone = err && typeof err === "object" && "isGone" in err && (err as { isGone?: () => boolean }).isGone?.();
        if (isGone || (err instanceof Error && (err.message.includes("410") || err.message.includes("Gone")))) {
          goneEndpoints.push(row.endpoint);
        }
        console.warn("Push failed for", row.endpoint?.slice(0, 50), err);
      }
    }

    if (goneEndpoints.length > 0) {
      await supabase.from("web_push_subscriptions").delete().in("endpoint", goneEndpoints);
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: subs.length, removed: goneEndpoints.length }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-web-push-reminder error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
