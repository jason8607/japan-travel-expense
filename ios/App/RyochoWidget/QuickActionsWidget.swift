import SwiftUI
import WidgetKit

// MARK: - Quick actions — variant C (all neutral, only scan icon gets Signal Blue stroke)

// Timeline entry for quick actions doesn't need snapshot data.
struct QuickEntry: TimelineEntry {
    let date: Date
}

struct QuickProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickEntry { QuickEntry(date: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (QuickEntry) -> Void) {
        completion(QuickEntry(date: Date()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickEntry>) -> Void) {
        let next = Calendar.current.date(byAdding: .hour, value: 12, to: Date()) ?? Date().addingTimeInterval(43_200)
        completion(Timeline(entries: [QuickEntry(date: Date())], policy: .after(next)))
    }
}

// MARK: - iOS 17+ view with independent Link tiles

@available(iOSApplicationExtension 17.0, *)
struct QuickActionsView17: View {
    @Environment(\.colorScheme) private var colorScheme

    private let newURL     = URL(string: "ryocho://shortcut/new")!
    private let scanURL    = URL(string: "ryocho://shortcut/scan")!
    private let summaryURL = URL(string: "ryocho://shortcut/summary")!

    var body: some View {
        let p = colorScheme == .dark ? WidgetPalette.dark : WidgetPalette.light

        VStack(alignment: .leading, spacing: 0) {
            // App label + QUICK badge
            HStack {
                Text("旅帳")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(p.smoke)
                Spacer()
                Text("QUICK")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(p.smoke.opacity(0.7))
                    .tracking(0.4)
            }
            .padding(.bottom, 8)

            HStack(spacing: 8) {
                QuickTile(
                    title: "記帳",
                    systemImage: "square.and.pencil",
                    url: newURL,
                    iconColor: p.ink,
                    palette: p
                )
                QuickTile(
                    title: "掃描",
                    systemImage: "doc.viewfinder",
                    url: scanURL,
                    iconColor: p.blue,   // scan gets Signal Blue
                    palette: p
                )
                QuickTile(
                    title: "統計",
                    systemImage: "chart.bar",
                    url: summaryURL,
                    iconColor: p.ink,
                    palette: p
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

@available(iOSApplicationExtension 17.0, *)
private struct QuickTile: View {
    let title: String
    let systemImage: String
    let url: URL
    let iconColor: Color
    let palette: WidgetPalette

    var body: some View {
        Link(destination: url) {
            VStack(spacing: 8) {
                Image(systemName: systemImage)
                    .font(.system(size: 22, weight: .light))
                    .foregroundStyle(iconColor)
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(palette.ink)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(palette.mist)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(palette.ring, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - iOS 16 fallback (single widgetURL tap)

struct QuickActionsLegacyView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let p = colorScheme == .dark ? WidgetPalette.dark : WidgetPalette.light

        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("旅帳")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(p.smoke)
                Spacer()
                Text("QUICK")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(p.smoke.opacity(0.7))
                    .tracking(0.4)
            }
            .padding(.bottom, 8)

            HStack(spacing: 8) {
                legacyTile(icon: "square.and.pencil", label: "記帳",  iconColor: p.ink,  p: p)
                legacyTile(icon: "doc.viewfinder",   label: "掃描",  iconColor: p.blue, p: p)
                legacyTile(icon: "chart.bar",         label: "統計",  iconColor: p.ink,  p: p)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(URL(string: "ryocho://shortcut/new"))
    }

    @ViewBuilder
    private func legacyTile(icon: String, label: String, iconColor: Color, p: WidgetPalette) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .light))
                .foregroundStyle(iconColor)
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(p.ink)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(p.mist)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(p.ring, lineWidth: 1)
        )
    }
}

// MARK: - Widget registration

struct QuickActionsWidget: Widget {
    let kind: String = "RyochoQuickActionsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickProvider()) { _ in
            Group {
                if #available(iOSApplicationExtension 17.0, *) {
                    QuickActionsView17()
                } else {
                    QuickActionsLegacyView()
                }
            }
            .padding(10)
            .ifAvailableContainerBackground()
        }
        .configurationDisplayName("旅帳 · 快捷")
        .description("快速開啟記帳、掃描收據與統計報表")
        .supportedFamilies([.systemMedium])
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
