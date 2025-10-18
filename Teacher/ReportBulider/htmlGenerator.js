// htmlGenerator.js.js

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
      case "interactive":
        content = `<div id="interactive-${component.id}">${component.html}</div>`;
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
  return `<style>${fontImport} body { font-family: ${fontFamily}; color: ${config.textColor}; } .editable-container .prose, .editable-container pre { cursor: text; transition: background-color 0.2s; } .editable-container .prose { min-height: 80px; padding: 0.75rem; border-radius: 0.375rem; border: 1px solid transparent; } .editable-container .prose:hover, .editable-container pre:hover { background-color: #f8fafc; border-color: #e2e8f0;} .code-preview, .code-input { font-family: 'D2Coding', monospace, 'Courier New'; font-size: 0.9rem; line-height: 1.6; } .code-preview { padding: 1rem; border-radius: 0.5rem; } .no-print { display: block; } @media print { .no-print { display: none; } #report-content { margin: 0; padding: 0; box-shadow: none; } }</style>`;
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
            screenshotCount: ${
              config.components.filter((c) => c.type === "image-upload").length
            },
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
        
        async function exportToPdf() {
            const loader = document.getElementById('loader-overlay');
            if(loader) loader.style.display = 'flex';
            const reportContent = document.getElementById('report-content');
            try {
                const { jsPDF } = window.jspdf;
                let format = config.paperSize.startsWith('a') || config.paperSize.startsWith('b') ? config.paperSize : 'a4';
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: format });
                
                // ❗ --- BUG FIX START ---
                // 1. 캡처 직전에 모든 프리뷰를 강제로 다시 렌더링합니다.
                // (localStorage에서 불러온 데이터가 프리뷰에 반영되도록 보장)
                document.querySelectorAll('.markdown-input').forEach(updateMarkdownPreview);
                if (config.hasCodeBlock) updateCodePreview();

                // 2. PDF에 포함될 프리뷰 요소들을 화면에 표시합니다.
                document.querySelectorAll('.editable-container textarea').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.editable-container .markdown-preview, .editable-container pre').forEach(el => el.style.display = 'block');
                
                // 3. 100ms 대기하여 브라우저가 DOM 변경(display) 및
                //    KaTeX, Highlight.js 렌더링을 완료할 시간을 줍니다.
                await new Promise(resolve => setTimeout(resolve, 100));
                // ❗ --- BUG FIX END ---
                
                const canvas = await html2canvas(reportContent, {
                     scale: 2,
                     useCORS: true,
                     windowWidth: reportContent.scrollWidth,
                     windowHeight: reportContent.scrollHeight
                });
                
                // 캡처 후, 원래 편집 상태로 되돌립니다.
                document.querySelectorAll('.editable-container textarea').forEach(el => el.style.display = '');
                document.querySelectorAll('.editable-container .markdown-preview, .editable-container pre').forEach(el => el.style.display = '');

                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = -heightLeft;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }
                pdf.save(document.title + '.pdf');
            } catch(e) { console.error("PDF Export Error:", e); }
            finally { if(loader) loader.style.display = 'none'; }
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
  // ❗ [수정된 부분]
  // 'const overlays' 선언이 'return' 문보다 *반드시* 먼저 와야 합니다.
  const overlays = `
    <div id="loader-overlay" class="fixed inset-0 bg-black bg-opacity-60 flex-col items-center justify-center hidden z-50">
        <div class="bg-white p-8 rounded-lg shadow-xl text-center">
            <svg class="animate-spin h-10 w-10" style="color: ${config.themeColor}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"><\\/circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"><\\/path>
            <\/svg>
            <p class="text-lg font-semibold text-slate-700 mt-4">PDF 생성 중...<\/p>
        <\/div>
    <\/div>
    <div id="autosave-status" class="no-print fixed bottom-6 right-6 flex items-center bg-slate-800 text-white py-2 px-4 rounded-lg shadow-lg opacity-0 transition-opacity duration-500 z-50">
        <svg id="autosave-icon-saving" class="animate-spin h-5 w-5 mr-3 hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"><\\/circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"><\/path><\/svg>
        <svg id="autosave-icon-saved" class="h-5 w-5 mr-3 hidden text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /><\/svg>
        <span id="autosave-text"><\/span>
    <\/div>`;

  return `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${config.reportTitle}</title>
            <script src="https://cdn.tailwindcss.com?plugins=typography"><\/script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js"><\/script>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"><\/script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"><\/script>
            ${styleContent}
        <\/head>
        <body class="p-4 sm:p-8 bg-slate-100">
            <main class="max-w-4xl mx-auto bg-white shadow-lg">
                ${bodyContent}
            </main>
            <footer class="text-center mt-8 py-6 no-print">
                <button id="export-pdf" class="text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto" style="background-color: ${config.themeColor};">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"><\/path><polyline points="7 10 12 15 17 10"><\/polyline><line x1="12" y1="15" x2="12" y2="3"><\/line><\/svg>
                    PDF로 저장
                <\/button>
            </footer>
            ${overlays}
            ${scriptContent}
        <\/body>
        <\/html>`;
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
