import Foundation

enum Currency: String, Codable {
    case jpy = "JPY"
    case twd = "TWD"
}

enum PaymentMethod: String, Codable, CaseIterable, Identifiable {
    case cash = "現金"
    case creditCard = "信用卡"
    case payPay = "PayPay"
    case suica = "Suica"
    case other = "其他"

    var id: String { rawValue }

    var systemIcon: String {
        switch self {
        case .cash: return "yensign.circle"
        case .creditCard: return "creditcard"
        case .payPay: return "p.circle.fill"
        case .suica: return "wave.3.right.circle"
        case .other: return "ellipsis.circle"
        }
    }
}

enum SplitType: String, Codable {
    case personal
    case split
}

struct Category: Identifiable, Hashable {
    let id: String
    let label: String
    let icon: String
    let tint: String

    static let food      = Category(id: "default-food",      label: "餐飲", icon: "🍜",  tint: "#E27A4A")
    static let transport = Category(id: "default-transport", label: "交通", icon: "🚄",  tint: "#5E8AB5")
    static let shopping  = Category(id: "default-shopping",  label: "購物", icon: "🛍️", tint: "#D16B84")
    static let hotel     = Category(id: "default-hotel",     label: "住宿", icon: "🏨",  tint: "#7AAE8C")
    static let ticket    = Category(id: "default-ticket",    label: "門票", icon: "🎫",  tint: "#9776C4")
    static let medicine  = Category(id: "default-medicine",  label: "藥品", icon: "💊",  tint: "#C9604F")
    static let beauty    = Category(id: "default-beauty",    label: "美妝", icon: "💄",  tint: "#D58AA3")
    static let clothes   = Category(id: "default-clothes",   label: "衣服", icon: "👕",  tint: "#A892C9")
    static let other     = Category(id: "default-other",     label: "其他", icon: "📦",  tint: "#8E7C65")
}

struct Member: Identifiable, Hashable {
    let id: String
    let displayName: String
    let avatarEmoji: String
    let avatarURL: URL?
}

struct Trip: Identifiable, Hashable {
    let id: String
    let name: String
    let startDate: Date
    let endDate: Date
    let budgetJPY: Int?
    let budgetTWD: Int?
    let members: [Member]
}

struct Expense: Identifiable, Hashable {
    let id: String
    let tripID: String
    let title: String
    let titleJA: String?
    let amountJPY: Int
    let amountTWD: Int
    let exchangeRate: Double
    let inputCurrency: Currency
    let paymentMethod: PaymentMethod
    let category: Category
    let owner: Member
    let participants: [Member]
    let splitType: SplitType
    let expenseDate: Date
    let note: String?
}

extension Trip {
    func dayIndex(for date: Date) -> Int {
        let cal = Calendar.current
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: startDate), to: cal.startOfDay(for: date)).day ?? 0
        return days + 1
    }

    var totalDays: Int {
        let cal = Calendar.current
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: startDate), to: cal.startOfDay(for: endDate)).day ?? 0
        return days + 1
    }
}
