// Kayles Game Logic (script.js)

const N_PINS = 60; // 핀 개수
let pins = []; // 핀 상태 (1: 서있음, 0: 제거됨)
let selectedPins = []; // 선택된 핀 인덱스
let currentPlayer = 'human'; // 현재 턴 (human 또는 ai)
let gameEnded = false;

const pinsContainer = document.getElementById('pins-container');
const gameMessage = document.getElementById('game-message');
const resetButton = document.getElementById('reset-button');
const currentTurnSpan = document.getElementById('current-turn');
const aiStatusSpan = document.getElementById('ai-status');

let inferenceSession; // ONNX Runtime InferenceSession

// 게임 초기화
function initializeGame() {
    pins = Array(N_PINS).fill(1); // 모든 핀을 서있는 상태로 초기화
    selectedPins = [];
    currentPlayer = 'human'; // 항상 사람이 먼저 시작
    gameEnded = false;
    gameMessage.textContent = '';
    renderPins();
    updateTurnDisplay();
    aiStatusSpan.textContent = '준비됨';
}

// 핀 렌더링
function renderPins() {
    pinsContainer.innerHTML = '';
    pins.forEach((state, index) => {
        const pinElement = document.createElement('div');
        pinElement.classList.add('pin');
        pinElement.dataset.index = index;
        if (state === 0) {
            pinElement.classList.add('removed');
        }
        pinElement.textContent = index + 1; // 핀 번호 표시
        pinElement.addEventListener('click', handlePinClick);
        pinsContainer.appendChild(pinElement);
    });
}

// 핀 클릭 핸들러
function handlePinClick(event) {
    if (gameEnded || currentPlayer !== 'human') return; // 게임 종료 또는 AI 턴이면 무시

    const clickedPinIndex = parseInt(event.target.dataset.index);

    // 이미 제거된 핀이면 무시
    if (pins[clickedPinIndex] === 0) return;

    // 선택된 핀 토글
    const indexInSelected = selectedPins.indexOf(clickedPinIndex);
    if (indexInSelected > -1) {
        selectedPins.splice(indexInSelected, 1);
        event.target.classList.remove('selected');
    } else {
        // 최대 2개 핀 선택 가능
        if (selectedPins.length < 2) {
            selectedPins.push(clickedPinIndex);
            event.target.classList.add('selected');
        } else {
            // 이미 2개 선택되어 있으면 가장 오래된 것 제거하고 새 것 추가
            const oldPinIndex = selectedPins.shift();
            document.querySelector(`.pin[data-index="${oldPinIndex}"]`).classList.remove('selected');
            selectedPins.push(clickedPinIndex);
            event.target.classList.add('selected');
        }
    }

    // 2개 핀이 선택되었고, 인접한 핀인지 확인 후 제거
    if (selectedPins.length === 2) {
        const [p1, p2] = selectedPins.sort((a, b) => a - b);
        if (p2 - p1 === 1) { // 인접한 핀인 경우
            removePins(p1, p2);
            selectedPins = []; // 선택 초기화
        } else {
            gameMessage.textContent = '인접한 핀 2개만 선택할 수 있습니다.';
            // 잠시 메시지 표시 후 선택 초기화
            setTimeout(() => {
                gameMessage.textContent = '';
                selectedPins.forEach(idx => document.querySelector(`.pin[data-index="${idx}"]`).classList.remove('selected'));
                selectedPins = [];
            }, 1000);
        }
    }
}

// 핀 제거 로직
function removePins(pin1, pin2) {
    pins[pin1] = 0;
    pins[pin2] = 0;
    renderPins(); // 핀 상태 업데이트

    // 게임 종료 조건 확인
    if (!hasValidMoves(pins)) {
        gameEnded = true;
        gameMessage.textContent = `게임 종료! ${currentPlayer === 'human' ? 'AI' : '당신'}이 승리했습니다! (Misere Play)`;
        currentTurnSpan.textContent = '종료';
    } else {
        // 턴 변경
        currentPlayer = currentPlayer === 'human' ? 'ai' : 'human';
        updateTurnDisplay();
        if (currentPlayer === 'ai') {
            setTimeout(aiTurn, 1000); // AI 턴 시작 (1초 지연)
        }
    }
}

// 유효한 움직임이 있는지 확인
function hasValidMoves(currentPins) {
    let valid = false;
    for (let i = 0; i < N_PINS - 1; i++) {
        if (currentPins[i] === 1 && currentPins[i+1] === 1) {
            valid = true; // 인접한 두 핀이 서있으면 유효한 움직임이 있음
            break; // 하나라도 찾으면 바로 종료
        }
    }
    console.log("hasValidMoves:", valid, "for pins:", currentPins); // 디버깅 로그 추가
    return valid;
}

// 턴 표시 업데이트
function updateTurnDisplay() {
    currentTurnSpan.textContent = currentPlayer === 'human' ? '당신' : 'AI';
}

// AI 턴 로직
async function aiTurn() {
    aiStatusSpan.textContent = '생각 중...';
    gameMessage.textContent = 'AI가 수를 두고 있습니다...';

    // 현재 핀 상태를 ONNX 모델 입력 형식으로 변환
    const inputTensor = new ort.Tensor('float32', new Float32Array(pins), [1, N_PINS]);

    console.log("AI Turn - Current Pins:", pins); // 디버깅 로그 추가

    try {
        const maskData = new Uint8Array(actionMasks.map(m => m ? 1 : 0));
        const maskTensor = new ort.Tensor('bool', maskData, [1, N_PINS - 1]);
        const feeds = {
            obs: inputTensor,
            action_masks: maskTensor
       };
        const results = await inferenceSession.run(feeds);
        
        // ONNX 모델 출력에서 action_logits 가져오기
        const actionLogits = results.action_logits.data;
        console.log("AI Turn - Raw Action Logits (first 10):", actionLogits.slice(0, 10), "..."); // 디버깅 로그 추가 (일부만)
        console.log("AI Turn - Raw Action Logits length:", actionLogits.length); // 디버깅 로그 추가

        // 유효한 행동 마스크 생성 (JavaScript 버전)
        const actionMasks = [];
        for (let i = 0; i < N_PINS - 1; i++) {
            actionMasks.push(pins[i] === 1 && pins[i+1] === 1);
        }
        console.log("AI Turn - Action Masks (for JS filtering):", actionMasks); // 디버깅 로그 추가

        // 마스크된 행동 중에서 가장 높은 확률을 가진 행동 선택
        let bestActionIndex = -1;
        let maxLogit = -Infinity;
        let validActionsConsidered = 0; // 디버깅: 유효한 행동 중 몇 개를 고려했는지

        for (let i = 0; i < actionLogits.length; i++) {
            if (actionMasks[i]) { // 유효한 행동인 경우에만 고려
                validActionsConsidered++;
                const currentLogit = Number(actionLogits[i]); // BigInt를 Number로 변환 (여전히 필요할 수 있음)
                console.log(`  Action ${i}: logit = ${currentLogit}`); // 각 유효 행동의 logit 값 출력

                // NaN 또는 Infinity 값 체크
                if (isNaN(currentLogit) || !isFinite(currentLogit)) {
                    console.warn(`  Warning: Logit for action ${i} is NaN or Infinity. Skipping.`);
                    continue; // 비정상적인 logit 값은 건너뛰기
                }

                if (currentLogit > maxLogit) {
                    maxLogit = currentLogit;
                    bestActionIndex = i;
                }
            }
        }
        console.log("AI Turn - Total valid actions considered:", validActionsConsidered);
        console.log("AI Turn - Max Logit found:", maxLogit);
        console.log("AI Turn - Chosen bestActionIndex (after loop):", bestActionIndex);

        if (bestActionIndex !== -1) {
            // AI가 선택한 핀 인덱스 계산
            const pin1 = bestActionIndex;
            const pin2 = bestActionIndex + 1;
            console.log(`AI Turn - Chosen Pins: ${pin1}, ${pin2}`); // 디버깅 로그 추가

            // AI가 선택한 핀 시각적으로 표시
            document.querySelector(`.pin[data-index="${pin1}"]`).classList.add('selected');
            document.querySelector(`.pin[data-index="${pin2}"]`).classList.add('selected');

            setTimeout(() => {
                removePins(pin1, pin2);
                // 선택 표시 제거
                document.querySelector(`.pin[data-index="${pin1}"]`).classList.remove('selected');
                document.querySelector(`.pin[data-index="${pin2}"]`).classList.remove('selected');
                aiStatusSpan.textContent = '완료';
                gameMessage.textContent = '';
            }, 1000); // 1초 후 핀 제거

        } else {
            console.error("AI Turn - No valid action found by AI, but game is not terminated yet. This indicates a problem in AI's action selection."); // 핵심 디버깅 로그
            gameEnded = true;
            gameMessage.textContent = 'AI가 둘 곳이 없습니다. 당신이 승리했습니다!';
            currentTurnSpan.textContent = '종료';
            aiStatusSpan.textContent = '오류/종료';
        }

    } catch (e) {
        console.error('ONNX Runtime 추론 오류:', e);
        gameMessage.textContent = 'AI 오류 발생!';
        aiStatusSpan.textContent = '오류';
        gameEnded = true;
    }
}

// ONNX 모델 로드
async function loadOnnxModel() {
    aiStatusSpan.textContent = '모델 로딩 중...';
    try {
        inferenceSession = await ort.InferenceSession.create('./kayles_60pins_misere_model.onnx');
        aiStatusSpan.textContent = '모델 로드 완료!';
        console.log('ONNX 모델 로드 완료:', inferenceSession);
        initializeGame(); // 모델 로드 후 게임 초기화
    } catch (e) {
        console.error('ONNX 모델 로드 오류:', e);
        aiStatusSpan.textContent = '모델 로드 실패!';
        gameMessage.textContent = 'AI 모델 로드에 실패했습니다. 게임을 플레이할 수 없습니다.';
    }
}

// 이벤트 리스너
resetButton.addEventListener('click', initializeGame);

// 페이지 로드 시 모델 로드 시작
window.onload = loadOnnxModel;
