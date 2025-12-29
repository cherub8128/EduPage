/**
 * PDF Export Module
 * Prepares document and triggers print/save as PDF
 */

const PDFExport = {
    /**
     * Prepare document for printing
     * Hides editors, shows previews
     */
    prepare() {
        // Switch all editors to preview mode
        document.querySelectorAll('.editable-container textarea').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.editable-container .markdown-preview').forEach(el => {
            el.style.display = 'block';
        });

        // Re-render math
        if (window.MathRenderer) {
            MathRenderer.renderPage();
        }
    },

    /**
     * Cleanup after printing
     * Restores editor/preview states
     */
    cleanup() {
        document.querySelectorAll('.editable-container textarea').forEach(el => {
            el.style.display = '';
        });
        document.querySelectorAll('.editable-container .markdown-preview').forEach(el => {
            el.style.display = '';
        });
    },

    /**
     * Generate filename from student info
     * @param {string} prefix
     * @returns {string}
     */
    getFilename(prefix = '보고서') {
        const studentId = document.getElementById('student-id')?.value.trim() || '학번';
        const studentName = document.getElementById('student-name')?.value.trim() || '이름';
        return `${prefix}_${studentId}_${studentName}`;
    },

    /**
     * Save as PDF via browser print
     * @param {string} filenamePrefix
     * @param {Function} validator - Optional validation function
     * @param {string} validationMessageId - Element ID for validation message
     * @param {string} validationMessage - Message to show on validation failure
     */
    save(filenamePrefix, validator = null, validationMessageId = null, validationMessage = '') {
        // Validate if validator provided
        if (validator && !validator()) {
            if (validationMessageId && validationMessage) {
                if (window.FormValidator) {
                    FormValidator.showMessage(validationMessageId, validationMessage);
                }
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Clear validation message
        if (validationMessageId && window.FormValidator) {
            FormValidator.showMessage(validationMessageId, '');
        }

        this.prepare();

        // Set document title for filename
        const prevTitle = document.title;
        document.title = this.getFilename(filenamePrefix);

        // Setup cleanup after print
        const cleanup = () => {
            this.cleanup();
            document.title = prevTitle;
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);

        // Trigger print
        window.print();
    },

    /**
     * Create global save handler
     * @param {string} filenamePrefix
     * @param {Function} validator
     * @param {string} messageId
     * @param {string} message
     */
    createGlobalHandler(filenamePrefix, validator, messageId, message) {
        window.saveAsPdf = () => {
            this.save(filenamePrefix, validator, messageId, message);
        };
    }
};

// Export
window.PDFExport = PDFExport;
