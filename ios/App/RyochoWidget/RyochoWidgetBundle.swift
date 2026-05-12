import SwiftUI
import WidgetKit

@main
struct RyochoWidgetBundle: WidgetBundle {
    var body: some Widget {
        RyochoTodayWidget()
        BudgetRingWidget()
        QuickActionsWidget()
        CashbackWidget()
        TrendWidget()
    }
}
