import SwiftUI
import WidgetKit

// MARK: - Budget ring provider (reuses SnapshotProvider / SnapshotEntry from RyochoWidget.swift)

struct BudgetRingEntryView: View {
    let entry: SnapshotEntry
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Group {
            if let snapshot = entry.snapshot, snapshot.shouldShowLedger {
                content(snapshot: snapshot)
            } else {
                LoginPromptView()
            }
        }
        .widgetURL(URL(string: "ryocho://widget/today"))
    }

    @ViewBuilder
    private func content(snapshot: WidgetSnapshot) -> some View {
        let p = colorScheme == .dark ? WidgetPalette.dark : WidgetPalette.light
        let spent = snapshot.today.spentJpy
        let budget = snapshot.today.budgetJpy ?? 0
        let pct: Double = budget > 0 ? min(1.0, spent / budget) : 0

        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("今日")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(p.smoke)
                Spacer()
                if let trip = snapshot.trip {
                    let days = tripDayLabel(trip: trip)
                    Text(days)
                        .font(.system(size: 11).monospacedDigit())
                        .foregroundStyle(p.smoke)
                }
            }

            Spacer(minLength: 0)

            // Ring with number inside
            GeometryReader { geo in
                let size = min(geo.size.width, geo.size.height)
                ZStack {
                    // Track
                    Circle()
                        .stroke(p.mist, lineWidth: 5)

                    // Progress arc
                    Circle()
                        .trim(from: 0, to: CGFloat(pct))
                        .stroke(
                            pct >= 1.0 ? Color(hex: "#EF4444") : p.blue,
                            style: StrokeStyle(lineWidth: 5, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))

                    // Center label
                    VStack(spacing: 0) {
                        Text("¥")
                            .font(.system(size: 10))
                            .foregroundStyle(p.smoke)
                        Text(WidgetFormat.number(spent))
                            .font(.system(size: 20, weight: .semibold).monospacedDigit())
                            .foregroundStyle(p.ink)
                            .minimumScaleFactor(0.5)
                            .lineLimit(1)
                            .padding(.top, -2)
                        Text("\(Int((pct * 100).rounded()))%")
                            .font(.system(size: 10).monospacedDigit())
                            .foregroundStyle(p.smoke)
                            .padding(.top, 1)
                    }
                }
                .frame(width: size, height: size)
                .frame(maxWidth: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func tripDayLabel(trip: TripSummary) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        guard
            let start = formatter.date(from: trip.startDate),
            let end = formatter.date(from: trip.endDate)
        else { return "" }
        let today = Date()
        let cal = Calendar.current
        let totalDays = cal.dateComponents([.day], from: start, to: end).day.map { $0 + 1 } ?? 1
        let dayNum = max(1, cal.dateComponents([.day], from: start, to: today).day.map { $0 + 1 } ?? 1)
        let clamped = min(dayNum, totalDays)
        return "day \(clamped) / \(totalDays)"
    }
}

// MARK: - Widget registration

struct BudgetRingWidget: Widget {
    let kind: String = "RyochoBudgetRingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            if #available(iOSApplicationExtension 17.0, *) {
                BudgetRingEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                BudgetRingEntryView(entry: entry)
                    .padding()
                    .background(Color(.systemBackground))
            }
        }
        .configurationDisplayName("旅帳 · 預算進度")
        .description("環狀進度顯示今日預算使用比例")
        .supportedFamilies([.systemSmall])
    }
}
