/**
 * Editor UI handling
 */
window.PosterEditorUI = {
    /**
     * Render the editor panel
     * @param {Object} data - The poster data
     */
    render(data) {
        const editorFields = document.getElementById('editor-fields');
        editorFields.innerHTML = '';

        // Quick Themes Configuration
        const quickThemes = [
            { id: 'classic-blue', label: '클래식 블루', colors: { textColor: '#0f4c81', titleColor: '#0f4c81', headerColor: '#1b3b5a', cardColor: '#f0f4f8', lineColor: '#0f4c81', borderColor: '#e2e8f0' } },
            { id: 'peach-fuzz', label: '피치 퍼즈', colors: { textColor: '#ffbe98', titleColor: '#9e4624', headerColor: '#be5a31', cardColor: '#fdf5f2', lineColor: '#ffbe98', borderColor: '#fed7aa' } },
            { id: 'viva-magenta', label: '비바 마젠타', colors: { textColor: '#be3455', titleColor: '#7a1b32', headerColor: '#992243', cardColor: '#fff0f3', lineColor: '#be3455', borderColor: '#fbcfe8' } },
            { id: 'very-peri', label: '베리 페리', colors: { textColor: '#6667ab', titleColor: '#3a3b7b', headerColor: '#4f5096', cardColor: '#f5f5fa', lineColor: '#6667ab', borderColor: '#c7c7f1' } },
            { id: 'emerald', label: '에메랄드', colors: { textColor: '#047857', titleColor: '#064e3b', headerColor: '#065f46', cardColor: '#ecfdf5', lineColor: '#059669', borderColor: '#a7f3d0' } },
            { id: 'illuminating', label: '모던 옐로우', colors: { textColor: '#93a600', titleColor: '#4a5200', headerColor: '#6b7500', cardColor: '#fcfdf5', lineColor: '#f5df4d', borderColor: '#fde047' } },
            { id: 'sage-earth', label: '세이지 & 어스', colors: { textColor: '#5b6348', titleColor: '#3e4a35', headerColor: '#4b5540', cardColor: '#f6f7f4', lineColor: '#859074', borderColor: '#d6d3d1' } },
            { id: 'slate-minimal', label: '어반 그레이', colors: { textColor: '#475569', titleColor: '#1e293b', headerColor: '#334155', cardColor: '#f8fafc', lineColor: '#64748b', borderColor: '#e2e8f0' } },
            { id: 'sunset', label: '선셋 오렌지', colors: { textColor: '#ea580c', titleColor: '#9a3412', headerColor: '#c2410c', cardColor: '#fff7ed', lineColor: '#f97316', borderColor: '#ffedd5' } },
            { id: 'lavender', label: '소프트 라벤더', colors: { textColor: '#7c3aed', titleColor: '#5b21b6', headerColor: '#6d28d9', cardColor: '#faf5ff', lineColor: '#8b5cf6', borderColor: '#ddd6fe' } },
        ];

        // Template Presets
        const templates = [
            { file: 'steam_challenge.json', name: 'STEAM융합 AI·SW 챌린지' },
            { file: 'python_toy.json', name: '파이썬 토이 프로젝트' },
            { file: 'data_analysis.json', name: '데이터 분석 프로젝트' },
            { file: 'empty.json', name: '전부 비어있는 양식' }
        ];

        const createTemplateButton = (t) => `
            <button type="button" 
                onclick="window.PosterApp.loadPreset('${t.file}')"
                class="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                ${t.name}
            </button>
        `;

        const createThemeButton = (theme) => `
            <button type="button" 
                class="px-3 py-1.5 rounded-md text-xs font-medium border transition-all hover:shadow-md theme-btn shrink-0" 
                style="background-color: ${theme.colors.cardColor}; border-color: ${theme.colors.lineColor}; color: ${theme.colors.textColor}"
                data-theme='${JSON.stringify(theme.colors)}'>
                ${theme.label}
            </button>
        `;

        const createColorInput = (label, key, value, extraHtml = '') => {
            const safeValue = value || '#000000';
            return `
            <div class="mb-3">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">${label}</label>
                <div class="flex items-center gap-2 group">
                    <div class="relative w-10 h-10 rounded-lg shadow-sm border border-slate-200 overflow-hidden shrink-0 group-hover:border-slate-400 transition-colors">
                        <input type="color" data-key="${key}" class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" value="${safeValue}">
                        <div class="w-full h-full" style="background-color: ${safeValue}" data-color-preview="${key}"></div>
                    </div>
                    <div class="relative flex-1">
                        <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">#</span>
                        <input type="text" data-key="${key}" 
                            class="w-full pl-5 pr-2 py-2 border-slate-200 rounded-lg text-sm font-mono text-slate-700 bg-slate-50 focus:bg-white focus:border-navyblue-500 focus:ring-1 focus:ring-navyblue-500 transition-all uppercase" 
                            value="${safeValue.replace('#', '')}" maxlength="7">
                    </div>
                </div>
                ${extraHtml}
            </div>
            `;
        };

        const mainInfoHtml = `
            <!-- Template Section -->
            <div class="space-y-3 p-4 border border-indigo-100 rounded-xl bg-indigo-50/50 mb-4">
                <div class="flex items-center justify-between">
                    <h3 class="font-bold text-sm text-indigo-900 flex items-center gap-2">
                        <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        템플릿 불러오기
                    </h3>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${templates.map(createTemplateButton).join('')}
                </div>
            </div>

            <div class="space-y-4 p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
                <h3 class="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    포스터 기본 정보
                </h3>
                <div class="grid grid-cols-2 gap-5">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1.5">활동 이름</label>
                        <input type="text" data-key="challengeTitle" class="w-full border-slate-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" value="${data.challengeTitle}">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-1.5">프로젝트 제목</label>
                        <input type="text" data-key="projectTitle" class="w-full border-slate-300 rounded-lg shadow-sm p-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" value="${data.projectTitle}">
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-5">
                    <div class="col-span-2 space-y-3">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1.5">
                                목표 섹션 라벨 <span class="text-xs font-normal text-slate-400 ml-1">(제목 직접 수정 가능)</span>
                            </label>
                            <input type="text" data-key="goalLabel" class="w-full border-slate-300 rounded-lg shadow-sm p-2 text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value="${data.goalLabel}">
                        </div>
                        <textarea data-key="projectGoal" class="w-full border-slate-300 rounded-lg shadow-sm p-3 text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all leading-relaxed" placeholder="프로젝트 목표를 입력하세요...">${data.projectGoal}</textarea>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1.5">출품자 <span class="text-xs font-normal text-slate-400">(줄바꿈 구분)</span></label>
                            <textarea data-key="authorName" class="w-full border-slate-300 rounded-lg shadow-sm p-3 text-sm h-[6.5rem] resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all leading-relaxed">${data.authorName}</textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1.5">지도교사</label>
                            <input type="text" data-key="instructorName" class="w-full border-slate-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" value="${data.instructorName}">
                        </div>
                    </div>
                </div>
            </div>

            <div class="space-y-5 p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
                <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 class="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <svg class="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                        디자인 & 색상
                    </h3>
                    <div class="flex gap-2 flex-wrap justify-end max-w-[70%]">
                        ${quickThemes.map(createThemeButton).join('')}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div class="md:col-span-1 border-r border-slate-100 pr-4">
                        <h4 class="text-xs font-bold text-slate-400 mb-3">헤더 영역</h4>
                        ${createColorInput('활동 이름', 'textColor', data.textColor)}
                        ${createColorInput('프로젝트 제목', 'titleColor', data.titleColor)}
                    </div>
                    <div class="md:col-span-4 grid grid-cols-3 gap-6">
                         ${createColorInput('섹션 헤더 텍스트', 'headerColor', data.headerColor)}
                         ${createColorInput('카드 배경', 'cardColor', data.cardColor)}
                         ${createColorInput('그리드 테두리', 'borderColor', data.borderColor)}
                         
                         ${createColorInput('강조/라인', 'lineColor', data.lineColor)}
                    </div>
                </div>
            </div>`;
        editorFields.insertAdjacentHTML('beforeend', mainInfoHtml);

        if (data.columns) {
            data.columns.forEach((column, colIndex) => {
                const columnContainer = document.createElement('div');
                columnContainer.className = "space-y-4 p-4 border border-slate-200 rounded-lg";
                columnContainer.innerHTML = `<h3 class="font-bold text-lg text-gray-900">컬럼 ${colIndex + 1}</h3>`;
                column.forEach((block, blockIndex) => {
                    columnContainer.appendChild(this.createEditorBlock(block, colIndex, blockIndex));
                });
                editorFields.appendChild(columnContainer);
            });
        }
    },

    /**
     * Create an editor block element
     */
    createEditorBlock(block, colIndex, blockIndex) {
        const blockContainer = document.createElement('div');
        blockContainer.className = "block-container";

        const blockDiv = document.createElement('div');
        blockDiv.className = 'p-3 bg-white border border-slate-200 rounded-md relative group';
        let contentHtml = '';

        switch (block.type) {
            case 'header':
                contentHtml = `<input type="text" class="w-full font-bold text-lg border-b-2 border-slate-200 focus:outline-none focus:border-navyblue-700 p-1" value="${block.content}" data-col="${colIndex}" data-block="${blockIndex}" data-type="header">`;
                break;
            case 'text':
                contentHtml = `<textarea class="w-full h-32 border-slate-300 rounded-md p-2 resize-y-none focus:ring-navyblue-700 focus:border-navyblue-700" data-col="${colIndex}" data-block="${blockIndex}" data-type="text">${block.content}</textarea>`;
                break;
            case 'image':
                const imagePreviewSrc = block.content.startsWith('data:image') ? block.content : 'https://placehold.co/100x60/e2e8f0/cbd5e0?text=No+Image';
                contentHtml = `
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-slate-700">이미지 파일</label>
                        <div class="flex items-center space-x-4">
                            <img src="${imagePreviewSrc}" class="w-24 h-16 object-cover rounded-md border border-slate-200">
                            <input type="file" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-navyblue-50 file:text-navyblue-700 hover:file:bg-navyblue-100" accept="image/*" data-col="${colIndex}" data-block="${blockIndex}" data-type="image" data-field="content">
                        </div>
                        <label class="block text-sm font-medium text-slate-700 mt-2">캡션 (설명)</label>
                        <input type="text" class="w-full border-slate-300 rounded-md p-2" value="${block.caption || ''}" data-col="${colIndex}" data-block="${blockIndex}" data-type="image" data-field="caption" placeholder="이미지 설명">
                    </div>`;
                break;
        }

        blockDiv.innerHTML = contentHtml + `
            <button class="absolute top-2 right-2 p-1 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity" data-col="${colIndex}" data-block="${blockIndex}" data-action="delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>`;

        const addBlockHtml = `
            <div class="relative h-2 flex items-center justify-center add-block-btn mt-4">
                <div class="w-full border-t border-dashed border-slate-300"></div>
                <div class="absolute flex space-x-2">
                    <button class="p-1.5 bg-navyblue-700 text-white rounded-full shadow-md hover:bg-navyblue-800 transform transition hover:scale-110" data-col="${colIndex}" data-block="${blockIndex}" data-action="add" data-add-type="text" title="텍스트 블록 추가"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                    <button class="p-1.5 bg-green-500 text-white rounded-full shadow-md hover:bg-green-600 transform transition hover:scale-110" data-col="${colIndex}" data-block="${blockIndex}" data-action="add" data-add-type="image" title="이미지 블록 추가"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
                </div>
            </div>`;

        blockContainer.appendChild(blockDiv);
        blockContainer.insertAdjacentHTML('beforeend', addBlockHtml);
        return blockContainer;
    }
};
