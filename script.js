// Misère Kayles - 추상적 행동 공간 모델용
let N_PINS = 60;
const MAX_PINS = 62; // Python의 max_size (60) + 2
const MAX_BOARD_SIZE = 60; // 실제 핀의 최대 개수
const POLICY_DIM = MAX_BOARD_SIZE * MAX_BOARD_SIZE; // max_size * max_size

const urlModel = new URLSearchParams(location.search).get("model");
const DEFAULT_MODEL_PATH = urlModel || "model.onnx";
// --- MCTS 설정 ---
function _getParam(name, def) {
  const q = new URLSearchParams(location.search);
  return q.has(name) ? q.get(name) : def;
}
const USE_MCTS = _getParam('mcts', '1') !== '0';
const MCTS_SIMS = parseInt(_getParam('sims', '800'), 10);
const MCTS_CPUCT = parseFloat(_getParam('cpuct', '1.4'));

// DOM Elements
const modelBadgeEl = document.getElementById("modelBadge");
const nPinsEl = document.getElementById("nPins");
const whoFirstEl = document.getElementById("whoFirst");
const newGameBtn = document.getElementById("newGameBtn");
const aiMoveBtn = document.getElementById("aiMoveBtn");
const pinsEl = document.getElementById("pins");
const gameMsgEl = document.getElementById("gameMsg");
const turnWhoEl = document.getElementById("turnWho");

// Game State
let pins = [];
let selected = [];
let player = +1;  // +1: Human, -1: AI
let session = null;

// ---- Helper Functions ----
function hasValidMoves(board) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] === 1 && board[i + 1] === 1) return true;
  }
  return false;
}

function _getRunLengths(pinsArr) {
    const runs = [];
    let currentRun = 0;
    for (const pin of pinsArr) {
        if (pin === 1) {
            currentRun++;
        } else {
            if (currentRun > 0) runs.push(currentRun);
            currentRun = 0;
        }
    }
    if (currentRun > 0) runs.push(currentRun);
    return runs;
}

function buildObs(pinsArr, currentPlayer) {
    const obs = new Float32Array(MAX_PINS);
    const runs = _getRunLengths(pinsArr);
    for (const r_len of runs) {
        if (r_len >= 1 && r_len <= MAX_BOARD_SIZE) obs[r_len - 1] += 1.0;
    }
    obs[MAX_PINS - 1] = (currentPlayer === +1) ? 1.0 : -1.0;
    return obs;
}

function _actionToTuple(action) {
    const runLen = Math.floor(action / MAX_BOARD_SIZE);
    const leftSplitSize = action % MAX_BOARD_SIZE;
    return { runLen, leftSplitSize };
}

function _tupleToAction(runLen, leftSplitSize) {
    return runLen * MAX_BOARD_SIZE + leftSplitSize;
}

function buildAbstractMask(pinsArr) {
    const mask = new Array(POLICY_DIM).fill(false);
    const uniqueRuns = [...new Set(_getRunLengths(pinsArr))];
    for (const r_len of uniqueRuns) {
        if (r_len >= 2) {
            for (let i = 0; i < r_len - 1; i++) {
                mask[_tupleToAction(r_len, i)] = true;
            }
        }
    }
    return mask;
}

function applyAbstractAction(pinsArr, action) {
    const { runLen, leftSplitSize } = _actionToTuple(action);
    const nextPins = pinsArr.slice();
    let inRun = false, runStart = -1;

    for (let i = 0; i <= nextPins.length; i++) {
        const pin = (i < nextPins.length) ? nextPins[i] : 0;
        if (pin === 1 && !inRun) {
            inRun = true;
            runStart = i;
        } else if (pin === 0 && inRun) {
            inRun = false;
            if ((i - runStart) === runLen) {
                const pin1_idx = runStart + leftSplitSize;
                nextPins[pin1_idx] = 0;
                nextPins[pin1_idx + 1] = 0;
                return nextPins;
            }
        }
    }
    return null; // Should not happen if logic is correct
}

// ---- Game Logic & Rendering ----
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

function render() {
  pinsEl.innerHTML = "";
  pins.forEach((v, idx) => {
    const div = document.createElement("div");
    div.className = "pin " + (v ? "alive" : "removed");
    div.textContent = idx + 1;
    if (v && player === +1 && session) {
      if (selected.includes(idx)) div.classList.add("selected");
      div.addEventListener("click", () => onPinClick(idx));
    }
    pinsEl.appendChild(div);
  });
  turnWhoEl.textContent = player === +1 ? "Human" : "AI";
  aiMoveBtn.disabled = !(player === -1 && session);
}

function onPinClick(i) {
  if (player !== +1 || !session || !pins[i]) return;
  if (selected.includes(i)) {
    selected = selected.filter(x => x !== i);
  } else if (selected.length < 2) {
    selected.push(i);
  }

  if (selected.length === 2) {
    selected.sort((a,b)=>a-b);
    const [p1, p2] = selected;
    if (p2 - p1 === 1 && pins[p1] && pins[p2]) {
      pins[p1] = 0; pins[p2] = 0; selected = [];
      player = -player;
      render();
      if (!checkAndMaybeEnd() && player === -1) setTimeout(aiTurn, 160);
    } else {
      gameMsgEl.textContent = "인접한 살아있는 핀 2개를 선택하세요.";
      setTimeout(()=>{ selected=[]; render(); gameMsgEl.textContent=""; }, 900);
    }
  } else {
    render();
  }
}

// ---- AI Logic ----
async function runModel(feeds) { return await session.run(feeds); }

class _MNode {
  constructor(pins, player, parent=null, prior=0.0) {
    this.pins = pins; this.player = player; this.parent = parent;
    this.children = new Map();
    this.N = 0; this.W = 0.0; this.P = prior;
  }
  get Q(){ return this.N === 0 ? 0.0 : this.W / this.N; }
}

async function _evalPV(pinsArr, currentPlayer){
  const obs = buildObs(pinsArr, currentPlayer);
  const legalMask = buildAbstractMask(pinsArr);
  const feeds = { obs: new ort.Tensor('float32', obs, [1, MAX_PINS]) };
  const out = await runModel(feeds);
  const logits = out['policy_logits']?.data;
  const value = out['value']?.data[0] || 0.0;

  let maxv = -Infinity;
  for (let i=0;i<logits.length;i++){ if(legalMask[i] && logits[i] > maxv) maxv = logits[i]; }
  const exps = new Float32Array(logits.length);
  let sum = 0.0;
  for (let i=0;i<logits.length;i++){
    if(legalMask[i]){ const v = Math.exp(logits[i]-maxv); exps[i]=v; sum+=v; }
  }
  const probs = new Float32Array(logits.length);
  if(sum > 0) for (let i=0;i<logits.length;i++) probs[i] = exps[i]/sum;

  return { probs, value: Number(value), legalMask };
}

async function _mctsSuggest(pinsArr){
  const root = new _MNode(pinsArr.slice(), -1);
  if (!hasValidMoves(root.pins)) return -1;
  {
    const { probs, legalMask } = await _evalPV(root.pins, root.player);
    for (let a=0;a<probs.length;a++){
      if (legalMask[a]){
        root.children.set(a, new _MNode(null, +1, root, probs[a]));
      }
    }
  }

  for (let t=0;t<MCTS_SIMS;t++){
    let node = root; const path=[node];
    while (node.children.size > 0 && node.pins){
      let bestA=-1, best=null, bestScore=-1e9;
      const sqrtN = Math.sqrt(Math.max(1,node.N));
      for (const [a,ch] of node.children.entries()){
        const s = ch.Q + MCTS_CPUCT * ch.P * sqrtN / (1 + ch.N);
        if (s > bestScore){ bestScore=s; best=ch; bestA=a; }
      }
      if(best.pins === null) best.pins = applyAbstractAction(node.pins, bestA);
      node = best; path.push(node);
    }

    let v;
    if (!hasValidMoves(node.pins)){
      v = 1.0;
    } else {
      const { probs, value, legalMask } = await _evalPV(node.pins, node.player);
      v = value;
      for (let a=0;a<probs.length;a++){
        if(legalMask[a]) node.children.set(a, new _MNode(null, -node.player, node, probs[a]));
      }
    }
    for (let i=path.length-1;i>=0;i--){ const n=path[i]; n.N+=1; n.W+=v; v = -v; }
  }
  let bestA=-1, bestN=-1;
  for (const [a,ch] of root.children.entries()){ if (ch.N > bestN){ bestN=ch.N; bestA=a; } }
  return bestA;
}

async function aiTurn() {
  if (!session || player !== -1 || checkAndMaybeEnd()) return;

  const thinkMsg = USE_MCTS ? `AI(MCTS ${MCTS_SIMS}) 생각 중...` : "AI 생각 중...";
  gameMsgEl.textContent = thinkMsg;

  try {
    let bestAction;
    if (USE_MCTS) {
        bestAction = await _mctsSuggest(pins);
    } else {
        const { probs, legalMask } = await _evalPV(pins, player);
        let bestA = -1, bestP = -1;
        for(let i=0; i<probs.length; i++) {
            if(legalMask[i] && probs[i] > bestP) {
                bestP = probs[i];
                bestA = i;
            }
        }
        bestAction = bestA;
    }

    if (bestAction < 0) {
        throw new Error("AI가 합법적인 수를 찾지 못했습니다.");
    }

    const nextPins = applyAbstractAction(pins, bestAction);
    if (!nextPins) throw new Error("AI가 제안한 수를 적용할 수 없습니다.");

    pins = nextPins;
    player = -player;
    render();
    if (!checkAndMaybeEnd()) gameMsgEl.textContent = "당신의 차례입니다.";

  } catch (e) {
    console.error(e);
    gameMsgEl.textContent = "AI 오류: " + e.message;
  }
}

// ---- Init and Event Listeners ----
async function init(){
  modelBadgeEl.textContent = `Model: loading… (${DEFAULT_MODEL_PATH})`;
  try {
    session = await ort.InferenceSession.create(DEFAULT_MODEL_PATH, { executionProviders: ["wasm"] });
    modelBadgeEl.textContent = `Model: loaded ✔ (${DEFAULT_MODEL_PATH})`;
    gameMsgEl.textContent = "모델이 로드되었습니다. 새 게임을 시작하세요.";
  } catch (e) {
    modelBadgeEl.textContent = `Model: failed — ${e.message}`;
    gameMsgEl.textContent = "모델 로드 실패. model.onnx 파일을 확인하세요.";
  }
  pins = Array(N_PINS).fill(1);
  render();
}

newGameBtn.addEventListener("click", () => {
  N_PINS = Math.max(2, Math.min(MAX_BOARD_SIZE, Number(nPinsEl.value) || 60));
  pins = Array(N_PINS).fill(1);
  selected = [];
  player = (whoFirstEl.value === "human") ? +1 : -1;
  render();
  if (!checkAndMaybeEnd()) {
    gameMsgEl.textContent = (player === +1) ? "인접한 핀 2개를 클릭하세요." : "AI가 먼저 둡니다.";
    if (player === -1) setTimeout(aiTurn, 180);
  }
});

aiMoveBtn.addEventListener("click", () => {
  if (player === -1 && session) aiTurn();
});

init();