import * as ort from 'onnxruntime-web';

const N_PINS = 60;
let inferenceSession = null;

// 1) ONNX 모델 비동기 로드
async function initModel() {
  inferenceSession = await ort.InferenceSession.create('kayles_60pins_misere_model.onnx');
  console.log('ONNX 모델 로드 완료.');
}

// 2) 현재 핀 상태를 배열로 반환 (0/1)
function getCurrentPins() {
  // 예시: 실제 DOM 혹은 상태에서 읽어오도록 변경
  // return Array.from(document.querySelectorAll('.pin')).map(pin => pin.active ? 1 : 0);
  return window.currentPins; 
}

// 3) 선택된 핀 제거 함수 (i와 i+1 인덱스)
function removePins(i, j) {
  // 예시 구현: 실제 게임 로직에 맞춰 수정
  window.currentPins[i] = 0;
  window.currentPins[j] = 0;
  console.log(`Removed pins at ${i} & ${j}`);
}

// 4) AI 턴 함수
async function aiTurn() {
  if (!inferenceSession) {
    console.error('Inference session not initialized!');
    return;
  }

  // (1) 현재 핀 상태 읽기
  const pins = getCurrentPins();
  console.log('AI Turn - Current Pins:', pins);

  // (2) obs Tensor 생성
  const obsData = new Float32Array(pins);
  const obsTensor = new ort.Tensor('float32', obsData, [1, N_PINS]);

  // (3) actionMasks 선언 & 계산: 항상 obsTensor 다음, feeds 생성 이전에!
  const actionMasks = [];
  for (let idx = 0; idx < N_PINS - 1; idx++) {
    actionMasks.push(pins[idx] === 1 && pins[idx + 1] === 1);
  }
  console.log('hasValidMoves:', actionMasks.some(x => x), 'for pins:', pins);

  // (4) maskData & maskTensor 생성
  const maskData = new Uint8Array(actionMasks.map(m => m ? 1 : 0));
  const maskTensor = new ort.Tensor('bool', maskData, [1, N_PINS - 1]);

  // (5) feeds 정의
  const feeds = {
    obs: obsTensor,
    action_masks: maskTensor
  };

  // (6) ONNX Runtime 추론
  let results;
  try {
    results = await inferenceSession.run(feeds);
  } catch (err) {
    console.error('ONNX Runtime 추론 오류:', err);
    return;
  }

  // (7) 로그릿, 값 추출
  const logits = results.action_logits.data;       // Float32Array, length === 59
  const value  = results.value_function.data;      // Float32Array, length === 1
  console.log('AI Turn - Raw logits length:', logits.length, 'Value:', value[0]);

  // (8) 최적 행동 선택
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

  // (9) 행동 수행: 핀 제거
  removePins(bestIndex, bestIndex + 1);
}

// 5) 초기화 및 클릭 핸들러 등록 예시
initModel();

// 예: 특정 버튼 클릭 시 AI 턴
document.getElementById('ai-move-btn').addEventListener('click', aiTurn);
