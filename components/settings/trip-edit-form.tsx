"use client";

import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface TripEditFormProps {
  name: string;
  startDate: string;
  endDate: string;
  budget: string;
  saving: boolean;
  onChangeName: (v: string) => void;
  onChangeStartDate: (v: string) => void;
  onChangeEndDate: (v: string) => void;
  onChangeBudget: (v: string) => void;
  onSubmit: () => void;
  onDelete?: () => void;
}

export function TripEditForm({
  name,
  startDate,
  endDate,
  budget,
  saving,
  onChangeName,
  onChangeStartDate,
  onChangeEndDate,
  onChangeBudget,
  onSubmit,
  onDelete,
}: TripEditFormProps) {
  return (
    <div className="p-4 space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">旅程名稱</Label>
        <Input
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          className="h-10 rounded-lg text-sm"
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
            ariaLabel="結束日期"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">旅程預算 (¥)</Label>
        <Input
          type="number"
          value={budget}
          onChange={(e) => onChangeBudget(e.target.value)}
          placeholder="選填"
          className="h-10 rounded-lg text-sm"
        />
      </div>
      <Button
        onClick={onSubmit}
        className="w-full h-10 bg-primary hover:bg-primary/90 rounded-lg text-sm"
        disabled={saving}
      >
        {saving ? "儲存中..." : "儲存變更"}
      </Button>
      {onDelete && (
        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          className="w-full h-10 rounded-lg text-sm text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          disabled={saving}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          刪除此旅程
        </Button>
      )}
    </div>
  );
}
