# MathEdu CSS 명세서 (Design Tokens & Classes)

이 문서는 `MathEdu` 프로젝트에서 사용하는 모든 CSS 변수와 클래스 명세를 정리합니다. 디자인 작업 시 이 명세를 참고하여 일관된 인터페이스를 유지하십시오.

---

## 1. 디자인 토큰 (CSS Variables)

`css/base/variables.css` 및 `colors.css`에 정의된 핵심 변수들입니다.

### 🎨 색상 (Colors)

| 변수명 | 설명 | 비고 |
| :--- | :--- | :--- |
| `--grad-primary` | 핵심 브랜드 그라디언트 | Charcoal계열 |
| `--bg-page` | 전체 페이지 배경색 | Off-white |
| `--bg-card` | 카드 및 섹션 배경색 | White |
| `--text-main` | 주요 헤딩 및 제목 색상 | Dark Neutral |
| `--text-body` | 본문 글꼴 색상 | Gray Neutral |
| `--color-primary` | 포인트 강조 색상 | Blue/Indigo |
| `--line` | 기본 경계선 색상 | Light Gray |

### 📏 수치 (Dimensions)

| 변수명 | 설명 | 값 |
| :--- | :--- | :--- |
| `--radius-md` | 기본 둥글기 | 12px |
| `--radius-lg` | 강조된 둥글기 | 16px |
| `--radius-xl` | 카드용 둥글기 | 24px |
| `--shadow` | 기본 소프트 섀도우 | 0 4px 6px ... |
| `--transition-fast` | 빠른 전환 속도 | 0.2s |
| `--transition-normal` | 일반 전환 속도 | 0.3s |

---

## 2. 레이아웃 시스템 (Layout)

### .container

- 중앙 정렬된 메인 컨텐츠 영역.
- `max-width: 1200px` (기본값).

### .m-grid

- 그리드 레이아웃 유틸리티.
- **예시**: `<div class="m-grid" style="grid-template-columns: 1fr 1fr;">`

### .modern-header

- 리포트 상단 타이틀 영역.
- 내부 구성: `h1` (제목), `p` (설명), `.m-badge` (구분).

---

## 3. 핵심 컴포넌트 클래스 (Components)

### ⏹️ 카드 (Cards)

| 클래스명 | 설명 | 특징 |
| :--- | :--- | :--- |
| `.m-card` | **표준 리포트 카드** | 흰색 배경, 큰 곡률, 호버 시 위로 이동 |
| `.step-card` | 단계별 안내 카드 | `.m-card`보다 조금 더 큰 여백 |
| `.mini` | 작은 데이터/정보 카드 | 좁은 여백, 얇은 테두리 |
| `.vis-container` | 시각화 박스 | 캔버스나 시뮬레이션 영역을 감싸는 컨테이너 |

### 🔘 버튼 (Buttons)

| 클래스명 | 설명 | 스타일 |
| :--- | :--- | :--- |
| `.m-btn.primary` | 주요 동작 버튼 | 그라디언트 배경, 흰색 텍스트 |
| `.m-btn.secondary` | 보조 동작 버튼 | 흰색 배경, 얇은 테두리 |
| `.m-btn.small` | 작은 사이즈 버튼 | 좁은 패딩, 작은 폰트 |
| `.chip` | 필터나 선택용 칩 | 완전 둥근(Pill) 형태 |

### 📝 폼 및 입력 (Forms)

| 클래스명 | 설명 | 비고 |
| :--- | :--- | :--- |
| `.m-input` | 표준 입력창 | 포커스 시 강조 효과 |
| `.savable` | 자동 저장 대상 | JS에서 감지하는 마커 클래스 |
| `.editable-container` | 마크다운 에디터 래퍼 | 입력창과 미리보기를 포함 |
| `.markdown-input` | 마크다운 입력창 | `display: none`이 기본 |
| `.markdown-preview` | 마크다운 미리보기창 | 클릭 시 입력창으로 전환 |

---

## 4. 유틸리티 클래스 (Utilities)

| 클래스명 | 기능 |
| :--- | :--- |
| `.flex` | `display: flex` |
| `.flex-col` | 컬럼 방향 정렬 |
| `.justify-between` | 양 끝 정렬 |
| `.items-center` | 수직 중앙 정렬 |
| `.gap-2`, `.gap-4` | 요소 간 간격 |
| `.print-hidden` | **PDF 출력 시 숨김** (매우 중요) |
| `.text-sm`, `.text-lg` | 폰트 크기 조절 |
| `.pt-lg`, `.pb-lg` | 상하단 여백 (Large) |

---

## 5. CSS 적용 가이드

1. **커스터마이징**: 특정 요소의 너비나 그리드 비율은 인라인 스타일(`style="..."`)을 사용하여 유연하게 조절하는 것을 권장합니다.
2. **반응형**: 모바일 환경에서는 `.m-grid`가 자동으로 1컬럼으로 전환되도록 설계되어 있습니다.
3. **그라디언트 활용**: 브랜드 아이덴티티 유지를 위해 제목 배경이나 주요 버튼에는 반드시 `var(--grad-primary)`를 사용하십시오.
