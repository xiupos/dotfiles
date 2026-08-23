if test -d $HOME/.local/src/orbifolder-1.2.1
  set -gx ORBIFOLDER_BIN $HOME/.local/src/orbifolder-1.2.1/src/orbifolder/orbifolder
  set -gx ORBIFOLDER_GEOMETRY_DIR $HOME/.local/src/orbifolder-1.2.1/Geometry
end

if test -d $HOME/.local/src/nonSUSYorbifolder
  set -gx NONSUSYORBIFOLDER_BIN $HOME/.local/src/nonSUSYorbifolder/src/orbifolder/nonSUSYorbifolder
  set -gx NONSUSYORBIFOLDER_GEOMETRY_DIR $HOME/.local/src/nonSUSYorbifolder/Geometry
end
