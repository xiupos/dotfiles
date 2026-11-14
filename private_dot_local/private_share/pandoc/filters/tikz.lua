-- tikz.lua -- ```tikz code blocks as figures.
--
--   ```{.tikz #fig:x caption="Markdown caption"}   -> numbered Figure
--   ::: {#fig:x}  ```tikz ... ```  caption paras :::  -> numbered Figure
--   ```tikz                                        -> unnumbered figure (legacy)
--
-- Figures are left to pandoc-crossref for numbering, so this filter must run
-- before it (and before unicode-math.lua, so that math in caption attributes
-- is converted too). Spec: vscode-extensions/tikz/SPEC.md in the dotfiles.

local function is_tikz(b)
  return b and b.t == "CodeBlock" and b.classes[1] == "tikz"
end

local function raw(text)
  return pandoc.RawBlock("latex", text)
end

local function figure(code, caption, id)
  return pandoc.Figure({ raw(code) }, { long = caption }, pandoc.Attr(id))
end

local div_pass = {
  Div = function(el)
    local c = el.content
    if not el.identifier:match("^fig:") or not is_tikz(c[1]) then
      return nil
    end
    local caption = pandoc.List()
    for i = 2, #c do
      caption:insert(c[i])
    end
    return figure(c[1].text, caption, el.identifier)
  end,
}

local code_pass = {
  CodeBlock = function(el)
    if not is_tikz(el) then
      return nil
    end
    local cap = el.attributes["caption"]
    if el.identifier == "" and not cap then
      return raw("\\begin{figure}\n\\centering\n" .. el.text .. "\n\\end{figure}")
    end
    local long = cap and pandoc.read(cap, "markdown").blocks or {}
    return figure(el.text, long, el.identifier)
  end,
}

return { div_pass, code_pass }
