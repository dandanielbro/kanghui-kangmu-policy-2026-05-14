# Audio Transcript Pages

這個資料夾現在就是一個可直接拿去當 GitHub Pages repo root 的純靜態網站。

用途：

- 承接本地離線轉錄結果
- 顯示整理後的逐字稿
- 依講話順序呈現段落標題、重點、說話者標註

## Repo 內容

- `index.html`：主頁面
- `styles.css`：版面與視覺樣式
- `app.js`：從 `content/transcript.json` 讀資料並渲染
- `content/transcript.json`：頁面內容與 speaker 標註
- `.nojekyll`：讓 GitHub Pages 直接當純靜態站處理

## 說話者標註

目前頁面支援 speaker legend 與每段逐字稿的說話者標籤。

核心資料欄位在 [content/transcript.json](/Users/dan/Desktop/super-assistant/projects/audio-transcript-pages/content/transcript.json)：

- `speakers`：整體角色說明
- `sections[].turns[]`：逐段 speaker turns
- `sections[].highlights`：每段重點
- `sections[].quote`：可保留語氣的一句原話

## 本機預覽

在 repo 上層啟動靜態伺服器：

```bash
python3 -m http.server 8123
```

然後打開：

- `http://localhost:8123/projects/audio-transcript-pages/`

## 發布到 GitHub Pages

這個資料夾可以直接作為一個獨立 repo 的根目錄。

建議流程：

1. 在 GitHub 建立新 repo
2. 把這個資料夾內容推上去
3. 在 repo 的 `Settings -> Pages`
4. Source 選你的 branch，例如 `main`
5. Folder 選 `/ (root)`

如果你要在本機把這個資料夾直接推到新 repo，常見步驟會是：

```bash
cd /Users/dan/Desktop/super-assistant/projects/audio-transcript-pages
git remote add origin <your-github-repo-url>
git add .
git commit -m "Initial GitHub Pages site"
git branch -M main
git push -u origin main
```

## 轉錄來源

這份站點目前承接的是：

- 原始音檔：`/Users/dan/Downloads/2026-05-13_20_05_37 怡潔家.mp3`
- 本地轉錄輸出：`/Users/dan/Desktop/super-assistant/output/transcribe-local/yijie-home/`

## 注意

- 說話者標註是依目前逐字稿內容做的最佳努力整理，不是模型級 diarization。
- 若之後要做更精準的 speaker 分離，建議加跑專門的 diarization 流程，再回填到 `content/transcript.json`。
