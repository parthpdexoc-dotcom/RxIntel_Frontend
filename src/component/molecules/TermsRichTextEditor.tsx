import React, { useCallback, useEffect, useMemo, useRef } from "react";
import ReactQuill from "react-quill";
import Quill from "quill";
import "react-quill/dist/quill.snow.css";
import "./TermsRichTextEditor.css";

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

type TermsRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function TermsRichTextEditor({
  value,
  onChange,
  placeholder = "Enter terms content…",
  disabled = false,
}: TermsRichTextEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<ReactQuill>(null);
  const pinnedScrollTopRef = useRef<number | null>(null);
  const toolbarFormattingRef = useRef(false);
  const toolbarResetTimerRef = useRef<number | null>(null);

  const pinScrollPosition = useCallback(() => {
    const scrollEl = findScrollParent(wrapRef.current);
    if (scrollEl) {
      pinnedScrollTopRef.current = scrollEl.scrollTop;
    }
  }, []);

  const clearPinnedScroll = useCallback(() => {
    pinnedScrollTopRef.current = null;
    toolbarFormattingRef.current = false;
    if (toolbarResetTimerRef.current != null) {
      window.clearTimeout(toolbarResetTimerRef.current);
      toolbarResetTimerRef.current = null;
    }
  }, []);

  const restoreScrollPosition = useCallback(() => {
    const scrollEl = findScrollParent(wrapRef.current);
    const top = pinnedScrollTopRef.current;
    if (scrollEl != null && top != null) {
      scrollEl.scrollTop = top;
    }
    clearPinnedScroll();
  }, [clearPinnedScroll]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const toolbar = wrap.querySelector(".ql-toolbar");
    if (!toolbar) return;

    const scrollEl = findScrollParent(wrap);

    const onToolbarPointerDown = (e: Event) => {
      e.preventDefault();
      toolbarFormattingRef.current = true;
      pinScrollPosition();
      if (toolbarResetTimerRef.current != null) {
        window.clearTimeout(toolbarResetTimerRef.current);
      }
      toolbarResetTimerRef.current = window.setTimeout(() => {
        clearPinnedScroll();
      }, 600);
    };

    const onUserScroll = () => {
      const pinned = pinnedScrollTopRef.current;
      if (pinned == null || !scrollEl) return;
      if (Math.abs(scrollEl.scrollTop - pinned) > 8) {
        clearPinnedScroll();
      }
    };

    toolbar.addEventListener("mousedown", onToolbarPointerDown);
    scrollEl?.addEventListener("scroll", onUserScroll, { passive: true });

    let quill: Quill | null = null;
    let onTextChange: ((...args: unknown[]) => void) | null = null;

    const attachQuillHandlers = () => {
      quill = quillRef.current?.getEditor() ?? null;
      if (!quill || onTextChange) return;

      const toolbarModule = quill.getModule("toolbar") as {
        addHandler: (name: string, handler: (value: unknown) => void) => void;
        quill: Quill;
      } | null;

      toolbarModule?.addHandler("header", function (this: { quill: Quill }, value) {
        const editor = this.quill;
        const range = editor.getSelection(true);
        const headerValue =
          value === false || value === null || value === undefined ? false : value;

        editor.format("header", headerValue, Quill.sources.USER);
        if (headerValue === false) {
          editor.format("bold", false, Quill.sources.USER);
        }

        if (range) {
          editor.setSelection(range.index, range.length, Quill.sources.SILENT);
        }
      });

      onTextChange = (_delta, _old, source) => {
        if (source !== "user" || !toolbarFormattingRef.current) return;
        requestAnimationFrame(restoreScrollPosition);
        window.setTimeout(restoreScrollPosition, 0);
      };

      quill.on("text-change", onTextChange);
    };

    attachQuillHandlers();
    const attachTimer = window.setTimeout(attachQuillHandlers, 0);

    return () => {
      window.clearTimeout(attachTimer);
      toolbar.removeEventListener("mousedown", onToolbarPointerDown);
      scrollEl?.removeEventListener("scroll", onUserScroll);
      clearPinnedScroll();
      if (quill && onTextChange) {
        quill.off("text-change", onTextChange);
      }
    };
  }, [clearPinnedScroll, pinScrollPosition, restoreScrollPosition]);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link"],
        ["clean"],
      ],
      clipboard: { matchVisual: false },
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "list",
    "align",
    "link",
  ];

  return (
    <div className="terms-rich-editor" ref={wrapRef}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={disabled}
      />
    </div>
  );
}
