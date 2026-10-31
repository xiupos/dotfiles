-- Insert a space after every citation/cross-reference ([@...]) when it is
-- directly followed by text, e.g. `表は[@tbl:x]のように` -> `表は[@tbl:x] のように`
-- and `作用([@eq:x])に` -> `作用([@eq:x]) に`. Closing parentheses right after
-- the reference stay attached; nothing is inserted before punctuation.
-- Must run before pandoc-crossref and citeproc.

local punct = { '、', '。', '，', '．', '）', '」', '』' }

local function no_space_before(c)
  if c:match('^[%.,;:!%?%)%]]') then return true end
  for _, p in ipairs(punct) do
    if c:sub(1, #p) == p then return true end
  end
  return false
end

function Inlines(inlines)
  for i = #inlines - 1, 1, -1 do
    local next = inlines[i + 1]
    if inlines[i].t == 'Cite' and next.t == 'Str' then
      local closing, rest = next.text:match('^(%)*)(.*)$')
      if rest ~= '' and not no_space_before(rest) then
        local new = { pandoc.Space(), pandoc.Str(rest) }
        if closing ~= '' then table.insert(new, 1, pandoc.Str(closing)) end
        inlines:remove(i + 1)
        for j = #new, 1, -1 do inlines:insert(i + 1, new[j]) end
      end
    end
  end
  return inlines
end
