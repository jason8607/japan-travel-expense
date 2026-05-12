import WidgetKit
import SwiftUI

// MARK: - Medium widget · today spent + category stacked bar + legend

struct TodayMediumView: View {
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
        .widgetURL(URL(string: "ryocho://widget/categories"))
    }

    @ViewBuilder
    private func content(snapshot: WidgetSnapshot) -> some View {
        let p = colorScheme == .dark ? WidgetPalette.dark : WidgetPalette.light
        let spent = snapshot.today.spentJpy
        let budget = snapshot.today.budgetJpy
        let remaining = snapshot.today.remainingJpy
        let cats = snapshot.todayByCategory.prefix(4)

        HStack(alignment: .top, spacing: 18) {
            // Left column: number + stacked bar
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    Text("今日花費")
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

                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("¥")
                        .font(.system(size: 14))
                        .foregroundStyle(p.smoke)
                    Text(WidgetFormat.number(spent))
                        .font(.system(size: 34, weight: .semibold).monospacedDigit())
                        .foregroundStyle(p.ink)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                }

                if let remaining = remaining {
                    let isOver = remaining < 0
                    Text(isOver
                         ? "超支 \(WidgetFormat.jpy(-remaining))"
                         : "剩 \(WidgetFormat.jpy(remaining)) / 今日預算")
                        .font(.system(size: 12, weight: .medium).monospacedDigit())
                        .foregroundStyle(isOver ? Color(hex: "#EF4444") : p.smoke)
                        .padding(.top, 6)
                } else if let trip = snapshot.trip {
                    Text(trip.name)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(p.smoke)
                        .lineLimit(1)
                        .padding(.top, 6)
                }

                // Stacked bar
                if let budget = budget, budget > 0, !cats.isEmpty {
                    stackedBar(cats: Array(cats), budget: budget, palette: p)
                        .padding(.top, 10)
                } else if !cats.isEmpty {
                    stackedBar(cats: Array(cats), budget: spent > 0 ? spent : 1, palette: p)
                        .padding(.top, 10)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Right column: category legend
            if !cats.isEmpty {
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(Array(cats), id: \.category) { slice in
                        HStack(spacing: 8) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(hex: slice.color))
                                .frame(width: 7, height: 7)
                            Text(slice.label)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(p.ink)
                                .lineLimit(1)
                            Spacer()
                            Text(WidgetFormat.number(slice.amountJpy))
                                .font(.system(size: 12).monospacedDigit())
                                .foregroundStyle(p.smoke)
                        }
                    }
                }
                .frame(width: 124)
                .frame(maxHeight: .infinity)
            } else {
                VStack {
                    Spacer()
                    Text("今日尚未記帳")
                        .font(.system(size: 11))
                        .foregroundStyle(p.smoke)
                    Spacer()
                }
                .frame(width: 100)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private func stackedBar(cats: [CategorySlice], budget: Double, palette p: WidgetPalette) -> some View {
        GeometryReader { geo in
            HStack(spacing: 0) {
                ForEach(cats, id: \.category) { slice in
                    let w = geo.size.width * CGFloat(min(slice.amountJpy / budget, 1.0))
                    Rectangle()
                        .fill(Color(hex: slice.color))
                        .frame(width: max(w, 0))
                }
                Spacer(minLength: 0)
            }
            .background(p.mist)
            .clipShape(Capsule())
        }
        .frame(height: 5)
    }

    private func todayLabel() -> String {
        let d = Date()
        let m = Calendar.current.component(.month, from: d)
        let day = Calendar.current.component(.day, from: d)
        return "\(m)/\(day)"
    }
}
