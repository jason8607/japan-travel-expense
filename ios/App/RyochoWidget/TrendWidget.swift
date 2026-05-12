import SwiftUI
import WidgetKit

// MARK: - Daily trend widget · variant A: bar chart, today highlighted in Signal Blue

struct TrendEntryView: View {
    let entry: SnapshotEntry
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Group {
            if let snapshot = entry.snapshot, snapshot.shouldShowLedger {
                if let trip = snapshot.trip, !trip.dailyTotals.isEmpty {
                    content(trip: trip, palette: colorScheme == .dark ? .dark : .light)
                } else {
                    noDataView(palette: colorScheme == .dark ? WidgetPalette.dark : WidgetPalette.light)
                }
            } else {
                LoginPromptView()
            }
        }
        .widgetURL(URL(string: "ryocho://widget/summary"))
    }

    @ViewBuilder
    private func content(trip: TripSummary, palette p: WidgetPalette) -> some View {
        let totals = trip.dailyTotals
        let totalJpy = totals.reduce(0.0) { $0 + $1.amountJpy }
        let pastDays = totals.filter { $0.amountJpy > 0 }.count
        let avgPerDay = pastDays > 0 ? totalJpy / Double(pastDays) : 0
        let todayStr = todayDateString()
        let maxAmt = totals.map(\.amountJpy).max() ?? 1

        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(trip.name)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(p.smoke)
                        .lineLimit(1)
                    HStack(alignment: .lastTextBaseline, spacing: 3) {
                        Text("¥")
                            .font(.system(size: 12))
                            .foregroundStyle(p.smoke)
                        Text(WidgetFormat.number(totalJpy))
                            .font(.system(size: 22, weight: .semibold).monospacedDigit())
                            .foregroundStyle(p.ink)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("平均 / 日")
                        .font(.system(size: 11))
                        .foregroundStyle(p.smoke)
                    Text("¥\(WidgetFormat.number(avgPerDay))")
                        .font(.system(size: 11, weight: .medium).monospacedDigit())
                        .foregroundStyle(p.ink)
                }
            }

            Spacer(minLength: 0)

            // Bar chart
            GeometryReader { geo in
                let barH: CGFloat = min(geo.size.height - 20, 56)
                let count = totals.count
                let spacing: CGFloat = count > 7 ? 6 : 10
                let totalSpacing = spacing * CGFloat(max(count - 1, 0))
                let barW = count > 0 ? max(4, (geo.size.width - totalSpacing) / CGFloat(count)) : 10

                VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .bottom, spacing: spacing) {
                        ForEach(totals) { day in
                            let isToday = day.date == todayStr
                            let isFuture = day.date > todayStr
                            let h: CGFloat = day.amountJpy > 0
                                ? max(4, CGFloat(day.amountJpy / maxAmt) * barH)
                                : 4
                            let barColor: Color = isToday
                                ? p.blue
                                : isFuture
                                    ? p.mist
                                    : (colorScheme == .dark
                                        ? Color(hex: "#334155")
                                        : Color(hex: "#CBD5E1"))
                            RoundedRectangle(cornerRadius: 4, style: .continuous)
                                .fill(barColor)
                                .opacity(isFuture ? 0.6 : 1.0)
                                .frame(width: barW, height: h)
                        }
                    }
                    .frame(height: barH, alignment: .bottom)

                    // X-axis labels (MM/DD last 2 chars = day portion)
                    HStack(spacing: spacing) {
                        ForEach(totals) { day in
                            let isToday = day.date == todayStr
                            let dayPart = String(day.date.suffix(2))
                            Text(dayPart)
                                .font(.system(size: 10).monospacedDigit())
                                .foregroundStyle(isToday ? p.blue : p.smoke)
                                .fontWeight(isToday ? .semibold : .regular)
                                .frame(width: barW)
                        }
                    }
                    .padding(.top, 6)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private func noDataView(palette p: WidgetPalette) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("每日花費趨勢")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(p.smoke)
            Spacer()
            Text("尚無花費資料")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(p.smoke)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func todayDateString() -> String {
        let d = Date()
        let y = Calendar.current.component(.year, from: d)
        let m = Calendar.current.component(.month, from: d)
        let day = Calendar.current.component(.day, from: d)
        return String(format: "%04d-%02d-%02d", y, m, day)
    }
}

// MARK: - Widget registration

struct TrendWidget: Widget {
    let kind: String = "RyochoTrendWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            if #available(iOSApplicationExtension 17.0, *) {
                TrendEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                TrendEntryView(entry: entry)
                    .padding()
                    .background(Color(.systemBackground))
            }
        }
        .configurationDisplayName("旅帳 · 每日花費")
        .description("長條圖顯示每日花費，今天以藍色標示")
        .supportedFamilies([.systemMedium])
    }
}
