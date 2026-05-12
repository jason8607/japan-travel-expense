import Foundation

enum MockData {
    static let me = Member(id: "u-me", displayName: "Jason", avatarEmoji: "🧋", avatarURL: nil)
    static let partner = Member(id: "u-partner", displayName: "Mika", avatarEmoji: "🐱", avatarURL: nil)
    static let friend = Member(id: "u-friend", displayName: "阿凱", avatarEmoji: "🦊", avatarURL: nil)

    static var trip: Trip {
        let cal = Calendar.current
        let start = cal.date(from: DateComponents(year: 2026, month: 5, day: 8))!
        let end = cal.date(from: DateComponents(year: 2026, month: 5, day: 15))!
        return Trip(
            id: "trip-mock",
            name: "東京・初夏散策",
            startDate: start,
            endDate: end,
            budgetJPY: 280_000,
            budgetTWD: 60_000,
            members: [me, partner, friend]
        )
    }

    static var expenses: [Expense] {
        let cal = Calendar.current
        let today = cal.date(from: DateComponents(year: 2026, month: 5, day: 12))!
        let yesterday = cal.date(byAdding: .day, value: -1, to: today)!
        let twoDaysAgo = cal.date(byAdding: .day, value: -2, to: today)!

        return [
            Expense(
                id: "e1",
                tripID: trip.id,
                title: "一蘭拉麵",
                titleJA: "一蘭ラーメン",
                amountJPY: 4_280,
                amountTWD: 920,
                exchangeRate: 0.2150,
                inputCurrency: .jpy,
                paymentMethod: .cash,
                category: .food,
                owner: me,
                participants: [me, partner],
                splitType: .split,
                expenseDate: today,
                note: nil
            ),
            Expense(
                id: "e2",
                tripID: trip.id,
                title: "東京 Metro 一日券",
                titleJA: "東京メトロ24時間券",
                amountJPY: 1_800,
                amountTWD: 387,
                exchangeRate: 0.2150,
                inputCurrency: .jpy,
                paymentMethod: .suica,
                category: .transport,
                owner: partner,
                participants: [me, partner, friend],
                splitType: .split,
                expenseDate: today,
                note: nil
            ),
            Expense(
                id: "e3",
                tripID: trip.id,
                title: "Beams 帆布托特",
                titleJA: "ビームストートバッグ",
                amountJPY: 8_900,
                amountTWD: 1_913,
                exchangeRate: 0.2150,
                inputCurrency: .jpy,
                paymentMethod: .creditCard,
                category: .shopping,
                owner: me,
                participants: [me],
                splitType: .personal,
                expenseDate: today,
                note: "送 Mika 的禮物"
            ),
            Expense(
                id: "e4",
                tripID: trip.id,
                title: "豊洲市場海膽丼",
                titleJA: "豊洲市場 ウニ丼",
                amountJPY: 6_500,
                amountTWD: 1_397,
                exchangeRate: 0.2150,
                inputCurrency: .jpy,
                paymentMethod: .creditCard,
                category: .food,
                owner: friend,
                participants: [me, partner, friend],
                splitType: .split,
                expenseDate: yesterday,
                note: nil
            ),
            Expense(
                id: "e5",
                tripID: trip.id,
                title: "teamLab 門票 ×3",
                titleJA: "チームラボ チケット",
                amountJPY: 11_400,
                amountTWD: 2_451,
                exchangeRate: 0.2150,
                inputCurrency: .jpy,
                paymentMethod: .creditCard,
                category: .ticket,
                owner: me,
                participants: [me, partner, friend],
                splitType: .split,
                expenseDate: yesterday,
                note: nil
            ),
            Expense(
                id: "e6",
                tripID: trip.id,
                title: "Shibuya Sky 展望台",
                titleJA: "渋谷スカイ",
                amountJPY: 7_800,
                amountTWD: 1_677,
                exchangeRate: 0.2150,
                inputCurrency: .jpy,
                paymentMethod: .creditCard,
                category: .ticket,
                owner: partner,
                participants: [me, partner, friend],
                splitType: .split,
                expenseDate: twoDaysAgo,
                note: nil
            )
        ]
    }

    static let exchangeRate: Double = 0.2150
}
