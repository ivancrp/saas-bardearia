import type { SlotsByDay, TimeSlot } from "./types";

const OPEN_HOUR = 9;
const CLOSE_HOUR = 19;
const DAYS_AHEAD = 7;

export function buildAvailableSlots(): SlotsByDay[] {
  const slots: TimeSlot[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const base = new Date(today);
    base.setDate(today.getDate() + d);

    for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
      for (const m of [0, 30]) {
        const dt = new Date(base);
        dt.setHours(h, m, 0, 0);
        if (dt < now) continue;

        slots.push({
          date: dt,
          timeLabel: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          iso: dt.toISOString(),
        });
      }
    }
  }

  const grouped = new Map<string, SlotsByDay>();

  for (const slot of slots) {
    const key = slot.date.toISOString().slice(0, 10);
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: slot.date.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        }),
        slots: [],
      });
    }
    grouped.get(key)!.slots.push(slot);
  }

  return Array.from(grouped.values());
}
