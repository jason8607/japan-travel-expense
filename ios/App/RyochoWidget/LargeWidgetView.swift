import WidgetKit
import SwiftUI

struct LargeWidgetView: View {
    let entry: SnapshotEntry

    var body: some View {
        Group {
            if let snapshot = entry.snapshot, snapshot.shouldShowLedger {
                content(snapshot: snapshot)
            } else {
                LoginPromptView()
            }
        }
        .widgetURL(URL(string: "ryocho://widget/summary"))
    }

    @ViewBuilder
    private func content(snapshot: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            header(snapshot: snapshot)

            if let trip = snapshot.trip, !trip.dailyTotals.isEmpty {
                TripLineChart(points: trip.dailyTotals)
                    .frame(maxWidth: .infinity)
                    .frame(height: 110)
            } else {
                placeholderChart()
                    .frame(maxWidth: .infinity)
                    .frame(height: 110)
            }

            Spacer(minLength: 0)
            settlementRow(snapshot: snapshot)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private func header(snapshot: WidgetSnapshot) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text(snapshot.trip?.name ?? "尚未選擇旅程")
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
                if let trip = snapshot.trip {
                    Text("旅程 \(WidgetFormat.jpy(trip.totalJpy))")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("今日")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                Text(WidgetFormat.jpy(snapshot.today.spentJpy))
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
        }
    }

    @ViewBuilder
    private func settlementRow(snapshot: WidgetSnapshot) -> some View {
        if let trip = snapshot.trip {
            if let s = trip.topSettlement {
                HStack(spacing: 6) {
                    Text(s.fromEmoji)
                    Text(s.fromName).font(.system(size: 11, weight: .medium)).lineLimit(1)
                    Image(systemName: "arrow.right").font(.system(size: 9, weight: .semibold)).foregroundStyle(.secondary)
                    Text(s.toEmoji)
                    Text(s.toName).font(.system(size: 11, weight: .medium)).lineLimit(1)
                    Spacer()
                    Text(WidgetFormat.jpy(s.amountJpy))
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
            } else if trip.settled {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color(hex: "#16A34A"))
                    Text("帳已結清")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    @ViewBuilder
    private func placeholderChart() -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.secondary.opacity(0.08))
            Text("尚無花費資料")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
    }
}

/// Sparkline without Swift Charts so the widget stays on iOS 15+ with the main app.
struct TripLineChart: View {
    let points: [DailyTotal]

    private var parsed: [(date: Date, amount: Double)] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        return points.compactMap { p in
            guard let d = formatter.date(from: p.date) else { return nil }
            return (d, p.amountJpy)
        }
    }

    var body: some View {
        let data = parsed
        Canvas { context, size in
            guard data.count >= 2 else { return }
            let amounts = data.map(\.amount)
            guard let maxY = amounts.max(), maxY > 0 else { return }
            let pad: CGFloat = 4
            let w = size.width - pad * 2
            let h = size.height - pad * 2
            let n = data.count
            func x(at index: Int) -> CGFloat {
                pad + w * CGFloat(index) / CGFloat(max(n - 1, 1))
            }
            func y(amount: Double) -> CGFloat {
                pad + h * (1 - CGFloat(amount / maxY))
            }
            var path = Path()
            path.move(to: CGPoint(x: x(at: 0), y: y(amount: data[0].amount)))
            for i in 1 ..< n {
                path.addLine(to: CGPoint(x: x(at: i), y: y(amount: data[i].amount)))
            }
            context.stroke(path, with: .color(Color(hex: "#2563EB")), style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
        }
    }
}

