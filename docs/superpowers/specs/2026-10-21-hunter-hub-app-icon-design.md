# Hunter Hub App Icon 設計規格

## 目標

將 Hunter Hub 現有的「🎯」識別統一為可穩定顯示的正式圖示，供登入頁、首頁「我的名單」、瀏覽器分頁及手機加入主畫面使用。

## 視覺

- 主體為紅白相間的圓形靶心，以及由右上斜向靶心中心的藍綠色飛鏢。
- 不使用獵刀、文字、深藍底、金屬或立體效果。
- 圖形保持簡潔並預留安全邊界，縮小到 favicon 尺寸仍能辨識。
- App Icon 使用淺色實底，避免不同手機對透明區域採用不同填色。

## 使用位置

- 登入頁圖示。
- 首頁「我的名單」圖示。
- 瀏覽器 favicon。
- iPhone `apple-touch-icon`。
- PWA manifest 的 192px、512px 與 maskable 圖示。

## 更新策略

- 圖示與 manifest 使用版本化檔名 `v1`。
- manifest 設為重新驗證；未來換圖時建立 `v2` 檔名並同步更新 HTML。
- Android/Chrome 可透過 manifest 更新；iPhone 已加入主畫面的舊捷徑仍可能需要移除後重新加入，網站不宣稱能繞過系統限制。

## 部署安全

- `scripts/deploy_pages.sh` 僅新增本規格列出的公開圖示、manifest 及 `_headers`。
- Excel、CSV、文件、測試及其他本機檔案仍不得進入部署包。

## 驗收

- 自動檢查 HTML、manifest、圖示尺寸與部署白名單。
- 在 390px 手機寬度檢查登入頁及首頁圖示。
- 部署後確認 production 的 HTML、manifest 與三種尺寸圖示可讀取。
