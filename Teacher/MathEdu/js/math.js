/**
 * Math Renderer Module
 * Wraps KaTeX for math rendering
 */

const MathRenderer = {
    delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
    ],

    /**
     * Render math in specific element
     * @param {HTMLElement} element
     */
    renderIn(element) {
        if (!window.renderMathInElement) return;

        try {
            renderMathInElement(element, {
                delimiters: this.delimiters,
                throwOnError: false
            });
        } catch (e) {
            console.warn('Math rendering error:', e);
        }
    },

    /**
     * Render math in entire page
     */
    renderPage() {
        this.renderIn(document.body);
    },

    /**
     * Check if KaTeX is loaded
     * @returns {boolean}
     */
    isReady() {
        return !!window.katex && !!window.renderMathInElement;
    },

    /**
     * Wait for KaTeX to load, then call callback
     * @param {Function} callback
     * @param {number} timeout
     */
    onReady(callback, timeout = 5000) {
        if (this.isReady()) {
            callback();
            return;
        }

        const start = Date.now();
        const check = () => {
            if (this.isReady()) {
                callback();
            } else if (Date.now() - start < timeout) {
                setTimeout(check, 100);
            } else {
                console.warn('KaTeX load timeout');
                callback(); // Call anyway
            }
        };
        check();
    }
};

// Export
window.MathRenderer = MathRenderer;
