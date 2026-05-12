import WidgetKit
import SwiftUI

// MARK: - Small widget · variant A: large number + thin progress bar

struct TodaySmallView: View {
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
        let budget = snapshot.today.budgetJpy
        let pct: Double = (budget != nil && budget! > 0) ? min(1.0, spent / budget!) : 0

        VStack(alignment: .leading, spacing: 0) {
            // Header: 今日 · MM/DD
            HStack(spacing: 4) {
                Text("今日")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(p.smoke)
                Text("·")
                    .font(.system(size: 11))
                    .foregroundStyle(p.smoke.opacity(0.5))
                Text(todayLabel())
                    .font(.system(size: 11).monospacedDigit())
                    .foregroundStyle(p.smoke)
            }

            Spacer(minLength: 0)

            // Currency prefix
            Text("¥")
                .font(.system(size: 11))
                .foregroundStyle(p.smoke)
                .padding(.bottom, -2)

            // Main amount
            Text(WidgetFormat.number(spent))
                .font(.system(size: 32, weight: .semibold).monospacedDigit())
                .foregroundStyle(p.ink)
                .minimumScaleFactor(0.55)
                .lineLimit(1)

            // TWD equivalent
            Text("NT$ \(WidgetFormat.number(snapshot.today.spentTwd))")
                .font(.system(size: 11).monospacedDigit())
                .foregroundStyle(p.smoke)
                .padding(.top, 4)

            // Progress bar + labels
            if let budget = budget, budget > 0 {
                VStack(alignment: .leading, spacing: 6) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 999)
                                .fill(p.mist)
                                .frame(height: 4)
                            RoundedRectangle(cornerRadius: 999)
                                .fill(pct >= 1.0 ? Color(hex: "#EF4444") : p.blue)
                                .frame(width: geo.size.width * CGFloat(pct), height: 4)
                        }
                    }
                    .frame(height: 4)

                    HStack {
                        Text("\(Int((pct * 100).rounded()))%")
                            .font(.system(size: 10).monospacedDigit())
                            .foregroundStyle(p.smoke)
                        Spacer()
                        Text("/ \(WidgetFormat.jpy(budget))")
                            .font(.system(size: 10).monospacedDigit())
                            .foregroundStyle(p.smoke)
                    }
                }
                .padding(.top, 12)
            } else if let trip = snapshot.trip {
                Text(trip.name)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(p.smoke)
                    .lineLimit(1)
                    .padding(.top, 12)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func todayLabel() -> String {
        let d = Date()
        let m = Calendar.current.component(.month, from: d)
        let day = Calendar.current.component(.day, from: d)
        return "\(m)/\(day)"
    }
}
