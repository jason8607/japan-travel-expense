import Foundation
import SwiftUI

struct WidgetSnapshot: Codable {
    let version: Int
    let isLoggedIn: Bool
    let isGuest: Bool
    let generatedAt: String
    let today: TodaySummary
    let todayByCategory: [CategorySlice]
    let trip: TripSummary?
    let cashback: CashbackSummary?

    var shouldShowLedger: Bool {
        isLoggedIn || isGuest || trip != nil
    }

    static let appGroupId = "group.com.jasonchen.ryocho"
    static let snapshotFileName = "widget_snapshot_v1.json"

    static func load() -> WidgetSnapshot? {
        guard
            let containerURL = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: appGroupId
            )
        else { return nil }
        let fileURL = containerURL.appendingPathComponent(snapshotFileName)
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }
}

struct TodaySummary: Codable {
    let spentJpy: Double
    let spentTwd: Double
    let budgetJpy: Double?
    let remainingJpy: Double?
}

struct CategorySlice: Codable, Identifiable {
    let category: String
    let label: String
    let icon: String
    let color: String
    let amountJpy: Double
    var id: String { category }

    enum CodingKeys: String, CodingKey {
        case category, label, icon, color, amountJpy
    }
}

struct TripSummary: Codable {
    let id: String
    let name: String
    let startDate: String
    let endDate: String
    let totalJpy: Double
    let dailyTotals: [DailyTotal]
    let topSettlement: SettlementInfo?
    let settled: Bool
}

struct DailyTotal: Codable, Identifiable {
    let date: String
    let amountJpy: Double
    var id: String { date }

    enum CodingKeys: String, CodingKey {
        case date, amountJpy
    }
}

struct SettlementInfo: Codable {
    let fromName: String
    let fromEmoji: String
    let toName: String
    let toEmoji: String
    let amountJpy: Double
}

struct CashbackSummary: Codable {
    let totalTwd: Double
    let cardCount: Int
    let averageRate: Double
    let topCard: CashbackTopCard?
}

struct CashbackTopCard: Codable {
    let cardName: String
    let cashbackTwd: Double
    let rateLabel: String
    let rate: Double
}

// MARK: - Sample data for widget gallery preview

extension WidgetSnapshot {
    static let sample = WidgetSnapshot(
        version: 1,
        isLoggedIn: true,
        isGuest: false,
        generatedAt: "",
        today: TodaySummary(
            spentJpy: 8420,
            spentTwd: 1768,
            budgetJpy: 12000,
            remainingJpy: 3580
        ),
        todayByCategory: [
            CategorySlice(category: "餐飲", label: "餐飲", icon: "🍜", color: "#E27A4A", amountJpy: 4200),
            CategorySlice(category: "交通", label: "交通", icon: "🚄", color: "#5E8AB5", amountJpy: 1820),
            CategorySlice(category: "購物", label: "購物", icon: "🛍️", color: "#D16B84", amountJpy: 1600),
            CategorySlice(category: "其他", label: "其他", icon: "📦", color: "#8E7C65", amountJpy: 800),
        ],
        trip: TripSummary(
            id: "sample",
            name: "東京 5 日",
            startDate: "2024-11-12",
            endDate: "2024-11-16",
            totalJpy: 26020,
            dailyTotals: [
                DailyTotal(date: "2024-11-12", amountJpy: 6200),
                DailyTotal(date: "2024-11-13", amountJpy: 11400),
                DailyTotal(date: "2024-11-14", amountJpy: 8420),
                DailyTotal(date: "2024-11-15", amountJpy: 0),
                DailyTotal(date: "2024-11-16", amountJpy: 0),
            ],
            topSettlement: nil,
            settled: false
        ),
        cashback: CashbackSummary(
            totalTwd: 1284,
            cardCount: 3,
            averageRate: 2.8,
            topCard: CashbackTopCard(
                cardName: "玉山 熊本熊",
                cashbackTwd: 742,
                rateLabel: "8.5% 海外消費",
                rate: 8.5
            )
        )
    )
}
