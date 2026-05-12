import SwiftUI

// Web: <div flex items-center gap-3 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10>
//   <UserAvatar md />
//   <flex-1>
//     <p title font-semibold text-sm />
//     <Badge category /> <Users icon if split />
//   </flex-1>
//   <text-right>
//     <p amountJpy font-bold text-sm tabular-nums />
//     <p amountTwd text-xs muted tabular-nums />
//   </text-right>
//   <MoreHorizontal button h-11 w-11 />
// </div>
struct ExpenseRow: View {
    let expense: Expense

    var body: some View {
        HStack(alignment: .center, spacing: Theme.Space.sm) {
            MemberAvatar(member: expense.owner, size: .md)

            VStack(alignment: .leading, spacing: 4) {
                Text(expense.title)
                    .font(Typography.bodyEmphasis)
                    .foregroundStyle(Theme.Color.foreground)
                    .lineLimit(1)
                HStack(spacing: 6) {
                    CategoryPill(category: expense.category)
                    if expense.splitType == .split {
                        if expense.participants.count < 3 {
                            HStack(spacing: 2) {
                                Image(systemName: "person.2.fill")
                                    .font(.system(size: 9))
                                Text("\(expense.participants.count) 人")
                                    .font(Typography.micro)
                            }
                            .foregroundStyle(Theme.Color.mutedForeground)
                        } else {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.Color.mutedForeground)
                        }
                    }
                }
            }

            Spacer(minLength: 4)

            VStack(alignment: .trailing, spacing: 2) {
                Text("¥\(expense.amountJPY.formatted())")
                    .font(Typography.bodyEmphasis)
                    .foregroundStyle(Theme.Color.foreground)
                    .monospacedDigit()
                Text("NT$\(expense.amountTWD.formatted())")
                    .font(Typography.small)
                    .foregroundStyle(Theme.Color.mutedForeground)
                    .monospacedDigit()
            }

            Button {
                Haptics.tap()
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Theme.Color.mutedForeground.opacity(0.7))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, Theme.Space.md)
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
