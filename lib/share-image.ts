function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
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

export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  shareTitle: string
): Promise<"shared" | "downloaded"> {
  if (isTouchDevice() && canShareImage()) {
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: shareTitle });
      return "shared";
    }
  }

  downloadImage(blob, filename);
  return "downloaded";
}
