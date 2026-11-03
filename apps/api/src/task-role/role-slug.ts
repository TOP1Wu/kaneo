import { createId } from "@paralleldrive/cuid2";

// Role names are often Chinese, which slugifies to nothing, so fall back to a
// short random suffix. Slugs only need to be unique within the workspace.
export function roleSlug(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `${base || "role"}-${createId().slice(0, 6)}`;
}
