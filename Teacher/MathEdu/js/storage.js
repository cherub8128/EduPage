/**
 * Storage Manager Module
 * Handles localStorage with prefix namespacing
 */

class StorageManager {
    /**
     * @param {string} prefix - Namespace prefix for storage keys
     */
    constructor(prefix = '') {
        this.prefix = prefix;
    }

    /**
     * Get full storage key with prefix
     * @param {string} id
     * @returns {string}
     */
    getKey(id) {
        return this.prefix + id;
    }

    /**
     * Save value to localStorage
     * @param {string} id
     * @param {string} value
     */
    save(id, value) {
        try {
            localStorage.setItem(this.getKey(id), value);
        } catch (e) {
            console.warn('Storage save failed:', e);
        }
    }

    /**
     * Load value from localStorage
     * @param {string} id
     * @returns {string|null}
     */
    load(id) {
        return localStorage.getItem(this.getKey(id));
    }

    /**
     * Remove value from localStorage
     * @param {string} id
     */
    remove(id) {
        localStorage.removeItem(this.getKey(id));
    }

    /**
     * Save JSON object
     * @param {string} id
     * @param {any} obj
     */
    saveJSON(id, obj) {
        this.save(id, JSON.stringify(obj));
    }

    /**
     * Load JSON object
     * @param {string} id
     * @param {any} defaultValue
     * @returns {any}
     */
    loadJSON(id, defaultValue = null) {
        const saved = this.load(id);
        if (!saved) return defaultValue;
        try {
            return JSON.parse(saved);
        } catch {
            return defaultValue;
        }
    }

    /**
     * Save all editable fields in a container
     * @param {HTMLElement[]} fields
     */
    saveFields(fields) {
        fields.forEach(field => {
            if (field.id) {
                this.save(field.id, field.value);
            }
        });
    }

    /**
     * Load values into editable fields
     * @param {HTMLElement[]} fields
     */
    loadFields(fields) {
        fields.forEach(field => {
            const saved = this.load(field.id);
            if (saved) field.value = saved;
        });
    }

    /**
     * Clear all keys with this prefix
     * @param {string[]} keys - Specific keys to clear
     */
    clear(keys) {
        keys.forEach(key => this.remove(key));
    }
}

// Export
window.StorageManager = StorageManager;
