// script.js

const N_PINS = 60;
let inferenceSession = null;
let currentPins = Array(N_PINS).fill(1);
let selected = []; // 사람 선택한 핀 인덱스

// DOM 요소
let pinsContainer, confirmBtn, gameMessageEl, playerTurnEl, aiStatusEl;

////////////////////////////////////////////////////////////////////////////////
// 1) 모델 로드
async function initModel() {
  inferenceSession = await ort.InferenceSession.create('kayles_60pins_misere_model.onnx');
  console.log('ONNX 모델 로드 완료.');
}

////////////////////////////////////////////////////////////////////////////////
// 2) 보드 렌더링 (그리고 클릭 핸들러 연결)
function renderBoard() {
  pinsContainer.innerHTML = '';
  currentPins.forEach((alive, idx) => {
    const pin = document.createElement('div');
    pin.className = alive ? 'pin' : 'pin removed';
    if (selected.includes(idx)) pin.classList.add('selected');
    pin.dataset.index = idx;
    pin.addEventListener('click', () => onPinClick(idx));
    pinsContainer.appendChild(pin);
  });
  updateConfirmBtn();
}

////////////////////////////////////////////////////////////////////////////////
// 3) 핀 클릭: 최대 2개까지 선택/해제
function onPinClick(idx) {
  if (!currentPins[idx]) return; // 이미 제거된 핀
  const pos = selected.indexOf(idx);
  if (pos >= 0) {
    selected.splice(pos, 1);
  } else if (selected.length < 2) {
    selected.push(idx);
  }
  renderBoard();
}

////////////////////////////////////////////////////////////////////////////////
// 4) Confirm 버튼 활성/비활성
function updateConfirmBtn() {
  confirmBtn.disabled = (selected.length !== 2);
}

////////////////////////////////////////////////////////////////////////////////
// 5) 사람 턴 실행
function humanTurn() {
  // 선택된 두 핀이 인접해야 유효
  const [i, j] = selected.sort((a, b) => a - b);
  if (j !== i + 1) {
    gameMessageEl.textContent = '인접한 두 핀만 선택할 수 있습니다.';
    return;
  }
  // 제거
  currentPins[i] = 0;
  currentPins[j] = 0;
  gameMessageEl.textContent = `Player removed ${i}, ${j}`;
  playerTurnEl.textContent = 'AI';
  selected = [];
  renderBoard();
  // AI 턴으로
  setTimeout(aiTurn, 300);  // 약간의 딜레이 후 AI 실행
}

////////////////////////////////////////////////////////////////////////////////
// 6) AI 턴 실행
async function aiTurn() {
  if (!inferenceSession) return;
  const pins = currentPins.slice();
  // obs Tensor
  const obsTensor = new ort.Tensor('float32', new Float32Array(pins), [1, N_PINS]);
  // action mask
  const masks = pins.slice(0, N_PINS-1).map((v,i) => v===1 && pins[i+1]===1);
  const maskTensor = new ort.Tensor('bool', new Uint8Array(masks.map(b=>b?1:0)), [1, N_PINS-1]);
  // 추론
  let res;
  try {
    res = await inferenceSession.run({ obs: obsTensor, action_masks: maskTensor });
  } catch (e) {
    console.error('ONNX 추론 오류', e);
    return;
  }
  const logits = res.action_logits.data;
  // best action
  let best=-1, maxLog=-Infinity;
  masks.forEach((ok,i) => {
    if (ok && logits[i]>maxLog) { maxLog=logits[i]; best=i; }
  });
  if (best < 0) {
    gameMessageEl.textContent = 'AI: No valid move';
    return;
  }
  // 제거
  currentPins[best]=0;
  currentPins[best+1]=0;
  gameMessageEl.textContent = `AI removed ${best}, ${best+1}`;
  playerTurnEl.textContent = 'You';
  aiStatusEl.textContent = 'Waiting';
  renderBoard();
}

////////////////////////////////////////////////////////////////////////////////
// 7) 초기화
document.addEventListener('DOMContentLoaded', async () => {
  // 엘리먼트 캐싱
  pinsContainer = document.getElementById('pins-container');
  confirmBtn    = document.getElementById('confirm-move-btn');
  gameMessageEl = document.getElementById('game-message');
  playerTurnEl  = document.getElementById('player-turn');
  aiStatusEl    = document.getElementById('ai-status');

  renderBoard();
  await initModel();
  confirmBtn.addEventListener('click', humanTurn);
});
