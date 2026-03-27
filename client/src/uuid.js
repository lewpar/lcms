// Use the native browser crypto API for UUID generation
export function v4() {
  return crypto.randomUUID();
}
