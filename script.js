;(async () => {
  // 1) onnxruntime-web 동적 import
  const ort = await import('onnxruntime-web');

  const N_PINS = 60;
  let inferenceSession = null;

  // 2) ONNX 모델 로드
  async function initModel() {
    inferenceSession = await ort.InferenceSession.create('kayles_60pins_misere_model.onnx');
    console.log('ONNX 모델 로드 완료.');
  }

  // 3) 현재 핀 상태 읽어오는 부분 (예시)
  function getCurrentPins() {
    return window.currentPins;  // 실제 코드에 맞춰 바꿔주세요
  }

  // 4) 핀 제거 함수 (i, j 인덱스)
  function removePins(i, j) {
    window.currentPins[i] = 0;
    window.currentPins[j] = 0;
    console.log(`Removed pins at ${i} & ${j}`);
  }

  // 5) AI 턴 수행
  async function aiTurn() {
    if (!inferenceSession) {
      console.error('Inference session not initialized!');
      return;
    }

    // (1) 현재 핀 상태
    const pins = getCurrentPins();
    console.log('AI Turn - Current Pins:', pins);

    // (2) obs Tensor
    const obsData = new Float32Array(pins);
    const obsTensor = new ort.Tensor('float32', obsData, [1, N_PINS]);

    // (3) actionMasks 계산 (feeds 생성 전)
    const actionMasks = [];
    for (let idx = 0; idx < N_PINS - 1; idx++) {
      actionMasks.push(pins[idx] === 1 && pins[idx + 1] === 1);
    }
    console.log('hasValidMoves:', actionMasks.some(x => x), 'for pins:', pins);

    // (4) mask Tensor
    const maskData = new Uint8Array(actionMasks.map(m => m ? 1 : 0));
    const maskTensor = new ort.Tensor('bool', maskData, [1, N_PINS - 1]);

    // (5) feeds
    const feeds = {
      obs: obsTensor,
      action_masks: maskTensor
    };

    // (6) 추론
    let results;
    try {
      results = await inferenceSession.run(feeds);
    } catch (err) {
      console.error('ONNX Runtime 추론 오류:', err);
      return;
    }

    // (7) logits & value
    const logits = results.action_logits.data;       // Float32Array (59)
    const value  = results.value_function.data;      // Float32Array (1)
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

    // (9) 핀 제거
    removePins(bestIndex, bestIndex + 1);
  }

  // 6) 초기화 및 버튼 연결
  await initModel();
  document.getElementById('ai-move-btn').addEventListener('click', aiTurn);
})();
