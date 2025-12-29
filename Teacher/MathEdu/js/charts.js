/**
 * Chart Utilities Module
 * Common chart helpers for Chart.js
 */

const ChartUtils = {
    /**
     * Get chart colors from CSS variables
     * @returns {Object}
     */
    getColors() {
        const style = getComputedStyle(document.body);
        return {
            muted: style.getPropertyValue('--muted') || '#666',
            text: style.getPropertyValue('--text') || '#000',
            line: style.getPropertyValue('--line') || '#ddd',
            primary: style.getPropertyValue('--color-primary') || '#3b82f6',
            accent: style.getPropertyValue('--accent') || '#7c5cff',
            accent2: style.getPropertyValue('--accent2') || '#00d4ff'
        };
    },

    /**
     * Convert parallel arrays to chart points
     * @param {number[]} x
     * @param {number[]} y
     * @returns {Array<{x: number, y: number}>}
     */
    toPoints(x, y) {
        const pts = [];
        for (let i = 0; i < x.length; i++) {
            if (isFinite(x[i]) && isFinite(y[i])) {
                pts.push({ x: x[i], y: y[i] });
            }
        }
        return pts;
    },

    /**
     * Create a line chart
     * @param {HTMLCanvasElement} canvas
     * @param {Array} datasets
     * @param {string} title
     * @returns {Chart}
     */
    createLineChart(canvas, datasets, title = '') {
        if (!window.Chart) {
            console.warn('Chart.js not loaded');
            return null;
        }

        const colors = this.getColors();

        return new Chart(canvas, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: colors.muted } },
                    title: {
                        display: !!title,
                        text: title,
                        color: colors.text
                    },
                    tooltip: { mode: 'nearest', intersect: false }
                },
                scales: {
                    x: {
                        type: 'linear',
                        ticks: { color: colors.muted },
                        grid: { color: colors.line }
                    },
                    y: {
                        ticks: { color: colors.muted },
                        grid: { color: colors.line }
                    }
                }
            }
        });
    },

    /**
     * Update chart datasets
     * @param {Chart} chart
     * @param {Array} datasets
     */
    updateChart(chart, datasets) {
        if (!chart) return;
        chart.data.datasets = datasets;
        chart.update();
    },

    /**
     * Refresh chart colors (for theme change)
     * @param {Chart} chart
     */
    refreshColors(chart) {
        if (!chart) return;

        const colors = this.getColors();
        chart.options.plugins.legend.labels.color = colors.muted;
        chart.options.plugins.title.color = colors.text;
        chart.options.scales.x.ticks.color = colors.muted;
        chart.options.scales.y.ticks.color = colors.muted;
        chart.options.scales.x.grid.color = colors.line;
        chart.options.scales.y.grid.color = colors.line;
        chart.update();
    },

    /**
     * Setup theme observer for charts
     * @param {Chart[]} charts
     */
    observeTheme(charts) {
        const observer = new MutationObserver(() => {
            charts.filter(Boolean).forEach(c => this.refreshColors(c));
        });
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    },

    /**
     * Create empty dataset template
     * @param {string} label
     * @param {Object} options
     * @returns {Object}
     */
    emptyDataset(label, options = {}) {
        return {
            label,
            data: [],
            parsing: false,
            borderWidth: 2,
            pointRadius: 0,
            ...options
        };
    }
};

// Export
window.ChartUtils = ChartUtils;
