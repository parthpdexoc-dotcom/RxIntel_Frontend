import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchCurrentTermsApi, saveCurrentTermsApi } from "../../service/TermsService";
import {
  hasSuperAdminRole,
  isAuthenticated,
} from "../../component/auth/authUtils";
import { useActionMessage } from "../../hooks/useActionMessage";
import { showSuccess } from "../../component/atoms/ToastHelper";
import { prepareTermsDocument } from "./termsPageShared";

export function useTermsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canEditTerms = isAuthenticated() && hasSuperAdminRole();

  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { actionMessage, showActionMessage, clearActionMessage } =
    useActionMessage();

  const { sections, html: displayHtml } = useMemo(
    () => prepareTermsDocument(content),
    [content]
  );

  const loadTerms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const terms = await fetchCurrentTermsApi();
      const next = terms?.content ?? "";
      setContent(next);
      setDraft(next);
      if (!next && !canEditTerms) {
        setError("Terms and Conditions are not available at this time.");
      }
    } catch {
      setError("Unable to load Terms and Conditions. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [canEditTerms]);

  useEffect(() => {
    void loadTerms();
  }, [loadTerms]);

  useEffect(() => {
    if (searchParams.get("edit") === "1" && canEditTerms && !loading) {
      setIsEditing(true);
    }
  }, [searchParams, canEditTerms, loading]);

  const startEdit = () => {
    setDraft(content);
    setIsEditing(true);
    navigate("/terms?edit=1", { replace: true });
  };

  const cancelEdit = () => {
    clearActionMessage();
    setDraft(content);
    setIsEditing(false);
    navigate("/terms", { replace: true });
  };

  const handleSave = async () => {
    clearActionMessage();
    const trimmed = draft.trim();
    if (!trimmed) {
      showActionMessage("Terms and Conditions content is required.");
      return;
    }

    setSaving(true);
    const result = await saveCurrentTermsApi({ content: trimmed });
    setSaving(false);

    if (!result.ok) {
      showActionMessage(result.message);
      return;
    }

    setContent(result.data.content);
    setDraft(result.data.content);
    setIsEditing(false);
    showSuccess("Terms and Conditions updated.");
    navigate("/terms", { replace: true });
  };

  return {
    canEditTerms,
    content,
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
  };
}
