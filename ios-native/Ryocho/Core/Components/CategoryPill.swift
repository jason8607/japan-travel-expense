import SwiftUI

// Web equivalent: <Badge bg={color}18 text={color} h-[18px] px-1.5 py-0 text-xs font-medium>
//   {emoji} {category}
// </Badge>
struct CategoryPill: View {
    let category: Category

    var body: some View {
        let tint = Color(hexString: category.tint)
        HStack(spacing: 2) {
            Text(category.icon)
                .font(.system(size: 11))
            Text(category.label)
                .font(Typography.microEmphasis)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 6)
        .frame(height: 18)
        .background(
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(tint.opacity(0.12))
        )
    }
}
