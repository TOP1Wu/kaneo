export type OrgUnitLink = { id: string; parentId: string | null };

/**
 * Ids of the given units and all of their descendants. Walks breadth-first and
 * tracks visited ids, so a corrupted cycle in stored data cannot loop forever.
 */
export function collectSubtreeIds(
  units: readonly OrgUnitLink[],
  rootIds: readonly string[],
): Set<string> {
  const children = new Map<string, string[]>();
  for (const unit of units) {
    if (!unit.parentId) continue;
    const siblings = children.get(unit.parentId) ?? [];
    siblings.push(unit.id);
    children.set(unit.parentId, siblings);
  }

  const known = new Set(units.map((unit) => unit.id));
  const visited = new Set<string>();
  const queue = rootIds.filter((id) => known.has(id));
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (visited.has(id)) continue;
    visited.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return visited;
}

/** True when moving `unitId` under `newParentId` would make it its own ancestor. */
export function wouldCreateCycle(
  units: readonly OrgUnitLink[],
  unitId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === null) return false;
  return collectSubtreeIds(units, [unitId]).has(newParentId);
}
