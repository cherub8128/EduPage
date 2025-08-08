// Kayles Game Logic (script.js)

// --- 설정 ---
let N_PINS = 60; // 기본 핀 개수
const MAX_PINS = 128; // 모델이 학습된 최대 핀 개수
const MODEL_PATH = './kayles_82pins.onnx'; // ONNX 모델 파일

// --- DOM 요소 ---
const pinsContainer = document.getElementById('pins-container');
const gameMessage = document.getElementById('game-message');
const resetButton = document.getElementById('reset-button');
const currentTurnSpan = document.getElementById('current-turn');
const aiStatusSpan = document.getElementById('ai-status');

// --- 전역 변수 ---
let pins = [];
let selectedPins = [];
let currentPlayer = 'human';
let gameEnded = false;
let inferenceSession;

// --- 게임 시작 및 초기화 ---

function promptForPinsAndStart() {
    let userPins;
    while (true) {
        const input = prompt("시작할 핀의 개수를 입력하세요 (10 ~ 82):", "60");
        // 사용자가 취소 버튼을 누른 경우
        if (input === null) {
            gameMessage.textContent = "게임이 취소되었습니다.";
            return; // 함수 종료
        }
        userPins = parseInt(input, 10);
        if (!isNaN(userPins) && userPins >= 10 && userPins <= 82) {
            break; // 올바른 값이 입력되면 루프 탈출
        }
        alert("잘못된 값입니다. 10에서 82 사이의 숫자를 입력해주세요.");
    }

    N_PINS = userPins;
    initializeGame();
}

function initializeGame() {
    pins = Array(N_PINS).fill(1);
    selectedPins = [];
    gameEnded = false;

    // 선공 플레이어 랜덤 결정
    currentPlayer = Math.random() < 0.5 ? 'human' : 'ai';

    gameMessage.textContent = `핀 ${N_PINS}개로 게임을 시작합니다. 인접한 핀 2개를 제거하세요.`;
    renderPins();
    updateTurnDisplay();
    aiStatusSpan.textContent = '준비됨';

    if (currentPlayer === 'ai') {
        setTimeout(aiTurn, 500);
    }
}

// --- 렌더링 및 UI 업데이트 ---

function renderPins() {
    pinsContainer.innerHTML = '';
    for (let i = 0; i < N_PINS; i++) {
        const pinElement = document.createElement('div');
        pinElement.classList.add('pin');
        pinElement.dataset.index = i;
        if (pins[i] === 0) {
            pinElement.classList.add('removed');
        }
        pinElement.textContent = i + 1;
        pinElement.addEventListener('click', handlePinClick);
        pinsContainer.appendChild(pinElement);
    }
}

function updateTurnDisplay() {
    currentTurnSpan.textContent = currentPlayer === 'human' ? '당신' : 'AI';
}

// --- 게임 플레이 로직 ---

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

function removePins(pin1, pin2) {
    pins[pin1] = 0;
    pins[pin2] = 0;
    selectedPins = [];
    renderPins();

    if (!hasValidMoves(pins)) {
        gameEnded = true;
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

function hasValidMoves(currentPins) {
    for (let i = 0; i < N_PINS - 1; i++) {
        if (currentPins[i] === 1 && currentPins[i + 1] === 1) {
            return true;
        }
    }
    return false;
}

// --- AI 로직 ---

async function aiTurn() {
    if (gameEnded) return;
    aiStatusSpan.textContent = '생각 중...';
    gameMessage.textContent = 'AI가 수를 두고 있습니다...';

    const paddedObs = new Float32Array(MAX_PINS).fill(0);
    paddedObs.set(pins);
    const obsTensor = new ort.Tensor('float32', paddedObs, [1, MAX_PINS]);

    const actionMasks = Array(MAX_PINS - 1).fill(false);
    for (let i = 0; i < N_PINS - 1; i++) {
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
            if (actionMasks[i]) {
                if (actionLogits[i] > maxLogit) {
                    maxLogit = actionLogits[i];
                    bestActionIndex = i;
                }
            }
        }

        if (bestActionIndex !== -1) {
            const pin1 = bestActionIndex;
            const pin2 = bestActionIndex + 1;

            document.querySelector(`.pin[data-index="${pin1}"]`)?.classList.add('selected');
            document.querySelector(`.pin[data-index="${pin2}"]`)?.classList.add('selected');

            setTimeout(() => {
                removePins(pin1, pin2);
                if (!gameEnded) {
                    aiStatusSpan.textContent = '준비됨';
                    gameMessage.textContent = '인접한 핀 2개를 클릭하여 제거하세요.';
                }
            }, 1000);
        } else {
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

// --- 모델 로드 및 이벤트 리스너 설정 ---

async function loadOnnxModel() {
    aiStatusSpan.textContent = '모델 로딩 중...';
    try {
        inferenceSession = await ort.InferenceSession.create(MODEL_PATH, { executionProviders: ['wasm'] });
        aiStatusSpan.textContent = '모델 로드 완료!';
        console.log('ONNX 모델 로드 완료:', inferenceSession);
        // 모델 로드 후, 사용자에게 핀 개수를 물어보고 게임 시작
        promptForPinsAndStart();
    } catch (e) {
        console.error('ONNX 모델 로드 오류:', e);
        aiStatusSpan.textContent = '모델 로드 실패!';
        gameMessage.textContent = `AI 모델(${MODEL_PATH}) 로드에 실패했습니다. 파일을 확인해주세요.`;
    }
}

// "게임 재시작" 버튼은 새로운 핀 개수를 물어보고 다시 시작
resetButton.addEventListener('click', promptForPinsAndStart);

// 페이지 로드 시 모델 로드 및 게임 시작 프로세스 시작
window.onload = loadOnnxModel;