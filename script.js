// script.js

const N_PINS = 60;
let inferenceSession = null;

// 게임 상태
let currentPins   = Array(N_PINS).fill(1);
let selectedPins  = [];
let currentPlayer = 'human';
let gameEnded     = false;

// DOM 요소
let pinsContainer, confirmBtn, gameMessageEl, playerTurnEl, aiStatusEl;

// 1) ONNX 모델 로드
async function initModel() {
  aiStatusEl.textContent = 'Loading…';
  inferenceSession = await ort.InferenceSession.create('kayles_60pins_misere_model.onnx');
  aiStatusEl.textContent = 'Ready';
  console.log('ONNX 모델 로드 완료.');
}

// 2) 보드 렌더링
function renderBoard() {
  pinsContainer.innerHTML = '';
  currentPins.forEach((alive, idx) => {
    const pin = document.createElement('div');
    pin.classList.add('pin');
    if (!alive)           pin.classList.add('removed');
    if (selectedPins.includes(idx)) pin.classList.add('selected');
    pin.dataset.index = idx;
    pin.addEventListener('click', () => onPinClick(idx));
    pinsContainer.appendChild(pin);
  });
  updateConfirmBtn();
}

// 3) 핀 클릭 핸들러 (사람 턴에만 작동)
function onPinClick(idx) {
  if (gameEnded || currentPlayer !== 'human') return;
  if (!currentPins[idx]) return;  // 이미 제거된 핀

  const pos = selectedPins.indexOf(idx);
  if (pos > -1) {
    selectedPins.splice(pos, 1);
  } else if (selectedPins.length < 2) {
    selectedPins.push(idx);
  }
  renderBoard();
}

// 4) 확인 버튼 활성/비활성
function updateConfirmBtn() {
  confirmBtn.disabled = !(currentPlayer === 'human' && selectedPins.length === 2);
}

// 5) 사람 턴 확정
function humanTurn() {
  const [i, j] = selectedPins.sort((a, b) => a - b);
  if (j !== i + 1) {
    gameMessageEl.textContent = '인접한 두 핀을 선택하세요.';
    setTimeout(() => gameMessageEl.textContent = '', 1000);
    selectedPins = [];
    renderBoard();
    return;
  }

  // 핀 제거
  currentPins[i] = 0;
  currentPins[j] = 0;
  gameMessageEl.textContent = `Player removed ${i}, ${j}`;
  currentPlayer = 'ai';
  playerTurnEl.textContent = 'AI';
  selectedPins = [];
  renderBoard();

  // AI 턴으로 전환
  setTimeout(aiTurn, 500);
}

// 6) AI 턴
async function aiTurn() {
  if (gameEnded) return;

  aiStatusEl.textContent    = 'Thinking…';
  gameMessageEl.textContent = 'AI가 수를 두고 있습니다…';

  // (1) obs 텐서
  const obsTensor = new ort.Tensor(
    'float32',
    new Float32Array(currentPins),
    [1, N_PINS]
  );

  // (2) mask 계산
  const maskArr = currentPins
    .slice(0, N_PINS - 1)
    .map((v, k) => v === 1 && currentPins[k + 1] === 1);
  const maskTensor = new ort.Tensor(
    'bool',
    new Uint8Array(maskArr.map(b => b ? 1 : 0)),
    [1, N_PINS - 1]
  );

  // (3) 추론 실행
  let results;
  try {
    results = await inferenceSession.run({
      obs: obsTensor,
      action_masks: maskTensor
    });
  } catch (e) {
    console.error('ONNX Runtime 오류:', e);
    gameEnded = true;
    return;
  }

  // (4) best action 선택
  const logits = results.action_logits.data;
  let bestIdx = -1, bestLogit = -Infinity;
  maskArr.forEach((ok, i) => {
    if (ok && logits[i] > bestLogit) {
      bestLogit = logits[i];
      bestIdx   = i;
    }
  });

  if (bestIdx < 0) {
    gameMessageEl.textContent = 'AI: No valid move';
    gameEnded = true;
    return;
  }

  // (5) 핀 제거 & 상태 업데이트
  currentPins[bestIdx]     = 0;
  currentPins[bestIdx + 1] = 0;
  gameMessageEl.textContent = `AI removed ${bestIdx}, ${bestIdx + 1}`;
  currentPlayer             = 'human';
  playerTurnEl.textContent  = 'You';
  aiStatusEl.textContent    = 'Waiting';
  renderBoard();
}

// 7) 초기화
document.addEventListener('DOMContentLoaded', async () => {
  pinsContainer  = document.getElementById('pins-container');
  confirmBtn     = document.getElementById('confirm-move-btn');
  gameMessageEl  = document.getElementById('game-message');
  playerTurnEl   = document.getElementById('player-turn');
  aiStatusEl     = document.getElementById('ai-status');

  confirmBtn.addEventListener('click', humanTurn);
  renderBoard();
  await initModel();
});
