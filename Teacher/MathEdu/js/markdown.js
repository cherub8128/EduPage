/**
 * Markdown Preview Module
 * Converts markdown to HTML with click-to-edit functionality
 */

const MarkdownPreview = {
    converter: null,

    /**
     * Initialize the markdown converter
     */
    init() {
        if (!window.showdown) {
            console.warn('Showdown not loaded');
            return;
        }

        this.converter = new showdown.Converter({
            ghCodeBlocks: true,
            simpleLineBreaks: true,
            literalMidWordUnderscores: true,
            disableForced4SpacesIndentedSublists: true,
            excludeTrailingPunctuationFromURLs: true
        });
        showdown.setOption('literalMidWordAsterisks', true);
    },

    /**
     * Convert markdown to HTML
     * @param {string} text
     * @returns {string}
     */
    toHtml(text) {
        if (!this.converter) return text;
        return this.converter.makeHtml(text);
    },

    /**
     * Update preview from textarea
     * @param {HTMLTextAreaElement} element
     */
    update(element) {
        if (!this.converter) return;

        const container = element.closest('.editable-container');
        if (!container) return;

        const preview = container.querySelector('.markdown-preview');
        if (!preview) return;

        let text = element.value;

        // Wrap as code block for code fields
        if (element.id?.includes('code')) {
            const lang = text.trim().startsWith('http') ? '' : 'python';
            text = "```" + lang + "\n" + text + "\n```";
        }

        const placeholder = '<p style="color:var(--muted);">내용을 입력하세요...</p>';
        preview.innerHTML = text ? this.toHtml(text) : placeholder;

        // Render math if available
        if (window.MathRenderer) {
            MathRenderer.renderIn(preview);
        }

        // Highlight code if available
        if (window.Prism) {
            Prism.highlightAllUnder(preview);
        }
    },

    /**
     * Auto-resize textarea to content
     * @param {HTMLTextAreaElement} textarea
     */
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    },

    /**
     * Setup click-to-edit for a container
     * @param {HTMLElement} container
     */
    setupEditor(container) {
        const preview = container.querySelector('.markdown-preview');
        const editor = container.querySelector('textarea');

        if (!preview || !editor) return;

        preview.addEventListener('click', () => {
            preview.style.display = 'none';
            editor.style.display = 'block';
            editor.focus();
            this.autoResize(editor);
        });

        editor.addEventListener('blur', () => {
            editor.style.display = 'none';
            preview.style.display = 'block';
            this.update(editor);
        });

        editor.addEventListener('input', () => {
            this.autoResize(editor);
        });
    },

    /**
     * Setup all editable containers
     * @param {string} selector
     */
    setupAll(selector = '.editable-container') {
        document.querySelectorAll(selector).forEach(container => {
            this.setupEditor(container);
        });
    },

    /**
     * Update all previews
     * @param {string} selector
     */
    updateAll(selector = '.markdown-input') {
        document.querySelectorAll(selector).forEach(el => {
            this.update(el);
        });
    }
};

// Export
window.MarkdownPreview = MarkdownPreview;
