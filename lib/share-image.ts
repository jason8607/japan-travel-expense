export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  // Treat as touch-only when the primary pointer is coarse AND no fine pointer
  // exists anywhere — avoids misclassifying touchscreen laptops (which still
  // have a mouse) as mobile and pushing them into the native share sheet.
  const primaryCoarse = window.matchMedia("(pointer: coarse)").matches;
  const hasFinePointer = window.matchMedia("(any-pointer: fine)").matches;
  return primaryCoarse && !hasFinePointer;
}

// iOS standalone PWA can't trigger a real file download — `<a download>` opens
// an in-app preview pane instead of saving. Detect this so the recap page can
// route the "download" intent through Web Share API (which exposes 儲存影像).
export function isIosStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
  if (!isIos) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return standalone;
}

export function canCopyImage(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof ClipboardItem === "undefined") return false;
  return typeof navigator.clipboard?.write === "function";
}

export async function copyImageToClipboard(blob: Blob): Promise<void> {
  const type = blob.type || "image/png";
  const item = new ClipboardItem({ [type]: blob });
  await navigator.clipboard.write([item]);
}

export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function canShareImage(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.share === "function" && typeof navigator.canShare === "function";
}

export async function shareImageNative(
  blob: Blob,
  filename: string,
  shareTitle: string
): Promise<"shared" | "unsupported" | "cancelled"> {
  if (!canShareImage()) return "unsupported";
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  if (!navigator.canShare({ files: [file] })) return "unsupported";
  try {
    await navigator.share({ files: [file], title: shareTitle });
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "cancelled";
    throw err;
  }
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export async function shareOrDownloadFile(
  blob: Blob,
  filename: string,
  shareTitle: string
): Promise<"shared" | "downloaded"> {
  // Native Capacitor app: write to cache then share via native sheet
  if (typeof window !== "undefined" && "Capacitor" in window) {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");
        const base64 = await blobToBase64(blob);
        const fileResult = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({ title: shareTitle, url: fileResult.uri });
        return "shared";
      }
    } catch {
      // fall through to web share / download
    }
  }

  // iOS standalone PWA always prefers share — `<a download>` opens an in-app
  // preview pane there instead of saving.
  const preferShare = isTouchDevice() || isIosStandalone();
  if (preferShare && canShareImage()) {
    // Strip charset from mime so Chrome's strict allowlist (e.g. "text/csv")
    // can match files generated with "text/csv;charset=utf-8".
    const mime = (blob.type || "application/octet-stream").split(";")[0].trim();
    const file = new File([blob], filename, { type: mime });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: shareTitle });
        return "shared";
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return "shared";
        // Some environments (desktop browsers under DevTools mobile emulation,
        // permission-denied contexts) reject share even after canShare → true.
        // Fall through to download instead of surfacing the error.
        console.warn("Web Share failed, falling back to download:", err);
      }
    }
  }

  downloadImage(blob, filename);
  return "downloaded";
}
