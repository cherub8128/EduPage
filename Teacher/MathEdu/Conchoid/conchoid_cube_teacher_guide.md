
# (교사용) 프로젝트형 수업 해설서  
## 니코메데스의 콘코이드(Conchoid)로 ‘배적(두 배의 입방체)’ 문제를 풀어보기  
### 실험(관찰) → 단순화(일반화) → 시뮬레이션 → 수학적 모델링 → 심화(개별화)

> 대상: 고등학교 2학년(수학Ⅱ/미적분/기하 선택 과목과 유연하게 연결 가능)  
> 수업 형태: 프로젝트 기반(PBL) + 수학적 모델링 + 디지털 도구(GeoGebra/HTML+JS, Tinkercad)  
> 핵심 질문: **“어떤 ‘기계적 제약’이 만들어내는 궤적을 수학적으로 규정하고, 그 곡선이 고전 문제(배적)를 어떻게 해결하는가?”**

---

## 0. 한 장 요약(교사용)

- 고대 그리스 기하학을 “만들어서 말하기(구성 중심)”로 해석하면, **구성(construct)**은 단순한 그림이 아니라 *존재/일관성*을 보장하는 장치가 된다.
- **Neusis(버징/맞대기)** 문제는 자·컴퍼스만으로는 일반적으로 불가능한 구성으로 알려져 있으며, 니코메데스는 **콘코이드**라는 곡선을 “기계로 그려서” neusis를 해결한다.
- neusis를 풀 수 있으면 **두 평균비례(two mean proportionals)**를 만들 수 있고, 이는 곧 **배적(입방체를 두 배로)** 문제로 이어진다.
- 수업은 “기계적 제약 → 데이터(점 구름) → 곡선의 방정식(모델) → 검증”의 과학적 흐름으로 구성한다.

---

## 1. 교육과정 연결(고2 기준)과 역량 목표

### 1.1 연결 가능한 단원(예시)
- **수학Ⅱ**
  - 삼각함수(각, $\sin,\cos,\tan$, $\sec$), 삼각비의 활용
  - 함수의 그래프 해석(점근선, 대칭, 여러 가지 분기(branch))
- **미적분(선택)**
  - 함수의 미분, 도함수로 접선 기울기/변곡 등 해석
- **기하(선택)**
  - 좌표기하(곡선의 방정식, 매개변수 표현)
  - 닮음/비례, 벡터(단위벡터로 점 생성)

### 1.2 수업에서 길러야 할 ‘수학적 행동’
- (정반합 관점)  
  - **정(정의·명제)**: “콘코이드란 무엇인가?”  
  - **반(반례·오류·불가능성)**: “왜 자·컴퍼스만으로는 neusis/배적이 어렵나?”  
  - **합(확장·모델링)**: “곡선/기구를 도입하면 무엇이 가능해지는가?”
- 수학적 모델링 프로세스
  - 현상 관찰 → 변수 선택 → 단순화 가정 → 수식화 → 예측 → 검증/오차 분석

---

## 2. 전체 수업 설계(권장 8차시, 50분 기준)

> “읽기(문헌) + 제작(틴커캐드) + 구현(지오지브라/웹) + 증명(수학)”을 **순서대로** 밟게 하는 설계다.

### 차시 1 — 문제 세팅: “배적은 왜 유명한가?”
- 도입: “한 변이 $a$인 정육면체의 부피는 $a^3$. 부피가 2배인 정육면체의 한 변은?”
  - 목표: $x^3 = 2a^3 \Rightarrow x = a\sqrt[3]{2}$
- 토론: $\sqrt{2}$는 만들 수 있는데 $\sqrt[3]{2}$는 왜 느낌이 다를까?
- 미션 공지: “오늘부터 우리가 할 일은 $\sqrt[3]{2}$를 ‘만드는 방법’을 찾는 것.”

### 차시 2 — 읽기(문헌 1): “만들어서 말하기(구성)” 관점
- 활동
  - 그림 직관 vs 구성 절차: “보인다”와 “증명된다”의 차이
  - ‘정의만으로 대상이 생기는가?’에 대한 짧은 사고실험(모순 사례 제시)

### 차시 3 — 읽기(문헌 2): Neusis 문제와 콘코이드 정의
- Neusis 문제 소개: 두 직선 $L,M$, 점 $O$, 길이 $a$가 주어질 때  
  $O$를 지나는 직선이 $L,M$을 각각 $A,B$에서 만나며 $AB=a$가 되게 하라.
- 니코메데스의 아이디어: “$AB=a$ 조건을 강제하는 궤적(콘코이드)을 먼저 만든다.”

### 차시 4 — 실험(관찰): “기계적 제약”으로 궤적을 관찰/데이터화
> 실제 제작을 “3D프린터/레이저커팅” 대신, **Tinkercad로 기구 도면을 설계**하고 움직임의 논리를 분석한다.

- 관찰 실험 A(가상 기구 설계)
  - Tinkercad에서 “슬라이더-핀-막대” 조합으로 ‘콘코이드 트레이서’ 개념 설계
  - 핵심 제약: **초과 길이(excess)가 일정**하도록(막대의 특정 부분 길이를 고정)
- 관찰 실험 B(데이터 수집)
  - 방법 1: GeoGebra Locus로 점 자동 생성(권장)
  - 방법 2: 실제 간이장치 + 영상 + Tracker(선택 심화)

#### 과학 실험 표준: 변수 설정
- **조작변인(독립변인)**: pole에서 직선 $L$까지 거리 $d$, interval(고정 길이) $k$
- **통제변인**: 좌표계/스케일, 샘플링 방식(각 간격), 측정 도구
- **종속변인**: 궤적 점 $P(x,y)$ 분포, 점근선/루프 존재 등

### 차시 5 — 단순화(일반화): 정의를 수학 모델로 번역
- 단순화 가정
  1) $O=(0,0)$
  2) $L: x=d$ ($d>0$)
  3) ray는 각 $\theta$로 매개화
  4) $OP = OQ \pm k$
- 일반화 맛보기: 직선이 기울어져도 좌표변환(회전/이동)으로 같은 형태의 식이 나온다.

### 차시 6 — 시뮬레이션: GeoGebra 또는 HTML+JS 구현
- GeoGebra: 정의 기반 생성(점 → 궤적)
- HTML+JS: $\theta$를 스윕하며 점을 그리기(시각화+데이터)

### 차시 7 — 모델링(수식 유도+증명): 방정식/성질/검증
- 콘코이드 방정식 유도(극좌표/매개/암시식)
- 점근선/대칭/branch 조건 분석
- 데이터와 모델 비교, 오차 원인 분류

### 차시 8 — 심화(개별화): 배적(두 평균비례)로 연결
- “콘코이드 → neusis 해결 → 두 평균비례 → 배적 해결” 연결 사슬 정리
- 학생 선택 심화(수학/공학/역사철학 중 택1)

---

## 3. 수학적 모델링 1: 콘코이드 방정식 유도(정의 → 좌표)

### 3.1 기하적 정의(수업용)
- 고정 점 $O$(pole)와 고정 직선 $L$
- $O$에서 방향 $\theta$로 ray $\ell_\theta$
- $Q=\ell_\theta\cap L$
- $P$는 ray 위에서 $QP=k$ (앞/뒤 두 방향 가능)
- $\theta$ 변화에 따른 $P$의 자취가 콘코이드

### 3.2 좌표 설정(단순화)
- $O=(0,0)$
- $L:x=d$
- ray 방향 각 $\theta$

교점
$$
Q=(d,\; d\tan\theta)
$$
거리
$$
OQ=d\sec\theta.
$$

### 3.3 극좌표식
정의에서 $OP=OQ\pm k$ 이므로
$$
r=d\sec\theta\pm k.
$$

### 3.4 암시적 방정식(핵심)
‘+’ branch로 유도:
$$
x=(d\sec\theta+k)\cos\theta=d+k\cos\theta
$$
따라서
$$
\cos\theta=\frac{x-d}{k},\quad \sec\theta=\frac{k}{x-d}.
$$
또한
$$
r=d\sec\theta+k=k\frac{x}{x-d}.
$$
$r^2=x^2+y^2$를 대입하면
$$
x^2+y^2=\left(k\frac{x}{x-d}\right)^2
$$
정리하여
$$
(x^2+y^2)(x-d)^2=k^2x^2.
$$

#### 해석 포인트
- 점근선: $x=d$
- 대칭: $y\mapsto -y$ 대칭
- $k,d$에 따라 내부 루프/두 branch의 형태 변화

---

## 4. 수학적 모델링 2: 접선 기울기(미적분 연결)

암시식
$$
F(x,y)=(x^2+y^2)(x-d)^2-k^2x^2=0
$$
에서,
$$
\frac{dy}{dx}=-\frac{F_x}{F_y}.
$$

계산
$$
F_x=2x(x-d)^2+2(x^2+y^2)(x-d)-2k^2x,
$$
$$
F_y=2y(x-d)^2.
$$
따라서
$$
\frac{dy}{dx}=-\frac{x(x-d)^2+(x^2+y^2)(x-d)-k^2x}{y(x-d)^2}.
$$

---

## 5. 시뮬레이션 구현

### 5.1 GeoGebra(정의 기반) 구현
1. $O=(0,0)$
2. 슬라이더 $d>0$, 직선 $L: x=d$
3. 슬라이더 $\theta$, ray $\ell_\theta$
4. $Q=\ell_\theta\cap L$
5. 단위벡터 $\hat{u}=\overrightarrow{OQ}/|OQ|$
6. $P_+=Q+k\hat{u}$, $P_-=Q-k\hat{u}$
7. `Locus(P_+, θ)`, `Locus(P_-, θ)`

### 5.2 HTML+JS(캔버스) 예시 코드
(본문에는 길이 관계와 시각화만 담은 최소 예시를 제공)

```html
<!-- 본문 코드: 교사가 그대로 복사하여 실행 가능 -->
```

---

## 6. 배적(두 평균비례)로 연결하는 수학

### 6.1 두 평균비례 정의
$a<b$에 대해 $x,y$가
$$
a:x=x:y=y:b
$$
을 만족하면 $x,y$는 두 평균비례.

### 6.2 배적(입방체 2배)
한 변 $a$인 정육면체 부피 $a^3$의 2배는 $2a^3$.
$$
x^3=2a^3\Rightarrow x=a\sqrt[3]{2}.
$$
이때 $b=2a$에 대해 두 평균비례 $x,y$를 만들면 곧 배적을 해결한다.

---

## 7. 실험-검증: 데이터 ↔ 모델 비교, 오차 분석

### 7.1 잔차(Residual) 정의
모델
$$
(x^2+y^2)(x-d)^2=k^2x^2
$$
에 대해 점 $P_i(x_i,y_i)$의 잔차:
$$
\varepsilon_i=(x_i^2+y_i^2)(x_i-d)^2-k^2x_i^2.
$$

### 7.2 오차 원인 분류
- 수학적: 좌표계/식 전개 오류, 파라미터 부호(branch) 혼동
- 측정적: 표본화 각 간격, 수치 반올림, 픽셀-실측 변환
- 기구학적: 마찰/유격/강체 가정 위배(실제 장치 사용 시)

---

## 8. 심화(개별화) 과제 메뉴

### 8.1 수학 심화
- 콘코이드 내부 루프 조건 탐구($k>d$ 등)
- 접선/법선/곡률(미적분 심화)
- “왜 자·컴퍼스로는 안 되나?” 대수적 맛보기(3차 vs 2차)

### 8.2 공학 심화
- 자유도(DoF) 분석: 장치가 왜 1자유도인가?
- 경로 생성(path generation)과 로봇 링크의 유사성 리포트

### 8.3 역사·철학 심화
- “구성 중심” 기하학의 의미와, 기계적 작도의 정당성 논쟁

---

## 9. 참고 자료(수업 기반)
- *Operationalism: An Interpretation of the Philosophy of Ancient Geometry* (Blåsjö)
- *Neusis / Verging* 자료(니코메데스의 conchoid로 neusis, 두 평균비례)
- MAA 자료(*The Duplicators… Nicomedes in On Conchoid Lines*)



---

## 10. (교사용 심화 수학) 콘코이드의 형태 분석: 분기, 정의역, 교점

여기서는 암시식
$$
(x^2+y^2)(x-d)^2=k^2x^2
$$
을 가지고, 그래프 해석(고2 수준)으로 “곡선이 왜 그런 모양인지”를 설명하는 파트를 확장한다.

### 10.1 $y$를 $x$의 함수로 풀어 보기(분기 확인)
위 식에서 $y^2$를 정리하면
$$
(x^2+y^2)(x-d)^2=k^2x^2
\Rightarrow y^2=\frac{k^2x^2}{(x-d)^2}-x^2.
$$
따라서
$$
y=\pm \sqrt{\frac{k^2x^2}{(x-d)^2}-x^2}
=\pm |x|\sqrt{\frac{k^2}{(x-d)^2}-1}.
$$

#### 실수값 조건(정의역 조건)
루트 안이 $\ge 0$이어야 하므로
$$
\frac{k^2}{(x-d)^2}-1\ge 0
\Rightarrow \frac{k^2}{(x-d)^2}\ge 1
\Rightarrow |x-d|\le k.
$$
즉, **실수점이 존재하는 $x$는 $d-k\le x\le d+k$ 근방에서 시작**하며,
점근선 $x=d$ 근처에서 $y$가 크게 벌어지는 모양이 자연스럽게 설명된다.

> 교실 운영 팁: 이 조건 하나만으로도 학생들이 “왜 어떤 구간에서는 점이 아예 안 찍히지?”를 스스로 설명하게 된다.

### 10.2 $x$축과의 교점(루프 존재의 힌트)
$y=0$을 대입하면
$$
x^2(x-d)^2=k^2x^2.
$$
$x=0$ 또는 $(x-d)^2=k^2$이므로,
$$
x=0,\quad x=d-k,\quad x=d+k.
$$
따라서 콘코이드는 보통 $x$축을 세 점에서 만날 수 있고(매개/branch에 따라 실제로 찍히는 점은 달라질 수 있음),
특히 $d-k<0$이면(즉 $k>d$이면) 원점 왼쪽까지 교점이 생겨 **내부 루프**가 나올 가능성이 커진다.

### 10.3 점근선($x=d$)을 “극좌표 폭발”로 설명하기
극좌표식 $r=d\sec\theta\pm k$에서 $\theta\to \pm \frac{\pi}{2}$이면 $\cos\theta\to 0$이라 $\sec\theta\to\infty$.
즉 $r$이 발산하고, 좌표로는 $x=r\cos\theta$가 $d$에 “붙어버리는” 형태가 된다.

---

## 11. (교사용) Neusis를 콘코이드로 푸는 ‘완전한 논리’(수업용 증명)

### 11.1 Neusis 문제 재진술(기하적으로 깔끔한 버전)
- 직선 $L$과 $M$이 주어진다.
- 점 $O$가 주어진다(이 점을 지나는 직선을 찾는다).
- 길이 $a$가 주어진다.
- 목표: $O$를 지나는 직선이 $L$과 $M$을 각각 $A,B$에서 만나게 하되, $AB=a$가 되게 하라.

### 11.2 니코메데스의 전략(정의로 ‘조건을 강제’)
핵심은 다음 한 문장이다.

> “직선 $M$ 위에서, $AB=a$를 만족시키는 점 $B$는 **콘코이드 위에 놓이도록** 만들 수 있다.”

구체적으로:
1. $L$을 ‘축(axis)’으로 삼고, pole을 $O$로 둔다.
2. interval(정의에서의 고정 거리)을 $a$로 둔 콘코이드를 그린다.
3. 그 콘코이드가 직선 $M$과 만나는 교점을 $B$로 잡는다.
4. $OB$를 그어 $L$과 만나는 점을 $A$로 잡는다.

이때 $AB=a$가 성립한다.  
왜냐하면, $B$가 콘코이드 위의 점이므로 “pole에서 $B$로 가는 ray가 $L$과 만나는 점”을 $A$라고 할 때, 정의상 $AB$가 interval과 같아야 하기 때문이다.

> 교사용 코칭 문장:  
> “여기서는 **증명이 짧은 게 장점**이에요. 짧다는 건 ‘대충’이 아니라, ‘정의에 조건이 내장’돼 있다는 뜻이에요.”

---

## 12. (교사용) 두 평균비례 구성의 논리(문헌 기반, 고2 친화 재정리)

문헌의 구성은 다소 복잡한 도형을 포함하므로, 수업에서는 다음의 “핵심 논리 뼈대”를 분리해 제시하는 편이 안전하다.

### 12.1 목표 구조
두 평균비례는
$$
a:x=x:y=y:b
$$
의 **연쇄비례**를 만드는 문제다.

따라서 교사는 학생에게 다음을 목표로 준다.
- 닮음 삼각형 2쌍을 찾아
  - $a:x = x:y$ 형태
  - $x:y = y:b$ 형태
  를 만들고, 결합해서 연쇄비례를 얻는다.

### 12.2 왜 ‘neusis 단계’가 필요한가?
문헌 구성에서 가장 중요한 문장은 이것이다.

- 구성 중 3단계(어떤 선분 길이를 정확히 맞추는 단계)는 **자·컴퍼스(직선과 원)만으로는 수행할 수 없다**는 코멘트가 들어간다.

교실에서의 핵심 메시지:
- “자·컴퍼스만으로는 안 되는 단 한 단계”가 등장하는 순간,
- 그 단계가 바로 “세제곱근 세계”로 넘어가는 문이다.

### 12.3 (선택) 연쇄비례 → 세제곱 관계의 즉각 도출(학생들에게 강력한 ‘와!’ 포인트)
연쇄비례
$$
a:x=x:y=y:b
$$
에서 양변을 곱해
$$
\frac{a}{x}=\frac{x}{y}=\frac{y}{b}=r
$$
로 두면 $b=a/r^3$이므로
$$
r^3=\frac{a}{b}.
$$
따라서
$$
x=\frac{a}{r}=a\sqrt[3]{\frac{b}{a}}.
$$
배적은 $b=2a$이므로 곧바로 $x=a\sqrt[3]{2}$.

> 교사용 팁:  
> 이 계산은 “기하 구성”이 단지 그림 놀이가 아니라, **대수(방정식)와 완전히 대응**한다는 메시지를 던진다.

---

## 13. (교사용) Tinkercad 단계 상세: ‘제약조건 기구학’을 수업 언어로 번역하기

> 실제 부품 제작 없이도 공학적 가치를 살리려면, “도면을 그리는 것”이 아니라  
> **‘제약조건을 설명하는 모델’을 만들게** 하는 것이 핵심이다.

### 13.1 학생 과제 형태(권장)
- 팀별로 Tinkercad에서 “콘코이드 트레이서”를 설계하고,
- 다음을 1쪽 리포트로 제출:
  1) 움직이는 부품 목록(막대/슬라이더/핀)  
  2) 각 연결의 종류(회전/슬라이딩)  
  3) 왜 1자유도(DoF)라고 생각하는지  
  4) 어떤 길이가 “항상 일정”으로 유지되게 설계했는지  

### 13.2 실전 설계 가이드(틴커캐드에서 흔히 막히는 부분)
- **슬라이더 레일**: 사각 단면 레일 + 그 안을 움직이는 블록(틈새 여유 0.2~0.5mm 개념 설명)
- **핀 조인트**: 원기둥 핀 + 회전 구멍(‘딱 맞음’이 아니라 약간의 공차가 필요)
- **“초과 길이 일정”**을 구현하려면
  - (A) 두 막대의 겹침 영역(슬롯)을 만들고,
  - (B) 슬롯 끝점-펜촉 사이 길이를 고정하는 식으로 설명하게 한다.

> 수업 언어:  
> “이건 CAD 정밀 설계 수업이 아니라, ‘제약조건이 궤적을 만든다’는 수학 수업이다.”

---

## 14. 평가(루브릭) — ‘수학적 완성도’와 ‘모델링 태도’를 분리

| 영역 | 4(탁월) | 3(충분) | 2(부분) | 1(미흡) |
|---|---|---|---|---|
| 정의→모델 번역 | 정의를 극좌표/암시식으로 완전 유도, 변수 의미 설명 | 유도는 가능하나 변수 의미 설명이 약함 | 식 일부만 도출, 논리 비약 | 정의와 식 연결 실패 |
| 데이터-모델 검증 | 잔차/오차 원인을 분류하고 개선 제안 | 잔차 계산 또는 오차 설명 중 하나 수행 | 비교는 하나 해석이 약함 | 비교 자체 없음 |
| 시뮬레이션 구현 | GeoGebra/웹 구현이 안정적, 파라미터 조절 가능 | 구현은 되나 기능 제한 | 구현이 불안정 | 구현 없음 |
| 배적 연결 논리 | “콘코이드→neusis→2평균비례→배적”을 스스로 서술 | 연결 사슬 대부분 설명 | 일부 연결만 | 연결 이해 부족 |
| 협업/소통 | 역할 분담과 기록이 명확 | 협업은 했으나 기록 부족 | 소수 주도 | 협업 실패 |

---

## 15. (교사용) HTML+JS 전체 코드(복사-실행용)

아래는 6차시(시뮬레이션)에서 바로 쓰는 “완전한 최소 구현”이다.  
학생에게는 **수식 $r=d\sec\theta\pm k$가 코드로 번역되는 과정**을 확인하게 한다.

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Conchoid Simulator</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 18px; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    .panel { display: grid; grid-template-columns: 1fr; gap: 10px; max-width: 920px; }
    .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    label { min-width: 140px; }
    input[type="range"] { width: 320px; }
    .pill { display:inline-block; padding: 2px 8px; border:1px solid #ddd; border-radius: 999px; background:#fafafa; }
    canvas { border: 1px solid #ddd; border-radius: 14px; width: 920px; max-width: 100%; height: auto; }
    .note { font-size: 13px; color: #444; }
    code { background: #f6f6f6; padding: 1px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>니코메데스의 콘코이드 시뮬레이터</h1>

  <div class="panel">
    <div class="row">
      <label>d (직선 <code>x=d</code>)</label>
      <input id="d" type="range" min="60" max="260" value="160" />
      <span class="pill">d=<span id="dVal"></span></span>
    </div>

    <div class="row">
      <label>k (interval)</label>
      <input id="k" type="range" min="10" max="220" value="110" />
      <span class="pill">k=<span id="kVal"></span></span>
    </div>

    <div class="row">
      <label>샘플 개수</label>
      <input id="n" type="range" min="300" max="4000" value="1800" />
      <span class="pill">n=<span id="nVal"></span></span>
    </div>

    <div class="row">
      <label>표시 옵션</label>
      <input id="showAxes" type="checkbox" checked />
      <span class="note">좌표축 표시</span>
      <input id="showLine" type="checkbox" checked />
      <span class="note">직선 <code>x=d</code> 표시</span>
    </div>

    <canvas id="cv" width="920" height="540"></canvas>

    <div class="note">
      수식: <code>r = d·sec(θ) ± k</code> 를 θ에 대해 스윕하여 점을 찍는다. (θ≈±π/2 근처는 sec가 발산하므로 제외)
    </div>
  </div>

<script>
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");

const dSlider = document.getElementById("d");
const kSlider = document.getElementById("k");
const nSlider = document.getElementById("n");
const showAxes = document.getElementById("showAxes");
const showLine = document.getElementById("showLine");

const dVal = document.getElementById("dVal");
const kVal = document.getElementById("kVal");
const nVal = document.getElementById("nVal");

function draw() {
  const d = +dSlider.value;
  const k = +kSlider.value;
  const n = +nSlider.value;

  dVal.textContent = d;
  kVal.textContent = k;
  nVal.textContent = n;

  ctx.clearRect(0, 0, cv.width, cv.height);

  // 화면 좌표계
  const ox = cv.width * 0.34;
  const oy = cv.height * 0.52;
  const scale = 1.0;

  const X = (x) => ox + x * scale;
  const Y = (y) => oy - y * scale;

  // 축
  if (showAxes.checked) {
    ctx.beginPath();
    ctx.moveTo(0, Y(0));
    ctx.lineTo(cv.width, Y(0));
    ctx.moveTo(X(0), 0);
    ctx.lineTo(X(0), cv.height);
    ctx.stroke();
  }

  // 직선 x=d
  if (showLine.checked) {
    ctx.beginPath();
    ctx.moveTo(X(d), 0);
    ctx.lineTo(X(d), cv.height);
    ctx.stroke();
  }

  // pole O
  ctx.beginPath();
  ctx.arc(X(0), Y(0), 4, 0, Math.PI * 2);
  ctx.fill();

  // branch plotting
  function plot(sign) {
    ctx.beginPath();
    let first = true;

    // theta 범위: -pi/2+eps ~ pi/2-eps
    const eps = 1e-3;
    for (let i = 0; i <= n; i++) {
      const th = -Math.PI/2 + eps + (i/n) * (Math.PI - 2*eps);
      const c = Math.cos(th);
      if (Math.abs(c) < 1e-5) continue;
      const sec = 1 / c;

      const r = d * sec + sign * k;
      const x = r * Math.cos(th);
      const y = r * Math.sin(th);

      const px = X(x), py = Y(y);
      if (first) { ctx.moveTo(px, py); first = false; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  plot(+1);
  plot(-1);
}

[dSlider, kSlider, nSlider, showAxes, showLine].forEach(el => el.addEventListener("input", draw));
draw();
</script>
</body>
</html>
```

---

## 16. (교사용) “왜 자·컴퍼스만으로는 배적이 안 되나?”를 고2 수준으로 다루는 법(정식 증명은 X)

정식 증명은 대학(대수학) 내용이지만, 학생들이 “이유의 구조”를 이해하는 것만으로도 학습 효과가 크다.

### 16.1 자·컴퍼스가 하는 일(직관)
- 자와 컴퍼스는 결국
  - 덧셈/뺄셈/곱셈/나눗셈에 해당하는 길이 구성,
  - 그리고 **제곱근**을 반복해서 뽑는 길이 구성을 만든다.
- 그래서 “자·컴퍼스로 만들 수 있는 수”는 대체로
  - $a+b\sqrt{c}$ 같은 형태가 계속 확장되는(2차 확장) 세계에 머문다.

### 16.2 배적이 요구하는 것(직관)
- 배적은 $x^3=2$를 푸는 문제라 3차(세제곱) 구조가 등장한다.
- 그래서 자·컴퍼스의 “제곱근 사다리”로는 일반적으로 도달하기 어렵다.

> 교사 전략:  
> 학생들에게 “$x^2=2$는 이차 방정식, $x^3=2$는 삼차 방정식” 정도만 연결해도, ‘왜 곡선/기계가 필요했는지’가 감으로 잡힌다.

---

# 부록 C. (교사용) 수업 운영 체크리스트(확장판)

- [ ] 정의(기하) → 방정식(대수) → 그래프(시각)로 표현을 3번 바꾸게 했는가?
- [ ] “왜 이 단순화가 타당한가?”를 한 번이라도 학생에게 말하게 했는가?
- [ ] 실험 변수(조작/통제/종속)를 실제로 문장으로 쓰게 했는가?
- [ ] 오차를 “수학/측정/기구학” 3범주로 나눠 보게 했는가?
- [ ] 학생별 심화 선택이 ‘계산’이 아니라 ‘탐구 질문’이 되도록 설계했는가?

