"use client";

import { Button } from "@/components/ui/button";
import { Camera, Sparkles, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ReceiptUploadProps {
  onImageSelected: (base64: string, mimeType: string, file: File) => void;
  isProcessing: boolean;
}

export function ReceiptUpload({
  onImageSelected,
  isProcessing,
}: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="relative mx-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="relative w-full aspect-3/4 rounded-xl overflow-hidden bg-muted">
            <Image
              src={preview}
              alt="收據"
              fill
              className="object-contain"
            />
            {isProcessing && (
              <>
                <div
                  className="pointer-events-none"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "100%",
                    background:
                      "linear-gradient(180deg, transparent 0%, rgba(209,75,61,0.3) 48%, transparent 50%)",
                    animation: "scanSweep 2.2s linear infinite",
                  }}
                />
                <div
                  className="pointer-events-none"
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    right: 10,
                    textAlign: "center",
                    fontSize: 10,
                    color: "#fff",
                    fontWeight: 600,
                    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      background: "rgba(209,75,61,0.9)",
                      borderRadius: 999,
                    }}
                  >
                    <Sparkles style={{ width: 10, height: 10 }} />
                    辨識中…
                  </span>
                </div>
              </>
            )}
          </div>
          {isProcessing && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              AI 正在辨識收據，請稍候幾秒
            </p>
          )}
        </div>
      ) : (
        <div className="mx-4 rounded-2xl border-2 border-dashed border-border bg-muted p-10">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">拍照或上傳收據圖片</p>
              <p className="text-sm text-muted-foreground mt-1">
                支援 JPG、PNG 格式
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 px-4">
        <Button
          onClick={() => cameraInputRef.current?.click()}
          variant="outline"
          className="flex-1 h-11"
          disabled={isProcessing}
        >
          <Camera className="h-4 w-4 mr-2" />
          拍照
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 h-11 bg-primary hover:bg-primary/90"
          disabled={isProcessing}
        >
          <Upload className="h-4 w-4 mr-2" />
          上傳圖片
        </Button>
      </div>

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
