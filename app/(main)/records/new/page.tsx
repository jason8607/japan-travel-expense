"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/expense/expense-form";

export default function NewExpensePage() {
  return (
    <div>
      <PageHeader title="新增消費" showBack />
      <ExpenseForm />
    </div>
  );
}
