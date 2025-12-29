# 회전하는 사각 물통의 포물선 단면 - 인터랙티브 교재

## 📚 프로젝트 개요

이 프로젝트는 회전하는 물통의 자유수면이 포물선이 되는 현상을 **논문 기반**으로 탐구하는 수학·물리 통합 교육 자료입니다.

### 주요 특징
- ✅ **버그 수정 완료**: Three.js OrbitControls ES modules 방식으로 변경하여 r150+ 호환
- 📖 논문 기반 학습 (Monteiro et al. 2019, Menker & Herczyński 2022)
- 🎮 인터랙티브 3D 시뮬레이션 (Three.js + Cannon.js)
- 📐 수학적 모델링 및 무차원화
- 🔬 학생 주도 탐구 활동지

---

## 📂 파일 구조

```
MathEdu/
├── overview.html        # 📚 개요: 학습 목표, 논문 소개, 모델링 설명
├── simulation.html      # 🎮 시뮬레이션: 인터랙티브 3D + 2D 비교
├── theory.html          # 📐 수식·심화: 무차원화, 확장, 연구 주제
├── shared.css           # 🎨 공통 스타일시트
├── README.md            # 📘 이 파일
│
├── RotateParabola.html  # ⚠️ 원본 파일 (보관용, 사용하지 않음)
│
└── (논문 PDF 파일들)
    ├── 1908.04256v2.pdf
    └── 2208.05059v1.pdf
```

---

## 🚀 사용 방법

### 1. 간단한 방법 (로컬 파일로 열기)

1. **overview.html**을 브라우저에서 직접 열기
2. 상단 내비게이션을 통해 시뮬레이션과 이론 페이지로 이동

### 2. 권장 방법 (로컬 웹 서버)

더 안정적인 동작을 위해 로컬 웹 서버 사용을 권장합니다:

```powershell
# Python이 설치되어 있다면
cd "C:\Users\songdo\Documents\Code\EduPage\Teacher\MathEdu"
python -m http.server 8000

# 또는 Node.js가 설치되어 있다면
npx http-server -p 8000
```

그 다음 브라우저에서 `http://localhost:8000/overview.html` 열기

---

## 🎯 학습 흐름 (5단계)

### 1️⃣ 현상 관찰 (overview.html)
- 논문을 통한 실험 관찰
- 물리 법칙에서 수식 유도
- 포물선 형상 수학적 확정

### 2️⃣ 모델링 (overview.html)
- 단순화 가정 (정상 상태, 강체 회전, 점성 무시)
- 직사각형 용기의 1D 포물선 모델
- 임계 각속도 \(\omega_c\) 계산

### 3️⃣ 시뮬레이션 (simulation.html)
- **2D 단면**: 이론 포물선 그래프
- **3D 시각화**: Three.js로 포물면 + Cannon.js 입자 유체
- 실시간 파라미터 조절 (\(\omega, H, L, g\))
- 이론 vs 물리엔진 비교

### 4️⃣ 수식화 (theory.html)
- 일반식 정리
- 무차원화 (스케일링 법칙)
- 다른 기하 확장 (원통, 정육면체)

### 5️⃣ 심화 탐구 (theory.html)
- 학생 연구 질문 생성
- 실험 설계 및 데이터 분석
- 추천 연구 주제 6가지 제시

---

## 🐛 버그 수정 내역

### 원본 파일 (RotateParabola.html)의 문제점
1. ❌ **Three.js OrbitControls 오류**: 
   - `THREE.OrbitControls is not a constructor`
   - 원인: r150+ 버전에서 ES modules 필수

2. ❌ **파일 크기**: 2061줄 → 유지보수 어려움

3. ❌ **CDN 불안정**: polyfill.io 연결 실패

### 수정 완료 ✅
1. ✅ **ES Modules 방식으로 변경**:
   ```html
   <script type="importmap">
   {
     "imports": {
       "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
       "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
     }
   }
   </script>
   
   <script type="module">
   import * as THREE from 'three';
   import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
   // ...
   </script>
   ```

2. ✅ **파일 분리**: 3개의 HTML + 1개의 CSS로 모듈화

3. ✅ **polyfill.io 제거**: 최신 브라우저는 ES6 기본 지원

4. ✅ **내용 보강**:
   - 논문 참고 자료 추가
   - 추천 연구 주제 6가지 제시
   - localStorage 기반 메모 저장 기능
   - 무차원화 설명 강화

---

## 🔧 기술 스택

### Frontend
- **HTML5**: 구조
- **CSS3**: 스타일링 (공통 스타일 분리)
- **JavaScript (ES6 Modules)**: 인터랙티브 기능

### Libraries
- **MathJax 3**: LaTeX 수식 렌더링
- **Three.js 0.160**: 3D 그래픽 (ES modules)
  - OrbitControls: 카메라 제어
- **Cannon.js 0.6**: 물리엔진 (입자 유체 시뮬레이션)

### Canvas API
- 2D 포물선 단면 그래프 그리기

---

## 📖 참고 논문

1. **Monteiro, M., Marti, A. C., & Vogt, P. (2019)**
   - *"The Parabola of Revolution: An Experimental Study Using a Rectangular Container"*
   - arXiv:1908.04256 [physics.ed-ph]
   - [링크](https://arxiv.org/abs/1908.04256)

2. **Menker, S. & Herczyński, A. (2022)**
   - *"Dry Patches and Rotating Containers"*
   - arXiv:2208.05059 [physics.flu-dyn]
   - [링크](https://arxiv.org/abs/2208.05059)

---

## 🎓 교육 활용

### 대상
- 고등학교 수학/물리 심화 과정
- 대학 교양 물리학
- 과학 영재 프로그램
- STEAM 교육

### 학습 목표
1. 실생활 현상 → 수학 모델 변환 능력
2. 컴퓨터 시뮬레이션을 통한 이론 검증
3. 과학적 탐구 프로세스 경험
4. 무차원 분석 및 스케일링 법칙 이해

### 추천 활동
- 실제 회전 물통 실험 및 비디오 분석
- 시뮬레이션 데이터로 중력가속도 역추정
- 다양한 기하 형태의 임계 각속도 비교
- 점성 유체 사용 시 이완 시간 측정

---

## 💡 추가 기능 아이디어

- [ ] CSV 데이터 내보내기 (실험 데이터 분석용)
- [ ] 실험 vs 이론 그래프 오버레이
- [ ] 원통/정육면체 수조 시뮬레이션 추가
- [ ] VR/AR 확장 (WebXR)
- [ ] 멀티플레이어 협업 모드

---

## 🤝 기여

버그 리포트나 개선 제안은 Issues에 등록해주세요.

---

## 📄 라이센스

교육용 자료로 자유롭게 사용 가능합니다.

---

## 📞 문의

교육 활용이나 기술 지원이 필요하시면 연락 주세요.

**제작일**: 2025-11-25  
**버전**: 2.0 (모듈화 및 버그 수정 완료)
