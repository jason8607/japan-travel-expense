import SwiftUI

// Web: <div mx-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10>
//   <flex justify-between>
//     <div>
//       <p "旅程總支出" text-xs muted />
//       <p [2rem] font-bold tracking-tight />  // total JPY
//       <p "≈ NT$..." text-xs muted />
//     </div>
//     <div count-badge bg-muted rounded-lg px-3 py-2.5>
//       <p count text-xl bold />
//       <p "筆" text-[10px] muted />
//     </div>
//   </flex>
//   {budget && progress-bar }
// </div>
struct BigSummaryCard: View {
    let totalJPY: Int
    let totalTWD: Int
    let count: Int
    let budgetJPY: Int?

    private var hasBudget: Bool { (budgetJPY ?? 0) > 0 }
    private var percentage: Int {
        guard let b = budgetJPY, b > 0 else { return 0 }
        return min(Int(Double(totalJPY) / Double(b) * 100), 100)
    }
    private var isOver: Bool {
        guard let b = budgetJPY else { return false }
        return totalJPY > b
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: Theme.Space.md) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("旅程總支出")
                        .font(Typography.smallEmphasis)
                        .foregroundStyle(Theme.Color.mutedForeground)
                    Text("¥\(totalJPY.formatted())")
                        .font(.system(size: 32, weight: .bold))
                        .tracking(-0.5)
                        .foregroundStyle(Theme.Color.foreground)
                        .monospacedDigit()
                        .padding(.top, 2)
                    Text("≈ NT$\(totalTWD.formatted())")
                        .font(Typography.small)
                        .foregroundStyle(Theme.Color.mutedForeground)
                        .monospacedDigit()
                        .padding(.top, 2)
                }
                Spacer(minLength: 0)
                VStack(spacing: 2) {
                    Text("\(count)")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(Theme.Color.foreground)
                        .monospacedDigit()
                    Text("筆")
                        .font(.system(size: 10))
                        .foregroundStyle(Theme.Color.mutedForeground)
                }
                .frame(minWidth: 52)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                        .fill(Theme.Color.muted)
                )
            }

            if let budget = budgetJPY, hasBudget {
                VStack(spacing: 6) {
                    HStack {
                        Text("預算 ¥\(budget.formatted())")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.Color.mutedForeground)
                            .monospacedDigit()
                        Spacer()
                        Text("\(percentage)%")
                            .font(Typography.microEmphasis)
                            .foregroundStyle(isOver ? Theme.Color.destructive : Theme.Color.mutedForeground)
                            .monospacedDigit()
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(Theme.Color.muted)
                            Capsule()
                                .fill(barColor)
                                .frame(width: geo.size.width * Double(percentage) / 100)
                        }
                    }
                    .frame(height: 8)
                }
                .padding(.top, Theme.Space.md)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: Theme.Radius.xl, style: .continuous)
                .fill(Theme.Color.card)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.Radius.xl, style: .continuous)
                .strokeBorder(Theme.Color.ring, lineWidth: 1)
        )
    }

    private var barColor: Color {
        if isOver { return Theme.Color.destructive }
        if percentage > 80 { return Theme.Color.warning }
        return Theme.Color.primary
    }
}
