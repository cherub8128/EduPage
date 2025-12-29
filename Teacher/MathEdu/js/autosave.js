/**
 * Autosave Status Module
 * Shows save status indicator to users
 */

const AutosaveStatus = {
    statusTimer: null,

    /**
     * Show save status
     * @param {'saving'|'saved'} state
     */
    show(state) {
        const statusEl = document.getElementById('autosave-status');
        if (!statusEl) return;

        const textEl = document.getElementById('autosave-text');
        const iconSaving = document.getElementById('autosave-icon-saving');
        const iconSaved = document.getElementById('autosave-icon-saved');

        clearTimeout(this.statusTimer);
        statusEl.style.opacity = '1';

        if (state === 'saving') {
            if (textEl) textEl.textContent = '저장 중...';
            if (iconSaving) iconSaving.classList.remove('hidden');
            if (iconSaved) iconSaved.classList.add('hidden');
        } else if (state === 'saved') {
            if (textEl) textEl.textContent = '저장 완료';
            if (iconSaving) iconSaving.classList.add('hidden');
            if (iconSaved) iconSaved.classList.remove('hidden');
            this.statusTimer = setTimeout(() => {
                statusEl.style.opacity = '0';
            }, 2000);
        }
    },

    /**
     * Create autosave handler for a field
     * @param {HTMLElement} field
     * @param {StorageManager} storage
     * @param {number} delay - Delay in ms before saving
     * @returns {Function} Event handler
     */
    createHandler(field, storage, delay = 1200) {
        let saveTimer = null;

        return () => {
            clearTimeout(saveTimer);
            this.show('saving');
            saveTimer = setTimeout(() => {
                storage.save(field.id, field.value);
                this.show('saved');
            }, delay);
        };
    },

    /**
     * Setup autosave for all editable fields
     * @param {string} selector
     * @param {StorageManager} storage
     */
    setup(selector, storage) {
        document.querySelectorAll(selector).forEach(field => {
            field.addEventListener('input', this.createHandler(field, storage));
        });
    }
};

// Export
window.AutosaveStatus = AutosaveStatus;
