import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface TripFormProps {
  name: string;
  startDate: string;
  endDate: string;
  budget: string;
  saving: boolean;
  submitLabel?: string;
  savingLabel?: string;
  onChangeName: (v: string) => void;
  onChangeStartDate: (v: string) => void;
  onChangeEndDate: (v: string) => void;
  onChangeBudget: (v: string) => void;
  onSubmit: () => void;
  onDelete?: () => void;
}

export function TripForm({
  name,
  startDate,
  endDate,
  budget,
  saving,
  submitLabel = "儲存變更",
  savingLabel = "儲存中…",
  onChangeName,
  onChangeStartDate,
  onChangeEndDate,
  onChangeBudget,
  onSubmit,
  onDelete,
}: TripFormProps) {
  return (
    <div className="p-4 space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">旅程名稱</Label>
        <Input
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="例：2026 日本北陸之旅"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">開始日期</Label>
          <DateInput
            value={startDate}
            onChange={onChangeStartDate}
            size="sm"
            ariaLabel="開始日期"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">結束日期</Label>
          <DateInput
            value={endDate}
            onChange={onChangeEndDate}
            size="sm"
            min={startDate || undefined}
            ariaLabel="結束日期"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          旅程預算 (¥){" "}
          <span className="font-normal">(選填)</span>
        </Label>
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={budget}
          onChange={(e) => onChangeBudget(e.target.value)}
          placeholder="例：100000"
          className="tabular-nums"
        />
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={saving}
        onClick={onSubmit}
      >
        {saving ? savingLabel : submitLabel}
      </Button>

      {onDelete && (
        <Button
          type="button"
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          disabled={saving}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          刪除此旅程
        </Button>
      )}
    </div>
  );
}
