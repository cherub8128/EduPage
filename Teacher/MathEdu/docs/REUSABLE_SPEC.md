# MathEdu 페이지 개발 재사용 명세 (Reusable Specification)

이 문서는 `MathEdu` 프로젝트 내에서 새로운 탐구 보고서나 시뮬레이션 페이지를 제작할 때 즉시 복사하여 사용할 수 있는 기술적 표준과 코드 스니펫을 제공합니다.

---

## 1. 표준 HTML 템플릿 (Boilerplate)

새 페이지 생성 시 아래 구조를 기본으로 시작합니다. 경로(`../`)는 실제 파일 깊이에 맞춰 조정하십시오.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>페이지 제목</title>

    <!-- 1. CSS 로드 (Base -> Components) -->
    <link rel="stylesheet" href="../css/main.css">
    <link rel="stylesheet" href="../css/components/report.css">

    <!-- 2. 외부 라이브러리 (CDN) -->
    <!-- Markdown: Showdown -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js"></script>
    <!-- Math: KaTeX -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    <!-- Code Highlight: Highlight.js -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</head>
<body>
    <div class="container pt-lg pb-lg">
        <!-- 공통 헤더 (디자인 시스템 가이드 준수) -->
        <header class="modern-header flex justify-between items-end flex-wrap gap-4">
            <div>
                <span class="m-badge" style="background:var(--grad-primary); color:white;">One-Page Report</span>
                <h1>주제 제목</h1>
                <p>주제에 대한 간단한 설명</p>
            </div>
            <div class="flex gap-2 print-hidden">
                <button id="export-pdf" class="m-btn primary small">📄 PDF 저장</button>
            </div>
        </header>

        <main class="flex flex-col gap-6">
            <!-- 사용자 정보 (자동 저장 포함) -->
            <section class="m-card">
                <div class="m-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <input id="student-id" class="m-input savable" placeholder="학번">
                    <input id="student-name" class="m-input savable" placeholder="이름">
                </div>
            </section>

            <!-- 인터랙티브 에디터 섹션 -->
            <section class="m-card">
                <h2 class="text-xl font-bold mb-4">탐구 기록</h2>
                <div class="editable-container">
                    <textarea id="my-note" class="savable markdown-input" placeholder="마크다운으로 내용을 입력하세요."></textarea>
                    <div class="markdown-preview"></div>
                </div>
            </section>
        </main>

        <!-- 자동저장 상태바 -->
        <footer class="mt-8 text-center text-sm text-muted print-hidden">
            <div id="autosave-status" class="flex items-center justify-center gap-2 opacity-0 transition-opacity">
                <span id="autosave-icon-saving" class="hidden">💾 저장 중...</span>
                <span id="autosave-icon-saved" class="text-green-600 hidden">✅ 저장됨</span>
                <span id="autosave-text"></span>
            </div>
        </footer>
    </div>

    <!-- 로직 초기화 -->
    <script type="module" src="script.js"></script>
</body>
</html>
```

---

## 2. 핵심 JS 연동 (ReportManager)

`script.js`에서 페이지별 기능을 활성화하는 표준 방법입니다.

```javascript
import { ReportManager } from '../js/report-core.js';

// 1. 매니저 초기화 (고유한 Storage Key 지정)
const manager = new ReportManager('my-unique-page-key');
manager.init();

// 2. 갤러리 시스템 활성화 (필요한 경우)
manager.initGallery(
    'results-gallery',        // 컨테이너 ID
    'results-gallery-input',  // input[type=file] ID
    'results-gallery-drop',   // dropzone ID
    'results-gallery-clear',  // 초기화 버튼 ID
    'results-gallery-add'     // 추가 버튼 ID
);

// 3. 차트 연동 (ChartUtils 활용)
if (window.ChartUtils) {
    const ctx = document.getElementById('myChart');
    const myChart = ChartUtils.createLineChart(ctx, [
        ChartUtils.emptyDataset('측정 데이터', { borderColor: '#3b82f6' })
    ], '데이터 변화 추이');
    
    // 테마 변경 감시 (다크/라이트 모드 대응)
    ChartUtils.observeTheme([myChart]);
}
```

---

## 3. UI 컴포넌트 클래스 명세

| 구분 | 클래스/구조 | 설명 |
| :--- | :--- | :--- |
| **컨테이너** | `.m-card` | 공통 카드 레이아웃 (그림자, 호버 애니메이션 포함) |
| **그리드** | `.m-grid` | `display: grid` 유틸리티. 인라인 스타일로 `grid-template-columns` 지정 권장 |
| **버튼** | `.m-btn.primary` | 그라디언트 배경 버튼 |
| | `.m-btn.secondary` | 아웃라인 스타일 버튼 |
| **입력창** | `.m-input` | 표준 테두리가 있는 입력창 |
| **배지** | `.m-badge` | 상태 표시 또는 카테고리용 배지 |
| **에디터** | `.editable-container` | `markdown-input`과 `markdown-preview`를 감싸는 래퍼 |

---

## 4. 데이터 저장 및 연동 규칙

1. **자동 저장 대상**: HTML 요소에 `.savable` 클래스를 부여하고 고유한 `id`를 가졌다면 `ReportManager`가 이를 감지하여 `localStorage`에 저장합니다.
2. **수식 입력**: 에디터 내에서 `$수식$` 또는 `$$수식$$` 형식을 지원합니다.
3. **반응형 대응**: 시뮬레이션 캔버스는 `.vis-container` 클래스를 권장하며, 고정 높이 또는 비율을 CSS로 지정하십시오.
4. **출력 최적화**: `.print-hidden` 클래스를 사용하면 PDF 출력 시 해당 요소가 제외됩니다.

---

## 5. 필수 디렉토리 구조

신규 페이지 생성 시 아래 구조를 유지하십시오.

```text
Teacher/MathEdu/
├── css/ (공통 스타일)
├── js/  (공통 로직: report-core.js 등)
└── [NewTopic]/ (새 페이지 디렉토리)
    ├── index.html
    ├── script.js
    └── images/
```
