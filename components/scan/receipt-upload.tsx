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
                <div className="scan-sweep" aria-hidden />
                <div className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5 text-center">
                  <span className="scan-sweep-pill">
                    <Sparkles className="h-2.5 w-2.5" />
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
        <div className="mx-4 rounded-xl bg-card p-12 ring-1 ring-foreground/10 flex justify-center">
          <Camera className="h-10 w-10 text-muted-foreground" />
        </div>
      )}

      <div className="flex gap-3 px-4">
        <Button
          onClick={() => cameraInputRef.current?.click()}
          size="lg"
          className="flex-1"
          disabled={isProcessing}
        >
          <Camera className="h-4 w-4 mr-2" />
          拍照
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          size="lg"
          className="flex-1"
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
