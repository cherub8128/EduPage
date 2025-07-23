const N_PINS = 60;
let inferenceSession = null;
// 0/1로 관리되는 현재 핀 상태
let currentPins = new Array(N_PINS).fill(1);

////////////////////////////////////////////////////////////////////////////////
// 1) 보드를 그리는 함수: currentPins 값을 보고 .pin 또는 .pin.empty 생성
function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (let i = 0; i < N_PINS; i++) {
    const pin = document.createElement('div');
    pin.className = 'pin' + (currentPins[i] ? '' : ' empty');
    pin.dataset.index = i;
    // (선택적) 사용자 클릭용: 여기서는 디버그 로그만 찍습니다
    pin.addEventListener('click', () => {
      if (!currentPins[i]) return;
      console.log(`Pin ${i} clicked`);
    });
    board.appendChild(pin);
  }
}

////////////////////////////////////////////////////////////////////////////////
// 2) 환경(obs) 배열 반환
function getCurrentPins() {
  // slice() 해서 복사본 리턴
  return currentPins.slice();
}

////////////////////////////////////////////////////////////////////////////////
// 3) 핀 제거 로직: 두 인덱스를 0으로 바꾼 뒤 다시 그린다
function removePins(i, j) {
  if (i < 0 || j < 0 || i >= N_PINS || j >= N_PINS) return;
  currentPins[i] = 0;
  currentPins[j] = 0;
  renderBoard();
}

////////////////////////////////////////////////////////////////////////////////
// 4) ONNX 모델 비동기 로드
async function initModel() {
  inferenceSession = await ort.InferenceSession.create('kayles_60pins_misere_model.onnx');
  console.log('ONNX 모델 로드 완료.');
}

////////////////////////////////////////////////////////////////////////////////
// 5) AI 턴: obs, mask 준비 → session.run → best action → removePins
async function aiTurn() {
  if (!inferenceSession) {
    console.error('Inference session not initialized!');
    return;
  }
  const pins = getCurrentPins();
  console.log('AI Turn - Current Pins:', pins);

  // (1) obs Tensor 생성
  const obsData = new Float32Array(pins);
  const obsTensor = new ort.Tensor('float32', obsData, [1, N_PINS]);

  // (2) actionMasks 계산
  const actionMasks = [];
  for (let idx = 0; idx < N_PINS - 1; idx++) {
    actionMasks.push(pins[idx] === 1 && pins[idx + 1] === 1);
  }
  console.log('hasValidMoves:', actionMasks.some(x => x), 'for pins:', pins);

  // (3) mask Tensor 생성
  const maskData = new Uint8Array(actionMasks.map(m => m ? 1 : 0));
  const maskTensor = new ort.Tensor('bool', maskData, [1, N_PINS - 1]);

  // (4) feeds
  const feeds = {
    obs: obsTensor,
    action_masks: maskTensor
  };

  // (5) 추론 실행
  let results;
  try {
    results = await inferenceSession.run(feeds);
  } catch (err) {
    console.error('ONNX Runtime 추론 오류:', err);
    return;
  }

  // (6) logits & value 추출
  const logits = results.action_logits.data;     // Float32Array, 길이 59
  const value  = results.value_function.data;    // Float32Array, 길이 1
  console.log('AI Turn - Logits length:', logits.length, 'Value:', value[0]);

  // (7) best action 선택
  let bestLogit = -Infinity;
  let bestIndex = -1;
  for (let i = 0; i < logits.length; i++) {
    if (actionMasks[i] && logits[i] > bestLogit) {
      bestLogit = logits[i];
      bestIndex = i;
    }
  }
  if (bestIndex < 0) {
    console.error('AI Turn - No valid action found!');
    return;
  }
  console.log('AI Turn - Chosen bestIndex:', bestIndex, 'Logit:', bestLogit);

  // (8) 실제 제거
  removePins(bestIndex, bestIndex + 1);
}

////////////////////////////////////////////////////////////////////////////////
// 6) 초기화: DOMContentLoaded → 보드 렌더 → 모델 로드 → 버튼에 이벤트 연결
document.addEventListener('DOMContentLoaded', async () => {
  renderBoard();
  await initModel();
  document.getElementById('ai-move-btn').addEventListener('click', aiTurn);
});
