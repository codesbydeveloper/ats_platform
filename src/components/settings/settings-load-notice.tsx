/** Shown when GET /api/settings failed; form stays editable below. */
export function SettingsLoadNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100"
    >
      Could not load saved settings ({message}). Fill in the fields below and
      save — your values will be sent to the server when it is available.
    </p>
  );
}
