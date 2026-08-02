import { addDoc, deleteDoc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { equipmentCol, equipmentRef } from "./paths";
import type { Equipment, EquipmentCondition } from "./types";

export interface CreateEquipmentInput {
  name: string;
  purchaseDate?: string;
  condition: EquipmentCondition;
  notes?: string;
}

export async function listEquipment(gymId: string): Promise<Equipment[]> {
  const snap = await getDocs(query(equipmentCol(gymId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    purchaseDate: d.data().purchaseDate ?? null,
    condition: d.data().condition,
    notes: d.data().notes ?? null,
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  }));
}

export async function createEquipment(gymId: string, input: CreateEquipmentInput): Promise<string> {
  const docRef = await addDoc(equipmentCol(gymId), {
    name: input.name,
    purchaseDate: input.purchaseDate ?? null,
    condition: input.condition,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateEquipmentCondition(gymId: string, equipmentId: string, condition: EquipmentCondition): Promise<void> {
  await updateDoc(equipmentRef(gymId, equipmentId), { condition });
}

export async function deleteEquipment(gymId: string, equipmentId: string): Promise<void> {
  await deleteDoc(equipmentRef(gymId, equipmentId));
}
