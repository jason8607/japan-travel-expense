import SwiftUI

enum Typography {
    static let kicker         = Font.system(size: 10, weight: .semibold)
    static let displayLarge   = Font.system(size: 32, weight: .bold)
    static let h1             = Font.system(size: 20, weight: .bold)
    static let h2             = Font.system(size: 14, weight: .semibold)
    static let body           = Font.system(size: 14)
    static let bodyEmphasis   = Font.system(size: 14, weight: .semibold)
    static let small          = Font.system(size: 12)
    static let smallEmphasis  = Font.system(size: 12, weight: .semibold)
    static let micro          = Font.system(size: 11)
    static let microEmphasis  = Font.system(size: 11, weight: .semibold)
    static let tiny           = Font.system(size: 10)
}
