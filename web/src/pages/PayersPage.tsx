import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { listPayers, createPayer } from "../firestore/payers";
import type { Payer } from "../firestore/types";
import { Button, EmptyState, ErrorText, Icon, Input, ListRow, Modal, PageHeader, PageSpinner } from "../components/ui";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PayersPage() {
  const gymId = useGymId();
  const navigate = useNavigate();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listPayers(gymId)
      .then(setPayers)
      .finally(() => setLoading(false));
  };

  useEffect(load, [gymId]);

  const handleCreate = async () => {
    if (!fullName.trim() || !EMAIL_REGEX.test(email)) {
      setError("Enter a name and a valid email.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payerId = await createPayer(gymId, { fullName: fullName.trim(), email, phone: phone || undefined });
      setModalOpen(false);
      setFullName("");
      setEmail("");
      setPhone("");
      navigate(`/payers/${payerId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Payers and billing"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Icon name="add" className="!text-lg" />
            New payer
          </Button>
        }
      />

      {loading && <PageSpinner />}
      {!loading && payers.length === 0 && <EmptyState>No payers yet.</EmptyState>}

      <div className="flex flex-col gap-sm">
        {payers.map((p) => (
          <Link key={p.id} to={`/payers/${p.id}`}>
            <ListRow>
              <p className="font-headline text-headline-sm font-semibold text-on-surface">{p.fullName}</p>
              <p className="mt-0.5 font-label-md text-label-md text-on-surface-variant">{p.email}</p>
            </ListRow>
          </Link>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Payer">
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <ErrorText>{error}</ErrorText>

        <div className="mt-2 flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button fullWidth loading={saving} onClick={handleCreate}>
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
