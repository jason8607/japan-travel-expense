import SwiftUI

// Web: <div grid grid-cols-2 gap-3 px-4 mt-3>
//   <div rounded-xl bg-card ring-1 px-4 py-3.5>
//     <p "今日" text-[11px] muted font-medium />
//     <p amount text-xl font-bold mt-1.5 />
//   </div>
//   <div ...>
//     <p "回饋" />
//     <p text-success />
//   </div>
// </div>
struct DualStatGrid: View {
    let todayJPY: Int
    let cashbackTWD: Int?

    var body: some View {
        HStack(spacing: 12) {
            statCard(label: "今日", value: "¥\(todayJPY.formatted())", tint: Theme.Color.foreground)
            statCard(
                label: "回饋",
                value: cashbackTWD.map { "NT$\($0.formatted())" } ?? "—",
                tint: Theme.Color.success
            )
        }
    }

    private func statCard(label: String, value: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Theme.Color.mutedForeground)
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .tracking(-0.3)
                .foregroundStyle(tint)
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: Theme.Radius.xl, style: .continuous)
                .fill(Theme.Color.card)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.Radius.xl, style: .continuous)
                .strokeBorder(Theme.Color.ring, lineWidth: 1)
        )
    }
}
