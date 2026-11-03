import type { LeaderBoardCard } from "@/fetchers/leader-board/get-leader-board";

/** True when every role this person holds on the card is done. */
export function isCardDone(card: Pick<LeaderBoardCard, "myRoles">): boolean {
  return (
    card.myRoles.length > 0 &&
    card.myRoles.every((role) => role.progress === "done")
  );
}

/**
 * Open cards first, finished ones last. The API already sorts this way; the
 * stable re-sort keeps the order right for role-less rows it can't see here.
 */
export function openCardsFirst<T extends Pick<LeaderBoardCard, "myRoles">>(
  cards: readonly T[],
): T[] {
  return [...cards].sort(
    (a, b) => Number(isCardDone(a)) - Number(isCardDone(b)),
  );
}
