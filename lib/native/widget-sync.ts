import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/capacitor";
import type { WidgetSnapshot } from "@/types/widget";

interface WidgetSyncPlugin {
  setSnapshot(opts: { json: string }): Promise<void>;
  clear(): Promise<void>;
  reloadAllTimelines(): Promise<void>;
}

const Native = registerPlugin<WidgetSyncPlugin>("WidgetSync");

export const widgetSync = {
  async write(snapshot: WidgetSnapshot): Promise<void> {
    if (!isNativeApp()) return;
    try {
      await Native.setSnapshot({ json: JSON.stringify(snapshot) });
    } catch (err) {
      console.warn("[widgetSync] write failed", err);
    }
  },

  async clear(): Promise<void> {
    if (!isNativeApp()) return;
    try {
      await Native.clear();
    } catch (err) {
      console.warn("[widgetSync] clear failed", err);
    }
  },

  async reload(): Promise<void> {
    if (!isNativeApp()) return;
    try {
      await Native.reloadAllTimelines();
    } catch (err) {
      console.warn("[widgetSync] reload failed", err);
    }
  },
};
