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
    static let storageKey = "widget_snapshot_v1"

    static func load() -> WidgetSnapshot? {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let json = defaults.string(forKey: storageKey),
            let data = json.data(using: .utf8)
        else { return nil }
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
