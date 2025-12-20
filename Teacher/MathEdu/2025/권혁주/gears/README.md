# 3D Gear Simulation | 3D 기어 시뮬레이션
https://hoodinga.github.io/PlanetaryGear_HarmonicDrive_CycloidalDrive_Sim/

An interactive 3D visualization tool for understanding different gear drive systems with real-time calculations and animations.

기어 구동 시스템을 이해하기 위한 인터랙티브 3D 시각화 도구입니다. 실시간 계산과 애니메이션을 제공합니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-0.160.0-green.svg)

## ✨ Features | 주요 기능

### 🔧 Three Gear Systems | 세 가지 기어 시스템
- **Planetary Gear** | 유성 기어
  - Compact design with high torque output
  - Typical reduction ratios: 1:3 to 1:10
  - 컴팩트한 구조와 높은 토크 출력
  
- **Harmonic Drive** | 하모닉 드라이브
  - Ultra-precise with very high reduction ratios (1:50~200)
  - Uses flexible spline deformation
  - 초정밀, 매우 높은 감속비 (1:50~200)
  
- **Cycloidal Drive** | 사이클로이드 드라이브
  - High torque density with minimal vibration
  - Wobbling motion for smooth power transmission
  - 높은 토크 밀도와 최소 진동

### 🌐 Bilingual Support | 이중 언어 지원
- 🇰🇷 Korean (한국어)
- 🇺🇸 English

### 📊 Interactive Features | 인터랙티브 기능
- **Real-time 3D Animation** | 실시간 3D 애니메이션
  - Smooth rotation visualization
  - Interactive camera controls (orbit, zoom, pan)
  
- **Dynamic Calculations** | 동적 계산
  - Speed and torque calculations
  - Gear ratio and reduction ratio display
  - Multiple torque units (Nm, kg·cm, lb·ft)
  
- **Hover Tooltips** | 호버 툴팁
  - Component identification on mouse hover
  - Korean/English component names
  
- **Configurable Parameters** | 설정 가능한 매개변수
  - Adjustable gear teeth counts
  - Real-time configuration updates
  - Visual feedback on changes

## 🚀 Getting Started | 시작하기

### Prerequisites | 필요 사항
- Modern web browser with WebGL support
- Local web server (for development)

### Installation | 설치

1. Clone the repository | 저장소 복제
```bash
git clone <repository-url>
cd planetary_gear
```

2. Start a local server | 로컬 서버 시작
```bash
# Using npx (recommended)
npx -y http-server . -o

# Or using Python
python -m http.server 8000

# Or using Node.js
npx serve
```

3. Open in browser | 브라우저에서 열기
```
http://localhost:8080 (or your server's port)
```

## 📁 Project Structure | 프로젝트 구조

```
planetary_gear/
├── index.html          # Main HTML structure | 메인 HTML 구조
├── style.css           # Glassmorphism UI styles | 글래스모피즘 UI 스타일
├── main.js             # Core application logic | 핵심 애플리케이션 로직
├── gears.js            # 3D gear geometry generators | 3D 기어 형상 생성기
├── translations.js     # Korean/English translations | 한국어/영어 번역
└── README.md           # This file | 이 파일
```

## 🎮 Usage | 사용법

### Selecting a Mode | 모드 선택
1. Use the dropdown at the top to select a gear system
2. 상단 드롭다운에서 기어 시스템 선택

### Changing Language | 언어 변경
- Click 🇰🇷 **한국어** for Korean
- Click 🇺🇸 **English** for English

### Adjusting Parameters | 매개변수 조정
1. Modify gear teeth counts or configuration values
2. Click **Update** (업데이트) button
3. Watch the 3D model and calculations update in real-time

### Interacting with 3D View | 3D 뷰 상호작용
- **Rotate** | 회전: Left mouse drag | 왼쪽 마우스 드래그
- **Zoom** | 확대/축소: Mouse wheel | 마우스 휠
- **Pan** | 이동: Right mouse drag | 오른쪽 마우스 드래그
- **Hover** | 호버: Move mouse over components to see names

## 🔬 Technical Details | 기술 세부사항

### Technology Stack | 기술 스택
- **Three.js** (0.160.0) - 3D graphics library
- **OrbitControls** - Camera interaction
- **Vanilla JavaScript** - No heavy frameworks
- **CSS3** - Modern glassmorphism design
- **ES6 Modules** - Clean code organization

### Key Components | 주요 구성요소

#### Planetary Gear Calculation | 유성 기어 계산
```
Reduction Ratio = 1 + (Ring Teeth / Sun Teeth)
Carrier Speed = Sun Speed × (Sun Teeth / (Sun + Ring Teeth))
```

#### Harmonic Drive Calculation | 하모닉 드라이브 계산
```
Reduction Ratio = Flexspline Teeth / (Circular - Flexspline Teeth)
Output Speed = Input Speed × Reduction Ratio
```

#### Cycloidal Drive Calculation | 사이클로이드 계산
```
Reduction Ratio = Number of Lobes / (Pins - Lobes) + 1
Output Speed = Input Speed / Reduction Ratio
```

### 3D Rendering Features | 3D 렌더링 기능
- **PBR Materials** - Physically-based rendering with metallic/roughness
- **Dynamic Lighting** - Ambient + directional lights
- **Raycasting** - Interactive object selection
- **Transparency** - Visual distinction for fixed components
- **Ball Bearings** - Realistic Harmonic Drive visualization

## 🎨 Design Highlights | 디자인 하이라이트

- **Glassmorphism UI** - Modern, translucent interface
- **Color Coding** - Each component type has distinct colors:
  - 🔵 Flexspline / Output (Blue/Cyan)
  - 🟠 Input / Wave Generator (Orange)
  - 🔴 Fixed / Ring Gear (Red/Magenta)
- **Responsive Layout** - Adapts to different screen sizes
- **Smooth Animations** - 60 FPS targeting
- **Visual Feedback** - Clear hover states and interactions

## 🤝 Contributing | 기여하기

Contributions are welcome! Please feel free to submit a Pull Request.

기여를 환영합니다! Pull Request를 자유롭게 제출해주세요.

## 📄 License | 라이선스

This project is open source and available under the MIT License.

이 프로젝트는 오픈 소스이며 MIT 라이선스로 제공됩니다.

## 🙏 Acknowledgments | 감사의 말

- Three.js community for excellent 3D library
- Encyclopedia Britannica for Harmonic Drive reference images
- All contributors and users of this project

## 📧 Contact | 연락처

For questions or feedback, please open an issue on GitHub.

질문이나 피드백이 있으시면 GitHub에서 이슈를 열어주세요.

---

Made with ❤️ using Three.js
