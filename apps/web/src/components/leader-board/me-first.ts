/** Moves the signed-in person's column to the front, others keep API order. */
export function meFirst<T extends { userId: string }>(
  people: readonly T[],
  meId: string | undefined,
): T[] {
  const me = people.find((person) => person.userId === meId);
  if (!me) return [...people];
  return [me, ...people.filter((person) => person !== me)];
}
