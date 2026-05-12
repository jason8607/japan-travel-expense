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

    /// When true, widget views should render ledger UI (not the empty / marketing prompt).
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

extension Color {
    init(hex: String) {
        let trimmed = hex.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
        var int: UInt64 = 0
        Scanner(string: trimmed).scanHexInt64(&int)
        let r, g, b, a: UInt64
        switch trimmed.count {
        case 6:
            (r, g, b, a) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF, 255)
        case 8:
            (r, g, b, a) = ((int >> 24) & 0xFF, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default:
            (r, g, b, a) = (148, 163, 184, 255)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

enum WidgetFormat {
    static func jpy(_ amount: Double) -> String {
        let n = Int(amount.rounded())
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = ","
        let body = formatter.string(from: NSNumber(value: n)) ?? "\(n)"
        return "¥\(body)"
    }
}
