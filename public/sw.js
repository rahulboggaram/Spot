// Service Worker for PWA Background Notifications
// This enables notifications even when the app is closed (on supported browsers)

const CACHE_NAME = 'spot-admin-v1';
const NOTIFICATION_TAG_12PM = 'price-update-12pm';
const NOTIFICATION_TAG_5PM = 'price-update-5pm';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Periodic Background Sync (for browsers that support it)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-price-reminders') {
    event.waitUntil(checkAndShowNotifications());
  }
});

// Background Sync (fallback for browsers that support it)
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-price-reminders') {
    event.waitUntil(checkAndShowNotifications());
  }
});

// Check time and show notifications if needed
async function checkAndShowNotifications() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Only on weekdays (Monday = 1 to Friday = 5)
  if (day >= 1 && day <= 5) {
    // Check if we should show 12pm notification
    if (hour === 12 && minute === 0) {
      await showNotification(
        'Price Update Reminder',
        'Time to update gold and silver prices (12:00 PM)',
        NOTIFICATION_TAG_12PM
      );
    }
    
    // Check if we should show 5pm notification
    if (hour === 17 && minute === 0) {
      await showNotification(
        'Price Update Reminder',
        'Time to update gold and silver prices (5:00 PM)',
        NOTIFICATION_TAG_5PM
      );
    }
  }
}

// Show notification
async function showNotification(title, body, tag) {
  // Check if we already showed this notification today
  const lastNotificationKey = 'lastPriceUpdateNotification';
  const today = new Date().toDateString();
  
  // Get stored data from IndexedDB or use a simple check
  // For simplicity, we'll use a different approach - check notification tag
  const notificationOptions = {
    body: body,
    icon: '/assets/icon.png',
    badge: '/assets/icon.png',
    tag: tag,
    requireInteraction: false,
    silent: false,
  };
  
  return self.registration.showNotification(title, notificationOptions);
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();
  
  // Open the admin page when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/admin');
      }
    })
  );
});

// Web Push: handle server-sent push (required for iOS PWA when app is closed/backgrounded)
self.addEventListener('push', (event) => {
  var data = { title: 'Price Update Reminder', body: 'Time to update gold and silver prices.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      try {
        data.body = event.data.text();
      } catch (e2) {}
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Spot', {
      body: data.body || 'Time to update gold and silver prices.',
      icon: '/assets/icon.png',
      badge: '/assets/icon.png',
      tag: data.tag || 'web-push-reminder',
      requireInteraction: false,
      silent: false,
    })
  );
});

// Message handler - allows the app to trigger notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_NOTIFICATIONS') {
    checkAndShowNotifications();
  }
});

// Handle messages from the app to check notifications
// The app will send messages periodically when it's open
// For background notifications, we rely on Web Push (push event above) when app is closed
