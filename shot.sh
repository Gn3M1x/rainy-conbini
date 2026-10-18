#!/bin/bash
cd "$(dirname "$0")"
NAME="${1:-shot}"; QS="${2:-t=8}"; W="${3:-1280}"; H="${4:-800}"; VT="${5:-9000}"
mkdir -p shots
rm -f "shots/$NAME.png"
OLD=$PWD/.chrome-$NAME
rm -rf "$OLD"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --user-data-dir="$OLD" \
  --crash-dumps-dir="$OLD/crashes" --disable-crash-reporter \
  --no-first-run --no-default-browser-check --hide-scrollbars \
  --disable-extensions --disable-background-networking \
  --enable-unsafe-swiftshader --use-angle=swiftshader --use-gl=angle \
  --window-size=$W,$H --virtual-time-budget=$VT \
  --screenshot="$PWD/shots/$NAME.png" \
  "file://$PWD/out/rainy-conbini.html?$QS" >/dev/null 2>&1
ls -la "shots/$NAME.png" 2>/dev/null || echo "NO SHOT"
