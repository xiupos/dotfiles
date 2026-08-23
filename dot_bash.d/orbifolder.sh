if [ -d "$HOME/.local/src/orbifolder-1.2.1" ]; then
  export ORBIFOLDER_BIN="$HOME/.local/src/orbifolder-1.2.1/src/orbifolder/orbifolder"
  export ORBIFOLDER_GEOMETRY_DIR="$HOME/.local/src/orbifolder-1.2.1/Geometry"
fi

if [ -d "$HOME/.local/src/nonSUSYorbifolder" ]; then
  export NONSUSYORBIFOLDER_BIN="$HOME/.local/src/nonSUSYorbifolder/src/orbifolder/nonSUSYorbifolder"
  export NONSUSYORBIFOLDER_GEOMETRY_DIR="$HOME/.local/src/nonSUSYorbifolder/Geometry"
fi
