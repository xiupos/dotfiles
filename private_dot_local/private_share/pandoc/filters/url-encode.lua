function Link(el)
  local encoded_url = el.target:gsub("([^A-Za-z0-9_%%%-+~#./:=?&])", function(c)
    return string.format("%%%02X", string.byte(c))
  end)

  if FORMAT:match('latex') or FORMAT:match('beamer') then
    local result = {}
    table.insert(result, pandoc.RawInline('latex', '\\href{' .. encoded_url .. '}{'))

    for _, inline in ipairs(el.content) do
      table.insert(result, inline)
    end

    table.insert(result, pandoc.RawInline('latex', '}'))
    return result
  end

  el.target = encoded_url
  return el
end
