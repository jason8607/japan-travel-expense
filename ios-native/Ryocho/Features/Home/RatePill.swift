import SwiftUI

// Web: <div inline-flex items-center gap-2 rounded-full bg-card ring-1 ring-foreground/10 px-4 py-1.5>
//   <span w-2 h-2 rounded-full bg-success />
//   <span "JPY 100" text-xs muted />
//   <span "≈" text-xs muted/60 />
//   <span "TWD 21.50" text-sm font-semibold />
// </div>
struct RatePill: View {
    let rate: Double

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(Theme.Color.success)
                .frame(width: 8, height: 8)
            Text("JPY 100")
                .font(Typography.small)
                .foregroundStyle(Theme.Color.mutedForeground)
            Text("≈")
                .font(Typography.small)
                .foregroundStyle(Theme.Color.mutedForeground.opacity(0.6))
            Text("TWD \(String(format: "%.2f", rate * 100))")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.Color.foreground)
                .monospacedDigit()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
        .background(
            Capsule().fill(Theme.Color.card)
        )
        .overlay(
            Capsule().strokeBorder(Theme.Color.ring, lineWidth: 1)
        )
    }
}
