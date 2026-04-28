"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ReceiptUploadProps {
  onImageSelected: (base64: string, mimeType: string, file: File) => void;
  isProcessing: boolean;
  error?: string | null;
  onReset?: () => void;
  resetSignal?: number;
}

export function ReceiptUpload({
  onImageSelected,
  isProcessing,
  error,
  onReset,
  resetSignal,
}: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Allow parent to clear the preview (e.g. user pressed "移除").
  useEffect(() => {
    if (resetSignal === undefined) return;
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, [resetSignal]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) {
        toast.error("讀取圖片失敗，請重新選擇");
        return;
      }
      setPreview(result);
      onImageSelected(base64, file.type, file);
    };
    reader.onerror = () => {
      toast.error("讀取圖片失敗，請重新選擇");
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    onReset?.();
  };

  const showErrorActions = !!error && !isProcessing && !!preview;

  return (
    <div>
      <div className="ed-scan-frame">
        <span className="ed-scan-corner tl" />
        <span className="ed-scan-corner tr" />
        <span className="ed-scan-corner bl" />
        <span className="ed-scan-corner br" />

        {preview ? (
          <div className="ed-scan-receipt">
            <Image
              src={preview}
              alt="收據"
              fill
              sizes="(max-width: 512px) 80vw, 320px"
              style={{ objectFit: "cover" }}
            />
            {isProcessing ? <div className="ed-scan-laser" /> : null}
          </div>
        ) : (
          <div style={{ padding: "0 18px" }}>
            <div className="ed-scan-empty-cap">N°01 · OCR INTAKE</div>
            <div className="ed-scan-empty-h">
              拍 一 張<br />
              <span className="vermilion">收 據</span>
            </div>
            <div className="ed-scan-empty-sub">
              交給 AI，剩下交給直覺
            </div>
          </div>
        )}

        {isProcessing ? (
          <div className="ed-scan-status">
            <span className="dot" />
            辨識中
          </div>
        ) : null}
      </div>

      {/* Error banner */}
      {showErrorActions ? (
        <div
          style={{
            margin: "16px 24px 0",
            padding: "12px 14px",
            background: "var(--ed-cream)",
            border: "1px solid var(--ed-vermillion)",
          }}
        >
          <div
            className="ed-mono"
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: "var(--ed-vermillion)",
              marginBottom: 4,
            }}
          >
            辨 識 失 敗
          </div>
          <div
            className="ed-serif"
            style={{
              fontSize: 13,
              color: "var(--ed-ink-soft)",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        </div>
      ) : null}

      {isProcessing ? (
        <p
          className="ed-mono"
          style={{
            margin: "20px 24px 0",
            fontSize: 10,
            letterSpacing: 2,
            color: "var(--ed-muted)",
            textAlign: "center",
          }}
        >
          AI 正在閱讀收據，約需數秒…
        </p>
      ) : showErrorActions ? (
        <div
          style={{
            padding: "16px 24px 0",
            display: "flex",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={handleRemove}
            className="ed-btn-ghost"
            style={{
              flex: 1,
              padding: "14px 0",
              fontSize: 13,
              letterSpacing: 4,
              fontWeight: 600,
            }}
          >
            移 除 圖 片
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ed-btn-primary"
            style={{
              flex: 1,
              padding: "14px 0",
              fontSize: 13,
              letterSpacing: 4,
            }}
          >
            重 新 上 傳
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="ed-btn-ghost"
            style={{
              flex: 1,
              padding: "14px 0",
              fontSize: 13,
              letterSpacing: 4,
              fontWeight: 600,
            }}
          >
            拍 　 照
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ed-btn-primary"
            style={{
              flex: 1,
              padding: "14px 0",
              fontSize: 13,
              letterSpacing: 4,
            }}
          >
            上 傳 圖 片
          </button>
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
