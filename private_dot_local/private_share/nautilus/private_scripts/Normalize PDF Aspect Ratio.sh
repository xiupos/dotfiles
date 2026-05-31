#!/bin/bash

for INPUT in "$@"; do
    [[ "${INPUT,,}" != *.pdf ]] && continue

    DIR=$(dirname "$INPUT")
    BASENAME=$(basename "$INPUT" .pdf)
    OUTPUT="${DIR}/${BASENAME}_resized.pdf"

    W=$(pdfinfo "$INPUT" | grep "Page size" | awk '{print $3}')
    H=$(pdfinfo "$INPUT" | grep "Page size" | awk '{print $5}')

    if [[ -z "$W" || -z "$H" ]]; then
        notify-send "PDF Resize" "Failed to get page size: $BASENAME" --icon=error
        continue
    fi

    pdfjam --outfile "$OUTPUT" \
           --papersize "{${W}pt,${H}pt}" \
           --fitpaper false \
           --rotateoversize false \
           "$INPUT" 2>/dev/null

    if [[ $? -eq 0 ]]; then
        notify-send "PDF Resize" "Done: ${BASENAME}_resized.pdf" --icon=emblem-ok
    else
        notify-send "PDF Resize" "Failed: $BASENAME" --icon=error
    fi
done
