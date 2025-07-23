const N_PINS = 60;
let inferenceSession = null;
let currentPins = Array(N_PINS).fill(1);

async function initModel() {
  inferenceSession = await ort.InferenceSession.create('kayles_60pins_misere_model.onnx');
  console.log('ONNX 모델 로드 완료.');
}

function renderPins() {
  // 이제 pinsContainer가 null이 아닙니다
  const pinsContainer = document.getElementById('pins-container');
  pinsContainer.innerHTML = '';
  currentPins.forEach((state, idx) => {
    const pin = document.createElement('div');
    pin.className = state ? 'pin' : 'pin removed';
    pin.dataset.index = idx;
    pin.textContent = idx + 1;
    pin.addEventListener('click', () => {
      console.log(`Pin ${idx} clicked`);
    });
    pinsContainer.appendChild(pin);
  });
}

async function aiTurn() {
  if (!inferenceSession) return console.error('모델이 아직 로드되지 않았습니다');
  const pins = currentPins.slice();

  // obs tensor
  const obsTensor = new ort.Tensor('float32', new Float32Array(pins), [1, N_PINS]);

  // mask 계산
  const masks = pins.slice(0, N_PINS-1).map((v,i) => v === 1 && pins[i+1] === 1);
  const maskTensor = new ort.Tensor('bool', new Uint8Array(masks.map(b => b?1:0)), [1, N_PINS-1]);

  // 추론
  const results = await inferenceSession.run({ obs: obsTensor, action_masks: maskTensor });
  const logits = results.action_logits.data;
  let best = -1, maxLogit = -Infinity;
  masks.forEach((valid,i) => {
    if (valid && logits[i] > maxLogit) {
      maxLogit = logits[i];
      best = i;
    }
  });
  if (best < 0) return console.error('유효한 행동이 없습니다');

  // 핀 제거
  currentPins[best] = 0;
  currentPins[best+1] = 0;
  renderPins();

  document.getElementById('ai-status').textContent = `Removed ${best},${best+1}`;
  document.getElementById('player-turn').textContent = 'You';
}

document.addEventListener('DOMContentLoaded', async () => {
  renderPins();
  await initModel();
  document.getElementById('ai-move-btn').addEventListener('click', aiTurn);
});
