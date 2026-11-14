-- tikz.lua -- ```tikz code blocks as figures.
--
--   ```{.tikz #fig:x caption="Markdown caption"}   -> numbered Figure
--   ```tikz                                        -> unnumbered figure (legacy)
--
-- Figures are left to pandoc-crossref for numbering, so this filter must run
-- before it (and before unicode-math.lua, so that math in caption attributes
-- is converted too). Spec: vscode-extensions/tikz/SPEC.md in the dotfiles.

local function raw(text)
  return pandoc.RawBlock("latex", text)
end

function CodeBlock(el)
  if el.classes[1] ~= "tikz" then
    return nil
  end
  local cap = el.attributes["caption"]
  if el.identifier == "" and not cap then
    return raw("\\begin{figure}\n\\centering\n" .. el.text .. "\n\\end{figure}")
  end
  local long = cap and pandoc.read(cap, "markdown").blocks or {}
  return pandoc.Figure({ raw(el.text) }, { long = long }, pandoc.Attr(el.identifier))
end
