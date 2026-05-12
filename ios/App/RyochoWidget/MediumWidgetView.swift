import WidgetKit
import SwiftUI

struct MediumWidgetView: View {
    let entry: SnapshotEntry

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
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 0) {
                Text("今日花費")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)

                Spacer(minLength: 4)

                Text(WidgetFormat.jpy(snapshot.today.spentJpy))
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)

                if let remaining = snapshot.today.remainingJpy {
                    Text(remaining >= 0 ? "剩 \(WidgetFormat.jpy(remaining))" : "超支 \(WidgetFormat.jpy(-remaining))")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(remaining < 0 ? .red : .secondary)
                }

                Spacer()

                if let trip = snapshot.trip {
                    Text(trip.name)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 8) {
                ZStack {
                    RingChart(slices: snapshot.todayByCategory)
                    centerLabel(snapshot.todayByCategory.count)
                }
                .frame(width: 78, height: 78)

                if !snapshot.todayByCategory.isEmpty {
                    legend(snapshot.todayByCategory)
                } else {
                    Text("今日尚未記帳")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 110)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private func centerLabel(_ count: Int) -> some View {
        VStack(spacing: 0) {
            Text("\(count)")
                .font(.system(size: 16, weight: .bold, design: .rounded))
            Text("類別")
                .font(.system(size: 9))
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func legend(_ slices: [CategorySlice]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(Array(slices.prefix(2))) { slice in
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color(hex: slice.color))
                        .frame(width: 6, height: 6)
                    Text(slice.label)
                        .font(.system(size: 9))
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
