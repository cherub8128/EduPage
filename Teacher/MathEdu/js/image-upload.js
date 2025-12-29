/**
 * Image Upload Module
 * Handles image upload, preview, and storage
 */

const ImageUpload = {
    /**
     * Preview uploaded image
     * @param {Event} event - Input change event
     * @param {number|string} id - Image identifier
     * @param {StorageManager} storage - Optional storage manager
     */
    preview(event, id, storage = null) {
        const preview = document.getElementById(`screenshot-preview-${id}`);
        const placeholder = document.getElementById(`screenshot-placeholder-${id}`);
        const file = event.target?.files?.[0];

        if (!file || !preview) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            preview.src = base64;
            preview.classList.remove('hidden');
            if (placeholder) placeholder.classList.add('hidden');

            // Save to storage if provided
            if (storage) {
                if (window.AutosaveStatus) AutosaveStatus.show('saving');
                storage.save(`screenshot-preview-${id}`, base64);
                if (window.AutosaveStatus) AutosaveStatus.show('saved');
            }
        };
        reader.readAsDataURL(file);
    },

    /**
     * Load saved image from storage
     * @param {number|string} id
     * @param {StorageManager} storage
     */
    load(id, storage) {
        if (!storage) return;

        const saved = storage.load(`screenshot-preview-${id}`);
        if (!saved) return;

        const preview = document.getElementById(`screenshot-preview-${id}`);
        const placeholder = document.getElementById(`screenshot-placeholder-${id}`);

        if (preview) {
            preview.src = saved;
            preview.classList.remove('hidden');
        }
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
    },

    /**
     * Load multiple images
     * @param {number[]} ids
     * @param {StorageManager} storage
     */
    loadAll(ids, storage) {
        ids.forEach(id => this.load(id, storage));
    },

    /**
     * Create global preview handler
     * @param {StorageManager} storage
     */
    createGlobalHandler(storage) {
        window.previewImage = (event, id) => {
            this.preview(event, id, storage);
        };
    }
};

// Export
window.ImageUpload = ImageUpload;
