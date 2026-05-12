import SwiftUI

// Tokens mirror app/globals.css :root + .dark for visual parity with the Web build.
enum Theme {
    enum Color {
        // brand / state
        static let primary           = SwiftUI.Color(light: 0x2563EB, dark: 0x60A5FA)
        static let primaryForeground = SwiftUI.Color(light: 0xFFFFFF, dark: 0x0B1220)
        static let success           = SwiftUI.Color(light: 0x16A34A, dark: 0x22C55E)
        static let warning           = SwiftUI.Color(light: 0xCA8A04, dark: 0xFBBF24)
        static let warningSubtle     = SwiftUI.Color(light: 0xFEF9C3, dark: 0x422006)
        static let destructive       = SwiftUI.Color(light: 0xDC2626, dark: 0xF87171)

        // surfaces
        static let background        = SwiftUI.Color(light: 0xFFFFFF, dark: 0x0B1220)
        static let card              = SwiftUI.Color(light: 0xFFFFFF, dark: 0x111827)
        static let muted             = SwiftUI.Color(light: 0xF1F5F9, dark: 0x1F2937)

        // text
        static let foreground        = SwiftUI.Color(light: 0x0F172A, dark: 0xF8FAFC)
        static let mutedForeground   = SwiftUI.Color(light: 0x64748B, dark: 0x94A3B8)

        // borders ≈ ring-1 ring-foreground/10
        static let ring              = SwiftUI.Color(light: 0x0F172A, dark: 0xF8FAFC).opacity(0.10)
    }

    // Tailwind radius: --radius 0.625rem (=10). xl = *1.4 ≈ 14. full = 999.
    enum Radius {
        static let sm: CGFloat = 6
        static let md: CGFloat = 10
        static let lg: CGFloat = 12
        static let xl: CGFloat = 14
        static let pill: CGFloat = 999
    }

    enum Space {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 20
        static let xl: CGFloat = 28
        static let xxl: CGFloat = 40
    }
}

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }

    init(light: UInt32, dark: UInt32) {
        self = Color(uiColor: UIColor { trait in
            let hex = trait.userInterfaceStyle == .dark ? dark : light
            let r = CGFloat((hex >> 16) & 0xFF) / 255
            let g = CGFloat((hex >> 8) & 0xFF) / 255
            let b = CGFloat(hex & 0xFF) / 255
            return UIColor(red: r, green: g, blue: b, alpha: 1)
        })
    }

    init(hexString: String) {
        let cleaned = hexString.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
        let value = UInt32(cleaned, radix: 16) ?? 0
        self.init(hex: value)
    }
}

// Web equivalent: rounded-xl bg-card ring-1 ring-foreground/10
struct RingCardStyle: ViewModifier {
    var padding: CGFloat
    var radius: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(Theme.Color.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Theme.Color.ring, lineWidth: 1)
            )
    }
}

extension View {
    func ringCard(padding: CGFloat = Theme.Space.md, radius: CGFloat = Theme.Radius.xl) -> some View {
        modifier(RingCardStyle(padding: padding, radius: radius))
    }
}
