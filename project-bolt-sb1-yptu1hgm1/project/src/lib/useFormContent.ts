import { useContext } from "react";
import { FormContentContext } from "./formContentContext";

export function useFormContent() {
  const context = useContext(FormContentContext);
  if (!context) throw new Error("useFormContent must be used within FormContentProvider.");
  return context;
}
