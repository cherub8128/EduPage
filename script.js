// ===============================
// Misère Dawson's Kayles (인접 2핀 제거만 허용)
// ONNX(Web) + 정식 PUCT MCTS (BCHW 고정 입력)
// -------------------------------
// - 모델 입력: [B, C, H, W]  (4D, 고정)
//   * C=1, H=1, W=OBS_W 로 가정 (필요 시 메타에서 숫자면 반영)
// - 모델 출력: 'policy' (또는 'policy_logits'/'action_logits'), 'value'
// - URL 파라미터:
//   ?model=export/dawsons_best.onnx
//   &sims=400&cpuct=1.4&temp=0&noise_eps=0.25&noise_alpha=0.3
// ===============================

/* -------------------- 기본 파라미터 -------------------- */
let N_PINS = 60;              // 시작 핀 개수
let OBS_W  = 60;             // 관측 벡터 길이(런 히스토그램 + 현재 턴)
const OBS_C = 3;              // 채널 수(3 고정)
const OBS_H = 1;              // 높이(1 고정)
const MCTS_SIMS   = 800;     // 400→800
const MCTS_CPUCT  = 1.4;
const TEMP_FINAL  = 0;       // ← 반드시 0
const NOISE_EPS   = 0;       // ← 반드시 0 (루트 Dirichlet 노이즈 끔)
const NOISE_ALPHA = 0.3;

function _getParam(name, def) {
  const q = new URLSearchParams(location.search);
  return q.has(name) ? q.get(name) : def;
}
const DEFAULT_MODEL_PATH = _getParam("model", "model.onnx");

// MCTS 하이퍼파라미터
const MCTS_SIMS   = parseInt(_getParam("sims", "800"), 10);
const MCTS_CPUCT  = parseFloat(_getParam("cpuct", "1.4"));
const TEMP_FINAL  = parseFloat(_getParam("temp", "0"));    // 0이면 argmax(N)
const NOISE_EPS   = parseFloat(_getParam("noise_eps", "0"));
const NOISE_ALPHA = parseFloat(_getParam("noise_alpha", "0.3"));

/* -------------------- DOM -------------------- */
const modelBadgeEl = document.getElementById("modelBadge");
const nPinsEl = document.getElementById("nPins");
const whoFirstEl = document.getElementById("whoFirst");
const newGameBtn = document.getElementById("newGameBtn");
const aiMoveBtn = document.getElementById("aiMoveBtn");
const pinsEl = document.getElementById("pins");
const gameMsgEl = document.getElementById("gameMsg");
const turnWhoEl = document.getElementById("turnWho");

/* -------------------- 상태 -------------------- */
let pins = [];            // 보드: 1=살아있음, 0=제거
let selected = [];        // 사용자가 선택한 핀 인덱스들(최대 2)
let player = +1;          // +1: 사람, -1: AI (현재 둘 차례)
let session = null;       // ONNX InferenceSession
let POLICY_NAME = "policy";  // 출력 정책 텐서 이름

/* ==================== 게임 규칙 ==================== */

// 인접 2핀 제거 가능한 합법 수 존재 여부
function hasValidMoves(board) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] === 1 && board[i + 1] === 1) return true;
  }
  return false;
}

// 1이 연속된 덩어리(런) 길이 리스트
function getRunLengths(arr) {
  const runs = [];
  let cur = 0;
  for (const v of arr) {
    if (v === 1) cur += 1;
    else { if (cur > 0) runs.push(cur); cur = 0; }
  }
  if (cur > 0) runs.push(cur);
  return runs;
}

// 관측 벡터(길이 OBS_W): [런 길이 히스토그램(1..), ..., 현재턴(+1/-1)]
function buildObs1D(board, who) {
  const x = new Float32Array(OBS_W).fill(0);
  const runs = getRunLengths(board);
  // obs[r-1] += count
  for (const r of runs) {
    const idx = r - 1;
    if (idx >= 0 && idx < OBS_W - 1) x[idx] += 1.0;
  }
  // 마지막 원소에 현재 턴(+1/-1)
  x[OBS_W - 1] = (who === +1) ? 1.0 : -1.0;
  return x;
}

// 인접쌍 합법 행동 마스크 (길이는 정책 길이에 맞춰 나중에 슬라이스)
function buildMask(board, desiredLen) {
  const m = new Uint8Array(desiredLen);
  const lim = Math.min(desiredLen, Math.max(0, board.length - 1));
  for (let i = 0; i < lim; i++) {
    if (board[i] === 1 && board[i + 1] === 1) m[i] = 1;
  }
  return m;
}

// 게임 종료 처리: Misère — 둘 수 없으면 '현재 둘 차례'가 승자
function declareWinner(currentWho) {
  const winner = currentWho === +1 ? "Human" : "AI";
  gameMsgEl.textContent = `게임 종료! 승자: ${winner}`;
  turnWhoEl.textContent = "종료";
  aiMoveBtn.disabled = true;
}

function checkAndMaybeEnd() {
  if (!hasValidMoves(pins)) { declareWinner(player); return true; }
  return false;
}

/* ==================== 렌더링/UI ==================== */

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
      // 사람 수 적용
      pins[p1] = 0; pins[p2] = 0; selected = [];
      // 턴 교대(미제르 판정은 '둘 차례' 기준)
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

/* ==================== ONNX I/O (BCHW 고정) ==================== */

// BCHW 입력 텐서 생성: [1, OBS_C(=1), OBS_H(=1), OBS_W]
// 첫 채널/첫 행에 obs1D를 채운다.
function makeBCHW(obs1D, inputName) {
  const W = OBS_W;
  const data = new Float32Array(OBS_C * OBS_H * W);
  for (let i=0;i<Math.min(W, obs1D.length); i++) data[i] = obs1D[i];
  return { [inputName]: new ort.Tensor("float32", data, [1, OBS_C, OBS_H, W]) };
}

// (정책이 log-softmax든 logits든) 마스크드 소프트맥스
function softmaxMasked(logits, mask) {
  let maxv = -Infinity;
  for (let i=0;i<logits.length;i++) if(mask[i] && logits[i] > maxv) maxv = logits[i];
  const exps = new Float32Array(logits.length);
  let sum = 0.0;
  for (let i=0;i<logits.length;i++) {
    if (mask[i]) { const v = Math.exp(logits[i] - maxv); exps[i]=v; sum+=v; }
  }
  const probs = new Float32Array(logits.length);
  if (sum <= 0) {
    // 합법 수가 모두 0이면 균등분배 폴백
    let cnt=0; for (let i=0;i<mask.length;i++) if(mask[i]) cnt++;
    if (cnt>0) { const u=1/cnt; for (let i=0;i<mask.length;i++) probs[i]=mask[i]?u:0; }
    return probs;
  }
  for (let i=0;i<logits.length;i++) probs[i] = mask[i] ? (exps[i]/sum) : 0;
  return probs;
}

// 정책 출력 텐서 이름 선택(기본 'policy')
function pickPolicyName(outputs) {
  if ("policy" in outputs) return "policy";
  if ("policy_logits" in outputs) return "policy_logits";
  if ("action_logits" in outputs) return "action_logits";
  // value가 아닌 첫 텐서
  const names = Object.keys(outputs);
  return names.find(n => n !== "value") || names[0];
}

/* ==================== PV 평가(캐시 포함) ==================== */

const pvCache = new Map(); // key: boardStr|whoStr

function boardKey(board, who) {
  return board.join("") + "|" + (who===+1?"H":"A");
}

async function evalPolicyValue(board, who) {
  const k = boardKey(board, who);
  if (pvCache.has(k)) return pvCache.get(k);

  const obs1D = buildObs1D(board, who);
  const feeds = makeBCHW(obs1D, session.inputNames[0] || "obs");
  const out   = await session.run(feeds);

  const polName = POLICY_NAME in out ? POLICY_NAME : pickPolicyName(out);
  const raw     = out[polName].data;    // log-softmax 혹은 logits
  const val     = out["value"]?.data ? Number(out["value"].data[0]) : 0.0;

  // 합법 마스크 & 정규화
  const mask = buildMask(board, raw.length);
  const probs = softmaxMasked(raw, Array.from(mask, x=>!!x));

  const res = { probs, value: val };
  pvCache.set(k, res);
  return res;
}

/* ==================== 정식 PUCT MCTS ==================== */

// 간단 감마/디리클레 샘플러 (루트 노이즈용)
function gammaSample(alpha) {
  if (alpha < 1) {
    // Johnk’s generator
    while (true) {
      const u = Math.random();
      const b = (Math.E + alpha)/Math.E;
      const p = b * u;
      let x;
      if (p <= 1) x = Math.pow(p, 1/alpha);
      else x = -Math.log((b - p)/alpha);
      const u2 = Math.random();
      if (p <= 1) { if (u2 <= Math.exp(-x)) return x; }
      else { if (u2 <= Math.pow(x, alpha - 1)) return x; }
    }
  } else {
    // Marsaglia-Tsang
    const d = alpha - 1/3;
    const c = 1/Math.sqrt(9*d);
    while (true) {
      let x, v;
      do {
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
function sampleDirichlet(k, alpha) {
  const arr = new Float32Array(k);
  let s=0; for (let i=0;i<k;i++){ const g=gammaSample(alpha); arr[i]=g; s+=g; }
  if (s>0) for (let i=0;i<k;i++) arr[i]/=s;
  return arr;
}

// 노드
class MNode {
  constructor(board, who) {
    this.board = board.slice();
    this.who   = who;                 // 현재 둘 차례
    this.N     = 0;                   // 방문수
    this.P     = null;                // prior 확률 분포(Float32Array)
    this.Nsa   = null;                // 액션별 방문수
    this.Wsa   = null;                // 액션별 누적가치
    this.valid = null;                // 합법 마스크
    this.children = new Map();        // a -> childKey
    this.expanded = false;
    this.terminal = !hasValidMoves(board); // 미제르: 둘 수 없으면 현재가 승리
  }
}

class PUCT {
  constructor(rootBoard, rootWho, sims, cpuct, temp, noise_eps, noise_alpha) {
    this.sims = sims;
    this.cpuct= cpuct;
    this.temp = temp;
    this.noise_eps = noise_eps;
    this.noise_alpha= noise_alpha;

    this.nodes = new Map();
    this.rootKey = boardKey(rootBoard, rootWho);
    this.nodes.set(this.rootKey, new MNode(rootBoard, rootWho));
  }

  _getOrCreate(board, who) {
    const k = boardKey(board, who);
    if (this.nodes.has(k)) return this.nodes.get(k);
    const n = new MNode(board, who);
    this.nodes.set(k, n);
    return n;
  }

  async _expand(node, isRoot=false) {
    if (node.expanded || node.terminal) return 0.0;

    const { probs, value } = await evalPolicyValue(node.board, node.who);
    let P = probs.slice();

    // 루트 Dirichlet 노이즈
    if (isRoot && this.noise_eps > 0) {
      const legalIdx = [];
      for (let i=0;i<P.length;i++) if (P[i] > 0) legalIdx.push(i);
      if (legalIdx.length > 0) {
        const noise = sampleDirichlet(legalIdx.length, this.noise_alpha);
        let j=0; for (const idx of legalIdx) P[idx] = (1 - this.noise_eps)*P[idx] + this.noise_eps*noise[j++];
        // 재정규화
        let s=0; for (const idx of legalIdx) s += P[idx];
        if (s>0) for (const idx of legalIdx) P[idx] /= s;
      }
    }

    node.P = P;
    node.valid = buildMask(node.board, P.length);
    node.Nsa = new Uint32Array(P.length);
    node.Wsa = new Float32Array(P.length);
    node.expanded = true;
    return value;  // 현재 둘 차례 관점의 v
  }

  _select(node) {
    const Nsum = Math.max(1, node.N);
    let bestA=-1, bestS=-1e9;
    for (let a=0;a<node.P.length;a++) {
      if (!node.valid[a]) continue;
      const nsa = node.Nsa[a];
      const qsa = (nsa===0) ? 0.0 : (node.Wsa[a]/nsa);
      const u   = this.cpuct * node.P[a] * Math.sqrt(Nsum) / (1 + nsa);
      const s   = qsa + u;
      if (s > bestS) { bestS=s; bestA=a; }
    }
    return bestA;
  }

  async _simulateOnce() {
    let path = [];
    let node = this.nodes.get(this.rootKey);

    // 루트가 미확장/터미널 처리
    if (!node.expanded && !node.terminal) {
      const v0 = await this._expand(node, true);
      // 백업
      let v = v0;
      for (let i=path.length-1;i>=0;i--) {
        const { n, a } = path[i]; n.N+=1; n.Nsa[a]+=1; n.Wsa[a]+=v; v=-v;
      }
      return;
    }
    if (node.terminal) {
      // 미제르: 현재가 승리 → v=+1
      let v = 1.0;
      for (let i=path.length-1;i>=0;i--) {
        const { n, a } = path[i]; n.N+=1; n.Nsa[a]+=1; n.Wsa[a]+=v; v=-v;
      }
      return;
    }

    // 아래로 한 단계 진행(한 번의 액션 확장)
    const a = this._select(node);
    if (a < 0) {
      // 수치 이슈 시 균등 랜덤
      const cand = [];
      for (let i=0;i<node.P.length;i++) if (node.valid[i]) cand.push(i);
      if (cand.length === 0) {
        // 터미널 취급
        let v = 1.0;
        for (let i=path.length-1;i>=0;i--) {
          const { n, a:a0 } = path[i]; n.N+=1; n.Nsa[a0]+=1; n.Wsa[a0]+=v; v=-v;
        }
        return;
      }
      const ra = cand[Math.floor(Math.random()*cand.length)];
      path.push({ n: node, a: ra });
      const next = node.board.slice(); next[ra]=0; next[ra+1]=0;
      node = this._getOrCreate(next, -node.who);
    } else {
      path.push({ n: node, a });
      const next = node.board.slice(); next[a]=0; next[a+1]=0;
      node = this._getOrCreate(next, -node.who);
    }

    if (!node.expanded && !node.terminal) {
      const v0 = await this._expand(node, false);
      // 백업
      let v = v0;
      for (let i=path.length-1;i>=0;i--) {
        const { n, a:a0 } = path[i]; n.N+=1; n.Nsa[a0]+=1; n.Wsa[a0]+=v; v=-v;
      }
      return;
    }
    if (node.terminal) {
      // 현재가 승리
      let v = 1.0;
      for (let i=path.length-1;i>=0;i--) {
        const { n, a:a0 } = path[i]; n.N+=1; n.Nsa[a0]+=1; n.Wsa[a0]+=v; v=-v;
      }
    }
  }

  async run() {
    for (let i=0;i<this.sims;i++) {
      await this._simulateOnce();
    }
    const root = this.nodes.get(this.rootKey);
    if (!root || !root.expanded) return -1;

    const Ns = root.Nsa, mask = root.valid;
    let action = -1;

    if (this.temp > 0) {
      // Ns^(1/temp)로 확률화 후 샘플
      const probs = new Float32Array(Ns.length);
      let sum = 0, invT = 1/this.temp;
      for (let a=0;a<Ns.length;a++) {
        if (mask[a]) { const v = Math.pow(Math.max(1, Ns[a]), invT); probs[a]=v; sum+=v; }
      }
      if (sum > 0) {
        let r = Math.random()*sum;
        for (let a=0;a<Ns.length;a++) {
          if (!mask[a]) continue;
          if (r < probs[a]) { action = a; break; }
          r -= probs[a];
        }
      }
      if (action < 0) {
        // 폴백: argmax Ns
        let best=-1,bv=-1; for (let a=0;a<Ns.length;a++) if (mask[a] && Ns[a]>bv){bv=Ns[a];best=a;}
        action = best;
      }
    } else {
      // temp=0 → argmax Ns
      let best=-1,bv=-1; for (let a=0;a<Ns.length;a++) if (mask[a] && Ns[a]>bv){bv=Ns[a];best=a;}
      action = best;
    }
    return action;
  }
}

/* ==================== AI 턴 ==================== */

async function aiTurn() {
  if (!session || player !== -1) return;
  if (checkAndMaybeEnd()) return;

  try {
    gameMsgEl.textContent = `AI(MCTS ${MCTS_SIMS}) 생각 중...`;
    const mcts = new PUCT(pins, -1, MCTS_SIMS, MCTS_CPUCT, TEMP_FINAL, NOISE_EPS, NOISE_ALPHA);
    const a = await mcts.run();
    if (a < 0) throw new Error("MCTS가 수를 찾지 못했습니다.");
    pins[a] = 0; pins[a+1] = 0;
    player = -player;
    render();
    if (checkAndMaybeEnd()) return;
    gameMsgEl.textContent = "당신의 차례입니다. 인접한 핀 2개를 제거하세요.";
  } catch (e) {
    console.error(e);
    gameMsgEl.textContent = "AI 추론 오류: " + e.message;
  }
}

/* ==================== 모델 로드/초기화 ==================== */

async function loadModel(path) {
  modelBadgeEl.textContent = `Model: loading… (${path})`;
  try {
    session = await ort.InferenceSession.create(path, { executionProviders: ["wasm"] });

    // 입력 이름/메타 확인 (4D 강제 사용)
    const inName = session.inputNames[0] || "obs";
    const inMeta = session.inputMetadata?.[inName];
    if (inMeta && Array.isArray(inMeta.dimensions) && inMeta.dimensions.length === 4) {
      // [B, C, H, W]에서 W가 숫자면 OBS_W에 반영
      const dims = inMeta.dimensions;
      if (typeof dims[3] === "number" && dims[3] > 0) OBS_W = dims[3];
    }
    POLICY_NAME = session.outputNames.includes("policy") ? "policy"
                 : (session.outputNames.includes("policy_logits") ? "policy_logits"
                 : (session.outputNames.includes("action_logits") ? "action_logits"
                 : session.outputNames[0]));

    modelBadgeEl.textContent = `Model: loaded ✔ (${path})`;
  } catch (e) {
    session = null;
    modelBadgeEl.textContent = `Model: failed — ${e.message}`;
  }
}

/* ==================== 이벤트 바인딩/시작 ==================== */

newGameBtn.addEventListener("click", () => {
  N_PINS = Math.max(2, Math.min(2000, Number(nPinsEl.value) || 60));
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
  await loadModel(DEFAULT_MODEL_PATH);
  pins = Array(N_PINS).fill(1);
  render();
  gameMsgEl.textContent = session ? "모델이 로드되었습니다. 새 게임을 시작하세요." : "모델 로드 실패. model.onnx 경로를 확인하세요.";
})();
