local PASSTHROUGH_ENVS = {
  "equation", "equation%*",
  "align", "align%*",
  "alignat", "alignat%*",
  "gather", "gather%*",
  "multline", "multline%*",
  "flalign", "flalign%*",
  "split",
}

local function should_passthrough(text)
  -- pandoc-crossref が処理済み
  if text:match("\\label{") then return true end

  -- 最外 \begin{...} の環境名を取得
  local env = text:match("^%s*\\begin{([^}]+)}")
  if env == nil then return false end

  for _, pattern in ipairs(PASSTHROUGH_ENVS) do
    if env:match("^" .. pattern .. "$") then return true end
  end

  return false
end

function Math(el)
  if el.mathtype == "DisplayMath" then
    if not should_passthrough(el.text) then
      return pandoc.RawInline("latex",
        "\n\\begin{equation}" .. el.text .. "\\end{equation}\n")
    end
  end
  return el
end
