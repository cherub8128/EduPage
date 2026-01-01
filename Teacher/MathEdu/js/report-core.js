/* ==================================================
   REPORT CORE LOGIC
   (AutoSave, Markdown, Gallery, PDF Export)
   ================================================== */

/**
 * ReportManager: Handles interactivity for specialized One-Page Reports
 * @param {string} storageKey - Key for localStorage
 */
export class ReportManager {
    constructor(storageKey) {
        this.storageKey = storageKey;
        this.converter = new showdown.Converter({
            tables: true,
            ghCodeBlocks: true,
            simpleLineBreaks: true,
            literalMidWordUnderscores: true
        });

        this.saveTimer = null;
        this.galleryData = {}; // Map: galleryId -> Array of items
    }

    init() {
        this.attachEditors();
        this.initAutoSave();
        this.initAutoSave();
        this.initPDFExport();
        this.initMarkdownExport();
        this.initHTMLExport();
        this.renderGlobalMath(); // Render static math on load
        this.loadContent();
    }

    renderGlobalMath() {
        const render = () => {
            if (window.renderMathInElement) {
                renderMathInElement(document.body, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            }
        };

        if (window.katex && window.renderMathInElement) {
            render();
        } else {
            // Wait for deferred scripts
            const timer = setInterval(() => {
                if (window.katex && window.renderMathInElement) {
                    clearInterval(timer);
                    render();
                }
            }, 100);
            // Fallback safety (stop checking after 5s)
            setTimeout(() => clearInterval(timer), 5000);
        }
    }

    // --- Markdown Editor ---
    attachEditors() {
        document.querySelectorAll('.editable-container').forEach(container => {
            const preview = container.querySelector('.markdown-preview');
            const editor = container.querySelector('.markdown-input');
            if (!editor || !preview) return;

            // Update preview initially
            this.updatePreview(editor, preview);

            // Toggle Behavior
            preview.addEventListener('click', () => {
                preview.style.display = 'none';
                editor.style.display = 'block';
                editor.focus();
                this.autoResize(editor);
            });

            editor.addEventListener('blur', () => {
                editor.style.display = 'none';
                preview.style.display = 'block';
                this.updatePreview(editor, preview);
                this.saveContent();
            });

            editor.addEventListener('input', () => {
                this.autoResize(editor);
                this.saveContent();
            });
        });
    }

    updatePreview(editor, preview) {
        const markdown = editor.value;
        const html = markdown ? this.converter.makeHtml(markdown) : '<p style="color:var(--text-muted); font-style:italic;">내용을 입력하세요...</p>';
        preview.innerHTML = html;

        // Re-render MathJax
        if (window.renderMathInElement) {
            renderMathInElement(preview, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        }
        // Highlight Code
        if (window.hljs) {
            preview.querySelectorAll('pre code').forEach(el => {
                delete el.dataset.highlighted;
                hljs.highlightElement(el);
            });
        }
    }

    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    }

    // --- Auto Save ---
    initAutoSave() {
        document.querySelectorAll('.savable').forEach(el => {
            el.addEventListener('input', () => this.saveContent());
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.addEventListener('change', () => this.saveContent());
            }
        });
    }

    saveContent() {
        clearTimeout(this.saveTimer);
        this.showStatus('saving');

        this.saveTimer = setTimeout(() => {
            const data = {};
            document.querySelectorAll('.savable').forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    data[el.id] = el.checked;
                } else {
                    data[el.id] = el.value;
                }
            });

            // Save Galleries
            data['galleryData'] = this.galleryData;

            localStorage.setItem(this.storageKey, JSON.stringify(data));
            this.showStatus('saved');
        }, 600);
    }

    loadContent() {
        const json = localStorage.getItem(this.storageKey);
        if (!json) return;

        try {
            const data = JSON.parse(json);

            // Restore inputs
            document.querySelectorAll('.savable').forEach(el => {
                if (el.id in data) {
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        el.checked = !!data[el.id];
                    } else {
                        el.value = data[el.id];
                    }
                }
            });

            // Update previews
            document.querySelectorAll('.editable-container .markdown-input').forEach(el => {
                const preview = el.closest('.editable-container').querySelector('.markdown-preview');
                if (preview) this.updatePreview(el, preview);
            });

            // Restore Galleries
            if (data.galleryData) {
                this.galleryData = data.galleryData;
                Object.keys(this.galleryData).forEach(containerId => {
                    this.renderGallery(containerId);
                });
            }

        } catch (e) {
            console.error("Load Failed", e);
        }
    }

    showStatus(status) {
        const el = document.getElementById('autosave-text');
        const iconSaving = document.getElementById('autosave-icon-saving');
        const iconSaved = document.getElementById('autosave-icon-saved');
        const container = document.getElementById('autosave-status');

        if (!container) return; // Optional UI

        container.style.opacity = '1';
        if (status === 'saving') {
            if (el) el.textContent = '저장 중...';
            if (iconSaving) iconSaving.classList.remove('hidden');
            if (iconSaved) iconSaved.classList.add('hidden');
        } else {
            if (el) el.textContent = '모든 변경사항이 저장되었습니다.';
            if (iconSaving) iconSaving.classList.add('hidden');
            if (iconSaved) iconSaved.classList.remove('hidden');
            setTimeout(() => { container.style.opacity = '0'; }, 2000);
        }
    }

    // --- Gallery System ---
    initGallery(containerId, inputId, dropId, clearBtnId = null, addBtnId = null) {
        if (!this.galleryData[containerId]) this.galleryData[containerId] = [];

        const input = document.getElementById(inputId);
        const drop = document.getElementById(dropId);

        if (input) {
            input.addEventListener('change', (e) => this.handleFiles(e.target.files, containerId));
        }

        if (drop) {
            ['dragenter', 'dragover'].forEach(ev => {
                drop.addEventListener(ev, (e) => {
                    e.preventDefault();
                    drop.classList.add('drag');
                });
            });
            ['dragleave', 'drop'].forEach(ev => {
                drop.addEventListener(ev, (e) => {
                    e.preventDefault();
                    drop.classList.remove('drag');
                });
            });
            drop.addEventListener('drop', (e) => {
                this.handleFiles(e.dataTransfer.files, containerId);
            });
        }

        if (clearBtnId) {
            const clearBtn = document.getElementById(clearBtnId);
            if (clearBtn) clearBtn.addEventListener('click', () => this.clearGallery(containerId));
        }

        if (addBtnId) {
            const addBtn = document.getElementById(addBtnId);
            if (addBtn && input) addBtn.addEventListener('click', () => input.click());
        }

        this.renderGallery(containerId);
    }

    handleFiles(files, containerId) {
        if (!files || !files.length) return;
        const arr = Array.from(files).filter(f => f.type.startsWith('image/'));

        let loaded = 0;
        arr.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.galleryData[containerId].push({
                    src: e.target.result,
                    caption: ''
                });
                loaded++;
                if (loaded === arr.length) {
                    this.renderGallery(containerId);
                    this.saveContent();
                }
            };
            reader.readAsDataURL(file);
        });

        const input = document.getElementById(containerId + '-input');
        if (input) input.value = '';
    }

    renderGallery(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        const items = this.galleryData[containerId] || [];

        items.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'm-card p-2';

            const img = document.createElement('img');
            img.src = item.src;
            img.style.width = '100%';
            img.style.height = '140px';
            img.style.objectFit = 'contain';
            card.appendChild(img);

            const cap = document.createElement('input');
            cap.className = 'm-input mt-2 text-sm';
            cap.placeholder = '설명 (Caption)';
            cap.value = item.caption || '';
            cap.addEventListener('input', (e) => {
                items[idx].caption = e.target.value;
                this.saveContent();
            });
            card.appendChild(cap);

            const delBtn = document.createElement('button');
            delBtn.className = 'm-btn small secondary mt-2 w-full justify-center';
            delBtn.textContent = '삭제';
            delBtn.onclick = () => {
                if (confirm('삭제하시겠습니까?')) {
                    items.splice(idx, 1);
                    this.renderGallery(containerId);
                    this.saveContent();
                }
            };
            card.appendChild(delBtn);

            container.appendChild(card);
        });
    }

    clearGallery(containerId) {
        if (confirm('모든 이미지를 삭제하시겠습니까?')) {
            this.galleryData[containerId] = [];
            this.renderGallery(containerId);
            this.saveContent();
        }
    }

    // --- PDF Export ---
    initPDFExport() {
        const btn = document.getElementById('export-pdf');
        if (!btn) return;

        btn.addEventListener('click', async () => {
            // Pre-process (Show all previews)
            document.querySelectorAll('.markdown-input').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.markdown-preview').forEach(el => el.style.display = 'block');

            // Wait for fonts
            await document.fonts.ready.catch(() => { });

            // Rename title for filename
            const prevTitle = document.title;
            const sId = document.getElementById('student-id')?.value || 'Unknown';
            const sNm = document.getElementById('student-name')?.value || 'User';
            document.title = `${sId}_${sNm}_Report`;

            window.print();

            // Restore
            document.title = prevTitle;
        });
    }

    // --- Markdown Export ---
    initMarkdownExport() {
        const btn = document.getElementById('export-md');
        if (!btn) return;

        btn.addEventListener('click', () => {
            let md = `# ${document.title}\n\n`;

            // Gather Student Info
            const sId = document.getElementById('student-id')?.value || '';
            const sNm = document.getElementById('student-name')?.value || '';
            if (sId || sNm) md += `**Student:** ${sId} ${sNm}\n\n---\n\n`;

            // Walk through main content
            const main = document.querySelector('main');
            if (main) {
                md += this.elementToMarkdown(main);
            }

            this.downloadFile(md, 'report.md', 'text/markdown');
        });
    }

    elementToMarkdown(root) {
        let text = "";

        // Helper to process children
        const process = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                let content = node.textContent.trim();
                if (content && !node.parentNode.closest('.print-hidden')) text += content + " ";
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.classList.contains('print-hidden')) return; // Skip hidden
            if (node.style.display === 'none') return;

            const tag = node.tagName.toLowerCase();

            // Headings
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                const level = parseInt(tag[1]);
                text += `\n\n${'#'.repeat(level)} ${node.textContent.trim()}\n\n`;
                return;
            }

            // Inputs / Textareas
            if (tag === 'input' && node.type === 'text') {
                text += ` **[Input: ${node.value}]** `;
                return;
            }
            if (tag === 'textarea') {
                text += `\n\n> ${node.value.split('\n').join('\n> ')}\n\n`;
                return;
            }

            // Images
            if (tag === 'img') {
                text += `\n![Image](${node.src})\n`;
                return;
            }

            // Paragraphs / Divs
            if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
                // If it's a structural container, recurse
                // For paragraph, add newline after
                Array.from(node.childNodes).forEach(process);
                if (tag === 'p') text += "\n\n";
                else if (tag !== 'span') text += "\n";
                return;
            }

            // Lists
            if (tag === 'ul' || tag === 'ol') {
                Array.from(node.children).forEach(li => {
                    text += `- ${li.textContent.trim()}\n`;
                });
                text += "\n";
                return;
            }

            // Default recurse
            Array.from(node.childNodes).forEach(process);
        };

        process(root);
        return text;
    }

    // --- HTML Export ---
    initHTMLExport() {
        const btn = document.getElementById('export-html');
        if (!btn) return;

        btn.addEventListener('click', () => {
            // Clone the document
            const clone = document.documentElement.cloneNode(true);

            // 1. Persist Input Values
            const origInputs = document.querySelectorAll('input, textarea, select');
            const cloneInputs = clone.querySelectorAll('input, textarea, select');

            for (let i = 0; i < origInputs.length; i++) {
                const orig = origInputs[i];
                const cln = cloneInputs[i];

                if (orig.tagName === 'TEXTAREA') {
                    cln.innerHTML = orig.value;
                    cln.textContent = orig.value;
                } else if (orig.tagName === 'SELECT') {
                    const options = cln.querySelectorAll('option');
                    options.forEach(opt => {
                        if (opt.value === orig.value) opt.setAttribute('selected', 'selected');
                    });
                } else if (orig.type === 'checkbox' || orig.type === 'radio') {
                    if (orig.checked) cln.setAttribute('checked', 'checked');
                } else {
                    cln.setAttribute('value', orig.value);
                }
            }

            // 2. Remove Print Hidden & Scripts
            clone.querySelectorAll('.print-hidden').forEach(el => el.remove());
            clone.querySelectorAll('script').forEach(el => el.remove());

            // 3. Remove Export Buttons explicitly if they persist
            // (Assuming they are inside print-hidden, but just in case)
            const exportBtns = clone.querySelectorAll('#export-md, #export-html, #export-pdf');
            exportBtns.forEach(btn => btn.remove());

            let html = clone.outerHTML;
            html = "<!DOCTYPE html>\n" + html;

            this.downloadFile(html, 'report.html', 'text/html');
        });
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        // Use student info for filename if available
        const sId = document.getElementById('student-id')?.value || '';
        const sNm = document.getElementById('student-name')?.value || '';
        if (sId || sNm) {
            const ext = filename.split('.').pop();
            filename = `${sId}_${sNm}_Report.${ext}`;
        }

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
