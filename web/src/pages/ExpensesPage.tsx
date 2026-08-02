import { useEffect, useState } from "react";
import { useGymId } from "../context/AuthContext";
import { createExpense, deleteExpense, listExpenses } from "../firestore/expenses";
import type { Expense } from "../firestore/types";
import { Button, EmptyState, ErrorText, Icon, Input, ListRow, Modal, PageHeader, PageSpinner } from "../components/ui";

const CATEGORIES = ["Rent", "Utilities", "Equipment", "Staff", "Maintenance", "Marketing", "Other"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const gymId = useGymId();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listExpenses(gymId)
      .then(setExpenses)
      .finally(() => setLoading(false));
  };

  useEffect(load, [gymId]);

  const thisMonthTotal = expenses
    .filter((e) => e.date.slice(0, 7) === todayIso().slice(0, 7))
    .reduce((sum, e) => sum + e.amountCents, 0);

  const handleCreate = async () => {
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createExpense(gymId, { category, amountCents, date, description: description || undefined });
      setModalOpen(false);
      setAmount("");
      setDescription("");
      setDate(todayIso());
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(gymId, id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`$${(thisMonthTotal / 100).toFixed(2)} spent this month`}
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Icon name="add" className="!text-lg" />
            Add expense
          </Button>
        }
      />

      {loading && <PageSpinner />}
      {!loading && expenses.length === 0 && <EmptyState>No expenses recorded yet.</EmptyState>}

      <div className="flex flex-col gap-sm">
        {expenses.map((e) => (
          <ListRow key={e.id} className="flex items-center justify-between gap-md">
            <div className="min-w-0">
              <p className="font-headline text-headline-sm font-semibold text-on-surface">{e.category}</p>
              <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant truncate">
                {e.date}
                {e.description ? ` · ${e.description}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-sm shrink-0">
              <p className="font-headline text-headline-sm font-bold text-primary-container">${(e.amountCents / 100).toFixed(2)}</p>
              <button onClick={() => handleDelete(e.id)} className="text-on-surface-variant hover:text-error transition-colors p-xs">
                <Icon name="delete" className="!text-lg" />
              </button>
            </div>
          </ListRow>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add expense">
        <label className="mb-md block">
          <span className="mb-xs block font-label-md text-label-md text-on-surface">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <Input label="Amount (e.g. 49.99)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

        <ErrorText>{error}</ErrorText>

        <div className="mt-2 flex gap-md">
          <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button fullWidth loading={saving} onClick={handleCreate}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
