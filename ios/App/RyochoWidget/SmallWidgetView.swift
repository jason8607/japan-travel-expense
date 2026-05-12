import WidgetKit
import SwiftUI

struct SmallWidgetView: View {
    let entry: SnapshotEntry

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
        VStack(alignment: .leading, spacing: 0) {
            Text("今日花費")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.secondary)
                .textCase(nil)

            Spacer(minLength: 4)

            Text(WidgetFormat.jpy(snapshot.today.spentJpy))
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            if let remaining = snapshot.today.remainingJpy {
                Text(remainingLabel(remaining))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(remaining < 0 ? .red : .secondary)
                    .padding(.top, 2)
            }

            Spacer()

            if let trip = snapshot.trip {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color(hex: "#2563EB"))
                        .frame(width: 6, height: 6)
                    Text(trip.name)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            } else {
                Text("尚未選擇旅程")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func remainingLabel(_ remaining: Double) -> String {
        if remaining >= 0 {
            return "今日預算剩 \(WidgetFormat.jpy(remaining))"
        }
        return "超支 \(WidgetFormat.jpy(-remaining))"
    }
}

struct LoginPromptView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("旅帳")
                .font(.system(size: 14, weight: .semibold))
            Text("請開啟 app 開始記帳")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
