import type { ElectrobunConfig } from "electrobun/bun";

const config: ElectrobunConfig = {
  app: {
    name: "Note",
    identifier: "dev.ll3.note",
    version: "0.1.0",
    description: "Block note app prototype",
  },
  build: {
    buildFolder: "build",
    artifactFolder: "artifacts",
    bun: {
      entrypoint: "src/bun/index.ts",
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
