export function formatCursorAgentErrorForUser(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("resource_exhausted")) {
    return "Cursor usage or quota limit (resource_exhausted). Try another model, wait a few minutes, or check usage at cursor.com/dashboard.";
  }
  return raw;
}
