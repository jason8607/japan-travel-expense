#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetSyncPlugin, "WidgetSync",
    CAP_PLUGIN_METHOD(setSnapshot, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clear, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reloadAllTimelines, CAPPluginReturnPromise);
)
