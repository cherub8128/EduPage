/**
 * Export Module
 * Handles PDF and HTML export functionality
 */

const POSTER_WIDTH = 1190.55;  // PDF A1 width in pixels at 72 DPI
const POSTER_HEIGHT = 1683.78; // PDF A1 height in pixels at 72 DPI

/**
 * Export poster to PDF
 * @param {Object} posterData - Poster data object
 */
async function exportToPdf(posterData) {
    const loader = document.getElementById('loader-overlay');
    loader.classList.remove('hidden');

    const renderContainer = document.createElement('div');
    renderContainer.style.width = `${POSTER_WIDTH}px`;
    renderContainer.style.height = `${POSTER_HEIGHT}px`;
    renderContainer.style.position = 'absolute';
    renderContainer.style.left = '-9999px';
    renderContainer.style.boxSizing = 'border-box';

    document.body.appendChild(renderContainer);

    const posterHTML = window.PosterTemplate.getPosterHTML(posterData);
    renderContainer.innerHTML = posterHTML;

    window.renderMathInElement(renderContainer, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false
    });

    try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(renderContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
        });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a1' });
        pdf.addImage(imgData, 'PNG', 0, 0, 594, 841);

        const authors = posterData.authorName.split('\n').join(', ');
        const filename = `${posterData.projectTitle} (${authors}).pdf`;
        pdf.save(filename);

    } catch (error) {
        console.error("PDF 생성 중 오류 발생:", error);
        alert("PDF를 생성하는 데 실패했습니다. 콘솔을 확인해주세요.");
    } finally {
        document.body.removeChild(renderContainer);
        loader.classList.add('hidden');
    }
}

/**
 * Export poster to standalone HTML file
 * Images are embedded as Base64 for single-file portability
 * @param {Object} posterData - Poster data object
 */
async function exportToHtml(posterData) {
    const loader = document.getElementById('loader-overlay');
    loader.classList.remove('hidden');

    try {
        // Get the poster HTML content
        const posterContent = window.PosterTemplate.getPosterHTML(posterData);

        // Create a temporary container for KaTeX rendering
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = posterContent;
        document.body.appendChild(tempContainer);

        window.renderMathInElement(tempContainer, {
            delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
            throwOnError: false
        });

        const renderedContent = tempContainer.innerHTML;
        document.body.removeChild(tempContainer);

        // Build standalone HTML document
        const htmlDocument = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${posterData.projectTitle} - 포스터</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>">
    
    <!-- Tailwind CSS (CDN) -->
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        slate: {
                            50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
                            300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b',
                            600: '#475569', 700: '#334155', 800: '#1e293b',
                            900: '#0f172a',
                        },
                        navyblue: {
                            DEFAULT: '#023373',
                            '900': '#023373',
                        },
                        gray: {
                            50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb',
                            300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280',
                            600: '#4b5563', 700: '#374151', 800: '#1f2937',
                            900: '#111827',
                        }
                    },
                    boxShadow: {
                        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                    }
                }
            }
        }
    <\/script>
    
    <!-- KaTeX CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
    
    <!-- Fonts -->
    <style>
        @import url('https://rsms.me/inter/inter.css');
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        
        body {
            font-family: 'Pretendard', 'Inter', sans-serif;
        }
        
        .break-inside-avoid {
            break-inside: avoid;
        }
        
        .prose ul {
            list-style-type: disc;
            padding-left: 1.5em;
        }
        
        .prose ol {
            list-style-type: decimal;
            padding-left: 1.5em;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body class="bg-white text-gray-800">
    <div id="poster" style="width: ${POSTER_WIDTH}px; height: ${POSTER_HEIGHT}px; margin: 0 auto;">
        ${renderedContent}
    </div>
    <div style="height: 80px;"></div>
</body>
</html>`;

        // Create download
        const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const authors = posterData.authorName.split('\n').join(', ');
        link.download = `${posterData.projectTitle} (${authors}).html`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("HTML 생성 중 오류 발생:", error);
        alert("HTML을 생성하는 데 실패했습니다. 콘솔을 확인해주세요.");
    } finally {
        loader.classList.add('hidden');
    }
}

// Export for use in other modules
window.PosterExport = {
    POSTER_WIDTH,
    POSTER_HEIGHT,
    exportToPdf,
    exportToHtml
};
