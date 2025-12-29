/**
 * Form Validation Module
 * Validates required fields and images
 */

const FormValidator = {
    /**
     * Validate required text fields
     * @param {string[]} fieldIds
     * @returns {boolean}
     */
    validateFields(fieldIds) {
        let valid = true;

        fieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (!field) return;

            field.classList.remove('is-invalid');
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                valid = false;
            }
        });

        return valid;
    },

    /**
     * Validate required images
     * @param {(number|string)[]} imageIds
     * @returns {boolean}
     */
    validateImages(imageIds) {
        let valid = true;

        imageIds.forEach(id => {
            const preview = document.getElementById(`screenshot-preview-${id}`);
            const container = preview?.parentElement;
            if (!container) return;

            container.style.borderColor = '';
            if (preview.classList.contains('hidden')) {
                container.style.borderColor = 'var(--color-invalid)';
                valid = false;
            }
        });

        return valid;
    },

    /**
     * Validate all required elements
     * @param {string[]} fieldIds
     * @param {(number|string)[]} imageIds
     * @returns {boolean}
     */
    validate(fieldIds = [], imageIds = []) {
        const fieldsValid = this.validateFields(fieldIds);
        const imagesValid = this.validateImages(imageIds);
        return fieldsValid && imagesValid;
    },

    /**
     * Show validation message
     * @param {string} elementId
     * @param {string} message
     */
    showMessage(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = message;
    },

    /**
     * Clear all validation states
     * @param {string[]} fieldIds
     * @param {(number|string)[]} imageIds
     */
    clear(fieldIds = [], imageIds = []) {
        fieldIds.forEach(id => {
            document.getElementById(id)?.classList.remove('is-invalid');
        });

        imageIds.forEach(id => {
            const preview = document.getElementById(`screenshot-preview-${id}`);
            if (preview?.parentElement) {
                preview.parentElement.style.borderColor = '';
            }
        });
    },

    /**
     * Scroll to first invalid field
     */
    scrollToFirst() {
        const firstInvalid = document.querySelector('.is-invalid');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus();
        }
    }
};

// Export
window.FormValidator = FormValidator;
