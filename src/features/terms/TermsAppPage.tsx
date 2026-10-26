import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button, Typography } from "@mui/material";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import { ModalActionMessage } from "../../component/atoms/CommonModal";
import GradientButton from "../../component/atoms/GradientButton";
import TermsContentView from "../../component/molecules/TermsContentView";
import TermsRichTextEditor from "../../component/molecules/TermsRichTextEditor";
import { FaFileContract } from "react-icons/fa";
import { useTermsPage } from "./useTermsPage";
import {
  findActiveSectionInScrollContainer,
  scrollToSectionInContainer,
} from "./termsScroll";
import "../../styles/pageCardTheme.css";
import "./Terms.css";

export default function TermsAppPage() {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedSectionRef = useRef<string | null>(null);
  const pinClearTimerRef = useRef<number | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const {
    canEditTerms,
    draft,
    setDraft,
    isEditing,
    loading,
    saving,
    error,
    actionMessage,
    sections,
    displayHtml,
    startEdit,
    cancelEdit,
    handleSave,
  } = useTermsPage();

  const syncActiveFromScroll = useCallback(() => {
    const root = scrollRef.current;
    if (!root || sections.length === 0) return;

    if (pinnedSectionRef.current) {
      setActiveSection(pinnedSectionRef.current);
      return;
    }

    const id = findActiveSectionInScrollContainer(
      root,
      sections.map((s) => s.id)
    );
    if (id) setActiveSection(id);
  }, [sections]);

  const scrollToSection = useCallback((sectionId: string) => {
    const root = scrollRef.current;
    if (!root) return;

    pinnedSectionRef.current = sectionId;
    setActiveSection(sectionId);

    if (pinClearTimerRef.current != null) {
      window.clearTimeout(pinClearTimerRef.current);
    }

    const releasePin = () => {
      pinnedSectionRef.current = null;
      pinClearTimerRef.current = null;
      syncActiveFromScroll();
    };

    const onScrollEnd = () => {
      root.removeEventListener("scrollend", onScrollEnd);
      releasePin();
    };

    if ("onscrollend" in root) {
      root.addEventListener("scrollend", onScrollEnd, { once: true });
    }
    pinClearTimerRef.current = window.setTimeout(() => {
      root.removeEventListener("scrollend", onScrollEnd);
      releasePin();
    }, 1200);

    if (scrollToSectionInContainer(root, sectionId)) {
      window.history.replaceState(null, "", `#${sectionId}`);
    }
  }, [syncActiveFromScroll]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (isEditing || loading || !displayHtml) return;
    const hash = location.hash.replace(/^#/, "");
    if (!hash) return;
    window.scrollTo(0, 0);
    const timer = window.setTimeout(() => scrollToSection(hash), 50);
    return () => window.clearTimeout(timer);
  }, [displayHtml, isEditing, loading, location.hash, scrollToSection]);

  useEffect(() => {
    if (isEditing || loading || sections.length === 0) return;
    syncActiveFromScroll();
  }, [displayHtml, isEditing, loading, sections, syncActiveFromScroll]);

  useEffect(() => {
    if (isEditing || loading || sections.length === 0) return;
    const root = scrollRef.current;
    if (!root) return;

    let raf = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(syncActiveFromScroll);
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(raf);
      if (pinClearTimerRef.current != null) {
        window.clearTimeout(pinClearTimerRef.current);
      }
    };
  }, [displayHtml, isEditing, loading, sections, syncActiveFromScroll]);

  const editAction =
    canEditTerms && !isEditing && !loading ? (
      <Button
        type="button"
        variant="outlined"
        className="terms-app-edit-btn"
        onClick={startEdit}
      >
        Edit
      </Button>
    ) : null;

  return (
    <div
      className={`page-card terms-app-page${isEditing ? " terms-app-page--editing" : ""}`}
    >
      <header className="terms-app-header">
        <PageCardHeader
          icon={<FaFileContract />}
          title="Terms and Conditions"
          actions={editAction}
        />
      </header>

      <div className="terms-app-body">
        {!isEditing && sections.length > 0 ? (
          <aside className="terms-app-toc" aria-label="On this page">
            <Typography component="p" className="terms-app-toc-title">
              On this page
            </Typography>
            <ul className="terms-app-toc-list">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className={
                      activeSection === section.id
                        ? "terms-app-toc-link terms-app-toc-link-active"
                        : "terms-app-toc-link"
                    }
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <div ref={scrollRef} className="terms-app-scroll">
          <div className="terms-app-main">
            {loading ? (
              <Typography className="terms-app-status" role="status">
                Loading…
              </Typography>
            ) : isEditing ? (
              <>
                <Typography className="terms-app-edit-hint" component="p">
                  Use the toolbar to format headings, paragraphs, and lists. You
                  do not need to type HTML tags.
                </Typography>
                <TermsRichTextEditor
                  value={draft}
                  onChange={setDraft}
                  disabled={saving}
                />
                <ModalActionMessage message={actionMessage} />
                <div className="terms-app-edit-actions">
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <GradientButton
                    type="button"
                    loading={saving}
                    loadingLabel="Saving…"
                    onClick={handleSave}
                  >
                    Save changes
                  </GradientButton>
                </div>
              </>
            ) : error ? (
              <Typography className="terms-app-error" role="alert">
                {error}
              </Typography>
            ) : (
              <TermsContentView html={displayHtml} className="terms-app-content" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
