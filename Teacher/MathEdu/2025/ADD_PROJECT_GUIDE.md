# 2025학년도 수학 탐구 프로젝트 추가 가이드

이 문서는 2025학년도 학생들의 수학 탐구 프로젝트를 웹사이트에 추가하는 표준 절차를 설명합니다.

## 1. 프로젝트 폴더 복사

학생이 제출한 프로젝트 폴더를 `Teacher/MathEdu/2025/` 디렉토리 아래에 복사합니다.

- 폴더명은 학생의 이름으로 합니다. (예: `홍길동`)
- 폴더 내에 `index.html` 파일이 반드시 존재해야 합니다.

## 2. 2025 인덱스 페이지에 카드 추가

`Teacher/MathEdu/2025/index.html` 파일을 열고 새로운 학생 카드를 추가합니다.

```html
<!-- [학생이름] Project -->
<div
  class="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300"
>
  <div class="p-8">
    <h2 class="text-2xl font-bold text-slate-900 mb-3">[학생이름]</h2>
    <p class="text-slate-600 mb-6">[프로젝트 설명 또는 주제]</p>
    <div class="flex flex-col gap-3">
      <a
        href="[학생이름]/index.html"
        class="card-button btn-purple text-white font-semibold py-2 px-5 rounded-lg inline-block text-center"
        >보러가기</a
      >
      <a
        href="[원본 GitHub Pages URL]"
        target="_blank"
        class="text-xs text-slate-400 hover:text-slate-600 text-center transition-colors"
        >Original: [원본 URL 도메인]</a
      >
    </div>
  </div>
</div>
```

## 3. Canonical Tag 및 원본 링크 추가

학생 폴더 내의 **모든 HTML 파일**에 대해 다음 작업을 수행합니다.

### 3.1 Canonical Tag 추가 (`<head>` 섹션)

모든 HTML 파일의 `<head>` 태그 닫기 직전에 다음 코드를 추가합니다.
`[파일명]`은 해당 HTML 파일의 이름입니다 (예: `index.html`, `simulation.html`).

```html
<link rel="canonical" href="[원본 GitHub Pages URL]/[파일명]" />
</head>
```

### 3.2 원본 소스 링크 추가 (`index.html` `<body>` 섹션)

학생 프로젝트의 메인 페이지인 `index.html` 파일의 `<body>` 태그 닫기 직전(또는 컨텐츠의 마지막 부분)에 다음 코드를 추가하여 원본 출처를 명시합니다.

```html
<div style="margin-top: 30px; text-align: center; color: #666;">
  <p>
    Original Source:
    <a
      href="[원본 GitHub Pages URL]"
      target="_blank"
      style="color: #667eea; text-decoration: none;"
      >[원본 GitHub Pages URL]</a
    >
  </p>
</div>
```

## 4. 확인 사항

- [ ] 2025 인덱스 페이지에서 카드가 정상적으로 보이고 링크가 작동하는지 확인
- [ ] 학생 프로젝트 페이지로 이동했을 때 디자인이 깨지지 않는지 확인
- [ ] 각 페이지의 소스 보기를 통해 `<link rel="canonical" ...>` 태그가 올바른 원본 URL을 가리키는지 확인
- [ ] `index.html` 하단에 원본 소스 링크가 보이는지 확인
