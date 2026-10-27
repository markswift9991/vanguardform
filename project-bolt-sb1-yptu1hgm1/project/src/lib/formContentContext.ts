import { createContext } from "react";

export interface FormContentContextValue {
  content: Record<string, string>;
  text: (fallback: string) => string;
  setContent: (content: Record<string, string>) => void;
}

export const FormContentContext = createContext<FormContentContextValue | null>(null);
