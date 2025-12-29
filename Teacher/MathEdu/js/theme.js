/**
 * Theme Manager Module
 * Handles dark/light theme switching and persistence
 */

const ThemeManager = {
    STORAGE_KEY: 'mathedu_theme',

    /**
     * Get current theme from localStorage
     * @returns {'auto'|'dark'|'light'}
     */
    get() {
        return localStorage.getItem(this.STORAGE_KEY) || 'auto';
    },

    /**
     * Set and apply theme
     * @param {'auto'|'dark'|'light'} theme
     */
    set(theme) {
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.apply();
    },

    /**
     * Apply current theme to document body
     * @returns {string} Applied theme
     */
    apply() {
        const theme = this.get();
        document.body.setAttribute('data-theme', theme);
        return theme;
    },

    /**
     * Toggle to next theme in cycle: auto -> dark -> light -> auto
     * @returns {string} New theme
     */
    toggle() {
        const current = this.get();
        const next = current === 'auto' ? 'dark' : (current === 'dark' ? 'light' : 'auto');
        this.set(next);
        return next;
    },

    /**
     * Get display label for theme
     * @param {string} theme
     * @returns {string} Label with emoji
     */
    getLabel(theme) {
        const labels = {
            'dark': '🌙 다크',
            'light': '☀️ 라이트',
            'auto': '🌓 자동'
        };
        return labels[theme] || labels.auto;
    },

    /**
     * Bind theme toggle button
     * @param {string} buttonId
     */
    bindButton(buttonId) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.textContent = this.getLabel(this.get());
        btn.addEventListener('click', () => {
            const newTheme = this.toggle();
            btn.textContent = this.getLabel(newTheme);
        });
    },

    /**
     * Initialize theme on page load
     */
    init() {
        this.apply();
    }
};

// Export
window.ThemeManager = ThemeManager;
