import type { ElectrobunConfig } from "electrobun/bun";
import { existsSync } from "node:fs";
import path from "node:path";
import type { BunPlugin } from "bun";

const srcRoot = path.resolve(import.meta.dirname, "src");
const resolvableExtensions = ["", ".ts", ".tsx", ".js", ".jsx", ".json"];

function resolveSrcAlias(importPath: string) {
  const basePath = path.join(srcRoot, importPath.slice(2));

  for (const extension of resolvableExtensions) {
    const candidate = `${basePath}${extension}`;
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return basePath;
}

const srcAliasPlugin: BunPlugin = {
  name: "note-src-alias",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => ({
      path: resolveSrcAlias(args.path)
    }));
  }
};

const config: ElectrobunConfig = {
  app: {
    name: "Note",
    identifier: "dev.ll3.note",
    version: "0.1.0",
    description: "Block note app prototype",
  },
  runtime: {
    exitOnLastWindowClosed: false,
  },
  build: {
    buildFolder: "build",
    artifactFolder: "artifacts",
    bun: {
      entrypoint: "src/bun/index.ts",
      plugins: [srcAliasPlugin],
    },
    copy: {
      "dist/mainview": "views/mainview",
    },
    mac: {
      codesign: false,
      createDmg: false,
    },
  },
};

export default config;
