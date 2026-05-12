import SwiftUI

@main
struct RyochoApp: App {
    var body: some Scene {
        WindowGroup {
            RootTabView()
                .tint(Theme.Color.primary)
        }
    }
}

struct RootTabView: View {
    @State private var selection: Tab = .home

    enum Tab: Hashable {
        case home, records, scan, stats, settings
    }

    var body: some View {
        TabView(selection: $selection) {
            HomeView(
                trip: MockData.trip,
                expenses: MockData.expenses,
                exchangeRate: MockData.exchangeRate,
                me: MockData.me
            )
            .tabItem { Label("首頁", systemImage: "house") }
            .tag(Tab.home)

            placeholder("記帳", icon: "list.bullet.clipboard")
                .tabItem { Label("記帳", systemImage: "list.bullet.clipboard") }
                .tag(Tab.records)

            placeholder("掃描", icon: "camera")
                .tabItem { Label("掃描", systemImage: "camera") }
                .tag(Tab.scan)

            placeholder("統計", icon: "chart.bar")
                .tabItem { Label("統計", systemImage: "chart.bar") }
                .tag(Tab.stats)

            placeholder("設定", icon: "gearshape")
                .tabItem { Label("設定", systemImage: "gearshape") }
                .tag(Tab.settings)
        }
    }

    private func placeholder(_ title: String, icon: String) -> some View {
        VStack(spacing: Theme.Space.md) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundStyle(Theme.Color.mutedForeground)
            Text("\(title)・待實作")
                .font(Typography.body)
                .foregroundStyle(Theme.Color.mutedForeground)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.Color.background.ignoresSafeArea())
    }
}
