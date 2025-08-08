// Kayles Game Logic (script.js)

// --- 설정 ---
let N_PINS = 81; // 실제 게임에 사용할 핀 개수
const MAX_PINS = 128; // 모델이 학습된 최대 핀 개수 (관찰/행동 공간 크기)
const MODEL_PATH = './kayles_81pins.onnx'; // 사용할 ONNX 모델 파일

// --- 전역 변수 ---
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

// --- 게임 로직 ---

// 게임 초기화
function initializeGame() {
    pins = Array(N_PINS).fill(1); // 실제 핀 개수만큼 초기화
    selectedPins = [];
    currentPlayer = 'human'; // 항상 사람이 먼저 시작
    gameEnded = false;
    gameMessage.textContent = '인접한 핀 2개를 클릭하여 제거하세요.';
    renderPins();
    updateTurnDisplay();
    aiStatusSpan.textContent = '준비됨';
}

// 핀 렌더링
function renderPins() {
    pinsContainer.innerHTML = '';
    // 실제 핀 개수(N_PINS)만큼만 렌더링
    for (let i = 0; i < N_PINS; i++) {
        const pinElement = document.createElement('div');
        pinElement.classList.add('pin');
        pinElement.dataset.index = i;
        if (pins[i] === 0) {
            pinElement.classList.add('removed');
        }
        pinElement.textContent = i + 1; // 핀 번호 표시
        pinElement.addEventListener('click', handlePinClick);
        pinsContainer.appendChild(pinElement);
    }
}

// 핀 클릭 핸들러
function handlePinClick(event) {
    if (gameEnded || currentPlayer !== 'human') return;

    const clickedPinIndex = parseInt(event.target.dataset.index);
    if (pins[clickedPinIndex] === 0) return;

    const indexInSelected = selectedPins.indexOf(clickedPinIndex);
    if (indexInSelected > -1) {
        selectedPins.splice(indexInSelected, 1);
        event.target.classList.remove('selected');
    } else {
        if (selectedPins.length < 2) {
            selectedPins.push(clickedPinIndex);
            event.target.classList.add('selected');
        }
    }

    if (selectedPins.length === 2) {
        const [p1, p2] = selectedPins.sort((a, b) => a - b);
        if (p2 - p1 === 1 && pins[p1] === 1 && pins[p2] === 1) {
            removePins(p1, p2);
        } else {
            gameMessage.textContent = '인접하고 아직 제거되지 않은 핀 2개를 선택해야 합니다.';
            setTimeout(() => {
                selectedPins.forEach(idx => document.querySelector(`.pin[data-index="${idx}"]`)?.classList.remove('selected'));
                selectedPins = [];
                gameMessage.textContent = '인접한 핀 2개를 클릭하여 제거하세요.';
            }, 1500);
        }
    }
}

// 핀 제거 로직
function removePins(pin1, pin2) {
    pins[pin1] = 0;
    pins[pin2] = 0;
    selectedPins = [];
    renderPins();

    if (!hasValidMoves(pins)) {
        gameEnded = true;
        // 미제르 플레이: 마지막으로 움직인 사람이 패배
        gameMessage.textContent = `게임 종료! ${currentPlayer === 'human' ? '당신' : 'AI'}의 패배입니다!`;
        currentTurnSpan.textContent = '종료';
    } else {
        currentPlayer = currentPlayer === 'human' ? 'ai' : 'human';
        updateTurnDisplay();
        if (currentPlayer === 'ai') {
            setTimeout(aiTurn, 500);
        }
    }
}

// 유효한 움직임이 있는지 확인
function hasValidMoves(currentPins) {
    for (let i = 0; i < N_PINS - 1; i++) {
        if (currentPins[i] === 1 && currentPins[i + 1] === 1) {
            return true;
        }
    }
    return false;
}

// 턴 표시 업데이트
function updateTurnDisplay() {
    currentTurnSpan.textContent = currentPlayer === 'human' ? '당신' : 'AI';
}

// AI 턴 로직
async function aiTurn() {
    if (gameEnded) return;
    aiStatusSpan.textContent = '생각 중...';
    gameMessage.textContent = 'AI가 수를 두고 있습니다...';

    // 1. 관찰(obs) 준비: 실제 핀 상태를 MAX_PINS 크기로 패딩
    const paddedObs = new Float32Array(MAX_PINS).fill(0);
    paddedObs.set(pins); // Float32Array의 시작 부분에 현재 핀 상태 복사
    const obsTensor = new ort.Tensor('float32', paddedObs, [1, MAX_PINS]);

    // 2. 행동 마스크(action_masks) 준비: MAX_PINS-1 크기로 생성
    const actionMasks = Array(MAX_PINS - 1).fill(false);
    for (let i = 0; i < N_PINS - 1; i++) {
        // 실제 게임판(N_PINS) 내에서만 유효한 행동을 true로 설정
        if (pins[i] === 1 && pins[i + 1] === 1) {
            actionMasks[i] = true;
        }
    }
    const maskData = new Uint8Array(actionMasks.map(m => m ? 1 : 0));
    const maskTensor = new ort.Tensor('bool', maskData, [1, MAX_PINS - 1]);

    try {
        const feeds = { obs: obsTensor, action_masks: maskTensor };
        const results = await inferenceSession.run(feeds);
        const actionLogits = results.action_logits.data;

        let bestActionIndex = -1;
        let maxLogit = -Infinity;

        for (let i = 0; i < actionLogits.length; i++) {
            if (actionMasks[i]) { // 유효한 행동 중에서만 선택
                if (actionLogits[i] > maxLogit) {
                    maxLogit = actionLogits[i];
                    bestActionIndex = i;
                }
            }
        }

        if (bestActionIndex !== -1) {
            const pin1 = bestActionIndex;
            const pin2 = bestActionIndex + 1;

            // AI가 선택한 핀 시각적으로 표시
            document.querySelector(`.pin[data-index="${pin1}"]`)?.classList.add('selected');
            document.querySelector(`.pin[data-index="${pin2}"]`)?.classList.add('selected');

            setTimeout(() => {
                removePins(pin1, pin2);
                aiStatusSpan.textContent = '준비됨';
                gameMessage.textContent = '인접한 핀 2개를 클릭하여 제거하세요.';
            }, 1000);
        } else {
            // 이 경우는 hasValidMoves가 false일 때만 발생해야 함
            console.error("AI가 유효한 행동을 찾지 못했습니다.");
            gameMessage.textContent = 'AI 오류: 행동 선택 실패';
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
        // ort.env.wasm.numThreads = 1; // 필요시 Wasm 스레드 수 설정
        inferenceSession = await ort.InferenceSession.create(MODEL_PATH, { executionProviders: ['wasm'] });
        aiStatusSpan.textContent = '모델 로드 완료!';
        console.log('ONNX 모델 로드 완료:', inferenceSession);
        initializeGame(); // 모델 로드 후 게임 초기화
    } catch (e) {
        console.error('ONNX 모델 로드 오류:', e);
        aiStatusSpan.textContent = '모델 로드 실패!';
        gameMessage.textContent = `AI 모델(${MODEL_PATH}) 로드에 실패했습니다. 파일을 확인해주세요.`;
    }
}

// 이벤트 리스너
resetButton.addEventListener('click', initializeGame);

// 페이지 로드 시 모델 로드 시작
window.onload = loadOnnxModel;