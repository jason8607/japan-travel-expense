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
import { ChevronDown, LayoutGrid, Plus, Pencil, Trash2, X, GripVertical } from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import type { CategoryItem } from "@/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function CategoryForm({
  editingItem,
  label, setLabel,
  icon, setIcon,
  color, setColor,
  saving,
  onSave,
  onCancel,
}: {
  editingItem: CategoryItem | null;
  label: string; setLabel: (v: string) => void;
  icon: string; setIcon: (v: string) => void;
  color: string; setColor: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [showIcons, setShowIcons] = useState(false);

  return (
    <div className="p-4 space-y-3 bg-muted/50">
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

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg text-sm"
        >
          取消
        </Button>
        <Button
          onClick={onSave}
          className="flex-1 h-9 bg-primary hover:bg-primary/90 rounded-lg text-sm"
          disabled={saving}
        >
          {saving ? "儲存中..." : editingItem ? "儲存變更" : "新增分類"}
        </Button>
      </div>
    </div>
  );
}

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, reorderCategories } = useCategories();
  const [isOpen, setIsOpen] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState("#6B7280");

  const resetForm = () => {
    setLabel("");
    setIcon("📦");
    setColor("#6B7280");
    setEditingItem(null);
    setShowNewForm(false);
  };

  const openNew = () => {
    resetForm();
    setShowNewForm(true);
  };

  const openEdit = (item: CategoryItem) => {
    setShowNewForm(false);
    setLabel(item.label);
    setIcon(item.icon);
    setColor(item.color);
    setEditingItem(item);
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
        if (updated) { toast.success("已更新分類"); } else { toast.error("更新失敗"); return; }
      } else {
        const item = await addCategory({ value: label.trim(), label: label.trim(), icon, color });
        if (item) { toast.success("已新增分類"); } else { toast.error("新增失敗"); return; }
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
    if (ok) { toast.success("已刪除分類"); } else { toast.error("刪除失敗"); }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const orderedIds = arrayMove(categories, oldIndex, newIndex).map((c) => c.id);
    const ok = await reorderCategories(orderedIds);
    if (!ok) toast.error("排序失敗");
  };

  const formProps = { label, setLabel, icon, setIcon, color, setColor, saving, onSave: handleSave, onCancel: resetForm };

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className={`px-4 py-3 flex items-center gap-2 ${isOpen ? "border-b border-border/60" : ""}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 min-w-0 text-left"
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          <span className="text-sm font-bold">分類管理</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {isOpen && (!showNewForm && !editingItem ? (
            <button
              onClick={openNew}
              className="text-xs text-primary flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              新增
            </button>
          ) : (
            <button
              onClick={resetForm}
              disabled={saving}
              className="text-xs text-muted-foreground flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              取消
            </button>
          ))}
          <button onClick={() => { setIsOpen(!isOpen); if (isOpen) resetForm(); }}>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          {/* New category form — directly below header */}
          {showNewForm && (
            <div className="border-b border-border/60">
              <CategoryForm editingItem={null} {...formProps} />
            </div>
          )}

          {/* Category list with inline edit */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-border/60">
                {categories.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    isEditing={editingItem?.id === item.id}
                    onEdit={() => editingItem?.id === item.id ? resetForm() : openEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                    editForm={
                      editingItem?.id === item.id
                        ? <CategoryForm editingItem={item} {...formProps} />
                        : undefined
                    }
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
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
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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

function SortableRow({
  item,
  isEditing,
  onEdit,
  onDelete,
  editForm,
}: {
  item: CategoryItem;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  editForm?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-card touch-none ${isDragging ? "shadow-lg ring-1 ring-border" : ""}`}
    >
      <div className="px-4 py-2.5 flex items-center gap-3">
        <button
          type="button"
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground active:cursor-grabbing cursor-grab touch-none shrink-0"
          aria-label="拖曳排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
            onClick={onEdit}
            className={`p-1.5 transition-colors ${isEditing ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {editForm && (
        <div className="border-t border-border/60">
          {editForm}
        </div>
      )}
    </li>
  );
}
