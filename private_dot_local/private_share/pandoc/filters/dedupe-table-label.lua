-- pandoc-crossref already puts \label in the table caption, and pandoc's
-- LaTeX writer adds another one from the table identifier; drop the latter.
function Table(tbl)
  if tbl.identifier ~= '' then
    local found = false
    pandoc.walk_block(pandoc.Div(tbl.caption.long), {
      RawInline = function(r)
        if r.format == 'latex' and r.text:find('\\label{' .. tbl.identifier .. '}', 1, true) then
          found = true
        end
      end
    })
    if found then tbl.identifier = '' end
    return tbl
  end
end
