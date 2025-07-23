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

// 1) 모델 로드
async function initModel() {
  aiStatusEl.textContent = 'Loading…';
  inferenceSession = await ort.InferenceSession.create('kayles_60pins_misere_model.onnx');
  aiStatusEl.textContent = 'Ready';
}

// 2) 보드 렌더링
function renderBoard() {
  pinsContainer.innerHTML = '';
  currentPins.forEach((alive, idx) => {
    const pin = document.createElement('div');
    pin.classList.add('pin');
    if (!alive) pin.classList.add('removed');
    if (selectedPins.includes(idx)) pin.classList.add('selected');
    pin.dataset.index = idx;
    pin.textContent = idx + 1;          // 숫자 표시
    pin.addEventListener('click', () => onPinClick(idx));
    pinsContainer.appendChild(pin);
  });
  confirmBtn.disabled = !(currentPlayer === 'human' && selectedPins.length === 2);
}

// 3) 사람 핀 클릭
function onPinClick(idx) {
  if (gameEnded || currentPlayer !== 'human') return;
  if (!currentPins[idx]) return;

  const i = selectedPins.indexOf(idx);
  if (i > -1) {
    selectedPins.splice(i, 1);
  } else if (selectedPins.length < 2) {
    selectedPins.push(idx);
  } else {
    // 2개 초과 선택 시 가장 오래된 것 교체
    selectedPins.shift();
    selectedPins.push(idx);
  }
  renderBoard();
}

// 4) 사람 턴 확정
function humanTurn() {
  const [i, j] = selectedPins.sort((a, b) => a - b);
  if (j !== i + 1) {
    gameMessageEl.textContent = '인접한 핀만 선택하세요.';
    setTimeout(() => (gameMessageEl.textContent = ''), 1000);
    selectedPins = [];
    renderBoard();
    return;
  }
  currentPins[i] = 0;
  currentPins[j] = 0;
  gameMessageEl.textContent = `You removed ${i + 1}, ${j + 1}`;
  currentPlayer = 'ai';
  playerTurnEl.textContent = 'AI';
  selectedPins = [];
  renderBoard();
  setTimeout(aiTurn, 500);
}

// 5) AI 턴
async function aiTurn() {
  aiStatusEl.textContent    = 'Thinking…';
  gameMessageEl.textContent = '';

  const obsTensor = new ort.Tensor(
    'float32',
    new Float32Array(currentPins),
    [1, N_PINS]
  );
  const maskArr = currentPins
    .slice(0, N_PINS - 1)
    .map((v,k) => v && currentPins[k + 1]);
  const maskTensor = new ort.Tensor(
    'bool',
    new Uint8Array(maskArr.map(b => b ? 1 : 0)),
    [1, N_PINS - 1]
  );

  const { action_logits } = await inferenceSession.run({
    obs: obsTensor,
    action_masks: maskTensor
  });
  const logits = action_logits.data;

  let bestIdx = -1, bestLog = -Infinity;
  maskArr.forEach((ok, i) => {
    if (ok && logits[i] > bestLog) {
      bestLog = logits[i];
      bestIdx = i;
    }
  });
  if (bestIdx < 0) {
    gameMessageEl.textContent = 'AI has no move';
    gameEnded = true;
    return;
  }
  currentPins[bestIdx]     = 0;
  currentPins[bestIdx + 1] = 0;
  gameMessageEl.textContent = `AI removed ${bestIdx + 1}, ${bestIdx + 2}`;
  currentPlayer             = 'human';
  playerTurnEl.textContent  = 'You';
  aiStatusEl.textContent    = 'Waiting';
  renderBoard();
}

// 6) 초기화
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
