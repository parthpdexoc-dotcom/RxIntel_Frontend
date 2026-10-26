import React from "react";
import "./ColumnResizeHandle.css";

type ColumnResizeHandleProps = {
  columnKey: string;
  onResizeStart: (columnKey: string, currentWidth: number, clientX: number) => void;
  onReset: (columnKey: string) => void;
};

export default function ColumnResizeHandle({
  columnKey,
  onResizeStart,
  onReset,
}: ColumnResizeHandleProps) {
  const handlePointerDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const th = event.currentTarget.closest("th");
    const currentWidth = th?.getBoundingClientRect().width ?? 120;
    onResizeStart(columnKey, currentWidth, event.clientX);
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onReset(columnKey);
  };

  return (
    <span
      className="column-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize column ${columnKey}`}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
