#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
stage_dir=$(mktemp -d /tmp/hunter-hub-pages.XXXXXX)

cleanup() {
  case "$stage_dir" in
    /tmp/hunter-hub-pages.*) rm -rf "$stage_dir" ;;
  esac
}
trap cleanup EXIT

# 僅允許公開網站必要檔案進入部署包；原始 Excel、CSV、測試及文件不得上傳。
public_files=(
  index.html
  data.json
  canton140.js
  canton140.json
  _worker.js
  manifest-v1.webmanifest
  _headers
  assets/hunter-hub-target-v1.svg
  assets/hunter-hub-icon-180-v1.png
  assets/hunter-hub-icon-192-v1.png
  assets/hunter-hub-icon-512-v1.png
)

for file in "${public_files[@]}"; do
  mkdir -p "$(dirname "$stage_dir/$file")"
  cp "$project_root/$file" "$stage_dir/$file"
done

/Users/insahung/.nvm/versions/node/v24.14.1/bin/node \
  /Users/insahung/.nvm/versions/node/v24.14.1/bin/wrangler \
  pages deploy "$stage_dir" --project-name=sales-database --branch=main
