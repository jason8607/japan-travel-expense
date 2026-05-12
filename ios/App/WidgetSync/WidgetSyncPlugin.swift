import Foundation
import Capacitor
import WidgetKit

@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin {

    static let appGroupId = "group.com.jasonchen.ryocho"
    static let snapshotFileName = "widget_snapshot_v1.json"

    private static func snapshotFileURL() -> URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId)?
            .appendingPathComponent(snapshotFileName)
    }

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("missing 'json' string")
            return
        }
        guard let fileURL = Self.snapshotFileURL() else {
            call.reject("App Group container not accessible — check entitlements")
            return
        }
        do {
            try json.data(using: .utf8)?.write(to: fileURL, options: .atomic)
        } catch {
            call.reject("Failed to write snapshot: \(error.localizedDescription)")
            return
        }
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        guard let fileURL = Self.snapshotFileURL() else {
            call.reject("App Group container not accessible — check entitlements")
            return
        }
        try? FileManager.default.removeItem(at: fileURL)
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
