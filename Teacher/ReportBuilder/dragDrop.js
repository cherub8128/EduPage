export function handleDragStart(app, e) {
    if (e.target.closest('.component-handle')) {
        app.draggedComponent = e.target.closest('.component');
        setTimeout(() => app.draggedComponent.classList.add('dragging'), 0);
    }
}

export function handleDragEnd(app) {
    if (app.draggedComponent) {
        app.draggedComponent.classList.remove('dragging');
        app.draggedComponent = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        app.config.components = app.buildDataFromDOM(app.elements.preview);
        app.saveConfig();
    }
}

export function handleDragOver(app, e) {
    e.preventDefault();
    const dropZone = e.target.closest('.drop-zone');
    if (!dropZone || !app.draggedComponent) return;
    const afterElement = getDragAfterElement(dropZone, e.clientY);
    if (afterElement == null) {
        dropZone.appendChild(app.draggedComponent);
    } else {
        dropZone.insertBefore(app.draggedComponent, afterElement);
    }
}

export function handleDragEnter(e) {
    e.preventDefault();
    const dropZone = e.target.closest('.drop-zone');
    if(dropZone) dropZone.classList.add('drag-over');
}

export function handleDragLeave(e) {
    const dropZone = e.target.closest('.drop-zone');
    if(dropZone) dropZone.classList.remove('drag-over');
}

export function handleDrop(app, e) {
    e.preventDefault();
    const dropZone = e.target.closest('.drop-zone');
    if(dropZone) dropZone.classList.remove('drag-over');
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(':scope > .component:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
