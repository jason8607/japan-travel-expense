import SwiftUI
import WidgetKit

@main
struct RyochoWidgetBundle: WidgetBundle {
    var body: some Widget {
        RyochoWidget()
        RyochoShortcutsWidget()
    }
}
