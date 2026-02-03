import WidgetKit
import SwiftUI

// MARK: - Inter Font Helper (with system fallback)
extension Font {
    static func inter(size: CGFloat, weight: Font.Weight) -> Font {
        // Font PostScript names (as they appear in the font files)
        let fontName: String
        switch weight {
        case .regular: fontName = "Inter-Regular"
        case .medium: fontName = "Inter-Medium"
        case .semibold: fontName = "Inter-SemiBold"
        case .bold: fontName = "Inter-Bold"
        case .black: fontName = "Inter-Black"
        default: fontName = "Inter-Regular"
        }
        
        // Check if font is available
        if UIFont(name: fontName, size: size) != nil {
            return .custom(fontName, size: size)
        }
        
        // Fallback: Use SF Pro (system font) which is similar to Inter
        // This ensures readable text even if Inter doesn't load
        return .system(size: size, weight: weight, design: .default)
    }
}

// MARK: - Widget rules (required for stability)
// • NO network: Widget must NEVER fetch from Supabase/API. iOS will kill the process.
// • UserDefaults only: Main app writes to App Group; widget reads from UserDefaults(suiteName:).
// • Define a view for EVERY supported family (systemSmall, systemMedium) or iOS may show empty white.
// • Use guard when reading shared defaults; return "Connect App" if locker empty (avoids crash + white screen on device).
// • MANDATORY: .containerBackground(for: .widget) required for iOS 17+ / iOS 26 to prevent white box.
// • Small widget size: 158x158 points on iPhone 17 Pro.

// Suite name MUST match index.tsx APP_GROUP and generated.entitlements exactly.
private let kWidgetSuiteName = "group.com.rahulboggaram.Spot.goldapp"

// MARK: - Timeline Provider
struct Provider: TimelineProvider {

    func placeholder(in context: Context) -> Entry {
        let rupeeSymbol = "\u{20B9}" // Indian Rupee Unicode
        return Entry(date: Date(), gold1g: "\(rupeeSymbol)14,638", silver1kg: "\(rupeeSymbol)3,04,863", goldChange: nil, silverChange: nil, hasRealData: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let e = makeEntry()
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [e], policy: .after(next)))
    }

    private func makeEntry() -> Entry {
        let gold1g = fetchGold1g()
        let silver1kg = fetchSilver1kg()
        let (goldCh, silverCh) = fetchChanges()
        // Debug: Check if we have real data (not placeholder "—")
        let hasRealData = gold1g != "—" && gold1g != "Connect App" && silver1kg != "—" && silver1kg != "Connect App"
        return Entry(date: Date(), gold1g: gold1g, silver1kg: silver1kg, goldChange: goldCh, silverChange: silverCh, hasRealData: hasRealData)
    }

    /// Read from App Group UserDefaults only. Guard prevents crash if locker empty; "—" (grey placeholder) instead of random numbers.
    private func fetchGold1g() -> String {
        let sharedDefaults = UserDefaults(suiteName: kWidgetSuiteName)
        guard let raw = sharedDefaults?.string(forKey: "currentPrice"), !raw.isEmpty else {
            return "—" // Grey placeholder instead of "Connect App"
        }
        let n = raw.replacingOccurrences(of: "₹", with: "").replacingOccurrences(of: ",", with: "")
        guard let v = Double(n), v > 0 else { 
            // If price is 0 or invalid, show placeholder
            return "—"
        }
        let oneGram = v / 10.0
        // Just check it's a valid positive number
        guard oneGram > 0 else { return "—" }
        let fmt = NumberFormatter()
        fmt.numberStyle = .decimal
        fmt.groupingSeparator = ","
        fmt.maximumFractionDigits = 0
        // Explicitly ensure ₹ symbol is included (using Unicode)
        let formatted = fmt.string(from: NSNumber(value: oneGram)) ?? "\(Int(oneGram))"
        let rupeeSymbol = "\u{20B9}" // Indian Rupee Unicode
        return "\(rupeeSymbol)\(formatted)"
    }

    private func fetchSilver1kg() -> String {
        let sharedDefaults = UserDefaults(suiteName: kWidgetSuiteName)
        guard let price = sharedDefaults?.string(forKey: "silverPrice"), !price.isEmpty else {
            return "—" // Grey placeholder instead of "Connect App"
        }
        
        // Check if price is "0" or invalid (just check > 0, no upper limit)
        let cleanPrice = price.replacingOccurrences(of: "₹", with: "").replacingOccurrences(of: "\u{20B9}", with: "").replacingOccurrences(of: ",", with: "")
        if let priceValue = Double(cleanPrice), priceValue > 0 {
            // Valid price - format it properly
            let rupeeSymbol = "\u{20B9}" // Indian Rupee Unicode
            if price.hasPrefix(rupeeSymbol) || price.hasPrefix("₹") {
                return price
            } else {
                // Remove any existing ₹ and add it properly
                let finalPrice = cleanPrice.trimmingCharacters(in: .whitespaces)
                let fmt = NumberFormatter()
                fmt.numberStyle = .decimal
                fmt.groupingSeparator = ","
                fmt.maximumFractionDigits = 0
                if let formatted = fmt.string(from: NSNumber(value: priceValue)) {
                    return "\(rupeeSymbol)\(formatted)"
                }
                return "\(rupeeSymbol)\(finalPrice)"
            }
        } else {
            // Invalid or zero price - show placeholder
            return "—"
        }
    }

    private func fetchChanges() -> (Entry.Change?, Entry.Change?) {
        let ud = UserDefaults(suiteName: kWidgetSuiteName)
        let gDir = ud?.string(forKey: "goldChangeDirection") ?? ""
        let sDir = ud?.string(forKey: "silverChangeDirection") ?? ""
        var gDiff: Double?
        if let s = ud?.string(forKey: "goldChangeDiff"), let d = Double(s) { gDiff = d }
        var sDiff: Double?
        if let s = ud?.string(forKey: "silverChangeDiff"), let d = Double(s) { sDiff = d }
        
        // Debug: Print what we're reading (only in debug builds)
        #if DEBUG
        print("🔍 Widget fetchChanges - Gold dir: '\(gDir)', diff: \(gDiff?.description ?? "nil")")
        print("🔍 Widget fetchChanges - Silver dir: '\(sDir)', diff: \(sDiff?.description ?? "nil")")
        #endif
        
        // Only create Change if we have valid direction ("up" or "down") and valid non-zero diff
        // Lowered threshold to 0.01 to catch meaningful changes
        var goldCh: Entry.Change?
        // Check if we have a valid direction and difference
        if !gDir.isEmpty, (gDir == "up" || gDir == "down"), let diff = gDiff, abs(diff) >= 0.01 {
            // Show if difference is meaningful (>= 0.01 to handle rounding)
            goldCh = Entry.Change(direction: gDir, diff: diff)
            #if DEBUG
            print("✅ Widget: Created gold change - \(gDir), \(diff)")
            #endif
        } else {
            #if DEBUG
            print("⚠️ Widget: Skipped gold change - dir: '\(gDir)' (isEmpty: \(gDir.isEmpty)), diff: \(gDiff?.description ?? "nil")")
            #endif
        }
        var silverCh: Entry.Change?
        // Check if we have a valid direction and difference
        if !sDir.isEmpty, (sDir == "up" || sDir == "down"), let diff = sDiff, abs(diff) >= 0.01 {
            // Show if difference is meaningful (>= 0.01 to handle rounding)
            silverCh = Entry.Change(direction: sDir, diff: diff)
            #if DEBUG
            print("✅ Widget: Created silver change - \(sDir), \(diff)")
            #endif
        } else {
            #if DEBUG
            print("⚠️ Widget: Skipped silver change - dir: '\(sDir)' (isEmpty: \(sDir.isEmpty)), diff: \(sDiff?.description ?? "nil")")
            #endif
        }
        return (goldCh, silverCh)
    }
}

// MARK: - Entry
struct Entry: TimelineEntry {
    let date: Date
    let gold1g: String
    let silver1kg: String
    let goldChange: Change?
    let silverChange: Change?
    let hasRealData: Bool // Debug: true if data is from app, false if fallback

    struct Change {
        let direction: String
        let diff: Double
    }
}

// MARK: - Widget View (system fonts only; explicit view per family)
// SAFETY: No force-unwrapping (!), no layout loops, all optionals safely handled
struct SpotWidgetView: View {
    var entry: Entry // Non-optional, always provided by Provider
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            bodySmall
        case .systemMedium:
            bodyMedium
        default:
            bodySmall
        }
    }

    private var bodySmall: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Debug indicator: shows if data is flowing
            if !entry.hasRealData {
                debugIndicator
            }
            
            // Gold Section
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    HStack(spacing: 1) {
                        Text("Gold ")
                            .font(.inter(size: 14, weight: .medium))
                            .foregroundColor(.white)
                        Text("1")
                            .font(.inter(size: 14, weight: .medium))
                            .foregroundColor(.white)
                        Text("g")
                            .font(.inter(size: 14, weight: .medium))
                            .foregroundColor(.white)
                    }
                    Spacer()
                    if let change = entry.goldChange {
                        indicator(direction: change.direction, diff: change.diff)
                    }
                }
                // Price with ₹ symbol - 1px space between ₹ and number
                // Show grey placeholder boxes when loading
                if isPlaceholder(entry.gold1g) {
                    // Grey loading placeholder
                    HStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 20, height: 24)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 60, height: 24)
                    }
                } else {
                    HStack(spacing: 1) {
                        Text(rupeeSymbol)
                            .font(.inter(size: 24, weight: .bold)) // Increased from 20 to 24 to match preview
                            .foregroundColor(.white)
                        Text(priceWithoutRupee(entry.gold1g))
                            .font(.inter(size: 24, weight: .bold)) // Increased from 20 to 24 to match preview
                            .foregroundColor(.white)
                    }
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                }
            }
            .padding(.bottom, 20) // Increased space below Gold section
            
            Rectangle()
                .fill(Color.white.opacity(0.1))
                .frame(height: 1)
                .frame(maxWidth: .infinity)
            
            // Silver Section
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    HStack(spacing: 1) {
                        Text("Silver ")
                            .font(.inter(size: 14, weight: .medium))
                            .foregroundColor(.white)
                        Text("1")
                            .font(.inter(size: 14, weight: .medium))
                            .foregroundColor(.white)
                        Text("kg")
                            .font(.inter(size: 14, weight: .medium))
                            .foregroundColor(.white)
                    }
                    Spacer()
                    if let change = entry.silverChange {
                        indicator(direction: change.direction, diff: change.diff)
                    }
                }
                // Price with ₹ symbol - 1px space between ₹ and number
                // Show grey placeholder boxes when loading
                if isPlaceholder(entry.silver1kg) {
                    // Grey loading placeholder
                    HStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 20, height: 24)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 80, height: 24)
                    }
                } else {
                    HStack(spacing: 1) {
                        Text(rupeeSymbol)
                            .font(.inter(size: 24, weight: .bold)) // Increased from 20 to 24 to match preview
                            .foregroundColor(.white)
                        Text(priceWithoutRupee(entry.silver1kg))
                            .font(.inter(size: 24, weight: .bold)) // Increased from 20 to 24 to match preview
                            .foregroundColor(.white)
                    }
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                }
            }
            .padding(.top, 20) // Increased space above Silver section
        }
        .padding(.vertical, 12)   // Vertical padding only - no horizontal padding
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        // MANDATORY for iOS 17+ / iOS 26: containerBackground prevents white box
        .containerBackground(for: .widget) {
            Color.black // Black background for dark widget
        }
    }

    private var bodyMedium: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Debug indicator: shows if data is flowing
            if !entry.hasRealData {
                debugIndicator
            }
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 0) {
                    row(title: "Gold 1g", price: entry.gold1g, change: entry.goldChange)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Rectangle()
                    .fill(Color.black.opacity(0.12))
                    .frame(width: 1)
                VStack(alignment: .leading, spacing: 0) {
                    row(title: "Silver 1kg", price: entry.silver1kg, change: entry.silverChange)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        // MANDATORY for iOS 17+ / iOS 26: containerBackground prevents white box
        .containerBackground(for: .widget) {
            Color(UIColor.systemBackground)
        }
    }

    private func isPlaceholder(_ price: String) -> Bool {
        price == "—" || price == "Connect App" || price.isEmpty
    }

    // Previous simple row - keeping for medium widget
    private func row(title: String, price: String, change: Entry.Change?) -> some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                // Handle spacing for "1g" and "1kg" in title
                if title == "Gold 1g" {
                    HStack(spacing: 1) {
                        Text("Gold ")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                        Text("1")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                        Text("g")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                } else if title == "Silver 1kg" {
                    HStack(spacing: 1) {
                        Text("Silver ")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                        Text("1")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                        Text("kg")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                } else {
                    Text(title)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                }
                Text(price)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(isPlaceholder(price) ? Color.secondary : Color.primary)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            if let c = change {
                indicator(direction: c.direction, diff: c.diff)
            }
        }
        .padding(.vertical, 4)
    }
    
    // Exact match to widget preview design from image
    private func priceRow(title: String, subtitle: String, price: String, change: Entry.Change?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            // First line: Title and Subtitle (small vertical spacing to price)
            HStack(alignment: .top, spacing: 4) {
                Text(title)
                    .font(.inter(size: 14, weight: .medium)) // Increased from 12
                    .foregroundColor(.black)
                Text(subtitle)
                    .font(.inter(size: 14, weight: .medium)) // Increased from 12
                    .foregroundColor(.black)
                Spacer()
                if let c = change {
                    indicator(direction: c.direction, diff: c.diff)
                }
            }
            // Second line: Price with ₹ symbol (larger, bolder font) - 1px space between ₹ and number
            HStack(spacing: 1) {
                Text(rupeeSymbol)
                    .font(.inter(size: 24, weight: .bold)) // Increased from 20 to 24 to match preview
                    .foregroundColor(isPlaceholder(price) ? Color.secondary : .black)
                Text(priceWithoutRupee(price))
                    .font(.inter(size: 24, weight: .bold)) // Increased from 20 to 24 to match preview
                    .foregroundColor(isPlaceholder(price) ? Color.secondary : .black)
            }
            .minimumScaleFactor(0.7)
            .lineLimit(1)
        }
        .padding(.vertical, 20)   // Vertical padding only - no horizontal padding
    }
    
    // Helper to get ₹ symbol (explicit Unicode)
    private var rupeeSymbol: String {
        "\u{20B9}" // Indian Rupee Unicode
    }
    
    // Helper to get price without ₹ symbol (for display with spacing)
    private func priceWithoutRupee(_ price: String) -> String {
        if price == "Connect App" || price == "—" || price.isEmpty {
            return "" // Return empty for placeholder
        }
        // Remove ₹ symbol if present
        let rupeeSymbol = "\u{20B9}"
        var clean = price.replacingOccurrences(of: rupeeSymbol, with: "")
        clean = clean.replacingOccurrences(of: "₹", with: "")
        return clean.trimmingCharacters(in: .whitespaces)
    }

    private func indicator(direction: String, diff: Double) -> some View {
        let isUp = direction.lowercased() == "up"
        // Exact colors from preview: #4CAF50 (up) and #F44336 (down)
        let col = isUp ? Color(red: 0.298, green: 0.686, blue: 0.314) : Color(red: 0.957, green: 0.263, blue: 0.212)
        // Use arrow symbol (matching Ionicons arrow-up/down rotated 45deg)
        let arrow = isUp ? "↗" : "↘"
        return HStack(spacing: 4) {
            Text(arrow)
                .font(.inter(size: 12, weight: .medium)) // Increased from 11
            Text("\(Int(round(diff)))")
                .font(.inter(size: 13, weight: .medium)) // Increased from 12
        }
        .foregroundColor(col)
    }

    private var separator: some View {
        Rectangle()
            .fill(Color.black.opacity(0.1)) // rgba(0, 0, 0, 0.1) - exact match
            .frame(height: 1)
            // No horizontal padding - extends full width
    }

    // Debug indicator: Shows when waiting for app data
    private var debugIndicator: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(Color.orange)
                .frame(width: 6, height: 6)
            Text("Waiting for app...")
                .font(.inter(size: 9, weight: .medium))
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Widget
@main
struct SpotWidget: Widget {
    let kind = "SpotPricesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            SpotWidgetView(entry: entry)
        }
        .configurationDisplayName("Spot Prices")
        .description("Gold and silver rates.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// Force widget refresh: Change this number when you want to force iOS to reload the widget
// Version: 2.0 - Updated layout design

// MARK: - Preview
struct SpotWidget_Previews: PreviewProvider {
    static let sample = Entry(
        date: Date(),
        gold1g: "₹14,638",
        silver1kg: "₹3,04,863",
        goldChange: Entry.Change(direction: "up", diff: 243),
        silverChange: Entry.Change(direction: "up", diff: 10888),
        hasRealData: true
    )
    static var previews: some View {
        Group {
            SpotWidgetView(entry: sample)
                .previewContext(WidgetPreviewContext(family: .systemSmall))
            SpotWidgetView(entry: sample)
                .previewContext(WidgetPreviewContext(family: .systemMedium))
        }
    }
}
