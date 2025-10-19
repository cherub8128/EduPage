import { handleDragStart, handleDragEnd, handleDragOver, handleDragEnter, handleDragLeave, handleDrop } from './dragDrop.js';

export function attachEventListeners(app) {
    app.elements.reportTitle.addEventListener('input', (e) => { app.config.reportTitle = e.target.value; app.saveConfig(); });
    app.elements.fileName.addEventListener('input', (e) => { app.config.fileName = e.target.value; app.saveConfig(); });
    app.elements.paperSize.addEventListener('change', (e) => { app.config.paperSize = e.target.value; app.updateGlobalStyles(); app.saveConfig(); });
    app.elements.themeColor.addEventListener('input', (e) => { app.config.themeColor = e.target.value; app.updateGlobalStyles(); e.target.parentElement.style.backgroundColor = e.target.value; app.saveConfig(); });
    app.elements.bgColor.addEventListener('input', (e) => { app.config.backgroundColor = e.target.value; app.updateGlobalStyles(); e.target.parentElement.style.backgroundColor = e.target.value; app.saveConfig(); });
    app.elements.textColor.addEventListener('input', (e) => { app.config.textColor = e.target.value; app.updateGlobalStyles(); e.target.parentElement.style.backgroundColor = e.target.value; app.saveConfig(); });
    app.elements.borderColor.addEventListener('input', (e) => { app.config.borderColor = e.target.value; app.updateGlobalStyles(); e.target.parentElement.style.backgroundColor = e.target.value; app.saveConfig(); });
    app.elements.fontFamily.addEventListener('change', (e) => { app.config.fontFamily = e.target.value; app.updateGlobalStyles(); app.saveConfig(); });
    app.elements.componentAddBtns.forEach(btn => btn.addEventListener('click', () => app.addComponent(btn.dataset.type)));
    app.elements.exportBtn.addEventListener('click', () => app.generateHTML());
    app.elements.resetBtn.addEventListener('click', () => app.resetBuilder());

    const preview = app.elements.preview;
    preview.addEventListener('input', (e) => { handleInput(app, e); app.saveConfig(); });
    preview.addEventListener('change', (e) => { handleChange(app, e); app.saveConfig(); });
    preview.addEventListener('click', (e) => handleClick(app, e));
    preview.addEventListener('dragstart', (e) => handleDragStart(app, e));
    preview.addEventListener('dragend', () => handleDragEnd(app));
    preview.addEventListener('dragover', (e) => handleDragOver(app, e));
    preview.addEventListener('dragenter', (e) => handleDragEnter(e));
    preview.addEventListener('dragleave', (e) => handleDragLeave(e));
    preview.addEventListener('drop', (e) => handleDrop(app, e));
}

function handleInput(app, e) {
    const componentEl = e.target.closest('.component');
    if (!componentEl) return;
    const component = app.findComponent(componentEl.dataset.id);
    if (!component) return;
    const field = e.target.dataset.field || 'content';
    if (e.target.isContentEditable) {
        component[field] = e.target.innerHTML;
    } else {
        component[field] = e.target.value;
    }
}

function handleChange(app, e) {
    if (e.target.matches('input[type="file"].embed-image-input')) {
        const componentEl = e.target.closest('.component');
        const component = app.findComponent(componentEl.dataset.id);
        if (!component || !e.target.files[0]) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            component.content = event.target.result;
            app.renderPreview();
        };
        reader.readAsDataURL(e.target.files[0]);
    }
}

function handleClick(app, e) {
    const deleteBtn = e.target.closest('.delete-btn');
    if(deleteBtn) {
        app.deleteComponent(deleteBtn.closest('.component').dataset.id);
    }
}
