"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { RenovationProject } from "@/lib/reno-data-loader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type ExpensesWireframeProps = {
  project: RenovationProject;
};

type ExpenseRow = {
  id: string;
  itemId: string;
  itemTitle: string;
  sectionId: string;
  sectionTitle: string;
  date: string;
  amount: number;
  type: string;
  vendor?: string;
  note?: string;
};

export function ExpensesWireframe({ project }: ExpensesWireframeProps) {
  const expenseRows = useMemo<ExpenseRow[]>(() => {
    return project.items.flatMap((item) => {
      const sectionTitle =
        project.sections.find((section) => section.id === item.sectionId)?.title ??
        item.sectionId;

      return item.expenses.map((expense) => ({
        id: expense.id,
        itemId: item.id,
        itemTitle: item.title,
        sectionId: item.sectionId,
        sectionTitle,
        date: expense.date,
        amount: expense.amount,
        type: expense.type,
        vendor: expense.vendor,
        note: expense.note,
      }));
    });
  }, [project.items, project.sections]);

  const projectExpenseTotal = useMemo(
    () => expenseRows.reduce((sum, expense) => sum + expense.amount, 0),
    [expenseRows],
  );

  const groupedBySection = useMemo(() => {
    return project.sections
      .map((section) => ({
        section,
        expenses: expenseRows.filter((expense) => expense.sectionId === section.id),
      }))
      .filter((entry) => entry.expenses.length > 0);
  }, [expenseRows, project.sections]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Expenses
        </p>
        <h1 className="mt-1 text-2xl font-semibold">All Expenses</h1>
        <p className="text-sm text-muted-foreground">
          Review expenses grouped by section.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Expense Entries</p>
          <p className="text-2xl font-semibold">{expenseRows.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Project Actual Spend</p>
          <p className="text-2xl font-semibold">
            ${projectExpenseTotal.toLocaleString()}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {groupedBySection.map(({ section, expenses }) => {
          const sectionTotal = expenses.reduce(
            (sum, expense) => sum + expense.amount,
            0,
          );

          return (
            <Collapsible key={section.id} defaultOpen>
              <div className="rounded-lg border">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {expenses.length} expense{expenses.length > 1 ? "s" : ""} • $
                      {sectionTotal.toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight className="size-4 transition-transform data-[state=open]:rotate-90" />
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-3 border-t px-4 py-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <Link
                            href={`/app/${project.id}/items/${expense.itemId}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {expense.itemTitle}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {expense.date} • {expense.type}
                            {expense.vendor ? ` • ${expense.vendor}` : ""}
                          </p>
                          {expense.note ? (
                            <p className="text-xs text-muted-foreground">{expense.note}</p>
                          ) : null}
                        </div>
                        <p className="font-semibold">
                          ${expense.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {!groupedBySection.length ? (
          <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
        ) : null}
      </section>
    </div>
  );
}
