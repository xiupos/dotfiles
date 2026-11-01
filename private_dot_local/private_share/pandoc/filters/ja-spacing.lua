-- ソースに書いた空白を和文の組版規則に合わせて置き換える (LaTeX 出力用)
--   和文 + 空白 + 欧文/数式  -> 四分空き (\jathinspace)
--   和文 + 空白 + 和文       -> 空白を削除
--   それ以外 (欧文同士, ", " の後など) はそのまま
-- 相互参照 (\cref) は cleveref-ja.sty の書式から前後の文字種を判断する
-- (図・表・式は「表 3.1」で和文始まり・欧文終わり, 章・節は「第 1 章」で和文始まり・和文終わり,
--  付録は「付録 A」で和文始まり・欧文終わり)
-- pandoc-crossref の後に実行する

local appendix = {}

local function is_ja(c)
  return (c >= 0x3000 and c <= 0x30FF) or (c >= 0x3400 and c <= 0x9FFF)
      or (c >= 0xF900 and c <= 0xFAFF) or (c >= 0xFF00 and c <= 0xFFEF)
end

local function char_class(s, last)
  if s == '' then return nil end
  local cps = {}
  for _, c in utf8.codes(s) do cps[#cps + 1] = c end
  local c = last and cps[#cps] or cps[1]
  if is_ja(c) then return 'J' end
  if last and utf8.char(c):match('[,.;:!?]') then return 'P' end
  return 'A'
end

local function cref_class(text, last)
  local cmd, ids = text:match('^\\([cC]?ref)%*?{([^}]*)}$')
  if not cmd then return nil end
  if cmd == 'ref' then return 'A' end
  if not last then return 'J' end
  local id = ids:match('([^,]+)$')
  if id:match('^sec:') and not appendix[id] then return 'J' end
  return 'A'
end

local function class(el, last)
  if el.t == 'Str' then return char_class(el.text, last) end
  if el.t == 'Math' or el.t == 'Code' or el.t == 'Cite' then return 'A' end
  if el.t == 'RawInline' then
    return el.format:match('tex') and cref_class(el.text, last) or nil
  end
  if el.content then return char_class(pandoc.utils.stringify(el), last) end
  return nil
end

local function Inlines(inlines)
  for i = #inlines - 1, 2, -1 do
    if inlines[i].t == 'Space' then
      local l, r = class(inlines[i - 1], true), class(inlines[i + 1], false)
      if l == 'J' and r == 'J' then
        inlines:remove(i)
      elseif (l == 'J' and r == 'A') or (l == 'A' and r == 'J') then
        inlines[i] = pandoc.RawInline('latex', '\\jathinspace{}')
      end
    end
  end
  return inlines
end

local function collect_appendix(doc)
  local after = false
  for _, b in ipairs(doc.blocks) do
    if b.t == 'RawBlock' and b.text:match('\\appendix') then after = true end
    if after and b.t == 'Header' and b.identifier ~= '' then appendix[b.identifier] = true end
  end
end

return {
  { Pandoc = collect_appendix },
  { Inlines = Inlines },
}
