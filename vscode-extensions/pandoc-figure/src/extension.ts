import { figurePlugin } from "./figure.ts";

export function activate() {
  return {
    extendMarkdownIt(md: any) {
      figurePlugin(md);
      return md;
    },
  };
}

export function deactivate(): void {}
