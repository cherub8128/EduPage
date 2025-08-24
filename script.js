// Misère Dawson's Kayles (인접 2핀 제거만 허용) - 알파제로 PUCT MCTS + ONNX 웹 추론
// - 입력: 'obs' (BL/BCL/BCHW 자동 대응)
// - 출력: 'policy' 또는 'policy_logits' 또는 'action_logits', 'value' (자동 탐색)
// - URL 파라미터로 하이퍼파라미터 조절 가능 (맨 위 설명 참고)

let N_PINS = 60;
let MAX_BOARD_SIZE = 128;   // 상한(메타로 갱신)
let MAX_OBS_LEN   = 130;    // 관측 길이(런 히스토그램 + player), 메타로 갱신

function _getParam(name, def) {
  const q = new URLSearchParams(location.search);
  return q.has(name) ? q.get(name) : def;
}
const urlModel = _getParam("model", null);
const DEFAULT_MODEL_PATH = urlModel || "model.onnx";

const USE_MCTS   = _getParam('mcts', '1') !== '0';
const MCTS_SIMS  = parseInt(_getParam('sims', '400'), 10);
const MCTS_CPUCT = parseFloat(_getParam('cpuct', '1.4'));
const TEMP_FINAL = parseFloat(_getParam('temp', '0'));
const NOISE_EPS  = parseFloat(_getParam('noise_eps', '0.25'));
const NOISE_ALPHA= parseFloat(_getParam('noise_alpha', '0.30'));

// DOM
const modelBadgeEl = document.getElementById("modelBadge");
const nPinsEl = document.getElementById("nPins");
const whoFirstEl = document.getElementById("whoFirst");
const newGameBtn = document.getElementById("newGameBtn");
const aiMoveBtn = document.getElementById("aiMoveBtn");
const pinsEl = document.getElementById("pins");
const gameMsgEl = document.getElementById("gameMsg");
const turnWhoEl = document.getElementById("turnWho");

// 상태
let pins = [];
let selected = [];
let player = +1;  // +1: 사람, -1: AI
let session = null;

// ONNX 입력 메타
let INPUT_NAME = "obs";
let INPUT_RANK = 2;          // 1:L / 2:BL / 3:BCL / 4:BCHW
let INPUT_LAYOUT = "BL";     // BL | BCL | BCHW | L
let OBS_C = 1, OBS_H = 1, OBS_W = MAX_OBS_LEN;
let POLICY_NAME = "policy";
let ACTION_SIZE_HINT = MAX_BOARD_SIZE - 1;

// ----------------- 게임 규칙 -----------------

function hasValidMoves(board) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] === 1 && board[i + 1] === 1) return true;
  }
  return false;
}

function _getRunLengths(pinsArr) {
  const runs = [];
  let cur = 0;
  for (const v of pinsArr) {
    if (v === 1) cur += 1;
    else { if (cur > 0) runs.push(cur); cur = 0; }
  }
  if (cur > 0) runs.push(cur);
  return runs;
}

// 관측(런 길이 히스토그램 + 현재 턴)
function buildObs1D(pinsArr, currentPlayer) {
  const L = MAX_OBS_LEN;
  const obs = new Float32Array(L).fill(0);
  const runs = _getRunLengths(pinsArr);
  for (const r of runs) {
    if (r >= 1 && r <= MAX_BOARD_SIZE) {
      const idx = r - 1;
      if (idx < L - 1) obs[idx] += 1.0;
    }
  }
  obs[L - 1] = (currentPlayer === +1) ? 1.0 : -1.0;
  return obs;
}

// 인접쌍 합법 수 마스크
function buildMask(pinsArr, desiredLength = ACTION_SIZE_HINT) {
  const len = Math.min(desiredLength, Math.max(0, pinsArr.length - 1));
  const mask = new Uint8Array(desiredLength);
  for (let i = 0; i < len; i++) {
    if (pinsArr[i] === 1 && pinsArr[i + 1] === 1) mask[i] = 1;
  }
  return mask;
}

function declareWinner(currentPlayer) {
  // Misère: 둘 수 없으면 '현재 둘 차례'가 승자
  const winner = currentPlayer === +1 ? "Human" : "AI";
  gameMsgEl.textContent = `게임 종료! 승자: ${winner}`;
  turnWhoEl.textContent = "종료";
  aiMoveBtn.disabled = true;
}

function checkAndMaybeEnd() {
  if (!hasValidMoves(pins)) { declareWinner(player); return true; }
  return false;
}

// ----------------- 렌더링 -----------------

function render() {
  pinsEl.innerHTML = "";
  pins.forEach((v, idx) => {
    const div = document.createElement("div");
    div.className = "pin " + (v ? "alive" : "removed");
    div.textContent = idx + 1;
    if (v && player === +1 && session) {
      if (selected.includes(idx)) div.classList.add("selected");
      div.addEventListener("click", () => onPinClick(idx), { passive: true });
    }
    pinsEl.appendChild(div);
  });
  turnWhoEl.textContent = player === +1 ? "Human" : "AI";
  aiMoveBtn.disabled = !(player === -1 && session);
}

function onPinClick(i) {
  if (player !== +1 || !session) return;
  if (!pins[i]) return;
  if (selected.includes(i)) {
    selected = selected.filter(x => x !== i);
  } else {
    if (selected.length < 2) selected.push(i);
  }
  if (selected.length === 2) {
    selected.sort((a,b)=>a-b);
    const [p1, p2] = selected;
    if (p2 - p1 === 1 && pins[p1] && pins[p2]) {
      // 사람 수
      pins[p1] = 0; pins[p2] = 0; selected = [];
      // 턴 교대 → 미제르 종료 판정은 '둘 차례' 기준
      player = -player;
      render();
      if (checkAndMaybeEnd()) return;
      if (player === -1) setTimeout(aiTurn, 120);
    } else {
      gameMsgEl.textContent = "인접한 살아있는 핀 2개를 선택하세요.";
      setTimeout(()=>{ selected=[]; render(); gameMsgEl.textContent=""; }, 900);
    }
  } else {
    render();
  }
}

// ----------------- ONNX I/O -----------------

function makeFeedsFromObs(obs1D) {
  if (INPUT_LAYOUT === "BL") {
    return { [INPUT_NAME]: new ort.Tensor("float32", obs1D, [1, obs1D.length]) };
  } else if (INPUT_LAYOUT === "BCL") {
    const data = new Float32Array(OBS_C * obs1D.length);
    for (let i=0;i<obs1D.length;i++) data[i] = obs1D[i];
    return { [INPUT_NAME]: new ort.Tensor("float32", data, [1, OBS_C, obs1D.length]) };
  } else if (INPUT_LAYOUT === "BCHW") {
    const H = OBS_H, W = OBS_W;
    const data = new Float32Array(OBS_C * H * W);
    for (let i=0;i<Math.min(W, obs1D.length); i++) data[i] = obs1D[i];
    return { [INPUT_NAME]: new ort.Tensor("float32", data, [1, OBS_C, H, W]) };
  } else if (INPUT_LAYOUT === "L") {
    return { [INPUT_NAME]: new ort.Tensor("float32", obs1D, [obs1D.length]) };
  }
  return { [INPUT_NAME]: new ort.Tensor("float32", obs1D, [1, obs1D.length]) };
}

function pickPolicyOutput(outputs) {
  if ("policy" in outputs) return "policy";
  if ("policy_logits" in outputs) return "policy_logits";
  if ("action_logits" in outputs) return "action_logits";
  const names = Object.keys(outputs);
  return names.find(n => n !== "value") || names[0];
}

async function runModel(feeds) {
  return await session.run(feeds);
}

function _softmaxMasked(logits, mask){
  let maxv = -Infinity;
  for (let i=0;i<logits.length;i++){ if(mask[i] && logits[i] > maxv) maxv = logits[i]; }
  const exps = new Float32Array(logits.length);
  let sum = 0.0;
  for (let i=0;i<logits.length;i++){
    if(mask[i]){ const v = Math.exp(logits[i]-maxv); exps[i]=v; sum+=v; } else exps[i]=0;
  }
  const probs = new Float32Array(logits.length);
  if(sum<=0){
    // 합법 수가 전부 0로 마스킹되었을 때: 균등 분배 폴백
    let cnt=0; for(let i=0;i<mask.length;i++) if(mask[i]) cnt++;
    if (cnt>0){ const u=1/cnt; for(let i=0;i<mask.length;i++) probs[i]=mask[i]?u:0; }
    return probs;
  }
  for (let i=0;i<logits.length;i++) probs[i] = exps[i]/sum;
  return probs;
}

// 네트워크 캐시(전이표)
const _pvCache = new Map(); // key: "board|player" -> {probs(Float32Array), value(number)}

function boardKey(pinsArr, who){ // 누가 둘 차례인지 포함(중요)
  return pinsArr.join("") + "|" + (who===+1? "H":"A");
}

async function evalPolicyValue(pinsArr, currentPlayer){
  const k = boardKey(pinsArr, currentPlayer);
  if (_pvCache.has(k)) return _pvCache.get(k);

  const obs1D = buildObs1D(pinsArr, currentPlayer);
  const out = await runModel(makeFeedsFromObs(obs1D));
  const polName = pickPolicyOutput(out);
  const logits = out[polName].data;
  const value  = out["value"]?.data ? Number(out["value"].data[0]) : 0.0;

  // 합법 마스크로 정책 정규화
  const mask = buildMask(pinsArr, logits.length);
  const probs = _softmaxMasked(logits, Array.from(mask, x=>!!x));

  const res = { probs, value };
  _pvCache.set(k, res);
  return res;
}

// ----------------- 정식 PUCT MCTS -----------------

class MCTSNode {
  constructor(pins, player) {
    this.pins = pins;                   // 현재 보드
    this.player = player;               // 현재 둘 차례(+1 사람 / -1 AI)
    this.N = 0;                         // 노드 방문 수
    this.P = null;                      // prior 확률 분포(Float32Array)
    this.Nsa = null;                    // 액션별 방문수(Uint32Array)
    this.Wsa = null;                    // 액션별 누적 가치(Float32Array)
    this.valid = null;                  // 합법 마스크(Uint8Array)
    this.children = new Map();          // a -> childKey
    this.expanded = false;              // 확장 여부
    this.terminal = false;              // 터미널 여부(둘 수 없음 → 미제르 승리)
  }
}

class PUCT_MCTS {
  constructor(rootPins, rootPlayer, sims, cpuct, temp, noise_eps, noise_alpha) {
    this.sims  = sims;
    this.cpuct = cpuct;
    this.temp  = temp;
    this.noise_eps = noise_eps;
    this.noise_alpha = noise_alpha;

    this.nodes = new Map();
    this.rootKey = boardKey(rootPins, rootPlayer);
    const root = this._getOrCreate(rootPins.slice(), rootPlayer);
    // 루트가 비었으면 즉시 터미널
  }

  _getOrCreate(pinsArr, who){
    const k = boardKey(pinsArr, who);
    if (this.nodes.has(k)) return this.nodes.get(k);
    const node = new MCTSNode(pinsArr.slice(), who);
    // 터미널 판정: 합법 수가 없으면 현재 둘 차례가 승리(미제르)
    if (!hasValidMoves(node.pins)) {
      node.terminal = true;
      // 여기서 value는 +1(현재 둘 차례 관점)로 해석 → 백업 시 그대로 사용
    }
    this.nodes.set(k, node);
    return node;
  }

  async _expand(node, isRoot=false){
    if (node.expanded || node.terminal) return 0.0;

    const { probs, value } = await evalPolicyValue(node.pins, node.player);
    // 합법 마스크/정규화는 evalPolicyValue에서 이미 처리됨

    // 루트 Dirichlet 노이즈 주입
    let P = probs.slice();
    if (isRoot && this.noise_eps > 0){
      // 유효 액션만 추출하여 Dirichlet 적용
      const legalIdx = [];
      for (let i=0;i<P.length;i++) if (P[i] > 0) legalIdx.push(i);
      if (legalIdx.length > 0){
        const noise = _sampleDirichlet(legalIdx.length, this.noise_alpha);
        let j=0; for (const idx of legalIdx) P[idx] = (1 - this.noise_eps)*P[idx] + this.noise_eps*noise[j++];
        // 다시 정규화
        let s = 0; for (const idx of legalIdx) s += P[idx];
        if (s > 0){ for (const idx of legalIdx) P[idx] /= s; }
      }
    }

    node.P = P;
    node.valid = buildMask(node.pins, P.length);
    node.Nsa = new Uint32Array(P.length);
    node.Wsa = new Float32Array(P.length);
    node.expanded = true;
    return value; // 이 노드(현재 둘 차례) 관점의 v
  }

  // 선택: Q + U 최대인 액션 선택
  _selectAction(node){
    const Nsum = Math.max(1, node.N);
    let bestA = -1, bestScore = -1e9;

    for (let a=0; a<node.P.length; a++){
      if (!node.valid[a]) continue;
      const nsa = node.Nsa[a];
      const qsa = (nsa === 0) ? 0.0 : (node.Wsa[a] / nsa);
      const u   = this.cpuct * node.P[a] * Math.sqrt(Nsum) / (1 + nsa);
      const s   = qsa + u;
      if (s > bestScore){ bestScore = s; bestA = a; }
    }
    return bestA;
  }

  // 한 번의 시뮬레이션
  async _simulate(){
    // Selection
    let path = [];
    let key = this.rootKey;
    let node = this.nodes.get(key);

    // 루트가 미확장/터미널이면 확장(또는 터미널 처리)
    if (!node.expanded && !node.terminal){
      const v0 = await this._expand(node, true);
      // Backup
      let v = v0;
      for (let i=path.length-1;i>=0;i--){
        const ent = path[i]; const n = ent.node; const a = ent.action;
        n.N += 1; n.Nsa[a] += 1; n.Wsa[a] += v; v = -v;
      }
      return;
    }
    if (node.terminal){
      // 현재 둘 차례가 승리 → v=+1
      let v = 1.0;
      for (let i=path.length-1;i>=0;i--){
        const ent = path[i]; const n = ent.node; const a = ent.action;
        n.N += 1; n.Nsa[a] += 1; n.Wsa[a] += v; v = -v;
      }
      return;
    }

    // 아래로 내려가며 leaf 찾기
    while (node.expanded && !node.terminal){
      const a = this._selectAction(node);
      if (a < 0){
        // 이론상 없어야 하지만, 수치 이슈 시 균등 샘플
        const candidates = [];
        for (let i=0;i<node.P.length;i++) if (node.valid[i]) candidates.push(i);
        if (candidates.length === 0) {
          // 합법 수 없음 → 터미널
          let v = 1.0;
          for (let i=path.length-1;i>=0;i--){
            const ent = path[i]; const n = ent.node; const aa = ent.action;
            n.N += 1; n.Nsa[aa] += 1; n.Wsa[aa] += v; v = -v;
          }
          return;
        }
        const randA = candidates[Math.floor(Math.random()*candidates.length)];
        path.push({ node, action: randA });
        // 전이
        const next = node.pins.slice(); next[randA]=0; next[randA+1]=0;
        const nextKey = boardKey(next, -node.player);
        node.children.set(randA, nextKey);
        node = this._getOrCreate(next, -node.player);
        break;
      } else {
        path.push({ node, action: a });
        let nextKey = node.children.get(a);
        if (!nextKey){
          const next = node.pins.slice(); next[a]=0; next[a+1]=0;
          nextKey = boardKey(next, -node.player);
          node.children.set(a, nextKey);
        }
        node = this._getOrCreateFromKey(nextKey);
        break; // 한 단계 확장 후 leaf로 이동
      }
    }

    // leaf 처리
    if (!node.expanded && !node.terminal){
      const v0 = await this._expand(node, false);
      // backup
      let v = v0;
      for (let i=path.length-1;i>=0;i--){
        const ent = path[i]; const n = ent.node; const a = ent.action;
        n.N += 1; n.Nsa[a] += 1; n.Wsa[a] += v; v = -v;
      }
      return;
    }
    if (node.terminal){
      // 현재 둘 차례 승리
      let v = 1.0;
      for (let i=path.length-1;i>=0;i--){
        const ent = path[i]; const n = ent.node; const a = ent.action;
        n.N += 1; n.Nsa[a] += 1; n.Wsa[a] += v; v = -v;
      }
    }
  }

  _getOrCreateFromKey(k){
    if (this.nodes.has(k)) return this.nodes.get(k);
    const [boardStr, whoStr] = k.split("|");
    const pinsArr = Array.from(boardStr, ch => (ch === "1" ? 1 : 0));
    const who = (whoStr === "H") ? +1 : -1;
    return this._getOrCreate(pinsArr, who);
  }

  async run(){
    // 시뮬레이션 반복
    for (let i=0;i<this.sims;i++){
      await this._simulate();
    }
    // 최종 선택: 방문수 기반
    const root = this.nodes.get(this.rootKey);
    if (!root || !root.expanded){
      // 평가 실패 시 폴백(그리디)
      return -1;
    }
    const Ns = root.Nsa;
    const mask = root.valid;
    let action = -1;

    if (this.temp > 0){
      // Ns^(1/temp)로 확률화
      let maxLen = Ns.length;
      const probs = new Float32Array(maxLen);
      let sum = 0;
      const invT = 1.0 / this.temp;
      for (let a=0;a<maxLen;a++){
        if (mask[a]){
          const v = Math.pow(Math.max(1, Ns[a]), invT);
          probs[a]=v; sum+=v;
        }
      }
      if (sum > 0){
        let r = Math.random()*sum;
        for (let a=0;a<maxLen;a++){
          if (!mask[a]) continue;
          if (r < probs[a]){ action = a; break; }
          r -= probs[a];
        }
      }
      if (action < 0){
        // 폴백: argmax Ns
        let best=-1,bv=-1;
        for (let a=0;a<Ns.length;a++){ if (mask[a] && Ns[a]>bv){ bv=Ns[a]; best=a; } }
        action = best;
      }
    } else {
      // temp=0 → argmax Ns
      let best=-1,bv=-1;
      for (let a=0;a<Ns.length;a++){ if (mask[a] && Ns[a]>bv){ bv=Ns[a]; best=a; } }
      action = best;
    }
    return action;
  }
}

// 간단 Dirichlet 샘플러(알파 동일)
function _sampleDirichlet(k, alpha){
  // 감마(alpha, 1) k개 샘플 → 정규화
  const arr = new Float32Array(k);
  let s = 0.0;
  for (let i=0;i<k;i++){
    const g = _gammaSample(alpha);
    arr[i] = g; s += g;
  }
  if (s > 0){ for (let i=0;i<k;i++) arr[i] /= s; }
  return arr;
}

// 매우 간단한 감마 샘플러(알파>0, 베타=1) - Marsaglia-Tsang의 근사(α>=1) + 폴백
function _gammaSample(alpha){
  if (alpha < 1){
    // Johnk’s generator
    while (true){
      const u = Math.random();
      const b = (Math.E + alpha)/Math.E;
      const p = b * u;
      let x;
      if (p <= 1) x = Math.pow(p, 1/alpha);
      else x = -Math.log((b - p)/alpha);
      const u2 = Math.random();
      if (p <= 1){
        if (u2 <= Math.exp(-x)) return x;
      } else {
        if (u2 <= Math.pow(x, alpha - 1)) return x;
      }
    }
  } else {
    // Marsaglia-Tsang
    const d = alpha - 1/3;
    const c = 1/Math.sqrt(9*d);
    while (true){
      let x, v;
      do {
        // 표준정규 근사: Box-Muller
        const u1 = Math.random(), u2 = Math.random();
        x = Math.sqrt(-2*Math.log(u1)) * Math.cos(2*Math.PI*u2);
        v = 1 + c*x;
      } while (v <= 0);
      v = v*v*v;
      const u = Math.random();
      if (u < 1 - 0.0331*(x*x)*(x*x)) return d*v;
      if (Math.log(u) < 0.5*x*x + d*(1 - v + Math.log(v))) return d*v;
    }
  }
}

// ----------------- AI 턴 -----------------

async function aiTurn() {
  if (!session || player !== -1) return;
  if (checkAndMaybeEnd()) return;

  gameMsgEl.textContent = `AI(MCTS ${MCTS_SIMS}) 생각 중...`;

  if (USE_MCTS) {
    try {
      const mcts = new PUCT_MCTS(pins, -1, MCTS_SIMS, MCTS_CPUCT, TEMP_FINAL, NOISE_EPS, NOISE_ALPHA);
      const a = await mcts.run();
      if (a < 0) throw new Error("MCTS가 수를 찾지 못했습니다.");
      pins[a] = 0; pins[a+1] = 0;
      player = -player;
      render();
      if (checkAndMaybeEnd()) return;
      gameMsgEl.textContent = "당신의 차례입니다. 인접한 핀 2개를 제거하세요.";
      return;
    } catch (e) {
      console.warn("MCTS 실패, 그리디로 폴백:", e);
    }
  }

  // 그리디 폴백
  try {
    const obs1D = buildObs1D(pins, player);
    const out = await runModel(makeFeedsFromObs(obs1D));
    const polName = pickPolicyOutput(out);
    const logits = out[polName]?.data;
    if (!logits) throw new Error("ONNX 출력에 policy/policy_logits/action_logits가 없습니다.");

    const mask = buildMask(pins, logits.length);
    let best = -1, bestVal = -Infinity;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] && logits[i] > bestVal) { bestVal = logits[i]; best = i; }
    }
    if (best < 0) {
      if (hasValidMoves(pins)) gameMsgEl.textContent = "AI 오류: 합법적인 수가 없습니다.";
      return;
    }

    pins[best] = 0; pins[best + 1] = 0;
    player = -player;
    render();
    if (checkAndMaybeEnd()) return;
    gameMsgEl.textContent = "당신의 차례입니다. 인접한 핀 2개를 제거하세요.";
  } catch (e) {
    console.error(e);
    gameMsgEl.textContent = "AI 추론 오류: " + e.message;
  }
}

// ----------------- 초기화 -----------------

async function loadModelFrom(path) {
  modelBadgeEl.textContent = `Model: loading… (${path})`;
  try {
    session = await ort.InferenceSession.create(path, { executionProviders: ["wasm"] });

    INPUT_NAME = session.inputNames[0] || "obs";
    const inMeta = session.inputMetadata?.[INPUT_NAME];
    if (inMeta && Array.isArray(inMeta.dimensions)) {
      const dims = inMeta.dimensions;
      const rank = dims.length;
      INPUT_RANK = rank;

      if (rank === 1) { INPUT_LAYOUT = "L"; }
      else if (rank === 2) { INPUT_LAYOUT = "BL"; }
      else if (rank === 3) { INPUT_LAYOUT = "BCL"; }
      else if (rank === 4) { INPUT_LAYOUT = "BCHW"; }
      else { INPUT_LAYOUT = "BL"; }

      const posDims = dims.filter(d => typeof d === "number" && d > 0);
      if (posDims.length >= 1) {
        const last = posDims[posDims.length - 1];
        MAX_OBS_LEN = Number(last);
        OBS_W = MAX_OBS_LEN;
      }
      if (INPUT_LAYOUT === "BCL" && typeof dims[1] === "number") OBS_C = dims[1];
      if (INPUT_LAYOUT === "BCHW") {
        if (typeof dims[1] === "number") OBS_C = dims[1];
        if (typeof dims[2] === "number") OBS_H = dims[2];
        if (typeof dims[3] === "number") OBS_W = dims[3];
      }
    }

    const outNames = session.outputNames;
    const meta = session.outputMetadata || {};
    const candidatePol = ["policy", "policy_logits", "action_logits"].find(n => outNames.includes(n)) || outNames[0];
    POLICY_NAME = candidatePol;
    const polDims = meta[candidatePol]?.dimensions;
    if (Array.isArray(polDims)) {
      const posDims = polDims.filter(d => typeof d === "number" && d > 0);
      if (posDims.length >= 1) ACTION_SIZE_HINT = posDims[posDims.length - 1];
    }

    modelBadgeEl.textContent = `Model: loaded ✔ (${path})`;
  } catch (e) {
    session = null;
    modelBadgeEl.textContent = `Model: failed — ${e.message}`;
  }
}

newGameBtn.addEventListener("click", () => {
  N_PINS = Math.max(2, Math.min(MAX_BOARD_SIZE, Number(nPinsEl.value) || 60));
  pins = Array(N_PINS).fill(1);
  selected = [];
  const who = whoFirstEl.value;
  player = (who === "human") ? +1 : -1;
  render();
  if (checkAndMaybeEnd()) return;
  gameMsgEl.textContent = (player === +1) ? "인접한 핀 2개를 클릭하세요." : "AI가 먼저 둡니다.";
  if (player === -1) setTimeout(aiTurn, 180);
});

aiMoveBtn.addEventListener("click", () => {
  if (player === -1 && session) aiTurn();
});

(async function init(){
  await loadModelFrom(DEFAULT_MODEL_PATH);
  pins = Array(N_PINS).fill(1);
  render();
  gameMsgEl.textContent = session ? "모델이 로드되었습니다. 새 게임을 시작하세요." : "모델 로드 실패. model.onnx 경로를 확인하세요.";
})();
