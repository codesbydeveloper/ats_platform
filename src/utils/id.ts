export function createTeacherId(existing: { id: string }[]) {
  const nums = existing
    .map((t) => parseInt(t.id.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `TCH-${String(next).padStart(5, "0")}`;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
