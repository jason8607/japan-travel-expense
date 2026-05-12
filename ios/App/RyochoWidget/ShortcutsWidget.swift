import SwiftUI
import WidgetKit

// MARK: - Timeline

struct ShortcutsEntry: TimelineEntry {
    let date: Date
}

struct ShortcutsProvider: TimelineProvider {
    func placeholder(in context: Context) -> ShortcutsEntry {
        ShortcutsEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (ShortcutsEntry) -> Void) {
        completion(ShortcutsEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ShortcutsEntry>) -> Void) {
        let entry = ShortcutsEntry(date: Date())
        let next = Calendar.current.date(byAdding: .hour, value: 12, to: Date()) ?? Date().addingTimeInterval(43_200)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Rows (iOS 17+ multi-target)

@available(iOSApplicationExtension 17.0, *)
private struct ShortcutLinkTile: View {
    let title: String
    let systemImage: String
    let url: URL
    var compact: Bool = false

    var body: some View {
        Link(destination: url) {
            VStack(spacing: compact ? 4 : 6) {
                Image(systemName: systemImage)
                    .font(.system(size: compact ? 16 : 20, weight: .semibold))
                    .foregroundStyle(Color(hex: "#2563EB"))
                Text(title)
                    .font(.system(size: compact ? 11 : 12, weight: .semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.vertical, compact ? 5 : 8)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(Color.primary.opacity(0.06), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

@available(iOSApplicationExtension 17.0, *)
struct ShortcutsWidgetView: View {
    @Environment(\.widgetFamily) private var family

    private let newURL = URL(string: "ryocho://shortcut/new")!
    private let scanURL = URL(string: "ryocho://shortcut/scan")!
    private let summaryURL = URL(string: "ryocho://shortcut/summary")!

    var body: some View {
        Group {
            switch family {
            case .systemMedium:
                HStack(spacing: 8) {
                    ShortcutLinkTile(title: "記帳", systemImage: "square.and.pencil", url: newURL)
                    ShortcutLinkTile(title: "掃描", systemImage: "doc.viewfinder", url: scanURL)
                    ShortcutLinkTile(title: "總結", systemImage: "chart.pie", url: summaryURL)
                }
            default:
                VStack(spacing: 5) {
                    ShortcutLinkTile(title: "記帳", systemImage: "square.and.pencil", url: newURL, compact: true)
                    ShortcutLinkTile(title: "掃描", systemImage: "doc.viewfinder", url: scanURL, compact: true)
                    ShortcutLinkTile(title: "總結", systemImage: "chart.pie", url: summaryURL, compact: true)
                }
            }
        }
        .padding(family == .systemMedium ? 10 : 8)
    }
}

/// Single-tap fallback before iOS 17 (no per-region Links in widgets).
struct ShortcutsWidgetLegacyView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("旅帳捷徑")
                .font(.system(size: 14, weight: .semibold))
            Text("更新至 iOS 17 可分別點記帳、掃描、總結")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(12)
        .widgetURL(URL(string: "ryocho://shortcut/new"))
    }
}

// MARK: - Widget

struct RyochoShortcutsWidget: Widget {
    let kind: String = "RyochoShortcutsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ShortcutsProvider()) { _ in
            Group {
                if #available(iOSApplicationExtension 17.0, *) {
                    ShortcutsWidgetView()
                } else {
                    ShortcutsWidgetLegacyView()
                }
            }
            .ifAvailableContainerBackground()
        }
        .configurationDisplayName("旅帳捷徑")
        .description("快速開啟記帳、掃描收據與總結報表")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private extension View {
    @ViewBuilder
    func ifAvailableContainerBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(.fill.tertiary, for: .widget)
        } else {
            self
                .padding(8)
                .background(Color(.systemBackground))
        }
    }
}
