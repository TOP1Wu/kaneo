type TreeUnit = {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
};

export type FlatTreeRow<T> = { unit: T; depth: number };

function children<T extends TreeUnit>(
  units: readonly T[],
  parentId: string | null,
) {
  return units
    .filter((unit) => unit.parentId === parentId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

/**
 * The tree flattened depth-first for rendering. A unit whose parent is
 * missing is treated as a root so a stale list never hides it.
 */
export function flattenOrgTree<T extends TreeUnit>(
  units: readonly T[],
): FlatTreeRow<T>[] {
  const ids = new Set(units.map((unit) => unit.id));
  const normalized = units.map((unit) =>
    unit.parentId && !ids.has(unit.parentId)
      ? { ...unit, parentId: null }
      : unit,
  );
  const rows: FlatTreeRow<T>[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const unit of children(normalized, parentId)) {
      if (seen.has(unit.id)) continue;
      seen.add(unit.id);
      rows.push({ unit: unit as T, depth });
      walk(unit.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

/** The unit and every descendant: none of them can become its parent. */
export function subtreeIds(
  units: readonly TreeUnit[],
  rootId: string,
): Set<string> {
  const result = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const unit of units) {
      if (unit.parentId && result.has(unit.parentId) && !result.has(unit.id)) {
        result.add(unit.id);
        grew = true;
      }
    }
  }
  return result;
}
