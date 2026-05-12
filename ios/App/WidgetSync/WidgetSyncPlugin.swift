import Foundation
import Capacitor
import WidgetKit

@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin {

    static let appGroupId = "group.com.jasonchen.ryocho"
    static let snapshotKey = "widget_snapshot_v1"

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("missing 'json' string")
            return
        }
        guard let defaults = UserDefaults(suiteName: Self.appGroupId) else {
            call.reject("App Group not accessible — check entitlements")
            return
        }
        defaults.set(json, forKey: Self.snapshotKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroupId) else {
            call.reject("App Group not accessible — check entitlements")
            return
        }
        defaults.removeObject(forKey: Self.snapshotKey)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc func reloadAllTimelines(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
