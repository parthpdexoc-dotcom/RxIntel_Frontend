import { useCallback, useState } from "react";

export function useActionMessage() {
  const [actionMessage, setActionMessage] = useState("");

  const clearActionMessage = useCallback(() => setActionMessage(""), []);

  const showActionMessage = useCallback((message?: string | null) => {
    if (message) setActionMessage(message);
  }, []);

  return {
    actionMessage,
    clearActionMessage,
    showActionMessage,
  };
}
