/**
 * Poster Editor Application
 * Main application logic for the poster editor
 */

const PosterApp = {
    posterData: null,
    saveTimeout: null,
    posterWidth: window.PosterExport?.POSTER_WIDTH || 1190.55,
    posterHeight: window.PosterExport?.POSTER_HEIGHT || 1683.78,
    zoomLevel: 1.0,

    /**
     * Get default poster data
     */
    getInitialData() {
        return {
            challengeTitle: "2025 STEAM융합 AI·SW 챌린지",
            goalLabel: "프로젝트 핵심 목표",
            colorTheme: "navyblue",
            projectTitle: "프로젝트 제목을 입력하세요",
            projectGoal: "프로젝트 목표를 작성하세요.",
            authorName: "이름을 입력하세요",
            instructorName: "선생님 성함",
            columns: [[], [], []],
            // Default Colors
            textColor: "#023373",
            cardColor: "#f8fafc",
            lineColor: "#023373",
            titleColor: "#111827",
            headerColor: "#111827",
            borderColor: "#e2e8f0" // Default border color
        };
    },

    /**
     * Initialize the application
     */
    async init() {
        await this.loadData();
        this.renderEditor();
        this.renderPreview();
        this.attachEventListeners();
        window.PosterPreviewUI.toggle(); // Initial state check or set
        // Actually, initial state in HTML is hidden? app.js previously had logic.
        // Let's ensure zoom is applied.
        this.applyZoom(); // Use internal helper or direct UI call
    },

    /**
     * Load data from IndexedDB with localStorage migration
     */
    async loadData() {
        try {
            const migratedData = await window.PosterDB.migrateFromLocalStorage();
            if (migratedData) {
                this.posterData = migratedData;
                return;
            }
            const dbData = await window.PosterDB.getFromDB(window.PosterDB.DATA_KEY);
            this.posterData = dbData || this.getInitialData();
        } catch (e) {
            console.error('데이터 로드 실패:', e);
            this.posterData = this.getInitialData();
        }
    },

    /**
     * Save data to IndexedDB
     */
    saveData() {
        clearTimeout(this.saveTimeout);
        this.updateSaveStatus('saving');
        this.saveTimeout = setTimeout(async () => {
            try {
                await window.PosterDB.saveToDB(window.PosterDB.DATA_KEY, this.posterData);
                this.updateSaveStatus('saved');
            } catch (e) {
                console.error('IndexedDB 저장 실패:', e);
                this.updateSaveStatus('saved');
            }
        }, 1000);
    },

    /**
     * Load a preset template
     */
    async loadPreset(filename) {
        if (!confirm('현재 작업 중인 내용은 사라집니다. 템플릿을 불러오시겠습니까?')) return;
        try {
            const response = await fetch(`data/${filename}`);
            if (!response.ok) throw new Error('Failed to load preset');
            const data = await response.json();
            this.posterData = data;
            this.renderEditor();
            this.renderPreview();
            this.saveData();
            setTimeout(() => this.renderPreview(), 100);
        } catch (error) {
            console.error('Error loading preset:', error);
            alert('템플릿 로드 실패: ' + error.message);
        }
    },

    /**
     * Render the editor panel
     */
    renderEditor() {
        window.PosterEditorUI.render(this.posterData);
    },

    /**
     * Render the poster preview
     */
    renderPreview() {
        window.PosterPreviewUI.render(this.posterData, this.posterWidth, this.posterHeight, this.zoomLevel);
    },

    applyZoom() {
        window.PosterPreviewUI.applyZoom(this.zoomLevel);
    },

    /**
     * Attach all event listeners
     */
    attachEventListeners() {
        const editorPanel = document.getElementById('editor-panel');
        editorPanel.addEventListener('input', e => this.handleEditorInput(e));
        editorPanel.addEventListener('change', e => this.handleFileInput(e));
        editorPanel.addEventListener('click', e => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;
            const { action, col, block, addType } = button.dataset;
            if (action === 'delete') this.handleDeleteBlock(col, block);
            if (action === 'add') this.handleAddBlock(col, block, addType);
        });

        // Quick Theme buttons
        editorPanel.addEventListener('click', e => {
            const btn = e.target.closest('.theme-btn');
            if (!btn) return;

            try {
                const themeColors = JSON.parse(btn.dataset.theme);

                // Update all color fields
                Object.entries(themeColors).forEach(([key, value]) => {
                    this.posterData[key] = value;
                });

                this.renderEditor();
                this.renderPreview();
                this.saveData();
            } catch (err) {
                console.error('Error applying theme:', err);
            }
        });

        document.getElementById('export-pdf').addEventListener('click', () =>
            window.PosterExport.exportToPdf(this.posterData));
        document.getElementById('export-html').addEventListener('click', () =>
            window.PosterExport.exportToHtml(this.posterData));
        document.getElementById('toggle-preview').addEventListener('click', () => window.PosterPreviewUI.toggle());

        // Zoom controls
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.zoomLevel += 0.1;
            this.applyZoom();
        });
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.zoomLevel = Math.max(0.1, this.zoomLevel - 0.1);
            this.applyZoom();
        });
        document.getElementById('zoom-fit-btn').addEventListener('click', () => {
            const previewPanel = document.getElementById('preview-panel');
            if (!previewPanel) return;
            const viewportWidth = previewPanel.clientWidth;
            const viewportHeight = previewPanel.clientHeight;
            const scaleX = viewportWidth / this.posterWidth;
            const scaleY = viewportHeight / this.posterHeight;
            this.zoomLevel = Math.min(scaleX, scaleY) * 0.95;
            this.applyZoom();
        });
        document.getElementById('zoom-reset-btn').addEventListener('click', () => {
            this.zoomLevel = 1.0;
            this.applyZoom();
        });
    },

    /**
     * Handle file input for image upload
     */
    handleFileInput(e) {
        if (e.target.type !== 'file' || !e.target.files[0]) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const col = e.target.dataset.col;
            const blockIndex = e.target.dataset.block;
            const block = this.posterData.columns[col][blockIndex];
            if (!block) return;
            block.content = event.target.result;
            this.rerender();
        };
        reader.readAsDataURL(file);
    },

    /**
     * Handle editor input changes
     */
    handleEditorInput(e) {
        if (!e.target.matches('input, textarea') || e.target.type === 'file') return;
        const key = e.target.dataset.key;
        const col = e.target.dataset.col;

        if (key) {
            let value = e.target.value;

            // Handle hex input sync
            if (e.target.type === 'text' && key.includes('Color')) {
                if (!value.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(value)) {
                    value = '#' + value;
                }
            }

            this.posterData[key] = value;

            // Sync color inputs locally without full re-render for performance
            if (['textColor', 'cardColor', 'lineColor', 'titleColor', 'headerColor'].includes(key)) {
                const editorPanel = document.getElementById('editor-panel');
                if (e.target.type === 'color') {
                    const textInput = editorPanel.querySelector(`input[type="text"][data-key="${key}"]`);
                    if (textInput) textInput.value = value.replace('#', '');
                } else if (e.target.type === 'text') {
                    const colorInput = editorPanel.querySelector(`input[type="color"][data-key="${key}"]`);
                    if (colorInput && /^#[0-9A-Fa-f]{6}$/.test(value)) {
                        colorInput.value = value;
                    }
                }
                const previewDiv = editorPanel.querySelector(`div[data-color-preview="${key}"]`);
                if (previewDiv) previewDiv.style.backgroundColor = value;
            }

        } else if (col !== undefined) {
            const blockIndex = e.target.dataset.block;
            const block = this.posterData.columns[col][blockIndex];
            if (!block) return;

            if (block.type === 'image') {
                block[e.target.dataset.field] = e.target.value;
            } else {
                block.content = e.target.value;
            }
        }
        this.renderPreview();
        this.saveData();
    },

    /**
     * Handle block deletion
     */
    handleDeleteBlock(col, blockIndex) {
        this.posterData.columns[parseInt(col)].splice(parseInt(blockIndex), 1);
        this.rerender();
    },

    /**
     * Handle adding new block
     */
    handleAddBlock(col, blockIndex, type) {
        const newBlock = { id: Date.now().toString(), type };
        if (type === 'text') {
            newBlock.content = '새로운 텍스트 블록입니다.';
        } else if (type === 'image') {
            newBlock.content = '';
            newBlock.caption = '새 이미지';
        }
        this.posterData.columns[parseInt(col)].splice(parseInt(blockIndex) + 1, 0, newBlock);
        this.rerender();
    },

    /**
     * Re-render both editor and preview
     */
    rerender() {
        this.renderEditor();
        this.renderPreview();
        this.saveData();
    },

    /**
     * Update the save status indicator
     */
    updateSaveStatus(status) {
        const textEl = document.getElementById('save-text');
        const savingIcon = document.getElementById('save-icon-saving');
        const savedIcon = document.getElementById('save-icon-saved');
        savingIcon.classList.toggle('hidden', status !== 'saving');
        savedIcon.classList.toggle('hidden', status !== 'saved');
        textEl.textContent = status === 'saving' ? '저장 중...' : '저장 완료';
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.PosterApp = PosterApp; // Expose global for inline onclick handlers
    PosterApp.init();
});
