import { figurePlugin, MarkdownIt } from "./figure";

export function activate() {
  return {
    extendMarkdownIt(md: MarkdownIt) {
      figurePlugin(md);
      return md;
    },
  };
}

export function deactivate(): void {}
