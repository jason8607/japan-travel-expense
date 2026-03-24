import { Client } from "@notionhq/client";
import type { Expense } from "@/types";

export async function syncExpenseToNotion(
  expense: Expense,
  notionToken: string,
  databaseId: string
): Promise<string> {
  const notion = new Client({ auth: notionToken });

  if (expense.notion_page_id) {
    await notion.pages.update({
      page_id: expense.notion_page_id,
      properties: buildProperties(expense),
    });
    return expense.notion_page_id;
  }

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: buildProperties(expense),
  });

  return response.id;
}

function buildProperties(expense: Expense) {
  return {
    品名: { title: [{ text: { content: expense.title } }] },
    "金額 (JPY)": { number: expense.amount_jpy },
    "金額 (TWD)": { number: expense.amount_twd },
    類別: { select: { name: expense.category } },
    支付方式: { select: { name: expense.payment_method } },
    日期: { date: { start: expense.expense_date } },
    店家: {
      rich_text: [{ text: { content: expense.store_name || "" } }],
    },
    地區: {
      rich_text: [{ text: { content: expense.location || "" } }],
    },
  };
}
