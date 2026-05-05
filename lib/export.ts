import type { Expense, TripMember } from "@/types";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildExpensesCsv(
  expenses: Expense[],
  tripName: string,
  members: TripMember[]
): { blob: Blob; filename: string } {
  const memberMap = new Map(
    members.map((m) => [m.user_id, m.profile?.display_name || "成員"])
  );

  const headers = [
    "日期",
    "品名",
    "日文品名",
    "金額(JPY)",
    "金額(TWD)",
    "匯率",
    "類別",
    "支付方式",
    "店家",
    "地點",
    "分帳方式",
    "付款人",
    "歸屬人",
    "均分人",
    "備註",
  ];

  const rows = expenses
    .sort((a, b) => a.expense_date.localeCompare(b.expense_date))
    .map((e) => {
      // Subset participants → list names. Empty for split = all members
      // (legacy / explicit "全部"); leave the cell blank to match historical
      // CSVs and keep the column quiet.
      const participantNames =
        e.split_type === "split" && e.participants && e.participants.length > 0
          ? e.participants
              .map((id) => memberMap.get(id) || "")
              .filter(Boolean)
              .join("、")
          : "";
      return [
        e.expense_date,
        e.title,
        e.title_ja || "",
        e.amount_jpy.toString(),
        e.amount_twd.toString(),
        e.exchange_rate.toString(),
        e.category,
        e.payment_method,
        e.store_name || "",
        e.location || "",
        e.split_type === "split" ? "均分" : "個人",
        memberMap.get(e.paid_by) || e.profile?.display_name || "",
        e.owner_id ? (memberMap.get(e.owner_id) || "") : "",
        participantNames,
        e.note || "",
      ];
    });

  const totalJpy = expenses.reduce((s, e) => s + e.amount_jpy, 0);
  const totalTwd = expenses.reduce((s, e) => s + e.amount_twd, 0);
  const totalRow = new Array(headers.length).fill("");
  totalRow[1] = "合計";
  totalRow[3] = totalJpy.toString();
  totalRow[4] = totalTwd.toString();
  rows.push(totalRow);

  const BOM = "\uFEFF";
  const csv =
    BOM +
    [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  return { blob, filename: `${tripName}_消費紀錄.csv` };
}
