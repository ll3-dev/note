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
  "base-uri 'none'",
  "frame-ancestors 'none'"
];

const DEV_CONNECT_SRC = [
  "connect-src 'self'",
  "http://127.0.0.1:*",
  "ws://127.0.0.1:*",
  "http://localhost:*",
  "ws://localhost:*",
  "http://[::1]:*",
  "ws://[::1]:*"
].join(" ");

const PROD_CONNECT_SRC = "connect-src 'self'";

function contentSecurityPolicy(command: "build" | "serve") {
  return [
    ...BASE_CSP_DIRECTIVES,
    command === "serve" ? DEV_CONNECT_SRC : PROD_CONNECT_SRC
  ].join("; ");
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
