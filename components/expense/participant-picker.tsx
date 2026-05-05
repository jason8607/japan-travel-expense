"use client";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import type { TripMember } from "@/types";
import { Settings2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Discriminated union: personal owns the whole expense; split divides it.
// For split, an empty `participants` is interpreted as "all members" so the
// shape matches the DB fallback (legacy split expenses have no participant
// rows). Subset splits store the explicit user_id list (2..N-1 members).
export type ParticipantValue =
  | { kind: "personal"; ownerId: string | null }
  | { kind: "split"; participants: string[] };

export interface ParticipantPickerProps {
  members: TripMember[];
  currentUserId: string;
  value: ParticipantValue;
  onChange: (value: ParticipantValue) => void;
  // Both variants present the same chips + inline subset panel; they only
  // differ in chip density (compact for OCR rows, full for the manual form).
  variant?: "compact" | "full";
  className?: string;
  // Override the chip label for "self" (defaults to "我"). The full form uses
  // "我的" because the surrounding label is "這筆是誰的".
  selfLabel?: string;
}

function memberLabel(m: TripMember, isMe: boolean, selfLabel: string): string {
  if (isMe) return selfLabel;
  return m.profile?.display_name || "成員";
}

function isPersonalSelected(
  value: ParticipantValue,
  userId: string,
  currentUserId: string,
): boolean {
  if (value.kind !== "personal") return false;
  // null ownerId is the canonical "self" representation.
  if (userId === currentUserId) return value.ownerId === null || value.ownerId === currentUserId;
  return value.ownerId === userId;
}

function isAllMembersSplit(value: ParticipantValue, allMemberIds: string[]): boolean {
  if (value.kind !== "split") return false;
  if (value.participants.length === 0) return true;
  if (value.participants.length !== allMemberIds.length) return false;
  return allMemberIds.every((id) => value.participants.includes(id));
}

function isSubsetSplit(value: ParticipantValue, allMemberIds: string[]): boolean {
  return (
    value.kind === "split" &&
    value.participants.length > 0 &&
    value.participants.length < allMemberIds.length
  );
}

// Subset splits must have at least 2 people. 1 person is semantically
// identical to a personal expense owned by that person, so we force users to
// pick that explicitly via the "personal" chips instead.
const MIN_SUBSET_SIZE = 2;

export function ParticipantPicker({
  members,
  currentUserId,
  value,
  onChange,
  variant = "full",
  className,
  selfLabel = "我",
}: ParticipantPickerProps) {
  const allMemberIds = useMemo(() => members.map((m) => m.user_id), [members]);
  const subsetSplit = isSubsetSplit(value, allMemberIds);

  // Inline panel uses a local draft so users can freely click people to add /
  // remove without triggering invalid intermediate values (1-person subset).
  // Draft is committed to the parent only via the Confirm button.
  //
  // Lazy init reads the initial prop so an edit form with an existing subset
  // opens the panel on first paint. Subsequent open/close stays user-driven —
  // do NOT sync this from `value` in an effect, or `confirmDraft` re-opens
  // itself the moment value becomes a subset.
  const [customOpen, setCustomOpen] = useState(() =>
    isSubsetSplit(value, members.map((m) => m.user_id)),
  );
  const [draftSubset, setDraftSubset] = useState<string[]>([]);

  // Initialize the draft when the panel opens. If the value is already a
  // subset, edit that. Otherwise start with just the current user — most
  // expenses include the logger themselves, so this saves a tap.
  useEffect(() => {
    if (!customOpen) return;
    if (value.kind === "split" && value.participants.length > 0) {
      setDraftSubset(value.participants);
    } else {
      setDraftSubset([currentUserId]);
    }
  }, [customOpen, value, currentUserId]);

  const allSplit = isAllMembersSplit(value, allMemberIds);

  const handlePersonal = (memberId: string) => {
    const isMe = memberId === currentUserId;
    onChange({ kind: "personal", ownerId: isMe ? null : memberId });
    setCustomOpen(false);
  };

  const handleAllSplit = () => {
    // Store empty for "all members" — matches the DB-empty / legacy fallback,
    // keeps the wire payload smaller, and means changing trip membership later
    // automatically rebalances historic split expenses.
    onChange({ kind: "split", participants: [] });
    setCustomOpen(false);
  };

  const handleCustomClick = () => {
    setCustomOpen((prev) => !prev);
  };

  const toggleDraftMember = (id: string) => {
    setDraftSubset((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const confirmDraft = () => {
    if (draftSubset.length < MIN_SUBSET_SIZE) return;
    if (draftSubset.length === allMemberIds.length) {
      // User picked everyone — collapse back to canonical "all" form.
      onChange({ kind: "split", participants: [] });
    } else {
      onChange({ kind: "split", participants: draftSubset });
    }
    setCustomOpen(false);
  };

  const cancelDraft = () => {
    setCustomOpen(false);
  };

  // "自訂" button label changes when a subset is active so users can see at a
  // glance that this expense has a non-default split.
  const subsetParticipantCount =
    value.kind === "split" ? value.participants.length : 0;
  const customLabel = subsetSplit ? `自訂 (${subsetParticipantCount})` : "自訂";

  // Subset only makes sense with 3+ members (with 2 the only options are
  // either all-split or personal). Hide the entrypoint otherwise.
  const showCustomButton = members.length >= 3;

  const chipClass = variant === "compact" ? CHIP_COMPACT : CHIP_FULL;
  const iconSize = variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4";
  const draftCount = draftSubset.length;
  const draftValid = draftCount >= MIN_SUBSET_SIZE;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => {
          const isMe = m.user_id === currentUserId;
          const selected = isPersonalSelected(value, m.user_id, currentUserId);
          return (
            <button
              key={m.user_id}
              type="button"
              onClick={() => handlePersonal(m.user_id)}
              className={cn(chipClass, selected ? CHIP_SELECTED : CHIP_IDLE)}
              aria-pressed={selected}
            >
              <UserAvatar
                avatarUrl={m.profile?.avatar_url}
                avatarEmoji={m.profile?.avatar_emoji}
                size="xs"
              />
              {memberLabel(m, isMe, selfLabel)}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleAllSplit}
          className={cn(chipClass, allSplit ? CHIP_SELECTED : CHIP_IDLE)}
          aria-pressed={allSplit}
        >
          <Users className={iconSize} />
          均分 ({members.length} 人)
        </button>

        {showCustomButton && (
          <button
            type="button"
            onClick={handleCustomClick}
            className={cn(
              chipClass,
              customOpen || subsetSplit ? CHIP_SELECTED : CHIP_IDLE,
            )}
            aria-pressed={customOpen || subsetSplit}
            aria-expanded={customOpen}
          >
            <Settings2 className={iconSize} />
            {customLabel}
          </button>
        )}
      </div>

      {showCustomButton && customOpen && (
        <div className="mt-3 space-y-2.5 rounded-lg bg-muted/50 p-3 ring-1 ring-foreground/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">
              點選要均分的人
            </p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {draftValid
                ? `已選 ${draftCount} 人`
                : `已選 ${draftCount} / 至少 ${MIN_SUBSET_SIZE} 人`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const isMe = m.user_id === currentUserId;
              const checked = draftSubset.includes(m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggleDraftMember(m.user_id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ring-1 outline-none transition-colors active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50",
                    checked
                      ? "bg-accent ring-primary text-accent-foreground"
                      : "bg-card/40 ring-border text-muted-foreground hover:bg-card",
                  )}
                  aria-pressed={checked}
                >
                  <UserAvatar
                    avatarUrl={m.profile?.avatar_url}
                    avatarEmoji={m.profile?.avatar_emoji}
                    size="xs"
                  />
                  {memberLabel(m, isMe, selfLabel)}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelDraft}
              className="flex-1 h-9"
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmDraft}
              disabled={!draftValid}
              className="flex-1 h-9"
            >
              確認
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const CHIP_BASE =
  "flex items-center gap-1.5 rounded-lg ring-1 outline-none transition-colors active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/50";

const CHIP_FULL = cn(CHIP_BASE, "px-3 py-2.5 text-sm font-medium");
const CHIP_COMPACT = cn(CHIP_BASE, "px-2 py-1 text-[11px] font-medium");

const CHIP_SELECTED = "bg-accent ring-primary text-accent-foreground";
const CHIP_IDLE = "bg-card ring-border text-muted-foreground hover:bg-muted";
