-- tikz.lua -- ```tikz code blocks as figures.
--
--   ```{.tikz #fig:x caption="Markdown caption"}   -> numbered Figure
--   ```tikz                                        -> unnumbered figure (legacy)
--
-- Figures are left to pandoc-crossref for numbering, so this filter must run
-- before it (and before unicode-math.lua, so that math in caption attributes
-- is converted too). The code itself is raw LaTeX, which unicode-math.lua does
-- not see, so its Unicode symbols are converted here with the same table
-- (unicode-math.lua next to this file). Spec: vscode-extensions/pandoc-preview/README.md
-- in the dotfiles.

local function raw(text)
  return pandoc.RawBlock("latex", text)
end

-- The Math function of unicode-math.lua, loaded in its own environment.
local unicode_math = (function()
  local env = setmetatable({}, { __index = _G })
  local file = pandoc.path.join({ pandoc.path.directory(PANDOC_SCRIPT_FILE), "unicode-math.lua" })
  assert(loadfile(file, "t", env))()
  return env.Math
end)()

local function convert(code)
  return unicode_math(pandoc.Math("InlineMath", code)).text
end

function CodeBlock(el)
  if el.classes[1] ~= "tikz" then
    return nil
  end
  local code = convert(el.text)
  local cap = el.attributes["caption"]
  if el.identifier == "" and not cap then
    return raw("\\begin{figure}\n\\centering\n" .. code .. "\n\\end{figure}")
  end
  local long = cap and pandoc.read(cap, "markdown").blocks or {}
  return pandoc.Figure({ raw(code) }, { long = long }, pandoc.Attr(el.identifier))
end
