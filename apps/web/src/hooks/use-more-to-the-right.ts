import { useLayoutEffect, useState } from "react";

/**
 * Whether a horizontal scroller still has content past its right edge, so a
 * fade can hint at more columns and disappear once the user reaches the end.
 * Pass whatever changes the content width (for example the column count).
 * The ref is a callback so a remounted scroller (after a loading state) is
 * observed again even when `contentKey` did not change.
 */
export function useMoreToTheRight<T extends HTMLElement>(contentKey: unknown) {
  const [element, setElement] = useState<T | null>(null);
  const [more, setMore] = useState(false);

  useLayoutEffect(() => {
    if (!element) return;
    const measure = () =>
      // 1px slack absorbs sub-pixel widths at non-integer zoom levels.
      setMore(
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      );
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    if (typeof ResizeObserver === "undefined") {
      return () => element.removeEventListener("scroll", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [element, contentKey]);

  return { ref: setElement, more };
}
