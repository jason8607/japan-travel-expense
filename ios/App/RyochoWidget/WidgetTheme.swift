import SwiftUI

// MARK: - Design tokens mirroring DESIGN.md / widgets.jsx

struct WidgetPalette {
    let bg: Color
    let ink: Color
    let smoke: Color
    let mist: Color
    let hairline: Color
    let blue: Color
    let blueInk: Color
    let sky: Color
    let indigo: Color
    let ring: Color

    static let light = WidgetPalette(
        bg:       Color(hex: "#FFFFFF"),
        ink:      Color(hex: "#0F172A"),
        smoke:    Color(hex: "#64748B"),
        mist:     Color(hex: "#F1F5F9"),
        hairline: Color(hex: "#E2E8F0"),
        blue:     Color(hex: "#2563EB"),
        blueInk:  .white,
        sky:      Color(hex: "#DBEAFE"),
        indigo:   Color(hex: "#1E40AF"),
        ring:     Color.black.opacity(0.10)
    )

    static let dark = WidgetPalette(
        bg:       Color(hex: "#0B1220"),
        ink:      Color(hex: "#E2E8F0"),
        smoke:    Color(hex: "#94A3B8"),
        mist:     Color(hex: "#1E293B"),
        hairline: Color(hex: "#1E293B"),
        blue:     Color(hex: "#3B82F6"),
        blueInk:  .white,
        sky:      Color(hex: "#1E3A8A"),
        indigo:   Color(hex: "#BFDBFE"),
        ring:     Color.white.opacity(0.08)
    )
}

// MARK: - Shared placeholder shown when user has no data yet

struct LoginPromptView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("旅帳")
                .font(.system(size: 14, weight: .semibold))
            Text("請開啟 app 開始記帳")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Number formatting

enum WidgetFormat {
    static func jpy(_ amount: Double) -> String {
        let n = Int(amount.rounded())
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = ","
        let body = formatter.string(from: NSNumber(value: n)) ?? "\(n)"
        return "¥\(body)"
    }

    static func twd(_ amount: Double) -> String {
        let n = Int(amount.rounded())
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = ","
        let body = formatter.string(from: NSNumber(value: n)) ?? "\(n)"
        return "NT$\(body)"
    }

    static func number(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = ","
        return formatter.string(from: NSNumber(value: Int(value.rounded()))) ?? "\(Int(value.rounded()))"
    }
}

// MARK: - Color hex initialiser (needed here so all widgets can use it)

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
