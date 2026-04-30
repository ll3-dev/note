import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const BASE_CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'"
];

const DEV_CONNECT_SRC = [
  "connect-src 'self'",
  "http://127.0.0.1:*",
  "ws://127.0.0.1:*",
  "http://localhost:*",
  "ws://localhost:*"
].join(" ");

const PROD_CONNECT_SRC = "connect-src 'self'";

function contentSecurityPolicy(command: "build" | "serve") {
  const directives = [...BASE_CSP_DIRECTIVES];

  if (command === "serve") {
    directives[1] = "script-src 'self' 'unsafe-inline'";
    directives.push(DEV_CONNECT_SRC);
  } else {
    directives.push(PROD_CONNECT_SRC);
  }

  return directives.join("; ");
}

export default defineConfig(({ command }) => ({
  root: "src/mainview",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "note-csp",
      transformIndexHtml() {
        return [
          {
            attrs: {
              content: contentSecurityPolicy(command),
              "http-equiv": "Content-Security-Policy"
            },
            injectTo: "head-prepend",
            tag: "meta"
          }
        ];
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src")
    }
  },
  build: {
    outDir: "../../dist/mainview",
    emptyOutDir: true
  }
}));
