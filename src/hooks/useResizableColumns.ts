import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export const DEFAULT_COLUMN_MIN_WIDTH = 64;

type ResizeSession = {
  key: string;
  startX: number;
  startWidth: number;
  /** Natural/default width captured before the user first widened this column. */
  floorWidth: number;
};

export type UseResizableColumnsOptions = {
  minWidth?: number;
};

export function useResizableColumns(options?: UseResizableColumnsOptions) {
  const minWidth = options?.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH;
  const [widths, setWidths] = useState<Record<string, number>>({});
  const sessionRef = useRef<ResizeSession | null>(null);
  /** Per-column original width; resize cannot go below this. */
  const floorWidthsRef = useRef<Record<string, number>>({});

  const getColumnStyle = useCallback(
    (key: string): CSSProperties | undefined => {
      const width = widths[key];
      if (width == null) return undefined;
      return {
        width,
        minWidth: width,
        maxWidth: width,
      };
    },
    [widths]
  );

  const resetColumn = useCallback((key: string) => {
    delete floorWidthsRef.current[key];
    setWidths((prev) => {
      if (prev[key] == null) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const beginResize = useCallback(
    (key: string, currentWidth: number, clientX: number) => {
      const measured = Math.max(minWidth, Math.round(currentWidth));
      // First drag on this column: current rendered width is the floor.
      if (floorWidthsRef.current[key] == null) {
        floorWidthsRef.current[key] = measured;
      }
      const floorWidth = floorWidthsRef.current[key];

      sessionRef.current = {
        key,
        startX: clientX,
        startWidth: Math.max(floorWidth, measured),
        floorWidth,
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [minWidth]
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) return;
      const delta = event.clientX - session.startX;
      const nextWidth = Math.max(
        session.floorWidth,
        Math.round(session.startWidth + delta)
      );
      setWidths((prev) => {
        if (prev[session.key] === nextWidth) return prev;
        return { ...prev, [session.key]: nextWidth };
      });
    };

    const endResize = () => {
      if (!sessionRef.current) return;
      sessionRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endResize);
    window.addEventListener("pointercancel", endResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endResize);
      window.removeEventListener("pointercancel", endResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return {
    widths,
    getColumnStyle,
    beginResize,
    resetColumn,
    minWidth,
  };
}
