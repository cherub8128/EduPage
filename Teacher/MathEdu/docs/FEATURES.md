# MathEdu 구현 기능 명세서 (Implemented Features)

이 문서는 `Teacher/MathEdu` 프로젝트에 구현된 주요 기술적 기능과 디자인 시스템 요소들을 정리한 문서입니다.

---

## 1. 리포트 관리 시스템 (Report Management)

`js/report-core.js`를 중심으로 한 핵심 기능입니다.

- **Markdown 실시간 편집**: Showdown 라이브러리를 사용하여 마크다운 입력을 실시간 HTML로 변환합니다.
- **자동 저장 (Auto-Save)**: 사용자가 입력한 모든 텍스트, 체크박스, 이미지 데이터를 `localStorage`에 자동 저장합니다.
- **상태 알림**: 저장 중 및 저장 완료 상태를 시각적 애니메이션으로 사용자에게 알립니다.
- **마크다운 미리보기**: 편집 영역 클릭 시 입력창으로 전환되고, 포커스를 잃으면 미리보기로 전환되는 인터랙티브 편집기를 지원합니다.

## 2. 시각화 및 멀티미디어 (Visualization & Multimedia)

- **이미지 갤러리 (Gallery System)**:
  - 드래그 앤 드롭 및 파일 선택을 통한 이미지 업로드 지원.
  - 이미지별 캡션(설명) 입력 및 개별 삭제 기능.
  - `Base64` 인코딩을 통해 로컬 스토리지에 이미지 데이터 영구 보관.
- **수식 렌더링 (Mathematical Rendering)**:
  - KaTeX를 활용하여 정적/동적 수식을 고품질로 렌더링합니다.
  - 마크다운 미리보기 내 수식도 실시간으로 처리됩니다.
- **차트 유틸리티 (Data Visualization)**:
  - `Chart.js`를 활용한 데이터 시각화 도구(`js/charts.js`) 제공.
  - 테마 변경 시 차트 색상 자동 동기화 기능.

## 3. 사용자 인터페이스 및 디자인 (UI/UX)

`css/` 디렉토리의 아토믹 디자인 시스템을 따릅니다.

- **Modern UI Design**: Charcoal 계열의 그라디언트와 Neutral 톤을 사용한 세련된 디자인.
- **컴포넌트 라이브러리**:
  - **Cards**: 호버 애니메이션과 상단 그라디언트 포인트가 포함된 카드 디자인.
  - **Buttons**: 프라이머리(그라디언트) 및 세컨더리(아웃라인) 스타일 버튼.
  - **Grid System**: 반응형 레이아웃을 위한 `.m-grid` 시스템.
- **테마 관리**: 라이트(Light) 모드를 기본으로 하며, 확장 가능한 CSS 변수 구조를 갖추고 있습니다.

## 4. 유틸리티 및 출력 (Utilities & Export)

- **PDF 내보내기**: 보고서 형식에 최적화된 프린트 스타일시트를 제공하며, 원클릭으로 학생 정보가 포함된 PDF 저장이 가능합니다.
- **입력 검증 (Validation)**: 필수 입력 항목 및 데이터 형식에 대한 유효성 검사 로직을 포함합니다.
- **반응형 대응**: `ResizeObserver`를 활용하여 시뮬레이션 캔버스의 크기를 유연하게 조정합니다.

## 5. 기술 스택 (Tech Stack)

- **Core**: Vanilla JS (ES6+ Module)
- **Styling**: Vanilla CSS (Variables, Flexbox, Grid)
- **Libraries**:
  - [KaTeX](https://katex.org/): 수학 수식 렌더링
  - [Showdown](https://showdownjs.com/): 마크다운 변환
  - [Chart.js](https://www.chartjs.org/): 데이터 시각화
  - [Highlight.js](https://highlightjs.org/): 코드 하이라이팅

---

## 관련 문서

- [디자인 시스템 가이드 (DESIGN_SYSTEM.md)](DESIGN_SYSTEM.md): UI/UX 원칙 및 컬러 팔레트 상세
- [페이지 개발 재사용 명세 (REUSABLE_SPEC.md)](REUSABLE_SPEC.md): 신규 페이지 작성을 위한 기술 표준 및 템플릿 코드
- [CSS 명세서 (CSS_SPEC.md)](CSS_SPEC.md): 사용 가능한 CSS 변수 및 클래스 상세 목록

마지막 업데이트: 2026-01-01
