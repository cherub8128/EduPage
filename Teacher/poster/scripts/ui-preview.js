/**
 * Preview UI handling
 */
window.PosterPreviewUI = {
    /**
     * Render the poster preview
     * @param {Object} data - The poster data
     * @param {number} width - Poster width
     * @param {number} height - Poster height
     * @param {number} zoomLevel - Current zoom level
     */
    render(data, width, height, zoomLevel) {
        const poster = document.getElementById('poster-preview');
        poster.style.width = `${width}px`;
        poster.style.height = `${height}px`;

        poster.innerHTML = window.PosterTemplate.getPosterHTML(data);
        this.applyZoom(zoomLevel);

        if (window.renderMathInElement) {
            window.renderMathInElement(poster, {
                delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
                throwOnError: false
            });
        }
    },

    /**
     * Apply zoom transformation
     * @param {number} level - Zoom level
     */
    applyZoom(level) {
        const poster = document.getElementById('poster-preview');
        if (!poster) return;
        poster.style.transformOrigin = 'top left';
        poster.style.transform = `scale(${level})`;
    },

    /**
     * Toggle preview panel visibility
     */
    toggle() {
        const previewPanel = document.getElementById('preview-panel');
        const editorPanel = document.getElementById('editor-panel');
        const toggleText = document.getElementById('toggle-text');

        previewPanel.classList.toggle('hidden');
        if (previewPanel.classList.contains('hidden')) {
            editorPanel.classList.remove('lg:w-1/2');
            editorPanel.classList.add('w-full');
            toggleText.textContent = "미리보기 보이기";
        } else {
            editorPanel.classList.add('lg:w-1/2');
            editorPanel.classList.remove('w-full');
            toggleText.textContent = "미리보기 감추기";
        }
    }
};
