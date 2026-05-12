import SwiftUI

struct HomeView: View {
    let trip: Trip
    let expenses: [Expense]
    let exchangeRate: Double
    let me: Member

    private var todayJPY: Int {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        return expenses.filter { cal.isDate($0.expenseDate, inSameDayAs: today) }
            .reduce(0) { $0 + $1.amountJPY }
    }

    private var totalJPY: Int { expenses.reduce(0) { $0 + $1.amountJPY } }
    private var totalTWD: Int { expenses.reduce(0) { $0 + $1.amountTWD } }

    private var recent: [Expense] {
        Array(expenses.sorted { $0.expenseDate > $1.expenseDate }.prefix(3))
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header
                        .padding(.horizontal, 20)
                        .padding(.top, 24)
                        .padding(.bottom, 16)

                    RatePill(rate: exchangeRate)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 16)

                    BigSummaryCard(
                        totalJPY: totalJPY,
                        totalTWD: totalTWD,
                        count: expenses.count,
                        budgetJPY: trip.budgetJPY
                    )
                    .padding(.horizontal, 16)

                    DualStatGrid(todayJPY: todayJPY, cashbackTWD: 234)
                        .padding(.horizontal, 16)
                        .padding(.top, 12)

                    recentSection
                        .padding(.horizontal, 16)
                        .padding(.top, 24)

                    Color.clear.frame(height: 100)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.Color.background.ignoresSafeArea())

            fab
                .padding(.trailing, 16)
                .padding(.bottom, 16)
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text("TRIP")
                    .font(Typography.kicker)
                    .tracking(2.0)
                    .foregroundStyle(Theme.Color.mutedForeground.opacity(0.7))
                Text("\(trip.name) \(trip.totalDays)日")
                    .font(Typography.h1)
                    .foregroundStyle(Theme.Color.foreground)
                    .lineLimit(1)
            }
            Spacer()
            MemberAvatar(member: me, size: .md)
        }
    }

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("最近消費")
                    .font(Typography.h2)
                    .foregroundStyle(Theme.Color.foreground)
                Spacer()
                if expenses.count > 3 {
                    Button {
                        Haptics.tap()
                    } label: {
                        Text("查看全部 →")
                            .font(Typography.small)
                            .foregroundStyle(Theme.Color.mutedForeground)
                    }
                }
            }
            VStack(spacing: 8) {
                ForEach(recent) { ExpenseRow(expense: $0) }
            }
        }
    }

    private var fab: some View {
        Button {
            Haptics.tap()
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(Theme.Color.primaryForeground)
                .frame(width: 56, height: 56)
                .background(
                    Circle().fill(Theme.Color.primary)
                )
                .shadow(color: Theme.Color.primary.opacity(0.3), radius: 12, x: 0, y: 6)
        }
        .buttonStyle(.plain)
    }
}

#Preview("Home — 有資料") {
    HomeView(
        trip: MockData.trip,
        expenses: MockData.expenses,
        exchangeRate: MockData.exchangeRate,
        me: MockData.me
    )
}

#Preview("Home — Dark") {
    HomeView(
        trip: MockData.trip,
        expenses: MockData.expenses,
        exchangeRate: MockData.exchangeRate,
        me: MockData.me
    )
    .preferredColorScheme(.dark)
}

#Preview("Home — 空狀態") {
    HomeView(
        trip: MockData.trip,
        expenses: [],
        exchangeRate: MockData.exchangeRate,
        me: MockData.me
    )
}
