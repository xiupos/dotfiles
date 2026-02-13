function CodeBlock(el)
  if el.classes[1] == "tikz" then
    body = table.concat({
      "\\begin{figure}",
      "\\centering",
      el.text,
      "\\end{figure}",
    }, "\n")
    return pandoc.RawBlock("latex", body)
  end
  return el
end
