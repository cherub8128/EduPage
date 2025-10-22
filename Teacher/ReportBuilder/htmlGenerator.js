// htmlGenerator.js  — 인쇄(Paged Media) 기반 PDF + 불필요 라이브러리 제거 버전

// app 객체를 인자로 받아 HTML 생성을 총괄합니다.
export function generateHTML(app) {
  // 이 내부 헬퍼 함수는 app의 config와 showdownConverter에 접근해야 합니다.
  const generateComponentHTML = (component, isRecursive = false) => {
    let content = "";
    switch (component.type) {
      case "h1":
        content = `<h1 class="text-4xl font-bold" style="color: ${app.config.themeColor};">${component.content}</h1>`;
        break;
      case "h2":
        content = `<h2 class="text-2xl font-bold border-b-2 pb-2" style="border-color: ${app.config.themeColor};">${component.content}</h2>`;
        break;
      case "h3":
        content = `<h3 class="text-xl font-semibold">${component.content}</h3>`;
        break;
      case "h4":
        content = `<h4 class="text-lg font-semibold text-slate-600">${component.content}</h4>`;
        break;
      case "input":
        content = `<div><label class="block font-medium mb-1">${component.label}</label><input type="text" id="input-${component.id}" class="savable w-full p-2 border border-slate-300 rounded-md" placeholder="${component.placeholder}"></div>`;
        break;
      case "static-markdown":
        content = `<div class="prose max-w-none">${app.showdownConverter.makeHtml(
          component.content
        )}</div>`;
        break;
      case "markdown":
        content = `<div class="editable-container"><textarea class="savable markdown-input hidden w-full p-2 border rounded-md" id="md-${component.id}" placeholder="내용을 입력하세요..." style="min-height: ${component.height}px;"></textarea><div class="markdown-preview prose max-w-none"></div></div>`;
        break;
      case "code":
        content = `<div class="editable-container"><textarea id="code-${component.id}" class="savable code-input hidden w-full p-2 border rounded-md bg-slate-800 text-white" style="min-height: ${component.height}px;">${component.content}</textarea><pre class="bg-slate-800 rounded-md"><code class="code-preview language-python"></code></pre></div>`;
        break;
      case "image-upload":
        content = `<div class="screenshot-wrapper" style="width: ${component.width}%; margin: 0 auto;"><label for="screenshot-input-${component.id}" class="flex flex-col items-center justify-center w-full min-h-48 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100"><img id="screenshot-preview-${component.id}" class="hidden w-full h-full object-contain rounded-lg"><div id="screenshot-placeholder-${component.id}" class="text-center text-slate-500 p-4">이미지 첨부</div></label><input type="file" accept="image/*" class="hidden" id="screenshot-input-${component.id}"></div>`;
        break;
      case "image-embed":
        content = `<img src="${component.content}" class="block h-auto object-contain" style="width: ${component.width}%; margin: 0 auto;">`;
        break;
      case "divider":
        content = `<hr style="border-color: ${app.config.borderColor}; border-top-width: 2px; margin: 1rem 0;">`;
        break;
      case "columns-2":
        content = `<div class="flex gap-6">${component.columns
          .map(
            (col) =>
              `<div class="flex-1">${col
                .map((c) => generateComponentHTML(c, true))
                .join("")}</div>`
          )
          .join("")}</div>`;
        break;
      case "columns-3":
        content = `<div class="flex gap-6">${component.columns
          .map(
            (col) =>
              `<div class="flex-1">${col
                .map((c) => generateComponentHTML(c, true))
                .join("")}</div>`
          )
          .join("")}</div>`;
        break;
      case "group":
        content = `<div class="border-2 border-dashed p-4 rounded-lg" style="border-color: ${
          app.config.borderColor
        };">${component.children
          .map((c) => generateComponentHTML(c, true))
          .join("")}</div>`;
        break;
      case "interactive": {
        const htmlPart = component.html || "";
        const jsPart   = component.js || component.scripts || "";
        content = `
        <section class="report-section mb-8 break-inside-avoid" data-interactive="${component.id}">
          <div id="interactive-${component.id}" class="interactive-root">
            ${htmlPart}
          </div>
          ${jsPart ? `<script>(function(){
            try {
              var root = document.getElementById('interactive-${component.id}');
              if (!root) return;
              ${jsPart}
            } catch(e) {
              console.error('Interactive ${component.id} init error:', e);
            }
          })();</script>` : ""}
        </section>`;
      }
      break;
    }
    return isRecursive
      ? `<div class="report-section mb-8 break-inside-avoid">${content}</div>`
      : content;
  };

  // generateHTML 함수의 메인 로직
  const bodyContent = `<div id="report-content" class="p-12" style="background-color: ${
    app.config.backgroundColor
  }; color: ${app.config.textColor}">${app.config.components
    .map(
      (c) =>
        `<div class="report-section mb-8 break-inside-avoid">${generateComponentHTML(
          c
        )}</div>`
    )
    .join("")}</div>`;
  const styleContent = generateStyleHTML(app.config);
  const scriptContent = generateScriptHTML(app.config);

  // ❗ 여기가 중요합니다.
  // buildFullHtml 함수가 호출되기 *전에* 이 함수가 먼저 호출되고,
  // buildFullHtml 내부에서 return 전에 overlays가 선언되어야 합니다.
  const fullHtml = buildFullHtml(
    app.config,
    bodyContent,
    styleContent,
    scriptContent
  );

  downloadFile(fullHtml, `${app.config.fileName}.html`, "text/html");
}

// --- 헬퍼 함수들 ---

function generateStyleHTML(config) {
  const fontImport =
    config.fontFamily === "sans"
      ? `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');`
      : `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap');`;
  const fontFamily =
    config.fontFamily === "serif"
      ? "'Noto Serif KR', serif"
      : "'Noto Sans KR', sans-serif";

  // 인쇄(Paged Media) 규칙 보강: 벡터 텍스트 유지 + 잘림 방지
  const printCSS = `
  @media print {
    @page { size: A4; margin: 15mm; }
    html, body { background: #fff !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    #report-content { margin: 0 !important; padding: 0 !important; box-shadow: none !important; }

    .report-section { break-inside: auto !important; page-break-inside: auto !important; }
    figure, table, .screenshot-wrapper { break-inside: avoid-page !important; page-break-inside: avoid !important; }

    img {
      max-width: 100% !important;
      height: auto !important;
      max-height: calc(297mm - 40mm) !important; /* A4높이-여백 */
      object-fit: contain !important;
      break-inside: avoid-page !important; page-break-inside: avoid !important;
    }
    pre, code {
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }
    pre { break-inside: auto !important; page-break-inside: auto !important; }

    table { table-layout: fixed; width: 100% !important; }
    th, td { word-break: break-word; }

    /* 인쇄 가독성 */
    body { font-size: 11pt; line-height: 1.45; }
    h1 { font-size: 20pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 13pt; }
  }`;

  return `<style>
    ${fontImport}
    body { font-family: ${fontFamily}; color: ${config.textColor}; }
    .editable-container .prose, .editable-container pre { cursor: text; transition: background-color 0.2s; }
    .editable-container .prose { min-height: 80px; padding: 0.75rem; border-radius: 0.375rem; border: 1px solid transparent; }
    .editable-container .prose:hover, .editable-container pre:hover { background-color: #f8fafc; border-color: #e2e8f0;}
    .code-preview, .code-input { font-family: 'D2Coding', monospace, 'Courier New'; font-size: 0.9rem; line-height: 1.6; }
    .code-preview { padding: 1rem; border-radius: 0.5rem; }
    .no-print { display: block; }
    ${printCSS}
  </style>`;
}

function generateScriptHTML(config) {
  const interactiveScripts = config.components
    .filter((c) => c.type === "interactive" && c.js)
    .map(
      (c) =>
        `// Interactive component: ${c.id}\n(function() { try { ${c.js} } catch(e) { console.error('Error in interactive component ${c.id}:', e) } })();`
    )
    .join("\n\n");

  const mainScript = `
        const config = {
            storageKey: 'exportedReportData_' + window.location.pathname,
            savableSelector: '.savable',
            screenshotCount: ${config.components.filter((c) => c.type === "image-upload").length},
            hasCodeBlock: ${config.components.some((c) => c.type === "code")},
            paperSize: '${config.paperSize}'
        };
        const converter = new showdown.Converter({ simpleLineBreaks: true, tables: true, strikethrough: true, ghCompatibleHeaderId: true, emoji: true });
        const exportBtn = document.getElementById('export-pdf');
        let saveTimer;
        let statusTimer;

        function showSaveStatus(state) {
            const statusEl = document.getElementById('autosave-status');
            if(!statusEl) return;
            const textEl = statusEl.querySelector('#autosave-text');
            const iconSaving = statusEl.querySelector('#autosave-icon-saving');
            const iconSaved = statusEl.querySelector('#autosave-icon-saved');
            statusEl.classList.remove('opacity-0');
            if (state === 'saved') {
                textEl.textContent = '저장 완료';
                iconSaving.classList.add('hidden');
                iconSaved.classList.remove('hidden');
                statusTimer = setTimeout(() => statusEl.classList.add('opacity-0'), 2000);
            } else {
                textEl.textContent = '저장 중...';
                iconSaving.classList.remove('hidden');
                iconSaved.classList.add('hidden');
            }
        }
        
        function saveContent() {
            clearTimeout(saveTimer);
            showSaveStatus('saving');
            saveTimer = setTimeout(() => {
                const data = {};
                document.querySelectorAll(config.savableSelector).forEach(el => data[el.id] = el.value);
                document.querySelectorAll('input[type="file"]').forEach(input => {
                    const preview = document.getElementById(input.id.replace('input', 'preview'));
                    if (preview && preview.src && !preview.src.endsWith('#')) data[preview.id] = preview.src;
                });
                localStorage.setItem(config.storageKey, JSON.stringify(data));
                showSaveStatus('saved');
            }, 1000);
        }

        function loadSavedContent() {
            const data = JSON.parse(localStorage.getItem(config.storageKey));
            if (!data) return;
            document.querySelectorAll(config.savableSelector).forEach(el => {
                if(data[el.id]) el.value = data[el.id];
            });
            document.querySelectorAll('img[id^="screenshot-preview-"]').forEach(img => {
                 if(data[img.id]) {
                     img.src = data[img.id];
                     img.classList.remove('hidden');
                     const placeholder = document.getElementById(img.id.replace('preview', 'placeholder'));
                     if(placeholder) placeholder.classList.add('hidden');
                 }
            });
        }

        function updateMarkdownPreview(textareaElement) {
            const container = textareaElement.closest('.editable-container');
            if (!container) return;
            const preview = container.querySelector('.markdown-preview');
            if (preview) {
                const placeholder = '<p class="text-slate-400">' + (textareaElement.placeholder || '내용을 입력하세요...') + '</p>';
                const html = textareaElement.value ? converter.makeHtml(textareaElement.value) : placeholder;
                preview.innerHTML = html;
                if(window.renderMathInElement) renderMathInElement(preview, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}] });
            }
        }

        function updateCodePreview() {
            if (!config.hasCodeBlock || typeof hljs === 'undefined') return;
            document.querySelectorAll('.code-input').forEach(textarea => {
                const container = textarea.closest('.editable-container');
                if (!container) return;
                const preview = container.querySelector('.code-preview');
                if (preview) {
                    preview.textContent = textarea.value || '// 코드를 입력하세요...';
                    delete preview.dataset.highlighted;
                    hljs.highlightElement(preview);
                }
            });
        }
        
        function autoResizeTextarea(textarea) { textarea.style.height = 'auto'; textarea.style.height = (textarea.scrollHeight) + 'px'; }

        function loadContent() {
            loadSavedContent();
            document.querySelectorAll('.markdown-input').forEach(updateMarkdownPreview);
            if (config.hasCodeBlock) updateCodePreview();
        }
        
        // === 인쇄 기반 PDF: 텍스트/수식/코드 선택 가능 ===
        async function exportToPdf() {
            const loader = document.getElementById('loader-overlay');
            if(loader) loader.style.display = 'flex';
            const reportContent = document.getElementById('report-content');

            // 1) 출력용 상태로 전환
            document.querySelectorAll('.markdown-input').forEach(updateMarkdownPreview);
            if (config.hasCodeBlock) updateCodePreview();

            const editors  = reportContent.querySelectorAll('.editable-container textarea');
            const previews = reportContent.querySelectorAll('.editable-container .markdown-preview, .editable-container pre');

            editors.forEach(el => el.classList.add('hidden'));
            previews.forEach(el => el.classList.remove('hidden'));

            // 2) 수식/코드 최신화
            if (window.renderMathInElement) {
              renderMathInElement(reportContent, {
                delimiters: [
                  {left:'$$', right:'$$', display:true},
                  {left:'$',  right:'$',  display:false},
                  {left:'\\\\(', right:'\\\\)', display:false},
                  {left:'\\\\[', right:'\\\\]', display:true}
                ],
                throwOnError: false
              });
            }
            if (typeof hljs !== 'undefined') {
              reportContent.querySelectorAll('pre code').forEach(el => {
                delete el.dataset.highlighted; hljs.highlightElement(el);
              });
            }

            // 3) 폰트/이미지 로딩 대기
            try { await document.fonts.ready; } catch(e) {}
            await Promise.all(Array.from(reportContent.querySelectorAll('img')).map(img => {
              if (img.complete) return;
              return new Promise(res => { img.addEventListener('load', res, { once:true }); img.addEventListener('error', res, { once:true }); });
            }));

            // 4) 파일명 제안: 첫 번째 h1 기준
            const h1 = document.querySelector('h1');
            const suggested = (h1?.textContent || '문서').trim().replace(/\\s+/g,'_');
            const prevTitle = document.title;
            document.title = suggested;

            const cleanup = () => {
              editors.forEach(el => el.classList.remove('hidden'));
              previews.forEach(el => el.classList.remove('hidden'));
              document.title = prevTitle;
              if(loader) loader.style.display = 'none';
              window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);

            // 5) 인쇄 → 사용자가 "PDF로 저장" 선택
            window.print();
        }

        function initialize() {
            document.querySelectorAll('.editable-container').forEach(container => {
                const preview = container.querySelector('.markdown-preview, pre');
                const editor = container.querySelector('textarea');
                if (preview && editor) {
                    preview.addEventListener('click', () => {
                        preview.classList.add('hidden');
                        editor.classList.remove('hidden');
                        editor.focus();
                        autoResizeTextarea(editor);
                    });
                    editor.addEventListener('blur', () => {
                        editor.classList.add('hidden');
                        preview.classList.remove('hidden');
                        if (editor.classList.contains('code-input')) updateCodePreview();
                        else updateMarkdownPreview(editor);
                        saveContent();
                    });
                }
            });
            document.querySelectorAll('input[type="file"]').forEach(input => {
                input.addEventListener('change', (event) => {
                    const preview = document.getElementById(input.id.replace('input', 'preview'));
                    const placeholder = document.getElementById(input.id.replace('input', 'placeholder'));
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            preview.src = e.target.result;
                            preview.classList.remove('hidden');
                            if (placeholder) placeholder.classList.add('hidden');
                            saveContent();
                        };
                        reader.readAsDataURL(file);
                    }
                });
            });
            document.querySelectorAll('.savable').forEach(el => el.addEventListener('input', saveContent));
            if (exportBtn) exportBtn.addEventListener('click', exportToPdf);
            loadContent();
        }
        
        initialize();
    `;
  return `<script>document.addEventListener('DOMContentLoaded', () => { try { ${mainScript} \n${interactiveScripts} } catch(e) { console.error('Error initializing report script:', e); } });<\/script>`;
}

function buildFullHtml(config, bodyContent, styleContent, scriptContent) {
  const overlays = `
    <div id="loader-overlay" class="fixed inset-0 bg-black bg-opacity-60 flex-col items-center justify-center hidden z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl text-center">
            <svg class="animate-spin h-10 w-10" style="color: ${config.themeColor}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-lg font-semibold text-slate-700 mt-4">인쇄용 PDF 준비 중...</p>
        </div>
    </div>
    <div id="autosave-status" class="no-print fixed bottom-6 right-6 flex items-center bg-slate-800 text-white py-2 px-4 rounded-lg shadow-lg opacity-0 transition-opacity duration-500 z-50">
        <svg id="autosave-icon-saving" class="animate-spin h-5 w-5 mr-3 hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <svg id="autosave-icon-saved" class="h-5 w-5 mr-3 hidden text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
        <span id="autosave-text"></span>
    </div>`;

  return `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${config.reportTitle}</title>
            <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js"></script>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
            ${styleContent}
        </head>
        <body class="p-4 sm:p-8 bg-slate-100">
            <main class="max-w-4xl mx-auto bg-white shadow-lg">
                ${bodyContent}
            </main>
            <footer class="text-center mt-8 py-6 no-print">
                <p class="text-sm text-slate-500 mb-2">
                  인쇄 창이 뜨면 '대상' 또는 '프린터' 항목에서 <strong>'PDF로 저장'</strong>을 선택하세요.
                </p>
                <button id="export-pdf" class="text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto" style="background-color: ${config.themeColor};">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    PDF로 저장
                </button>
            </footer>
            ${overlays}
            ${scriptContent}
        </body>
        </html>`;
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
