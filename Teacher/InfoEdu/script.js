// Standardized Report App
// This script can be reused across different report formats.

document.addEventListener('DOMContentLoaded', () => {
    // A factory function to create a report instance
    window.createReportApp = (config) => {
        // --- 1. ESSENTIAL LIBRARIES CHECK ---
        const requiredLibs = ['showdown', 'html2canvas', 'jspdf', 'renderMathInElement', 'hljs'];
        const missingLibs = requiredLibs.filter(lib => typeof window[lib] === 'undefined');
        if (missingLibs.length > 0) {
            console.error("Required libraries are not loaded:", missingLibs);
            alert(`페이지에 필요한 라이브러리(${missingLibs.join(', ')})를 로드하지 못했습니다. 인터넷 연결을 확인 후 새로고침 해주세요.`);
            return;
        }

        // --- 2. CONFIGURATION AND ELEMENTS ---
        const { storageKey, savableSelector, screenshotCount, hasCodeBlock } = config;
        const converter = new showdown.Converter({ simpleLineBreaks: true, tables: true, strikethrough: true });
        const exportBtn = document.getElementById('export-pdf');
        const autosaveStatusEl = document.getElementById('autosave-status');
        let saveTimer;
        let statusTimer;

        // --- 3. UI & RENDERING FUNCTIONS ---
        function showSaveStatus(state) {
            if (!autosaveStatusEl) return;
            const textEl = autosaveStatusEl.querySelector('#autosave-text');
            const iconSaving = autosaveStatusEl.querySelector('#autosave-icon-saving');
            const iconSaved = autosaveStatusEl.querySelector('#autosave-icon-saved');
            
            clearTimeout(statusTimer);
            autosaveStatusEl.classList.remove('opacity-0');

            if (state === 'saving') {
                if(textEl) textEl.textContent = '저장 중...';
                if(iconSaving) iconSaving.classList.remove('hidden');
                if(iconSaved) iconSaved.classList.add('hidden');
            } else if (state === 'saved') {
                if(textEl) textEl.textContent = '모든 변경사항이 저장되었습니다.';
                if(iconSaving) iconSaving.classList.add('hidden');
                if(iconSaved) iconSaved.classList.remove('hidden');
                statusTimer = setTimeout(() => autosaveStatusEl.classList.add('opacity-0'), 2000);
            }
        }

        function updateMarkdownPreview(textareaElement) {
            if (!textareaElement) return;
            const preview = textareaElement.nextElementSibling;
            if (preview && preview.classList.contains('markdown-preview')) {
                const placeholder = '<p class="text-slate-400">내용을 입력하세요...</p>';
                const html = textareaElement.value ? converter.makeHtml(textareaElement.value) : placeholder;
                preview.innerHTML = html;
                renderMathInElement(preview, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}] });
            }
        }

        function updateCodePreview() {
            if (!hasCodeBlock) return;
            const textarea = document.getElementById('code-input');
            const preview = document.getElementById('code-preview');
            if (textarea && preview) {
                preview.textContent = textarea.value || '// 코드를 입력하세요...';
                hljs.highlightElement(preview);
            }
        }
        
        function autoResizeTextarea(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        }

        // --- 4. DATA HANDLING ---
        function saveContent() {
            clearTimeout(saveTimer);
            showSaveStatus('saving');
            saveTimer = setTimeout(() => {
                const data = {};
                document.querySelectorAll(savableSelector).forEach(el => {
                    data[el.id] = el.value;
                });
                for (let i = 1; i <= screenshotCount; i++) {
                    const img = document.getElementById(`screenshot-preview-${i}`);
                    if (img && img.src && !img.src.includes('placeholder')) {
                        data[`screenshot-preview-${i}`] = img.src;
                    }
                }
                localStorage.setItem(storageKey, JSON.stringify(data));
                showSaveStatus('saved');
            }, 1000);
        }

        function loadContent() {
            const data = JSON.parse(localStorage.getItem(storageKey));
            if (!data) {
                document.querySelectorAll('.markdown-input').forEach(updateMarkdownPreview);
                if (hasCodeBlock) updateCodePreview();
                return;
            }

            document.querySelectorAll(savableSelector).forEach(field => {
                if (data.hasOwnProperty(field.id)) {
                    field.value = data[field.id];
                }
            });
            
            for (let i = 1; i <= screenshotCount; i++) {
                if (data[`screenshot-preview-${i}`]) {
                    const preview = document.getElementById(`screenshot-preview-${i}`);
                    const placeholder = document.getElementById(`screenshot-placeholder-${i}`);
                    preview.src = data[`screenshot-preview-${i}`];
                    preview.classList.remove('hidden');
                    if (placeholder) placeholder.classList.add('hidden');
                }
            }

            document.querySelectorAll('.markdown-input').forEach(updateMarkdownPreview);
            if (hasCodeBlock) updateCodePreview();
        }

        // --- 5. PDF EXPORT ---
        async function exportToPdf() {
            const loader = document.getElementById('loader-overlay');
            const reportContent = document.getElementById('report-content');
            const validationMessage = document.getElementById('validation-message');
            let allFilled = true;

            // Validation
            if(validationMessage) validationMessage.textContent = '';
            document.querySelectorAll(savableSelector).forEach(el => {
                const section = el.closest('.report-section');
                const title = section ? section.querySelector('h2, h3') : null;
                if (!el.value.trim()) {
                    if (title) title.classList.add('text-red-500');
                    allFilled = false;
                } else {
                    if (title) title.classList.remove('text-red-500');
                }
            });
            for (let i = 1; i <= screenshotCount; i++) {
                const img = document.getElementById(`screenshot-preview-${i}`);
                const wrapper = img.closest('.screenshot-wrapper');
                if (wrapper) {
                     wrapper.classList.remove('border-red-400', 'border-2');
                    if (!img.src || img.src.includes('placeholder')) {
                        wrapper.classList.add('border-red-400', 'border-2', 'rounded-lg');
                        allFilled = false;
                    }
                }
            }

            if (!allFilled) {
                if(validationMessage) validationMessage.textContent = '모든 필수 항목을 작성하고 스크린샷을 첨부해주세요.';
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            
            if(loader) loader.style.display = 'flex';

            try {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const margin = 15;
                const contentWidth = pdfWidth - (margin * 2);
                let yPosition = margin;

                const sections = Array.from(reportContent.querySelectorAll('.report-section'));

                for (const section of sections) {
                    const canvas = await html2canvas(section, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        onclone: (doc) => {
                            const clonedSection = doc.body.children[0];
                            if (!clonedSection) return;
                            clonedSection.querySelectorAll('.editable-container').forEach(container => {
                                const editor = container.querySelector('textarea');
                                const preview = container.querySelector('.prose, code');
                                if(editor) editor.style.display = 'none';
                                if(preview) preview.style.display = 'block';
                            });
                            renderMathInElement(clonedSection, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}] });
                        }
                    });
                    
                    const imgHeight = (canvas.height * contentWidth) / canvas.width;

                    if (yPosition + imgHeight > pdf.internal.pageSize.getHeight() - margin) {
                        pdf.addPage();
                        yPosition = margin;
                    }

                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, yPosition, contentWidth, imgHeight);
                    yPosition += imgHeight + 5;
                }

                const studentId = document.getElementById('student-id').value.trim() || '학번';
                const studentName = document.getElementById('student-name').value.trim() || '이름';
                const docTitle = document.title.split(' ')[0] || '보고서';
                const filename = `${docTitle}_${studentId}_${studentName}.pdf`;
                pdf.save(filename);

            } catch(error) {
                console.error("PDF generation error:", error);
                alert("PDF를 생성하는 데 실패했습니다. 콘솔을 확인해주세요.");
            } finally {
                if(loader) loader.style.display = 'none';
            }
        }

        // --- 6. INITIALIZATION ---
        function initialize() {
            // Notion-style editing toggle
            document.querySelectorAll('.editable-container').forEach(container => {
                const preview = container.querySelector('.markdown-preview, #code-preview');
                const editor = container.querySelector('textarea');

                if (preview && editor) {
                    preview.addEventListener('click', () => {
                        preview.classList.add('hidden');
                        editor.classList.remove('hidden');
                        editor.focus();
                        autoResizeTextarea(editor);
                    });

                    editor.addEventListener('blur', () => {
                        editor.classList.add('hidden');
                        preview.classList.remove('hidden');
                        if (editor.id === 'code-input' && hasCodeBlock) {
                            updateCodePreview();
                        } else {
                            updateMarkdownPreview(editor);
                        }
                    });
                }
            });

            document.querySelectorAll(savableSelector).forEach(el => {
                el.addEventListener('input', () => {
                    saveContent();
                    if (el.tagName === 'TEXTAREA') autoResizeTextarea(el);
                });
            });

            for (let i = 1; i <= screenshotCount; i++) {
                const input = document.getElementById(`screenshot-input-${i}`);
                if (input) {
                    input.addEventListener('change', (event) => {
                        const preview = document.getElementById(`screenshot-preview-${i}`);
                        const placeholder = document.getElementById(`screenshot-placeholder-${i}`);
                        const file = event.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                preview.src = e.target.result;
                                preview.classList.remove('hidden');
                                if (placeholder) placeholder.classList.add('hidden');
                                saveContent();
                            }
                            reader.readAsDataURL(file);
                        }
                    });
                }
            }
            
            if (exportBtn) exportBtn.addEventListener('click', exportToPdf);

            loadContent();
        }

        initialize();
    };
});

