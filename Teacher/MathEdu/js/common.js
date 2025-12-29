/**
 * MathEdu Common - Module Loader
 * Loads all atomic modules and provides unified API
 */

// This file serves as a convenient single import that loads all modules
// Individual modules can also be loaded separately for smaller bundles

// Module loading order (respects dependencies):
// 1. theme.js - No dependencies
// 2. storage.js - No dependencies
// 3. math.js - No dependencies
// 4. autosave.js - Depends on storage
// 5. markdown.js - Depends on math
// 6. image-upload.js - Depends on autosave, storage
// 7. validation.js - No dependencies
// 8. pdf-export.js - Depends on math, validation
// 9. charts.js - No dependencies

/**
 * MathEdu namespace - provides access to all modules
 */
window.MathEdu = {
    // Modules are attached by their respective files
    get Theme() { return window.ThemeManager; },
    get Storage() { return window.StorageManager; },
    get Autosave() { return window.AutosaveStatus; },
    get Markdown() { return window.MarkdownPreview; },
    get Math() { return window.MathRenderer; },
    get Image() { return window.ImageUpload; },
    get Validator() { return window.FormValidator; },
    get PDF() { return window.PDFExport; },
    get Charts() { return window.ChartUtils; },

    /**
     * Initialize all modules for a report page
     * @param {Object} config
     */
    initReport(config = {}) {
        const {
            storagePrefix = 'mathedu_',
            themeButtonId = 'themeBtn',
            imageIds = [1, 2],
            requiredFields = [],
            requiredImages = [],
            pdfPrefix = '보고서',
            validationMessageId = 'validation-message',
            validationMessage = '필수 항목을 모두 작성해주세요.'
        } = config;

        // Initialize storage
        const storage = new StorageManager(storagePrefix);

        // Initialize theme
        if (window.ThemeManager) {
            ThemeManager.init();
            ThemeManager.bindButton(themeButtonId);
        }

        // Initialize markdown
        if (window.MarkdownPreview) {
            MarkdownPreview.init();
        }

        // Setup image upload handler
        if (window.ImageUpload) {
            ImageUpload.createGlobalHandler(storage);
            ImageUpload.loadAll(imageIds, storage);
        }

        // Load saved fields
        storage.loadFields(document.querySelectorAll('.editable-field'));

        // Setup autosave
        if (window.AutosaveStatus) {
            AutosaveStatus.setup('.editable-field', storage);
        }

        // Setup markdown editors
        if (window.MarkdownPreview) {
            MarkdownPreview.setupAll();
            MarkdownPreview.updateAll();
        }

        // Render math
        if (window.MathRenderer) {
            MathRenderer.onReady(() => {
                MathRenderer.renderPage();
            });
        }

        // Setup PDF export
        if (window.PDFExport && window.FormValidator) {
            const validator = () => {
                return FormValidator.validate(requiredFields, requiredImages);
            };
            PDFExport.createGlobalHandler(pdfPrefix, validator, validationMessageId, validationMessage);
        }

        return { storage };
    }
};
