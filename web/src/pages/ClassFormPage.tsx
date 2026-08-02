import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGymId } from "../context/AuthContext";
import { createClass } from "../firestore/classes";
import { Button, Card, ErrorText, Icon, Input, PageHeader } from "../components/ui";

export default function ClassFormPage() {
  const gymId = useGymId();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [capacity, setCapacity] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const startsAtDate = new Date(startsAt);
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }
    if (Number.isNaN(startsAtDate.getTime())) {
      setError("Enter a valid start date/time.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createClass(gymId, {
        name: name.trim(),
        trainerName: trainerName || undefined,
        startsAt: startsAtDate.toISOString(),
        durationMinutes: parseInt(duration, 10),
        capacity: parseInt(capacity, 10),
      });
      navigate("/classes");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[32rem] mx-auto">
      <PageHeader title="New class" />

      <Card>
        <Input label="Class name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Trainer" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} />
        <Input label="Starts at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <Input label="Duration (minutes)" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <Input label="Capacity" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </Card>

      <ErrorText>{error}</ErrorText>

      <Button fullWidth className="mt-lg" loading={saving} onClick={handleSave}>
        <Icon name="event_note" className="!text-lg" />
        Create class
      </Button>
    </div>
  );
}
