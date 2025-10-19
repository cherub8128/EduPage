export function createComponentElement(app, component) {
    const div = document.createElement('div');
    div.className = 'component';
    div.dataset.id = component.id;
    let contentHtml = '';
    const controls = `<div class="component-controls"><div class="component-handle" draggable="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></div><div class="delete-btn"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div></div>`;
    const settings = (fields) => `<div class="component-settings absolute top-0 right-0 bg-white/50 backdrop-blur-sm p-1 rounded-bl-lg shadow text-xs items-center gap-2"> ${fields} </div>`;
    const widthSetting = `<div><label>너비:</label><input type="number" min="10" max="100" value="${component.width}" data-field="width" class="w-12 text-center border rounded"> %</div>`;
    const heightSetting = `<div><label>높이:</label><input type="number" min="50" step="10" value="${component.height}" data-field="height" class="w-16 text-center border rounded"> px</div>`;
    
    switch(component.type) {
        case 'h1': contentHtml = `<h1 class="text-4xl font-bold" style="color: var(--theme-color);" contenteditable="true" data-field="content">${component.content}</h1>`; break;
        case 'h2': contentHtml = `<h2 class="text-2xl font-bold border-b-2 pb-2 mb-4" style="border-color: var(--theme-color);" contenteditable="true" data-field="content">${component.content}</h2>`; break;
        case 'h3': contentHtml = `<h3 class="text-xl font-semibold" contenteditable="true" data-field="content">${component.content}</h3>`; break;
        case 'h4': contentHtml = `<h4 class="text-lg font-semibold text-slate-600" contenteditable="true" data-field="content">${component.content}</h4>`; break;
        case 'input': contentHtml = `<div><label class="font-medium" contenteditable="true" data-field="label">${component.label}</label><div class="w-full border border-slate-300 rounded-md p-2 mt-1"><span class="placeholder-editor" contenteditable="true" data-field="placeholder">${component.placeholder}</span></div></div>`; break;
        case 'static-markdown': contentHtml = `<div class="prose max-w-none" contenteditable="true" data-field="content">${component.content}</div>`; break;
        case 'markdown': contentHtml = `<div class="relative prose max-w-none text-slate-400 border-2 border-dashed rounded-lg p-4" style="min-height:${component.height}px">사용자가 마크다운을 입력하는 영역 ${settings(heightSetting)}</div>`; break;
        case 'code': contentHtml = `<div class="relative"><pre class="bg-slate-800 text-white p-4 rounded-md" style="min-height:${component.height}px"><code contenteditable="true" data-field="content" class="language-python">${component.content}</code></pre>${settings(heightSetting)}</div>`; break;
        case 'image-upload': contentHtml = `<div class="relative bg-slate-100 border-2 border-dashed rounded-lg flex items-center justify-center h-48 text-slate-500" style="width:${component.width}%; margin: 0 auto;">이미지 입력 영역 ${settings(widthSetting)}</div>`; break;
        case 'image-embed': const imgPrev = component.content ? `<img src="${component.content}" class="w-full h-auto object-contain rounded-md">` : ''; contentHtml = `<div class="relative flex flex-col items-center justify-center h-auto text-slate-500" style="width:${component.width}%; margin: 0 auto;"> ${imgPrev} <label for="embed-input-${component.id}" class="mt-2 text-sm bg-slate-200 text-slate-700 font-medium py-1 px-3 rounded-md cursor-pointer hover:bg-slate-300">이미지 선택</label><input type="file" accept="image/*" class="embed-image-input hidden" id="embed-input-${component.id}"> ${settings(widthSetting)} </div>`; break;
        case 'interactive': contentHtml = `<div class="border-2 border-dashed border-blue-300 bg-blue-50 p-4 rounded-lg"><h4 class="font-semibold text-blue-800">인터랙티브 활동</h4><div class="mt-2"><label class="text-sm font-medium text-slate-700">HTML</label><textarea data-field="html" class="interactive-code w-full h-24 p-2 mt-1 font-mono text-sm border rounded-md">${component.html}</textarea></div><div class="mt-2"><label class="text-sm font-medium text-slate-700">JavaScript</label><textarea data-field="js" class="interactive-code w-full h-24 p-2 mt-1 font-mono text-sm border rounded-md">${component.js}</textarea></div></div>`; break;
        case 'divider': contentHtml = `<hr style="border-color: var(--border-color); border-top-width: 2px; margin: 1rem 0;">`; break;
        case 'columns-2': case 'columns-3': { const numCols = component.type === 'columns-2' ? 2 : 3; const colContainer = document.createElement('div'); colContainer.className = 'flex gap-4'; for (let i = 0; i < numCols; i++) { const colDiv = document.createElement('div'); colDiv.className = 'flex-1 bg-slate-50 p-4 rounded-md border drop-zone'; (component.columns[i] || []).forEach(child => colDiv.appendChild(app.createComponentElement(child))); colContainer.appendChild(colDiv); } div.innerHTML = controls; div.appendChild(colContainer); return div; }
        case 'group': { const groupContainer = document.createElement('div'); groupContainer.className = 'border-2 border-dashed p-4 rounded-lg drop-zone'; groupContainer.style.borderColor = 'var(--border-color)'; (component.children || []).forEach(child => groupContainer.appendChild(app.createComponentElement(child))); div.innerHTML = controls; div.appendChild(groupContainer); return div; }
    }
    div.innerHTML = controls + contentHtml;
    return div;
}

export function renderPreview(app, container = app.elements.preview, components = app.config.components) {
    if (container === app.elements.preview) container.innerHTML = '';
    components.forEach(component => {
        const el = app.createComponentElement(component);
        container.appendChild(el);
    });
}

export function updateGlobalStyles(app) {
    const allSizeClasses = ['preview-a0', 'preview-a1', 'preview-a2', 'preview-a3', 'preview-a4', 'preview-b4', 'preview-b5', 'preview-letter', 'preview-web'];
    app.elements.preview.classList.remove(...allSizeClasses);
    app.elements.preview.classList.add(`preview-${app.config.paperSize}`);
    
    document.documentElement.style.setProperty('--theme-color', app.config.themeColor);
    document.documentElement.style.setProperty('--bg-color', app.config.backgroundColor);
    document.documentElement.style.setProperty('--text-color', app.config.textColor);
    document.documentElement.style.setProperty('--border-color', app.config.borderColor);
    
    app.elements.preview.style.backgroundColor = 'var(--bg-color)';
    app.elements.preview.style.color = 'var(--text-color)';
    
    app.elements.exportBtn.style.backgroundColor = app.config.themeColor;
    app.elements.preview.classList.remove('preview-serif', 'preview-sans');
    app.elements.preview.classList.add(app.config.fontFamily === 'serif' ? 'preview-serif' : 'preview-sans');
}
