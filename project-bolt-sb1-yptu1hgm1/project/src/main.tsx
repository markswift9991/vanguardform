import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { FormContentProvider } from "./lib/FormContentProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FormContentProvider>
      <App />
    </FormContentProvider>
  </React.StrictMode>,
);