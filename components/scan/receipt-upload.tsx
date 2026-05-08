"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Camera, Sparkles, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ReceiptUploadProps {
  onImageSelected: (base64: string, mimeType: string, file: File) => void;
  isProcessing: boolean;
  className?: string;
}

export function ReceiptUpload({
  onImageSelected,
  isProcessing,
  className,
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
    <div className={cn("space-y-4", className)}>
      {preview ? (
        <div className="relative mx-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
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
        <div className="mx-4 rounded-xl bg-card p-10 ring-1 ring-foreground/10">
        <div className="flex flex-col items-center gap-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Camera className="h-10 w-10 " />
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
          className="flex-1 h-10"
          disabled={isProcessing}
        >
          <Camera className="h-4 w-4 mr-2" />
          拍照
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="flex-1 h-10"
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
