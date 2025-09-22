/* =========================================================
 * Misère Dawson's Kayles — Exact DP only (N ≤ 120, Chrome)
 * - 규칙: 인접한 2핀만 제거 가능 (옥탈 0.07)
 * - 미제르: 둘 수 없으면 "현재 차례"가 승리
 * - 모델/알파제로 전부 제거, 재귀+메모로 정확 판정
 * - UI는 기존 index.html/style.css 그대로 사용
 * - 추가: n 결정 시 "선수승/후수승" 배지 표시, 이론 페이지 버튼
 * =======================================================*/

/* -------------------- DOM -------------------- */
const modelBadgeEl = document.getElementById("modelBadge");
const pnBadgeEl    = document.getElementById("pnBadge");
const nPinsEl      = document.getElementById("nPins");
const whoFirstEl   = document.getElementById("whoFirst");
const newGameBtn   = document.getElementById("newGameBtn");
const aiMoveBtn    = document.getElementById("aiMoveBtn");
const theoryBtn    = document.getElementById("theoryBtn");
const pinsEl       = document.getElementById("pins");
const gameMsgEl    = document.getElementById("gameMsg");
const turnWhoEl    = document.getElementById("turnWho");

/* -------------------- 상태 -------------------- */
const N_MAX = 120;
let pins = [];
let selected = [];
let player = +1; // +1: 사람, -1: AI

/* ==================== 규칙/유틸 ==================== */

function hasValidMoves(board) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] === 1 && board[i + 1] === 1) return true;
  }
  return false;
}

function getRunLengths(arr) {
  const runs = [];
  let cur = 0;
  for (const v of arr) {
    if (v === 1) cur++;
    else { if (cur > 0) runs.push(cur); cur = 0; }
  }
  if (cur > 0) runs.push(cur);
  return runs;
}

// 보드 → 정규 상태(세그먼트 길이들, 2 이상만, 내림차순)
function boardToState(board) {
  const runs = getRunLengths(board);
  const segs = runs.filter(x => x >= 2).sort((a,b)=>b-a);
  return segs;
}

function stateKey(segs) { return segs.join(","); }

/* ==================== 재귀+메모: P/N 판정 ==================== */
/*
 * isP(segs): P-포지션이면 true, 아니면 false(N)
 * - 미제르 기저: 더 둘 수 없으면 N (현재 차례가 승리)
 * - 전이: 어떤 자식이라도 P면 현재는 N, 모든 자식이 N이면 현재는 P
 */
const memoPN = new Map();

function isPFromState(segs) {
  const key = stateKey(segs);
  if (memoPN.has(key)) return memoPN.get(key);

  if (segs.length === 0) {
    memoPN.set(key, false); // 이동 없음 ⇒ 미제르에서 N
    return false;
  }
  for (let i=0;i<segs.length;i++) {
    const m = segs[i];
    for (let k=0;k<=m-2;k++) {
      const L = k, R = m - k - 2;
      const child = [];
      for (let j=0;j<segs.length;j++) if (j!==i) child.push(segs[j]);
      if (L >= 2) child.push(L);
      if (R >= 2) child.push(R);
      child.sort((a,b)=>b-a);
      if (isPFromState(child)) { memoPN.set(key, false); return false; }
    }
  }
  memoPN.set(key, true);
  return true;
}

function isPBoard(board) { return isPFromState(boardToState(board)); }

/* ==================== PN 배지 업데이트 ==================== */
// n 핀으로 시작하는 단일 줄 초기 포지션의 선수/후수승 표시
function updatePNBadgeForN(n) {
  if (!(n >= 2 && n <= N_MAX)) {
    pnBadgeEl.textContent = "초기 포지션: —";
    return;
  }
  const board = Array(n).fill(1);
  const isP = isPBoard(board);
  // P ⇒ 후수승, N ⇒ 선수승
  pnBadgeEl.textContent = `초기 포지션: ${isP ? "후수승 (P)" : "선수승 (N)"}`;
}

/* ==================== AI 최적 수 선택 ==================== */
function aiBestMoveIndex(board) {
  const legal = [];
  for (let i=0;i<board.length-1;i++) if (board[i]===1 && board[i+1]===1) legal.push(i);
  if (legal.length===0) return -1;

  if (!isPBoard(board)) {
    for (const i of legal) {
      const child = board.slice();
      child[i]=0; child[i+1]=0;
      if (isPBoard(child)) return i; // P로 보내는 승리 수
    }
  }
  return legal[Math.floor(legal.length/2)];
}

/* ==================== 렌더링/UI ==================== */

function render() {
  pinsEl.innerHTML = "";
  pins.forEach((v, idx) => {
    const div = document.createElement("div");
    div.className = "pin " + (v ? "alive" : "removed");
    div.textContent = idx + 1;
    if (v && player === +1) {
      if (selected.includes(idx)) div.classList.add("selected");
      div.addEventListener("click", () => onPinClick(idx), { passive: true });
    }
    pinsEl.appendChild(div);
  });
  turnWhoEl.textContent = player === +1 ? "사람" : "AI";
  aiMoveBtn.disabled = !(player === -1);
}

function onPinClick(i) {
  if (player !== +1) return;
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
      pins[p1] = 0; pins[p2] = 0; selected = [];
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

function declareWinner(currentWho) {
  const winner = currentWho === +1 ? "사람" : "AI";
  gameMsgEl.textContent = `게임 종료! 승자: ${winner}`;
  turnWhoEl.textContent = "종료";
  aiMoveBtn.disabled = true;
}

function checkAndMaybeEnd() {
  if (!hasValidMoves(pins)) { declareWinner(player); return true; }
  return false;
}

/* ==================== AI 턴 ==================== */

function aiTurn() {
  if (player !== -1) return;
  if (checkAndMaybeEnd()) return;
  try {
    gameMsgEl.textContent = `AI(DP) 계산 중…`;
    const a = aiBestMoveIndex(pins);
    if (a < 0) { declareWinner(player); return; }
    pins[a]=0; pins[a+1]=0;
    player = -player;
    render();
    if (checkAndMaybeEnd()) return;
    gameMsgEl.textContent = "당신의 차례입니다. 인접한 핀 2개를 제거하세요.";
  } catch (e) {
    console.error(e);
    gameMsgEl.textContent = "AI 계산 오류: " + e.message;
  }
}

/* ==================== 이벤트/초기화 ==================== */

newGameBtn.addEventListener("click", () => {
  let n = Math.max(2, Math.min(N_MAX, Number(nPinsEl.value) || 60));
  if (n !== Number(nPinsEl.value)) {
    nPinsEl.value = n;
    gameMsgEl.textContent = `핀 개수는 2~${N_MAX} 사이만 허용됩니다.`;
    setTimeout(()=>gameMsgEl.textContent="", 1200);
  }
  // n 확정 시 P/N 배지 갱신
  updatePNBadgeForN(n);

  pins = Array(n).fill(1);
  selected = [];
  const who = whoFirstEl.value;
  player = (who === "사람") ? +1 : -1;
  render();
  if (checkAndMaybeEnd()) return;
  gameMsgEl.textContent = (player === +1) ? "인접한 핀 2개를 클릭하세요." : "AI가 먼저 둡니다.";
  if (player === -1) setTimeout(aiTurn, 180);
});

// 입력 변화에 따라 미리보기 배지 업데이트
nPinsEl.addEventListener("input", () => {
  const n = Number(nPinsEl.value);
  if (Number.isFinite(n)) updatePNBadgeForN(n);
});

aiMoveBtn.addEventListener("click", () => {
  if (player === -1) aiTurn();
});

// 이론 페이지 이동 (디자인 일관성 위해 버튼 사용)
theoryBtn.addEventListener("click", () => {
  window.location.href = "Lab/KaylesAI/theory.html";
});

// 초기 진입
(function init(){
  modelBadgeEl.textContent = `Mode: Exact DP (n ≤ ${N_MAX})`;
  const n0 = Math.max(2, Math.min(N_MAX, Number(nPinsEl.value) || 60));
  updatePNBadgeForN(n0);
  pins = Array(n0).fill(1);
  render();
  gameMsgEl.textContent = "정확 DP 모드입니다. 새 게임을 시작하세요.";
})();
