/**
 * Poster Template Module
 * Contains HTML template generation for poster preview and export
 */

/**
 * Parse markdown content to HTML
 * @param {string} content - Markdown content
 * @returns {string} HTML content
 */
function parseContent(content) {
    return marked.parse(content || '', { breaks: true, gfm: true });
}

/**
 * Create HTML for a single preview block
 * @param {Object} block - Block data
 * @param {Object} colors - Color settings {textColor, cardColor, lineColor, headerColor}
 * @returns {string} HTML string
 */
function createPreviewBlock(block, colors = {}) {
    const lineColor = colors.lineColor || '#023373';
    const cardColor = colors.cardColor || '#f8fafc';
    const headerColor = colors.headerColor || '#111827';

    const blockWrapper = (content) => `<div class="p-3 border border-slate-200 rounded-lg shadow-soft break-inside-avoid" style="background-color: ${cardColor}">${content}</div>`;

    switch (block.type) {
        case 'header':
            // Use headerColor for text and lineColor for border
            return `<h2 class="text-base font-bold pl-2" style="border-left: 4px solid ${lineColor}; color: ${headerColor}">${block.content}</h2>`;
        case 'text':
            return blockWrapper(`<div class="text-xs leading-relaxed prose max-w-none text-gray-800/90">${parseContent(block.content)}</div>`);
        case 'image':
            const imgSrc = block.content || 'https://placehold.co/600x400/e2e8f0/cbd5e0?text=Image+Not+Found';
            return blockWrapper(`
                <div class="break-inside-avoid">
                    <img src="${imgSrc}" alt="${block.caption || 'Poster image'}" class="w-full rounded-md shadow-md mb-1" onerror="this.onerror=null;this.src='https://placehold.co/600x400/e2e8f0/cbd5e0?text=Image+Load+Failed';">
                    <p class="text-center text-[0.65rem] text-slate-600">${block.caption || ''}</p>
                </div>`);
        default:
            return '';
    }
}

/**
 * Get accent color for a theme (legacy support)
 * @param {string} theme - Theme name
 * @returns {string} Hex color code
 */
function getThemeColor(theme) {
    const colors = {
        navyblue: '#023373',
        emerald: '#059669',
        purple: '#7c3aed',
        orange: '#ea580c',
        rose: '#e11d48',
        slate: '#475569',
    };
    return colors[theme] || colors.navyblue;
}

/**
 * Generate full poster HTML
 * @param {Object} posterData - Poster data object
 * @returns {string} Complete poster HTML
 */
function getPosterHTML(posterData) {
    const challengeTitle = posterData.challengeTitle || "2025 STEAM융합 AI·SW 챌린지";
    const goalLabel = posterData.goalLabel || "프로젝트 핵심 목표";


    // Use new color fields if available, fall back to legacy colorTheme
    const textColor = posterData.textColor || getThemeColor(posterData.colorTheme);
    const cardColor = posterData.cardColor || '#f8fafc';
    const lineColor = posterData.lineColor || getThemeColor(posterData.colorTheme);
    const titleColor = posterData.titleColor || '#111827';
    const headerColor = posterData.headerColor || '#111827';
    const borderColor = posterData.borderColor || '#e2e8f0';

    const colors = { textColor, cardColor, lineColor, titleColor, headerColor, borderColor };

    return `
        <div class="bg-white p-6 h-full w-full flex flex-col box-border relative">
            <div class="absolute top-6 right-0 w-6 h-6" style="background-color: ${lineColor}"></div>
            <div class="text-xs font-semibold mb-2" style="color: ${textColor}">${challengeTitle}</div>
            <header class="flex items-start mb-3 border-b-2 pb-3" style="border-color: ${borderColor}">
                <div class="mr-4 flex-shrink-0">
                    <div class="w-16 h-16 border-2 flex flex-col justify-center items-center rounded-md" style="border-color: ${borderColor}">
                        <span class="text-[0.6rem] font-bold text-slate-500">출품번호</span>
                        <div class="h-6"></div>
                    </div>
                </div>
                <div class="flex-grow pt-1">
                    <h1 class="text-3xl font-bold leading-tight" style="color: ${titleColor}">${posterData.projectTitle}</h1>
                </div>
            </header>
            <div class="grid grid-cols-5 gap-x-4 my-4 border-b-2 pb-4 items-start" style="border-color: ${borderColor}">
                <div class="col-span-3">
                    <h2 class="text-base font-bold mb-1" style="color: ${headerColor}">${goalLabel}</h2>
                    <div class="text-xs leading-relaxed prose max-w-none text-gray-800/90">${parseContent(posterData.projectGoal)}</div>
                </div>
                <div class="col-span-2 text-left pl-3">
                    <div class="p-2 border rounded-lg shadow-soft h-full" style="background-color: ${cardColor}; border-color: ${borderColor}">
                        <h3 class="font-bold text-sm text-gray-900">출품자</h3>
                        <p class="mt-1 mb-2 text-xs text-gray-800/90 whitespace-pre-line">${posterData.authorName}</p>
                        <h3 class="font-bold text-sm text-gray-900">지도교사</h3>
                        <p class="mt-1 text-xs text-gray-800/90">${posterData.instructorName}</p>
                    </div>
                </div>
            </div>
            <main class="grid grid-cols-3 gap-x-4 flex-grow">
                ${posterData.columns.map(col => `
                    <div class="flex flex-col space-y-4">
                        ${col.map(block => createPreviewBlock(block, colors)).join('')}
                    </div>
                `).join('')}
            </main>
        </div>`;
}

// Export for use in other modules
window.PosterTemplate = {
    parseContent,
    createPreviewBlock,
    getPosterHTML,
    getThemeColor
};
