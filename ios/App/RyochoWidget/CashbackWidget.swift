import SwiftUI
import WidgetKit

// MARK: - Cashback widget · variant A: left = total + avg, right = top card (blue panel)

struct CashbackEntryView: View {
    let entry: SnapshotEntry
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Group {
            if let snapshot = entry.snapshot, snapshot.shouldShowLedger {
                if let cashback = snapshot.cashback {
                    content(cashback: cashback, palette: colorScheme == .dark ? .dark : .light)
                } else {
                    noCashbackView(palette: colorScheme == .dark ? WidgetPalette.dark : WidgetPalette.light)
                }
            } else {
                LoginPromptView()
            }
        }
        .widgetURL(URL(string: "ryocho://widget/summary"))
    }

    @ViewBuilder
    private func content(cashback: CashbackSummary, palette p: WidgetPalette) -> some View {
        HStack(alignment: .top, spacing: 14) {
            // Left: total cashback summary
            VStack(alignment: .leading, spacing: 0) {
                Text("本次旅程回饋")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(p.smoke)

                Spacer(minLength: 0)

                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("NT$")
                        .font(.system(size: 14))
                        .foregroundStyle(p.smoke)
                    Text(WidgetFormat.number(cashback.totalTwd))
                        .font(.system(size: 32, weight: .semibold).monospacedDigit())
                        .foregroundStyle(p.ink)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                }

                HStack(spacing: 5) {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(p.blue)
                    Text("\(cashback.cardCount) 張卡 · 平均 \(String(format: "%.1f", cashback.averageRate))%")
                        .font(.system(size: 12))
                        .foregroundStyle(p.smoke)
                }
                .padding(.top, 6)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Right: TOP card panel
            if let top = cashback.topCard {
                ZStack(alignment: .topLeading) {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(p.blue)

                    VStack(alignment: .leading, spacing: 0) {
                        HStack(alignment: .top) {
                            Text("TOP")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(p.blueInk.opacity(0.8))
                                .tracking(0.8)
                            Spacer()
                            Image(systemName: "creditcard")
                                .font(.system(size: 14, weight: .light))
                                .foregroundStyle(p.blueInk.opacity(0.85))
                        }

                        Spacer(minLength: 0)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(top.cardName)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(p.blueInk.opacity(0.9))
                                .lineLimit(1)
                            Text("NT$\(WidgetFormat.number(top.cashbackTwd))")
                                .font(.system(size: 18, weight: .semibold).monospacedDigit())
                                .foregroundStyle(p.blueInk)
                            Text(top.rateLabel)
                                .font(.system(size: 10))
                                .foregroundStyle(p.blueInk.opacity(0.75))
                        }
                    }
                    .padding(11)
                }
                .frame(width: 138)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private func noCashbackView(palette p: WidgetPalette) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("本次旅程回饋")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(p.smoke)
            Spacer()
            Text("尚無信用卡消費")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(p.smoke)
            Text("新增信用卡後開始追蹤回饋")
                .font(.system(size: 11))
                .foregroundStyle(p.smoke.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Widget registration

struct CashbackWidget: Widget {
    let kind: String = "RyochoCashbackWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            if #available(iOSApplicationExtension 17.0, *) {
                CashbackEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                CashbackEntryView(entry: entry)
                    .padding()
                    .background(Color(.systemBackground))
            }
        }
        .configurationDisplayName("旅帳 · 信用卡回饋")
        .description("顯示本次旅程信用卡回饋金額與最佳卡")
        .supportedFamilies([.systemMedium])
    }
}
