#!/usr/bin/env bash
# Convert to EPUB (Apple Books).sh
# Nautilus script: converts a scanned PDF to Fixed Layout EPUB
# Requires: poppler (pdftoppm, pdfinfo), python3 (stdlib only)
# Install: cp "Convert to EPUB (Apple Books).sh" ~/.local/share/nautilus/scripts/
#          chmod +x ~/.local/share/nautilus/scripts/"Convert to EPUB (Apple Books).sh"

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

notify() {
    local title="$1" msg="$2" urgency="${3:-normal}"
    if command -v notify-send &>/dev/null; then
        notify-send --urgency="$urgency" --app-name="PDF→EPUB" "$title" "$msg"
    else
        echo "[$title] $msg" >&2
    fi
}

die() {
    notify "PDF→EPUB failed" "$1" critical
    exit 1
}

# ---------------------------------------------------------------------------
# Validate input
# ---------------------------------------------------------------------------

[[ -z "${NAUTILUS_SCRIPT_SELECTED_FILE_PATHS:-}" ]] && die "No file selected."

# Take only the first selected file
INPUT_PDF=$(echo "$NAUTILUS_SCRIPT_SELECTED_FILE_PATHS" | head -n1 | tr -d '\n')

[[ -f "$INPUT_PDF" ]] || die "File not found: $INPUT_PDF"
[[ "${INPUT_PDF,,}" == *.pdf ]] || die "Selected file is not a PDF."

# ---------------------------------------------------------------------------
# Check dependencies
# ---------------------------------------------------------------------------

for cmd in pdftoppm pdfinfo python3; do
    command -v "$cmd" &>/dev/null || die "Missing dependency: $cmd (install poppler)"
done

# ---------------------------------------------------------------------------
# Image format selection
# ---------------------------------------------------------------------------

IMG_FMT=""
if command -v zenity &>/dev/null; then
    IMG_FMT=$(zenity --list \
        --title="PDF→EPUB: Image Format" \
        --text="Select image format for page rasterisation:" \
        --radiolist \
        --column="" --column="Format" --column="Best for" \
        TRUE  "JPEG" "Scanned photos / greyscale pages (smaller file)" \
        FALSE "PNG"  "Text-heavy / vector pages (sharper, lossless)" \
        --width=420 --height=220 2>/dev/null) || die "Cancelled."
elif command -v yad &>/dev/null; then
    IMG_FMT=$(yad --list \
        --title="PDF→EPUB: Image Format" \
        --text="Select image format for page rasterisation:" \
        --radiolist \
        --column="" --column="Format" --column="Best for" \
        TRUE  "JPEG" "Scanned photos / greyscale pages (smaller file)" \
        FALSE "PNG"  "Text-heavy / vector pages (sharper, lossless)" \
        --width=420 --height=220 2>/dev/null \
        | cut -d'|' -f2) || die "Cancelled."
else
    # No dialog available — fall back to JPEG
    IMG_FMT="JPEG"
    notify "PDF→EPUB" "zenity/yad not found; defaulting to JPEG."
fi

[[ "$IMG_FMT" == "JPEG" || "$IMG_FMT" == "PNG" ]] || die "No format selected."

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASENAME=$(basename "$INPUT_PDF" .pdf)
OUTPUT_EPUB="${INPUT_PDF%/*}/${BASENAME}.epub"
WORKDIR=$(mktemp -d)
IMGDIR="$WORKDIR/images"
mkdir -p "$IMGDIR"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Metadata from pdfinfo
# ---------------------------------------------------------------------------

TITLE=$(pdfinfo "$INPUT_PDF" 2>/dev/null | awk -F': ' '/^Title:/ && $2!="" {sub(/^[ \t]+/,"",$2); print $2; exit}')
[[ -z "$TITLE" ]] && TITLE="$BASENAME"

PAGE_COUNT=$(pdfinfo "$INPUT_PDF" 2>/dev/null | awk '/^Pages:/ {print $2}')
[[ -z "$PAGE_COUNT" ]] && die "Could not read page count from PDF."

# Detect page dimensions (points → mm, first page)
read -r W_PT H_PT < <(
    pdfinfo "$INPUT_PDF" 2>/dev/null \
    | awk '/^Page size:/ {printf "%.0f %.0f\n", $3, $5; exit}'
)
# Convert pt to px at 96dpi baseline (1pt = 1/72 inch, 1px at 96dpi = 1/96 inch)
# We'll use actual raster dimensions from pdftoppm output instead; these are fallbacks.
FALLBACK_W=1080
FALLBACK_H=1440

# ---------------------------------------------------------------------------
# Rasterise pages
# ---------------------------------------------------------------------------

notify "PDF→EPUB" "Rasterising $PAGE_COUNT pages…"

if [[ "$IMG_FMT" == "JPEG" ]]; then
    pdftoppm -r 150 -jpeg -cropbox "$INPUT_PDF" "$IMGDIR/page"
    mapfile -t IMAGES < <(ls -1v "$IMGDIR"/page-*.jpg 2>/dev/null || ls -1v "$IMGDIR"/page*.jpg)
    IMG_EXT="jpg"
    MEDIA_TYPE="image/jpeg"
else
    pdftoppm -r 150 -png -cropbox "$INPUT_PDF" "$IMGDIR/page"
    mapfile -t IMAGES < <(ls -1v "$IMGDIR"/page-*.png 2>/dev/null || ls -1v "$IMGDIR"/page*.png)
    IMG_EXT="png"
    MEDIA_TYPE="image/png"
fi
[[ ${#IMAGES[@]} -eq 0 ]] && die "pdftoppm produced no images."

# Detect actual image dimensions from first page
read -r VIEWPORT_W VIEWPORT_H < <(
    python3 - "$IMG_FMT" "$IMGDIR/${IMAGES[0]##*/}" <<'PYEOF'
import struct, sys

fmt      = sys.argv[1]
img_path = sys.argv[2]

def jpeg_dimensions(path):
    with open(path, 'rb') as f:
        f.read(2)
        while True:
            marker = f.read(2)
            if len(marker) < 2: break
            length = struct.unpack('>H', f.read(2))[0]
            if marker[1] in (0xC0, 0xC1, 0xC2):
                f.read(1)
                h = struct.unpack('>H', f.read(2))[0]
                w = struct.unpack('>H', f.read(2))[0]
                return w, h
            f.read(length - 2)
    return None, None

def png_dimensions(path):
    with open(path, 'rb') as f:
        f.read(8)
        f.read(4)
        f.read(4)  # IHDR
        w = struct.unpack('>I', f.read(4))[0]
        h = struct.unpack('>I', f.read(4))[0]
    return w, h

w, h = jpeg_dimensions(img_path) if fmt == "JPEG" else png_dimensions(img_path)
print(w, h)
PYEOF
) 2>/dev/null || { VIEWPORT_W=$FALLBACK_W; VIEWPORT_H=$FALLBACK_H; }

# ---------------------------------------------------------------------------
# Build Fixed Layout EPUB (Python, stdlib only)
# ---------------------------------------------------------------------------

notify "PDF→EPUB" "Building Fixed Layout EPUB…"

python3 - \
    "$WORKDIR" \
    "$OUTPUT_EPUB" \
    "$TITLE" \
    "$VIEWPORT_W" \
    "$VIEWPORT_H" \
    "$MEDIA_TYPE" \
    "${IMAGES[@]}" \
<<'PYEOF'
import sys, os, zipfile, uuid, datetime

workdir     = sys.argv[1]
out_epub    = sys.argv[2]
title       = sys.argv[3]
vw          = int(sys.argv[4])
vh          = int(sys.argv[5])
media_type  = sys.argv[6]
image_paths = sys.argv[7:]

book_id   = str(uuid.uuid4())
book_uid  = f"urn:uuid:{book_id}"
now_iso   = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
pages     = [os.path.basename(p) for p in image_paths]
n         = len(pages)

# ---- mimetype (must be first, uncompressed) --------------------------------
# ---- container.xml ---------------------------------------------------------
CONTAINER = '''\
<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>'''

# ---- content.opf -----------------------------------------------------------
def img_item(i, p):
    props = ' properties="cover-image"' if i == 0 else ''
    return f'    <item id="img{i:04d}" href="images/{p}" media-type="{media_type}"{props}/>'

manifest_items = "\n".join(img_item(i, p) for i, p in enumerate(pages)) + "\n" + "\n".join(
    f'    <item id="page{i:04d}" href="pages/page{i:04d}.xhtml" media-type="application/xhtml+xml" properties="svg"/>'
    for i in range(n)
)
spine_items = "\n".join(
    f'    <itemref idref="page{i:04d}"/>'
    for i in range(n)
)
OPF = f'''\
<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf"
         unique-identifier="uid" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">{book_uid}</dc:identifier>
    <dc:title>{title}</dc:title>
    <dc:language>ja</dc:language>
    <meta property="dcterms:modified">{now_iso}</meta>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">auto</meta>
    <meta name="cover" content="img0000"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
{manifest_items}
  </manifest>
  <spine toc="ncx">
{spine_items}
  </spine>
</package>'''

# ---- nav.xhtml -------------------------------------------------------------
nav_items = "\n".join(
    f'      <li><a href="pages/page{i:04d}.xhtml">Page {i+1}</a></li>'
    for i in range(n)
)
NAV = f'''\
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops" lang="ja">
<head><meta charset="UTF-8"/><title>{title}</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <ol>
{nav_items}
    </ol>
  </nav>
</body>
</html>'''

# ---- toc.ncx ---------------------------------------------------------------
ncx_points = "\n".join(
    f'''  <navPoint id="np{i:04d}" playOrder="{i+1}">
    <navLabel><text>Page {i+1}</text></navLabel>
    <content src="pages/page{i:04d}.xhtml"/>
  </navPoint>'''
    for i in range(n)
)
NCX = f'''\
<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="{book_uid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="{n}"/>
    <meta name="dtb:maxPageNumber" content="{n}"/>
  </head>
  <docTitle><text>{title}</text></docTitle>
  <navMap>
{ncx_points}
  </navMap>
</ncx>'''

# ---- per-page XHTML (Fixed Layout via SVG viewport) -----------------------
def page_xhtml(i, img_name):
    return f'''\
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width={vw}, height={vh}"/>
  <title>Page {i+1}</title>
  <style>
    html, body {{ margin:0; padding:0; width:{vw}px; height:{vh}px; overflow:hidden; }}
    img {{ display:block; width:{vw}px; height:{vh}px; }}
  </style>
</head>
<body>
  <img src="../images/{img_name}" alt="Page {i+1}"/>
</body>
</html>'''

# ---- Assemble EPUB zip -----------------------------------------------------
with zipfile.ZipFile(out_epub, 'w', zipfile.ZIP_DEFLATED) as z:
    # mimetype must be first and stored (not deflated)
    z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip",
               compress_type=zipfile.ZIP_STORED)
    z.writestr("META-INF/container.xml", CONTAINER)
    z.writestr("OEBPS/content.opf",      OPF)
    z.writestr("OEBPS/nav.xhtml",        NAV)
    z.writestr("OEBPS/toc.ncx",          NCX)
    for i, (img_path, img_name) in enumerate(zip(image_paths, pages)):
        z.write(img_path, f"OEBPS/images/{img_name}")
        z.writestr(f"OEBPS/pages/page{i:04d}.xhtml", page_xhtml(i, img_name))

print(f"Written: {out_epub}")
PYEOF

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

notify "PDF→EPUB done" "\"${BASENAME}.epub\" saved next to the PDF."
PYEOF
