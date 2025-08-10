// Misère Kayles (no splitting) — Top toolbar, mobile-optimized, auto-load model.
// - Auto-loads model from same folder: model.onnx (or override via ?model=name.onnx)
// - Inputs: obs [1, MAX_PINS] float32, optional action_masks [1, MAX_PINS-1] bool
// - Outputs: 'policy_logits' or 'action_logits' (length MAX_PINS-1)
let N_PINS = 60;
const MAX_PINS = 130;
const urlModel = new URLSearchParams(location.search).get("model");
const DEFAULT_MODEL_PATH = urlModel || "model.onnx";
// --- MCTS toggle (does not break existing logic) ---
// Control via URL: ?mcts=1&sims=256&cpuct=1.4
function _getParam(name, def) {
  const q = new URLSearchParams(location.search);
  return q.has(name) ? q.get(name) : def;
}
const USE_MCTS = _getParam('mcts', '1') !== '0';
const MCTS_SIMS = parseInt(_getParam('sims', '256'), 10);
const MCTS_CPUCT = parseFloat(_getParam('cpuct', '1.4'));


// DOM
const modelBadgeEl = document.getElementById("modelBadge");
const nPinsEl = document.getElementById("nPins");
const whoFirstEl = document.getElementById("whoFirst");
const newGameBtn = document.getElementById("newGameBtn");
const aiMoveBtn = document.getElementById("aiMoveBtn");
const pinsEl = document.getElementById("pins");
const gameMsgEl = document.getElementById("gameMsg");
const turnWhoEl = document.getElementById("turnWho");

// State
let pins = [];
let selected = [];
let player = +1;  // +1: Human, -1: AI
let session = null;

// ---- Helpers ----
function hasValidMoves(board) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] === 1 && board[i + 1] === 1) return true;
  }
  return false;
}

function padObs(pinsArr) {
  const v = new Float32Array(MAX_PINS);
  for (let i = 0; i < Math.min(MAX_PINS, pinsArr.length); i++) v[i] = pinsArr[i];
  return v;
}

function buildMask(pinsArr) {
  const mask = new Uint8Array(MAX_PINS - 1);
  for (let i = 0; i < Math.min(MAX_PINS - 1, pinsArr.length - 1); i++) {
    if (pinsArr[i] === 1 && pinsArr[i + 1] === 1) mask[i] = 1;
  }
  return mask;
}

function declareWinner(currentPlayer) {
  const winner = currentPlayer === +1 ? "Human" : "AI";
  gameMsgEl.textContent = `게임 종료! 승자: ${winner}`;
  turnWhoEl.textContent = "종료";
  aiMoveBtn.disabled = true;
}

function checkAndMaybeEnd() {
  if (!hasValidMoves(pins)) { declareWinner(player); return true; }
  return false;
}

// ---- Rendering ----
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
      // apply player's move
      pins[p1] = 0; pins[p2] = 0; selected = [];
      // switch turn FIRST (misère checks are for TO-MOVE player)
      player = -player;
      render();
      // terminal check for the to-move player
      if (checkAndMaybeEnd()) return;
      // AI moves if it's AI's turn
      if (player === -1) setTimeout(aiTurn, 160);
    } else {
      gameMsgEl.textContent = "인접한 살아있는 핀 2개를 선택하세요.";
      setTimeout(()=>{ selected=[]; render(); gameMsgEl.textContent=""; }, 900);
    }
  } else {
    render();
  }
}

// ---- AI ----

// --- MCTS utilities (safe add-on) ---
class _MNode {
  constructor(key, pins, player, parent=null, prior=0.0) {
    this.key = key;
    this.pins = pins;
    this.player = player; // +1 human, -1 AI
    this.parent = parent;
    this.children = new Map(); // action -> _MNode
    this.N = 0;
    this.W = 0.0;
    this.P = prior;
  }
  get Q(){ return this.N === 0 ? 0.0 : this.W / this.N; }
}
function _stateKey(p){ return p.join(''); }
function _softmaxMasked(logits, mask){
  let maxv = -Infinity;
  for (let i=0;i<logits.length;i++){ if(mask[i] && logits[i] > maxv) maxv = logits[i]; }
  const exps = new Float32Array(logits.length);
  let sum = 0.0;
  for (let i=0;i<logits.length;i++){
    if(mask[i]){ const v = Math.exp(logits[i]-maxv); exps[i]=v; sum+=v; } else exps[i]=0;
  }
  const probs = new Float32Array(logits.length);
  if(sum<=0) return probs;
  for (let i=0;i<logits.length;i++) probs[i] = exps[i]/sum;
  return probs;
}
async function _evalPV(pinsArr){
  const obs = padObs(pinsArr);
  const mask = buildMask(pinsArr);
  const feeds = { obs: new ort.Tensor('float32', obs, [1, MAX_PINS]), action_masks: new ort.Tensor('bool', mask, [1, MAX_PINS-1]) };
  const out = await runModel(feeds);
  const logits = (out['policy_logits']?.data) || (out['action_logits']?.data);
  const value = (out['value']?.data ? out['value'].data[0] : (out['value'] ? out['value'][0] : 0.0));
  const probs = _softmaxMasked(logits, Array.from(mask, x=>!!x));
  return { probs, value: Number(value) };
}
async function _mctsSuggest(pinsArr, sims=MCTS_SIMS, c_puct=MCTS_CPUCT){
  const root = new _MNode(_stateKey(pinsArr), pinsArr.slice(), -1, null, 0.0); // AI to move (-1)
  if (!hasValidMoves(root.pins)) return -1;
  // Expand root
  {
    const { probs } = await _evalPV(root.pins);
    for (let a=0;a<probs.length;a++){
      if (probs[a] > 0){
        const next = root.pins.slice(); next[a]=0; next[a+1]=0;
        root.children.set(a, new _MNode(_stateKey(next), next, +1, root, probs[a]));
      }
    }
  }
  for (let t=0;t<sims;t++){
    let node = root; const path=[node];
    // Selection
    while (node.children.size > 0){
      let bestA=-1, best=null, bestScore=-1e9;
      const sqrtN = Math.sqrt(Math.max(1,node.N));
      for (const [a,ch] of node.children.entries()){
        const u = c_puct * ch.P * sqrtN / (1 + ch.N);
        const s = ch.Q + u;
        if (s > bestScore){ bestScore=s; best=ch; bestA=a; }
      }
      node = best; path.push(node);
    }
    // Terminal?
    if (!hasValidMoves(node.pins)){
      // current node.player to move has no moves => wins in misère
      let v = 1.0;
      for (let i=path.length-1;i>=0;i--){ const n=path[i]; n.N+=1; n.W+=v; v = -v; }
      continue;
    }
    // Expand by NN
    const { probs, value } = await _evalPV(node.pins);
    for (let a=0;a<probs.length;a++){
      if (probs[a] > 0){
        const next = node.pins.slice(); next[a]=0; next[a+1]=0;
        node.children.set(a, new _MNode(_stateKey(next), next, -node.player, node, probs[a]));
      }
    }
    // Backup
    let v = value;
    for (let i=path.length-1;i>=0;i--){ const n=path[i]; n.N+=1; n.W+=v; v = -v; }
  }
  let bestA=-1, bestN=-1;
  for (const [a,ch] of root.children.entries()){ if (ch.N > bestN){ bestN=ch.N; bestA=a; } }
  return bestA;
}
async function runModel(feeds) {
  try {
    // Try with mask first
    return await session.run(feeds);
  } catch (e) {
    // Retry without action_masks if model doesn't expect it
    if (feeds.action_masks) {
      const { action_masks, ...feeds2 } = feeds;
      return await session.run(feeds2);
    } else {
      throw e;
    }
  }
}

async function aiTurn() {
  if (!session) return;
  if (player !== -1) return; // only when AI to move
  if (USE_MCTS) {
    try {
      gameMsgEl.textContent = `AI(MCTS {'{'}MCTS_SIMS{'}'}) 생각 중...`;
      if (!hasValidMoves(pins)) { declareWinner(player); return; }
      const a = await _mctsSuggest(pins, MCTS_SIMS, MCTS_CPUCT);
      if (a < 0) { gameMsgEl.textContent = "AI 오류: 합법 수 없음"; return; }
      pins[a] = 0; pins[a+1] = 0;
      player = -player;
      render();
      if (checkAndMaybeEnd()) return;
      gameMsgEl.textContent = "당신의 차례입니다. 인접한 핀 2개를 제거하세요.";
      return;
    } catch (e) {
      console.warn("MCTS 실패, 그리디로 폴백:", e);
      // fall through to greedy
    }
  }

  if (!session) return;
  if (player !== -1) return; // only when AI to move
  gameMsgEl.textContent = "AI 생각 중...";

  // If AI has no moves, AI (to move) wins by misère
  if (!hasValidMoves(pins)) { declareWinner(player); return; }

  const obs = padObs(pins);
  const mask = buildMask(pins);
  const feeds = {
    obs: new ort.Tensor("float32", obs, [1, MAX_PINS]),
    action_masks: new ort.Tensor("bool", mask, [1, MAX_PINS - 1]),
  };

  try {
    const out = await runModel(feeds);
    const logits = (out["policy_logits"]?.data) || (out["action_logits"]?.data);
    if (!logits) throw new Error("ONNX 출력에 policy_logits/action_logits가 없습니다.");
    // pick best legal
    let best = -1, bestVal = -1e30;
    for (let i = 0; i < mask.length; i++) if (mask[i] && logits[i] > bestVal) (bestVal = logits[i]), (best = i);
    if (best < 0) { gameMsgEl.textContent = "AI 오류: 합법적 수 없음"; return; }
    // apply AI move
    pins[best] = 0; pins[best + 1] = 0;
    // switch to human
    player = -player;
    render();
    // terminal check for the to-move player (human)
    if (checkAndMaybeEnd()) return;
    gameMsgEl.textContent = "당신의 차례입니다. 인접한 핀 2개를 제거하세요.";
  } catch (e) {
    console.error(e);
    gameMsgEl.textContent = "AI 추론 오류: " + e.message;
  }
}

// ---- Init / Events ----
async function loadModelFrom(path) {
  modelBadgeEl.textContent = `Model: loading… (${path})`;
  try {
    session = await ort.InferenceSession.create(path, { executionProviders: ["wasm"] });
    modelBadgeEl.textContent = `Model: loaded ✔ (${path})`;
  } catch (e) {
    session = null;
    modelBadgeEl.textContent = `Model: failed — ${e.message}`;
  }
}

newGameBtn.addEventListener("click", () => {
  N_PINS = Math.max(2, Math.min(128, Number(nPinsEl.value) || 60));
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
  // initial board
  pins = Array(N_PINS).fill(1);
  render();
  gameMsgEl.textContent = session ? "모델이 로드되었습니다. 새 게임을 시작하세요." : "모델 로드 실패. model.onnx 경로를 확인하세요.";
})();