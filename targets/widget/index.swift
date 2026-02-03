import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), price: "₹75,400")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), price: fetchPrice())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let currentPrice = fetchPrice()
        let entry = SimpleEntry(date: Date(), price: currentPrice)
        
        // Create multiple entries to update more frequently
        // Refresh every 1 minute (minimum recommended interval)
        var entries: [SimpleEntry] = [entry]
        
        // Add entries for the next 15 minutes (one per minute)
        for minute in 1...15 {
            if let futureDate = Calendar.current.date(byAdding: .minute, value: minute, to: Date()) {
                // Each entry will re-read the price when it's time to display
                let futureEntry = SimpleEntry(date: futureDate, price: fetchPrice())
                entries.append(futureEntry)
            }
        }
        
        // Refresh every 1 minute
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date())!
        let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
        completion(timeline)
    }
    
    // This helper function grabs the price from our "shared locker"
    func fetchPrice() -> String {
        let sharedDefaults = UserDefaults(suiteName: "group.com.rahulboggaram.Spot")
        if let price = sharedDefaults?.string(forKey: "currentPrice"), !price.isEmpty {
            return price
        }
        // Fallback to a default price if not found
        return "₹14,638"
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let price: String
}

struct GoldWidgetEntryView : View {
    var entry: Provider.Entry
    
    // Always fetch the latest price when displaying (in case it was updated)
    var currentPrice: String {
        let sharedDefaults = UserDefaults(suiteName: "group.com.rahulboggaram.Spot")
        if let price = sharedDefaults?.string(forKey: "currentPrice"), !price.isEmpty {
            return price
        }
        return entry.price // Fallback to entry price
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("GOLD 24K")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.secondary)
            
            Text(currentPrice)
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundColor(.primary)
            
            Spacer()
            
            Text("Live Price")
                .font(.system(size: 10))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color.yellow.opacity(0.2))
                .foregroundColor(.orange)
                .cornerRadius(4)
        }
        .padding()
        // This gives it that nice gold-themed background
        .containerBackground(for: .widget) {
            Color(UIColor.systemBackground)
        }
    }
}

@main
struct GoldWidget: Widget {
    let kind: String = "GoldWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            GoldWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Gold Spot Price")
        .description("Track live gold rates on your home screen.")
        .supportedFamilies([.systemSmall])
    }
}