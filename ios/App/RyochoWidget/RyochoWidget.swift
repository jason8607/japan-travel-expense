import SwiftUI
import WidgetKit

struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        let snapshot = context.isPreview ? .sample : (WidgetSnapshot.load() ?? .sample)
        completion(SnapshotEntry(date: Date(), snapshot: snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let entry = SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load() ?? .sample)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Entry view dispatches to small / medium

struct RyochoTodayEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: SnapshotEntry

    var body: some View {
        switch family {
        case .systemSmall:
            TodaySmallView(entry: entry)
        default:
            TodayMediumView(entry: entry)
        }
    }
}

// MARK: - Widget registration

struct RyochoTodayWidget: Widget {
    let kind: String = "RyochoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            if #available(iOSApplicationExtension 17.0, *) {
                RyochoTodayEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                RyochoTodayEntryView(entry: entry)
                    .padding()
                    .background(Color(.systemBackground))
            }
        }
        .configurationDisplayName("旅帳 · 今日")
        .description("今日花費金額與類別分布")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
