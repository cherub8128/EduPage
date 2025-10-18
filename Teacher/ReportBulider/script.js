// script.js

// --- 1. 모듈 임포트 ---
import { defaultConfig } from './config.js';
import { attachEventListeners } from './events.js';
import { generateHTML } from './htmlGenerator.js'; // 수정된 htmlGenerator 임포트
import { updateGlobalStyles } from './ui.js';

// --- 2. 메인 app 객체 정의 ---
const app = {
  defaultConfig: defaultConfig,
  config: {},

  elements: {
    reportTitle: document.getElementById("report-title"),
    fileName: document.getElementById("file-name"),
    paperSize: document.getElementById("paper-size"),
    themeColor: document.getElementById("theme-color"),
    bgColor: document.getElementById("bg-color"),
    textColor: document.getElementById("text-color"),
    borderColor: document.getElementById("border-color"),
    fontFamily: document.getElementById("font-family"),
    preview: document.getElementById("preview"),
    exportBtn: document.getElementById("export-html"),
    componentAddBtns: document.querySelectorAll(".component-add-btn"),
    resetBtn: document.getElementById("reset-builder"),
    autosaveStatusEl: document.getElementById("autosave-status"),
  },

  draggedComponent: null,
  saveTimer: null,

  // --- 3. 모듈 함수를 app 메서드로 할당 ---
  attachEventListeners() {
    attachEventListeners(this);
  },
  updateGlobalStyles() {
    updateGlobalStyles(this);
  },
  // generateHTML을 래핑하여 'this'(app)를 전달합니다.
  generateHTML() {
    generateHTML(this);
  },

  // --- 4. init 메서드 수정 ---
  init() {
    // showdownConverter는 HTML 생성(htmlGenerator.js) 및
    // 프리뷰 렌더링(ui.js의 createComponentElement) 시 필요할 수 있으므로
    // app 객체에 저장해 둡니다.
    this.showdownConverter = new showdown.Converter({
      strikethrough: true,
      tables: true,
      emoji: true,
    });
    this.loadConfig();
    this.updateGlobalStyles();
    this.renderPreview();
    this.attachEventListeners();
  },

  // --- 5. 기존 핵심 로직 유지 ---
  // (HTML 생성 관련 함수들은 htmlGenerator.js로 이동했으므로 여기서 삭제됨)
  
  saveConfig() {
    clearTimeout(this.saveTimer);
    this.showSaveStatus("saving");
    this.saveTimer = setTimeout(() => {
      localStorage.setItem("reportBuilderConfig", JSON.stringify(this.config));
      this.showSaveStatus("saved");
    }, 1000);
  },

  loadConfig() {
    const savedConfig = localStorage.getItem("reportBuilderConfig");
    this.config = savedConfig
      ? JSON.parse(savedConfig)
      : JSON.parse(JSON.stringify(this.defaultConfig));
    this.elements.reportTitle.value = this.config.reportTitle;
    this.elements.fileName.value = this.config.fileName;
    this.elements.paperSize.value = this.config.paperSize;
    this.elements.themeColor.value = this.config.themeColor;
    this.elements.bgColor.value = this.config.backgroundColor;
    this.elements.textColor.value = this.config.textColor;
    this.elements.borderColor.value = this.config.borderColor;
    this.elements.fontFamily.value = this.config.fontFamily;
  },

  resetBuilder() {
    const btn = this.elements.resetBtn;
    if (btn.dataset.confirming) {
      localStorage.removeItem("reportBuilderConfig");
      window.location.reload();
    } else {
      btn.dataset.confirming = "true";
      const originalContent = btn.innerHTML;
      btn.innerHTML = "정말요?";
      btn.classList.add("text-red-600");
      setTimeout(() => {
        delete btn.dataset.confirming;
        btn.innerHTML = originalContent;
        btn.classList.remove("text-red-600");
      }, 3000);
    }
  },

  showSaveStatus(state) {
    const textEl =
      this.elements.autosaveStatusEl.querySelector("#autosave-text");
    const iconSaving = this.elements.autosaveStatusEl.querySelector(
      "#autosave-icon-saving"
    );
    const iconSaved = this.elements.autosaveStatusEl.querySelector(
      "#autosave-icon-saved"
    );

    this.elements.autosaveStatusEl.classList.remove("opacity-0");

    if (state === "saving") {
      if (textEl) textEl.textContent = "저장 중...";
      if (iconSaving) iconSaving.classList.remove("hidden");
      if (iconSaved) iconSaved.classList.add("hidden");
    } else if (state === "saved") {
      if (textEl) textEl.textContent = "모든 변경사항이 저장되었습니다.";
      if (iconSaving) iconSaving.classList.add("hidden");
      if (iconSaved) iconSaved.classList.remove("hidden");
      setTimeout(
        () => this.elements.autosaveStatusEl.classList.add("opacity-0"),
        2000
      );
    }
  },

  addComponent(type, targetArray = this.config.components) {
    const newComponent = { id: Date.now(), type, content: "" };
    switch (type) {
      case "h1":
        newComponent.content = "대제목";
        break;
      case "h2":
        newComponent.content = "부제목";
        break;
      case "h3":
        newComponent.content = "중제목";
        break;
      case "h4":
        newComponent.content = "소제목";
        break;
      case "input":
        newComponent.label = "라벨";
        newComponent.placeholder = "안내 문구";
        break;
      case "static-markdown":
        newComponent.content =
          "이곳은 보고서 양식의 일부로, 최종 사용자는 수정할 수 없는 설명글입니다.";
        break;
      case "markdown":
        newComponent.content = "사용자가 이 영역에 텍스트를 입력합니다.";
        newComponent.height = 150;
        break;
      case "code":
        newComponent.content = 'print("Hello, World!")';
        newComponent.height = 200;
        break;
      case "image-embed":
        newComponent.width = 100;
        break;
      case "image-upload":
        newComponent.width = 100;
        break;
      case "interactive":
        newComponent.html = `<div style="padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">\\n  <p>카운터: <span id="count-${newComponent.id}">0</span></p>\\n  <button id="btn-${newComponent.id}" style="padding: 4px 8px; border-radius: 4px;">증가</button>\\n</div>`;
        newComponent.js = `let count = 0;\\nconst countSpan = document.getElementById('count-${newComponent.id}');\\ndocument.getElementById('btn-${newComponent.id}').addEventListener('click', () => {\\n  count++;\\n  countSpan.textContent = count;\\n});`;
        break;
      case "columns-2":
        newComponent.columns = [[], []];
        break;
      case "columns-3":
        newComponent.columns = [[], [], []];
        break;
      case "group":
        newComponent.children = [];
        break;
    }
    targetArray.push(newComponent);
    this.renderPreview();
    this.saveConfig();
  },

  deleteComponent(id, componentArray = this.config.components) {
    const index = componentArray.findIndex((c) => c.id == id);
    if (index > -1) {
      componentArray.splice(index, 1);
    } else {
      componentArray.forEach((c) => {
        if (c.columns)
          c.columns.forEach((col) => this.deleteComponent(id, col));
        if (c.children) this.deleteComponent(id, c.children);
      });
    }
    if (componentArray === this.config.components) {
      this.renderPreview();
      this.saveConfig();
    }
  },

  // ui.js의 렌더링 함수는 버그가 있으므로 기존 로컬 함수를 유지합니다.
  renderPreview(
    container = this.elements.preview,
    components = this.config.components
  ) {
    if (container === this.elements.preview) container.innerHTML = "";
    components.forEach((component) => {
      const el = this.createComponentElement(component);
      container.appendChild(el);
    });
  },

  // ui.js의 렌더링 함수는 버그가 있으므로 기존 로컬 함수를 유지합니다.
  createComponentElement(component) {
    const div = document.createElement("div");
    div.className = "component";
    div.dataset.id = component.id;
    let contentHtml = "";
    const controls = `<div class="component-controls"><div class="component-handle" draggable="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></div><div class="delete-btn"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div></div>`;
    const settings = (fields) =>
      `<div class="component-settings absolute top-0 right-0 bg-white/50 backdrop-blur-sm p-1 rounded-bl-lg shadow text-xs items-center gap-2"> ${fields} </div>`;
    const widthSetting = `<div><label>너비:</label><input type="number" min="10" max="100" value="${component.width}" data-field="width" class="w-12 text-center border rounded"> %</div>`;
    const heightSetting = `<div><label>높이:</label><input type="number" min="50" step="10" value="${component.height}" data-field="height" class="w-16 text-center border rounded"> px</div>`;
    switch (component.type) {
      case "h1":
        contentHtml = `<h1 class="text-4xl font-bold" style="color: var(--theme-color);" contenteditable="true" data-field="content">${component.content}</h1>`;
        break;
      case "h2":
        contentHtml = `<h2 class="text-2xl font-bold border-b-2 pb-2 mb-4" style="border-color: var(--theme-color);" contenteditable="true" data-field="content">${component.content}</h2>`;
        break;
      case "h3":
        contentHtml = `<h3 class="text-xl font-semibold" contenteditable="true" data-field="content">${component.content}</h3>`;
        break;
      case "h4":
        contentHtml = `<h4 class="text-lg font-semibold text-slate-600" contenteditable="true" data-field="content">${component.content}</h4>`;
        break;
      case "input":
        contentHtml = `<div><label class="font-medium" contenteditable="true" data-field="label">${component.label}</label><div class="w-full border border-slate-300 rounded-md p-2 mt-1"><span class="placeholder-editor" contenteditable="true" data-field="placeholder">${component.placeholder}</span></div></div>`;
        break;
      case "static-markdown":
        contentHtml = `<div class="prose max-w-none" contenteditable="true" data-field="content">${component.content}</div>`;
        break;
      case "markdown":
        contentHtml = `<div class="relative prose max-w-none text-slate-400 border-2 border-dashed rounded-lg p-4" style="min-height:${
          component.height
        }px">사용자가 마크다운을 입력하는 영역 ${settings(
          heightSetting
        )}</div>`;
        break;
      case "code":
        contentHtml = `<div class="relative"><pre class="bg-slate-800 text-white p-4 rounded-md" style="min-height:${
          component.height
        }px"><code contenteditable="true" data-field="content" class="language-python">${
          component.content
        }</code></pre>${settings(heightSetting)}</div>`;
        break;
      case "image-upload":
        contentHtml = `<div class="relative bg-slate-100 border-2 border-dashed rounded-lg flex items-center justify-center h-48 text-slate-500" style="width:${
          component.width
        }%; margin: 0 auto;">이미지 입력 영역 ${settings(widthSetting)}</div>`;
        break;
      case "image-embed":
        const imgPrev = component.content
          ? `<img src="${component.content}" class="w-full h-auto object-contain rounded-md">`
          : "";
        contentHtml = `<div class="relative flex flex-col items-center justify-center h-auto text-slate-500" style="width:${
          component.width
        }%; margin: 0 auto;"> ${imgPrev} <label for="embed-input-${
          component.id
        }" class="mt-2 text-sm bg-slate-200 text-slate-700 font-medium py-1 px-3 rounded-md cursor-pointer hover:bg-slate-300">이미지 선택</label><input type="file" accept="image/*" class="embed-image-input hidden" id="embed-input-${
          component.id
        }"> ${settings(widthSetting)} </div>`;
        break;

      case "interactive":
        contentHtml = `<div class="border-2 border-dashed border-blue-300 bg-blue-50 p-4 rounded-lg"><h4 class="font-semibold text-blue-800">인터랙티브 활동</h4><div class="mt-2"><label class="text-sm font-medium text-slate-700">HTML</label><textarea data-field="html" class="interactive-code w-full h-24 p-2 mt-1 font-mono text-sm border rounded-md">${component.html}</textarea></div><div class="mt-2"><label class="text-sm font-medium text-slate-700">JavaScript</label><textarea data-field="js" class="interactive-code w-full h-24 p-2 mt-1 font-mono text-sm border rounded-md">${component.js}</textarea></div></div>`;
        break;
      case "divider":
        contentHtml = `<hr style="border-color: var(--border-color); border-top-width: 2px; margin: 1rem 0;">`;
        break;
      case "columns-2":
      case "columns-3": {
        const numCols = component.type === "columns-2" ? 2 : 3;
        const colContainer = document.createElement("div");
        colContainer.className = "flex gap-4";
        for (let i = 0; i < numCols; i++) {
          const colDiv = document.createElement("div");
          colDiv.className =
            "flex-1 bg-slate-50 p-4 rounded-md border drop-zone";
          (component.columns[i] || []).forEach((child) =>
            colDiv.appendChild(this.createComponentElement(child))
          );
          colContainer.appendChild(colDiv);
        }
        div.innerHTML = controls;
        div.appendChild(colContainer);
        return div;
      }
      case "group": {
        const groupContainer = document.createElement("div");
        groupContainer.className =
          "border-2 border-dashed p-4 rounded-lg drop-zone";
        groupContainer.style.borderColor = "var(--border-color)";
        (component.children || []).forEach((child) =>
          groupContainer.appendChild(this.createComponentElement(child))
        );
        div.innerHTML = controls;
        div.appendChild(groupContainer);
        return div;
      }
    }

    div.innerHTML = controls + contentHtml;
    return div;
  },
  
  // 유틸리티 함수 (DOM에서 데이터 빌드, 컴포넌트 찾기)
  buildDataFromDOM(container) {
    const components = [];
    container.childNodes.forEach((node) => {
      if (
        node.nodeType !== Node.ELEMENT_NODE ||
        !node.classList.contains("component")
      )
        return;
      const id = node.dataset.id;
      const originalComponent = this.findComponent(id);
      if (!originalComponent) return;
      const newComponent = { ...originalComponent };
      if (newComponent.type.startsWith("columns")) {
        newComponent.columns = [];
        node.querySelectorAll(":scope > div > .drop-zone").forEach((colNode) => {
          newComponent.columns.push(this.buildDataFromDOM(colNode));
        });
      } else if (newComponent.type === "group") {
        const groupNode = node.querySelector(".drop-zone");
        newComponent.children = this.buildDataFromDOM(groupNode);
      }
      components.push(newComponent);
    });
    return components;
  },

  findComponent(id, components = this.config.components) {
    for (const component of components) {
      if (component.id == id) return component;
      if (component.columns) {
        for (const col of component.columns) {
          const found = this.findComponent(id, col);
          if (found) return found;
        }
      }
      if (component.children) {
        const found = this.findComponent(id, component.children);
        if (found) return found;
      }
    }
    return null;
  },
};

// --- 7. 앱 실행 ---
app.init();