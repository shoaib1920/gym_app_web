import { addDoc, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { expensesCol } from "./paths";
import type { Expense } from "./types";

export interface CreateExpenseInput {
  category: string;
  amountCents: number;
  description?: string;
  date: string;
}

export async function listExpenses(gymId: string): Promise<Expense[]> {
  const snap = await getDocs(query(expensesCol(gymId), orderBy("date", "desc")));
  return snap.docs.map((d) => ({
    id: d.id,
    category: d.data().category,
    amountCents: d.data().amountCents,
    description: d.data().description ?? null,
    date: d.data().date,
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  }));
}

export async function createExpense(gymId: string, input: CreateExpenseInput): Promise<string> {
  const docRef = await addDoc(expensesCol(gymId), {
    category: input.category,
    amountCents: input.amountCents,
    description: input.description ?? null,
    date: input.date,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteExpense(gymId: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(expensesCol(gymId), expenseId));
}
