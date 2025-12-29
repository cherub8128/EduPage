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
        this.initPDFExport();
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
}
