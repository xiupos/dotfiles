# Shared by source-hash.sh and install.sh (source it).

# source_files DIR: NUL-separated paths (relative to DIR, as ./...) of the
# source files under DIR, leaving out dependencies, build output and caches.
source_files() {
  (cd "$1" && find . \( -name node_modules -o -name dist -o -name out -o -name .cache -o -name screenshots -o -name '*.vsix' \) -prune \
    -o -type f -print0)
}
