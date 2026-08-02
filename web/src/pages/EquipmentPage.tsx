import { useEffect, useState } from "react";
import { useGymId } from "../context/AuthContext";
import { createEquipment, deleteEquipment, listEquipment, updateEquipmentCondition } from "../firestore/equipment";
import type { Equipment, EquipmentCondition } from "../firestore/types";
import { Button, EmptyState, ErrorText, Icon, Input, ListRow, Modal, PageHeader, PageSpinner, StatusPill } from "../components/ui";

const CONDITION_LABEL: Record<EquipmentCondition, string> = {
  good: "Good",
  needs_repair: "Needs repair",
  needs_replacement: "Needs replacement",
};

const CONDITION_PILL: Record<EquipmentCondition, "active" | "neutral" | "error"> = {
  good: "active",
  needs_repair: "neutral",
  needs_replacement: "error",
};

export default function EquipmentPage() {
  const gymId = useGymId();
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [condition, setCondition] = useState<EquipmentCondition>("good");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listEquipment(gymId)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(load, [gymId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Enter an equipment name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEquipment(gymId, {
        name: name.trim(),
        purchaseDate: purchaseDate || undefined,
        condition,
        notes: notes || undefined,
      });
      setModalOpen(false);
      setName("");
      setPurchaseDate("");
      setCondition("good");
      setNotes("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleConditionChange = async (equipmentId: string, next: EquipmentCondition) => {
    await updateEquipmentCondition(gymId, equipmentId, next);
    load();
  };

  const handleDelete = async (equipmentId: string) => {
    await deleteEquipment(gymId, equipmentId);
    load();
  };

  const needsAttention = items.filter((i) => i.condition !== "good").length;

  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle={needsAttention > 0 ? `${needsAttention} item${needsAttention === 1 ? "" : "s"} need attention` : undefined}
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Icon name="add" className="!text-lg" />
            Add equipment
          </Button>
        }
      />

      {loading && <PageSpinner />}
      {!loading && items.length === 0 && <EmptyState>No equipment tracked yet.</EmptyState>}

      <div className="flex flex-col gap-sm">
        {items.map((item) => (
          <ListRow key={item.id} className="flex items-center justify-between gap-md">
            <div className="min-w-0">
              <p className="font-headline text-headline-sm font-semibold text-on-surface truncate">{item.name}</p>
              <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
                {item.purchaseDate ? `Bought ${item.purchaseDate}` : "Purchase date unknown"}
                {item.notes ? ` · ${item.notes}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-sm shrink-0">
              <select
                value={item.condition}
                onChange={(e) => handleConditionChange(item.id, e.target.value as EquipmentCondition)}
                className="rounded-lg border border-outline-variant bg-surface-container-low px-sm py-xs font-label-sm text-label-sm text-on-surface outline-none"
              >
                {(Object.keys(CONDITION_LABEL) as EquipmentCondition[]).map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABEL[c]}
                  </option>
                ))}
              </select>
              <StatusPill variant={CONDITION_PILL[item.condition]}>{CONDITION_LABEL[item.condition]}</StatusPill>
              <button onClick={() => handleDelete(item.id)} className="text-on-surface-variant hover:text-error transition-colors p-xs">
                <Icon name="delete" className="!text-lg" />
              </button>
            </div>
          </ListRow>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add equipment">
        <Input label="Name" placeholder="e.g. Treadmill #3" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Purchase date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        <label className="mb-md block">
          <span className="mb-xs block font-label-md text-label-md text-on-surface">Condition</span>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as EquipmentCondition)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm text-on-surface outline-none"
          >
            {(Object.keys(CONDITION_LABEL) as EquipmentCondition[]).map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

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
