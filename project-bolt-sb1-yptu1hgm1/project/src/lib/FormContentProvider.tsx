import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest } from "./api";
import { FormContentContext } from "./formContentContext";
import { DEFAULT_FORM_CONTENT } from "./formContentDefaults";

export function FormContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(DEFAULT_FORM_CONTENT);

  useEffect(() => {
    let active = true;
    void apiRequest<Record<string, unknown>>("/api/form-content")
      .then((saved) => {
        if (!active) return;
        const safeContent = { ...DEFAULT_FORM_CONTENT };
        for (const key of Object.keys(DEFAULT_FORM_CONTENT)) {
          if (typeof saved[key] === "string") safeContent[key] = saved[key];
        }
        setContent(safeContent);
      })
      .catch((error: unknown) => {
        console.error("Could not load published form content; displaying built-in text.", error);
      });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    content,
    text: (fallback: string) => content[fallback] ?? fallback,
    setContent,
  }), [content]);

  return <FormContentContext.Provider value={value}>{children}</FormContentContext.Provider>;
}
