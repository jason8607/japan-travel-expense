"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LayoutGrid, Plus, Pencil, Trash2, X } from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import type { CategoryItem } from "@/types";

const COLOR_OPTIONS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#A78BFA", "#EC4899",
  "#F472B6", "#6B7280",
];

const ICON_OPTIONS = [
  "🍽️", "🚆", "🛍️", "🏨", "🎫", "💊", "💄", "👕", "📦",
  "🎮", "☕", "🍰", "🎁", "📱", "🏥", "🎬", "📚", "🐾",
  "✈️", "🚗", "🍺", "🏖️", "💇", "🧸",
];

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState("#6B7280");
  const [showIcons, setShowIcons] = useState(false);

  const resetForm = () => {
    setLabel("");
    setIcon("📦");
    setColor("#6B7280");
    setEditingItem(null);
    setShowForm(false);
    setShowIcons(false);
  };

  const openEdit = (item: CategoryItem) => {
    setEditingItem(item);
    setLabel(item.label);
    setIcon(item.icon);
    setColor(item.color);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("請輸入分類名稱");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const updated = await updateCategory(editingItem.id, {
          label: label.trim(),
          value: label.trim(),
          icon,
          color,
        });
        if (updated) {
          toast.success("已更新分類");
        } else {
          toast.error("更新失敗");
          return;
        }
      } else {
        const item = await addCategory({
          value: label.trim(),
          label: label.trim(),
          icon,
          color,
        });
        if (item) {
          toast.success("已新增分類");
        } else {
          toast.error("新增失敗");
          return;
        }
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deleteCategory(deleteTarget.id);
    setDeleteTarget(null);
    if (ok) {
      toast.success("已刪除分類");
    } else {
      toast.error("刪除失敗");
    }
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          分類管理
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="text-xs text-primary flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          新增
        </button>
      </div>

      <div className="divide-y divide-border/60">
        {categories.map((item) => (
          <div
            key={item.id}
            className="px-4 py-2.5 flex items-center gap-3"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: item.color + "18" }}
            >
              <span className="text-base">{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openEdit(item)}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteTarget(item)}
                className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="border-t border-border/60 p-4 space-y-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {editingItem ? "編輯分類" : "新增分類"}
            </span>
            <button
              onClick={resetForm}
              className="text-xs text-muted-foreground flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              取消
            </button>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowIcons(!showIcons)}
              className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-xl shrink-0 hover:bg-card transition-colors"
              style={{ backgroundColor: color + "18" }}
            >
              {icon}
            </button>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">名稱</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="例：伴手禮"
                className="h-10 rounded-lg text-sm"
              />
            </div>
          </div>

          {showIcons && (
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => { setIcon(ic); setShowIcons(false); }}
                  className={`w-full aspect-square rounded-lg text-lg flex items-center justify-center transition-all ${
                    icon === ic
                      ? "bg-primary/15 ring-2 ring-primary/50"
                      : "bg-card hover:bg-muted"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">顏色</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-primary/50 scale-110" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={handleSave}
            className="w-full h-10 bg-primary hover:bg-primary/90 rounded-lg text-sm"
            disabled={saving}
          >
            {saving
              ? "儲存中..."
              : editingItem
                ? "儲存變更"
                : "新增分類"}
          </Button>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>確定要刪除？</DialogTitle>
            <DialogDescription>
              將刪除「{deleteTarget?.icon} {deleteTarget?.label}」分類。已記錄的消費不會受影響。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
            >
              確定刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
