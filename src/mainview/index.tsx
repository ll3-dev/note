import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@/mainview/app/providers";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>
);
