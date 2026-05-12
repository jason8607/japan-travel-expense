import SwiftUI

// Web UserAvatar sizes: sm=h-8 (32), md=h-10 (40), lg=h-12 (48)
enum AvatarSize { case sm, md, lg
    var pt: CGFloat {
        switch self { case .sm: 32; case .md: 40; case .lg: 48 }
    }
}

struct MemberAvatar: View {
    let member: Member
    var size: AvatarSize = .md

    var body: some View {
        ZStack {
            Circle().fill(Theme.Color.muted)
            if let url = member.avatarURL {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Text(member.avatarEmoji).font(.system(size: size.pt * 0.55))
                }
            } else {
                Text(member.avatarEmoji).font(.system(size: size.pt * 0.55))
            }
        }
        .frame(width: size.pt, height: size.pt)
        .clipShape(Circle())
    }
}
