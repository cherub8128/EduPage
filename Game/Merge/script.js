document.addEventListener('DOMContentLoaded', () => {
        const GRID_SIZE = 11;
        const BOARD_SIZE = 4;
        const state = {
            playerPos: { x: 0, y: 0 },
            targetPos: { x: 0, y: 0 },
            dragged: { element: null, sourceSlot: null, originalItem: null },
            mapItems: [],
            gemsCollected: new Set(),
            currentStageGem: null,
            stageCount: 1,
            hearts: 5,
            maxHearts: 5
        };

        const GEMS = [
            { id: 'red_diamond', color: 'red-500', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 9l10 13L22 9z"/></svg>`},
            { id: 'blue_emerald', color: 'blue-400', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12l4 6v12H2V9z"/></svg>`},
            { id: 'green_triangle', color: 'green-400', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22z"/></svg>`},
            { id: 'yellow_oval', color: 'yellow-400', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="12" rx="8" ry="11"/></svg>`},
            { id: 'purple_heart', color: 'purple-500', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`},
            { id: 'cyan_star', color: 'cyan-400', svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`}
        ];
        const COLOR_PALETTE = Array.from({ length: 40 }, (_, i) => {
            const hue = i * 9;
            return {
                name: `color-${hue}`,
                bg: `background-color: hsl(${hue}, 80%, 55%);`,
                border: `border-color: hsl(${hue}, 80%, 70%);`
            };
        });
        const REMOVER_COLORS = [
            { bg: 'bg-green-900/50', border: 'border-green-500' }, 
            { bg: 'bg-green-800/50', border: 'border-green-400' },
            { bg: 'bg-green-700/50', border: 'border-green-300' },
            { bg: 'bg-emerald-700/50', border: 'border-emerald-300' },
            { bg: 'bg-teal-700/50', border: 'border-teal-300' },
            { bg: 'bg-cyan-700/50', border: 'border-cyan-300' },
            { bg: 'bg-sky-700/50', border: 'border-sky-300' }
        ];

        const mapContainer = document.getElementById('map-container');
        const mapGrid = document.getElementById('map-grid');
        const mapItemsContainer = document.getElementById('map-items-container');
        const playerEl = document.getElementById('player');
        const targetEl = document.getElementById('target');
        const boardSlots = document.querySelectorAll('.board-slot');
        const inventorySlots = document.querySelectorAll('.inventory-slot');
        const allSlots = document.querySelectorAll('.slot');
        const gemCollectionContainer = document.getElementById('gem-collection-container');
        const endingPopup = document.getElementById('ending-popup');
        const gameoverPopup = document.getElementById('gameover-popup');
        const confirmResetPopup = document.getElementById('confirm-reset-popup');
        const restartBtn = document.getElementById('restart-game-btn');
        const resetStageBtn = document.getElementById('reset-stage-btn');
        const confirmFullResetBtn = document.getElementById('confirm-full-reset-btn');
        const cancelResetBtn = document.getElementById('cancel-reset-btn');
        const confirmFinalResetBtn = document.getElementById('confirm-final-reset-btn');
        const cancelFullResetBtn = document.getElementById('cancel-full-reset-btn');
        const stageCounterEl = document.getElementById('stage-counter');
        const mapCoordsX = document.getElementById('map-coords-x');
        const mapCoordsY = document.getElementById('map-coords-y');
        const helpBtn = document.getElementById('help-btn');
        const helpModal = document.getElementById('help-modal');
        const closeHelpBtn = document.getElementById('close-help-btn');
        const fullResetBtn = document.getElementById('full-reset-btn');

        document.getElementById('gem-legend-icon').innerHTML = `<div class="w-full h-full text-yellow-400 animate-pulse">${GEMS[3].svg}</div>`;

        const BASE_VECTORS = [ { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 } ];
        
        function setCookie(name, value, days) { let expires = ""; if (days) { const date = new Date(); date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); expires = "; expires=" + date.toUTCString(); } document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax"; }
        function getCookie(name) { const nameEQ = name + "="; const ca = document.cookie.split(';'); for (let i = 0; i < ca.length; i++) { let c = ca[i]; while (c.charAt(0) == ' ') c = c.substring(1, c.length); if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length); } return null; }
        
        function loadProgress() {
            const savedState = getCookie("vectorMergeState");
            if(savedState) {
                try {
                    const loaded = JSON.parse(savedState);
                    state.gemsCollected = new Set(loaded.gemsCollected);
                    state.stageCount = loaded.stageCount;
                    state.hearts = loaded.hearts;
                    restoreGameState(loaded);
                } catch(e) {
                    console.error("Failed to load saved state:", e);
                    setupLevel();
                }
            } else {
                setupLevel();
            }
        }
        function saveProgress() {
            try {
                const gameState = {
                    workbench: Array.from(boardSlots).map(serializeSlot),
                    inventory: Array.from(inventorySlots).map(serializeSlot),
                    mapItems: state.mapItems,
                    playerPos: state.playerPos,
                    targetPos: state.targetPos,
                    currentStageGem: state.currentStageGem,
                    gemsCollected: [...state.gemsCollected],
                    stageCount: state.stageCount,
                    hearts: state.hearts
                };
                setCookie("vectorMergeState", JSON.stringify(gameState), 365);
            } catch(e) {
                console.error("Failed to save state:", e);
            }
        }

        function setupLevel(isReset = true) {
            if(isReset) {
                allSlots.forEach(slot => slot.innerHTML = '');
                state.mapItems = [];
                state.currentStageGem = null;
                const occupiedPositions = new Set();
                
                let playerPos, targetPos, targetDistance;
                do {
                    playerPos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
                    targetPos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
                    targetDistance = Math.abs(playerPos.x - targetPos.x) + Math.abs(playerPos.y - targetPos.y);
                } while (targetDistance < 16);
                state.playerPos = playerPos; state.targetPos = targetPos;
                occupiedPositions.add(`${playerPos.x},${playerPos.y}`); occupiedPositions.add(`${targetPos.x},${targetPos.y}`);

                const uncollectedGems = GEMS.filter(gem => !state.gemsCollected.has(gem.id));
                if (uncollectedGems.length > 0) {
                    const gemToPlace = uncollectedGems[randInt(uncollectedGems.length)];
                    let gemPos, gemDistance, attempts = 0;
                    do { 
                        gemPos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) }; 
                        gemDistance = Math.abs(playerPos.x - gemPos.x) + Math.abs(playerPos.y - gemPos.y);
                        attempts++;
                    } while ((occupiedPositions.has(`${gemPos.x},${gemPos.y}`) || gemDistance < 16) && attempts < 100);
                    
                    if (attempts >= 100) { 
                        do { gemPos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) }; } while (occupiedPositions.has(`${gemPos.x},${gemPos.y}`));
                    }

                    occupiedPositions.add(`${gemPos.x},${gemPos.y}`);
                    state.currentStageGem = { ...gemToPlace, x: gemPos.x, y: gemPos.y, collected: false };
                }
                
                const requiredItems = [
                    ...Array(3).fill('pouch'), ...Array(2).fill('remover'), ...Array(2).fill('vector'), ...Array(1).fill('question_mark')
                ];
                const totalMapItems = requiredItems.length + randInt(2);

                for(let i=0; i< totalMapItems; i++) {
                    let itemType = i < requiredItems.length ? requiredItems[i] : ['pouch', 'remover', 'vector', 'question_mark'][randInt(4)];
                     let pos, itemDistance, attempts = 0;
                    do {
                        pos = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
                        itemDistance = Math.abs(playerPos.x - pos.x) + Math.abs(playerPos.y - pos.y);
                        attempts++;
                    } while((occupiedPositions.has(`${pos.x},${pos.y}`) || itemDistance >= targetDistance) && attempts < 100);
                    if (attempts >= 100) continue;
                    occupiedPositions.add(`${pos.x},${pos.y}`);
                    
                    state.mapItems.push({
                        id: `map-item-${Date.now()}-${i}`, x: pos.x, y: pos.y, type: itemType.replace('remover', 'recycler'),
                        tier: itemType === 'recycler' ? 1 + randInt(2) : undefined,
                        count: itemType === 'pouch' ? 5 + randInt(6) : (itemType === 'recycler' ? 3 + randInt(3) : undefined),
                        vector: itemType === 'vector' ? BASE_VECTORS[randInt(4)] : undefined
                    });
                }

                const boardIndices = [...Array(16).keys()];
                const stageColorPalette = getStageColorPalette(state.stageCount);
                const obstacleCount = 2;
                for (let i = 0; i < obstacleCount; i++) {
                    if(!boardIndices.length) break;
                    const pos = boardIndices.splice(randInt(boardIndices.length), 1)[0];
                    
                    let hiddenItem;
                    const rand = randInt(3);
                    if (rand === 0) hiddenItem = createPouchItemHTML(5);
                    else if (rand === 1) hiddenItem = createVectorItemHTML(BASE_VECTORS[randInt(4)].x, BASE_VECTORS[randInt(4)].y);
                    else hiddenItem = createRecyclerItemHTML(1);

                    const colorInfo = stageColorPalette[randInt(stageColorPalette.length)];
                    boardSlots[pos].innerHTML = createObstacleItemHTML(colorInfo, hiddenItem);
                }
                const pouchStartPos = boardIndices.splice(randInt(boardIndices.length), 1)[0];
                boardSlots[pouchStartPos].innerHTML = createPouchItemHTML(20);
                attachItemListeners(boardSlots[pouchStartPos].firstElementChild);
            }

            stageCounterEl.textContent = state.stageCount;
            updateGemCollectionUI();
            updateInventoryUI();
            updateHeartUI();
            updateUI();
            saveProgress();
        }

        function restoreGameState(loadedState) {
            state.playerPos = loadedState.playerPos;
            state.targetPos = loadedState.targetPos;
            state.mapItems = loadedState.mapItems;
            state.currentStageGem = loadedState.currentStageGem;
            
            const deserializeAndPlace = (slots, data) => {
                slots.forEach((slot, index) => {
                    const itemData = data[index];
                    if (itemData) {
                        slot.innerHTML = createItemHTMLFromData(itemData);
                        attachItemListeners(slot.firstElementChild);
                    }
                });
            };
            deserializeAndPlace(boardSlots, loadedState.workbench);
            deserializeAndPlace(inventorySlots, loadedState.inventory);

            setupLevel(false); 
        }

        function createItemHTMLFromData(data) {
            switch(data.itemType) {
                case 'vector': return createVectorItemHTML(parseInt(data.vx), parseInt(data.vy));
                case 'pouch': return createPouchItemHTML(parseInt(data.count));
                case 'residue': return createResidueItemHTML(parseInt(data.tier));
                case 'recycler': return createRecyclerItemHTML(parseInt(data.tier), parseInt(data.count));
                case 'scalar': return createScalarItemHTML(parseInt(data.value));
                case 'obstacle': 
                    const colorInfo = COLOR_PALETTE.find(c => c.name === data.colorName);
                    try {
                         return createObstacleItemHTML(colorInfo, decodeURIComponent(escape(atob(data.hiddenItem))));
                    } catch (e) {
                         console.error("Error decoding hidden item:", data.hiddenItem, e);
                         return ''; // return empty if fails
                    }
                default: return '';
            }
        }

        function serializeSlot(slot) {
            const item = slot.firstElementChild;
            if (!item) return null;
            // Obstacle's hiddenItem is already encoded in createObstacleItemHTML, no need to re-encode.
            return { ...item.dataset };
        }

        function drawMapCoords() {
            mapCoordsX.innerHTML = ''; mapCoordsY.innerHTML = '';
            for(let i=0; i<GRID_SIZE; i++) {
                const xEl = document.createElement('div'); xEl.className = 'map-coord font-orbitron'; xEl.textContent = i; mapCoordsX.appendChild(xEl);
                const yEl = document.createElement('div'); yEl.className = 'map-coord'; yEl.textContent = GRID_SIZE - 1 - i; mapCoordsY.appendChild(yEl);
            }
        }
        function updateUI() {
             const ro = new ResizeObserver(entries => {
                if (!entries.length || entries[0].contentRect.width === 0) return;
                const boxSize = entries[0].contentRect.width;
                const cellSize = boxSize / GRID_SIZE;
                mapContainer.style.setProperty('--cell-size', `${cellSize}px`);
                playerEl.style.transform = `translate(${state.playerPos.x * cellSize}px, ${(GRID_SIZE - 1 - state.playerPos.y) * cellSize}px)`;
                targetEl.style.setProperty('--tw-translate', `translate(${state.targetPos.x * cellSize}px, ${(GRID_SIZE - 1 - state.targetPos.y) * cellSize}px)`);
                renderMapItems(cellSize);
            });
            ro.observe(mapGrid);
        }
        function renderMapItems(cellSize) {
            mapItemsContainer.innerHTML = '';
            const gridCells = mapGrid.children;
            for (const cell of gridCells) { cell.classList.remove('passable'); }
            for (const cell of gridCells) {
                cell.style.backgroundColor = ''; // Reset background color
            }

            const occupiedPositions = new Set();
            occupiedPositions.add(`${state.playerPos.x},${state.playerPos.y}`);
            occupiedPositions.add(`${state.targetPos.x},${state.targetPos.y}`);

            if (state.currentStageGem && !state.currentStageGem.collected) {
                const gem = state.currentStageGem;
                occupiedPositions.add(`${gem.x},${gem.y}`);
                const gemEl = document.createElement('div'); gemEl.className = 'map-item'; gemEl.id = `gem-${gem.id}`;
                gemEl.style.transform = `translate(${gem.x * cellSize}px, ${(GRID_SIZE - 1 - gem.y) * cellSize}px)`;
                gemEl.innerHTML = `<div class="w-full h-full text-${gem.color} animate-pulse">${gem.svg}</div>`;
                mapItemsContainer.appendChild(gemEl);
            }
            state.mapItems.forEach(item => {
                occupiedPositions.add(`${item.x},${item.y}`);
                const itemEl = document.createElement('div'); itemEl.className = 'map-item'; itemEl.id = item.id;
                itemEl.style.transform = `translate(${item.x * cellSize}px, ${(GRID_SIZE - 1 - item.y) * cellSize}px)`;
                if (item.type === 'pouch') itemEl.innerHTML = `<svg class="w-3/4 h-3/4 text-purple-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M5 21v-4M3 19h4m14-14v4m-2-2h4m-2 14v-4m-2 2h4M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                else if (item.type === 'recycler') itemEl.innerHTML = `<svg class="w-3/4 h-3/4 text-green-300 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L9 15M20 4l-5 5"></path></svg>`;
                else if (item.type === 'vector') {
                     const colorInfo = getVectorColorInfo(item.vector.x, item.vector.y);
                     const angle = -Math.atan2(item.vector.y, item.vector.x) * (180 / Math.PI);
                     itemEl.innerHTML = `<div class="w-full h-full rounded-md flex items-center justify-center" style="${colorInfo.bg} border: 2px solid; ${colorInfo.border}"><svg class="w-3/4 h-3/4 text-white" style="transform: rotate(${angle}deg);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></div>`;
                } else if (item.type === 'question_mark') {
                    itemEl.innerHTML = `<div class="w-3/4 h-3/4 text-blue-300 animate-pulse font-bold text-2xl flex items-center justify-center">?</div>`;
                }
                mapItemsContainer.appendChild(itemEl);
            });
            occupiedPositions.forEach(posStr => {
                const [x, y] = posStr.split(',').map(Number);
                const displayY = GRID_SIZE - 1 - y;
                const index = displayY * GRID_SIZE + x;
                if (gridCells[index]) gridCells[index].classList.add('passable'); // This will apply the correct CSS styles
            });
        }
        function updateGemCollectionUI(){gemCollectionContainer.innerHTML='';GEMS.forEach(e=>{const t=state.gemsCollected.has(e.id),o=document.createElement('div');o.className=`w-10 h-10 flex items-center justify-center ${t?`text-${e.color}`:'text-gray-600 gem-silhouette'}`;o.innerHTML=e.svg;gemCollectionContainer.appendChild(o)})}
        function updateInventoryUI() {
            const slotsToShow = Math.min(10, 4 + state.gemsCollected.size);
            inventorySlots.forEach((slot, index) => {
                if (index < slotsToShow) {
                    slot.classList.remove('hidden');
                } else {
                    slot.classList.add('hidden');
                }
            });
        }
        function updateHeartUI() {
            const heartContainer = document.getElementById('heart-container');
            heartContainer.innerHTML = '';
            for (let i = 0; i < state.maxHearts; i++) {
                const heartSVG = `<svg class="w-6 h-6 ${i < state.hearts ? 'text-red-500' : 'text-gray-600'}" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>`;
                heartContainer.innerHTML += heartSVG;
            }
            if (state.hearts <= 0) {
                resetStageBtn.disabled = true;
                resetStageBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                resetStageBtn.disabled = false;
                resetStageBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
        
        function getStageColorPalette(stage) {
            const colorCount = Math.min(40, 4 + Math.floor((stage - 1) / 10) * 4);
            const step = Math.floor(40 / colorCount);
            return Array.from({ length: colorCount }, (_, i) => COLOR_PALETTE[i * step]);
        }
        function getVectorColorInfo(vx, vy) {
            if (vx === 0 && vy === 0) {
                return { name: 'gray', bg: 'background-color: #4B5563;', border: 'border-color: #6B7280;' };
            }
            const angle = (Math.atan2(vy, vx) * 180 / Math.PI + 360) % 360;
            const index = Math.round(angle / 9) % 40;
            return COLOR_PALETTE[index];
        }
        
        function getResidueColorInfo(tier) {
            const colors = [{ bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-500' }, { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-500' }, { bg: 'bg-zinc-800', border: 'border-zinc-600', text: 'text-zinc-500' }, { bg: 'bg-neutral-800', border: 'border-neutral-600', text: 'text-neutral-500' }];
            return colors[Math.min(tier - 1, colors.length - 1)];
        }

        function createVectorItemHTML(vx, vy) {
             if (vx === 0 && vy === 0) {
                const colorInfo = getVectorColorInfo(0,0);
                return `<div class="item border-2 shadow-lg text-white" style="${colorInfo.bg} ${colorInfo.border}" data-item-type="vector" data-vx="0" data-vy="0"><svg class="w-2/5 h-2/5" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/></svg><span class="text-xs font-bold">(0,0)</span></div>`;
            }
            const angle = -Math.atan2(vy, vx) * (180 / Math.PI);
            const colorInfo = getVectorColorInfo(vx, vy);
            return `<div class="item border-2 shadow-lg text-white" style="${colorInfo.bg} ${colorInfo.border}" data-item-type="vector" data-vx="${vx}" data-vy="${vy}"><svg class="w-3/5 h-3/5" style="transform: rotate(${angle}deg);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg><span class="text-xs font-bold">(${vx},${vy})</span></div>`;
        }
        function createPouchItemHTML(c=10){return`<div class="item bg-main border-2 border-purple-400 pouch" data-item-type="pouch" data-count="${c}"><div class="absolute top-0 right-1 text-xs font-bold text-white bg-purple-600 rounded-full w-5 h-5 flex items-center justify-center shadow-md">${c}</div><svg class="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M5 21v-4M3 19h4m14-14v4m-2-2h4m-2 14v-4m-2 2h4M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="text-xs font-bold text-purple-200">소환진</span></div>`}
        function createResidueItemHTML(t){const{bg,border,text}=getResidueColorInfo(t);return`<div class="item ${bg} border-2 ${border} shadow-inner" data-item-type="residue" data-tier="${t}"><div class="absolute top-0 right-1 text-xs font-bold text-gray-300 bg-gray-700 rounded-full px-1.5 py-0.5 shadow-md">Lv.${t}</div><svg class="w-8 h-8 ${text}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span class="text-xs font-bold text-gray-400">잔여물</span></div>`}
        function createRecyclerItemHTML(t, c){ const count = c || (3 + randInt(3)); const color = REMOVER_COLORS[Math.min(t-1, REMOVER_COLORS.length - 1)]; return`<div class="item ${color.bg} border-2 ${color.border} shadow-lg" data-item-type="recycler" data-tier="${t}" data-count="${count}"><div class="absolute top-0 right-1 text-xs font-bold text-white bg-black/30 rounded-full px-1.5 py-0.5 shadow-md">x${count}</div><svg class="w-8 h-8 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M4 20L9 15M20 4l-5 5"></path></svg><span class="text-xs font-bold text-green-200">재활용기 Lv.${t}</span></div>`}
        function createScalarItemHTML(v){return`<div class="item bg-gray-100 border-2 border-gray-400 text-gray-800" data-item-type="scalar" data-value="${v}"><span class="text-2xl font-bold">${v}</span><span class="text-xs font-bold">스칼라</span></div>`}
        function createObstacleItemHTML(c,h){const e=btoa(unescape(encodeURIComponent(h)));return`<div class="item border-4 shadow-lg" style="${c.bg} ${c.border}" data-item-type="obstacle" data-color-name="${c.name}" data-hidden-item="${e}"><svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div>`}
        
        function attachItemListeners(item){if(!item||item.dataset.itemType==='obstacle')return;item.addEventListener('mousedown',handleInteractionStart);item.addEventListener('touchstart',handleInteractionStart,{passive:false});}
        
        let isDragging = false;
        let startPos = { x: 0, y: 0 };
        const DRAG_THRESHOLD = 10; // 10px
        
        function handleInteractionStart(e){
            const originalItem = e.currentTarget;
            // 이미 드래그 중인 경우, 호환성으로 인해 발생하는 중복 이벤트를 무시합니다.
            if (isDragging || state.dragged.originalItem) return;

            if(!originalItem) return;

            // 터치 이벤트가 시작되면, 호환성을 위해 발생하는 마우스 이벤트는 무시합니다.
            if (e.type === 'touchstart') e.preventDefault();

            isDragging = false;
            state.dragged.originalItem = originalItem;
            state.dragged.sourceSlot = originalItem.parentElement;
            const pos = e.touches ? e.touches[0] : e;
            startPos = { x: pos.clientX, y: pos.clientY };
            
            document.addEventListener('mousemove', handleInteractionMove, { passive: false });
            document.addEventListener('touchmove', handleInteractionMove, { passive: false });
            document.addEventListener('mouseup', handleInteractionEnd);
            document.addEventListener('touchend', handleInteractionEnd);
        }
        
        function startDrag() {
            if (!state.dragged.originalItem || isDragging) return;
            isDragging = true;

            const originalItem = state.dragged.originalItem;
            const ghostItem = originalItem.cloneNode(true);
            const rect = originalItem.getBoundingClientRect();
            ghostItem.classList.add('ghost-item');
            ghostItem.style.width = `${rect.width}px`;
            ghostItem.style.height = `${rect.height}px`;
            document.body.appendChild(ghostItem);
            state.dragged.element = ghostItem;

            originalItem.classList.add('dragging-source');
        }

        function handleInteractionMove(e) {
            if (!state.dragged.originalItem) return;
            e.preventDefault();
            const pos = e.touches ? e.touches[0] : e;
            
            if (!isDragging) {
                const dx = pos.clientX - startPos.x;
                const dy = pos.clientY - startPos.y;
                if (Math.sqrt(dx*dx + dy*dy) > DRAG_THRESHOLD) {
                    startDrag();
                }
            }

            if (isDragging && state.dragged.element) {
                state.dragged.element.style.left = `${pos.clientX}px`;
                state.dragged.element.style.top = `${pos.clientY}px`;

                // 유령 아이템을 잠시 숨기고 그 아래의 요소를 찾습니다.
                state.dragged.element.style.display = 'none';
                const elementBelow = document.elementFromPoint(pos.clientX, pos.clientY);
                state.dragged.element.style.display = '';

                allSlots.forEach(s => s.classList.remove('over'));
                const targetSlot = elementBelow?.closest('.slot');
                if(targetSlot) targetSlot.classList.add('over');
            }
        }

        function handleInteractionEnd(e) {
            // 이벤트 리스너를 즉시 제거하여 중복 호출을 방지합니다.
            document.removeEventListener('mousemove', handleInteractionMove);
            document.removeEventListener('touchmove', handleInteractionMove);
            document.removeEventListener('mouseup', handleInteractionEnd);
            document.removeEventListener('touchend', handleInteractionEnd);
            const wasDragging = isDragging;
            if (isDragging) {
                // 유령 아이템을 숨겨야 정확한 드롭 위치를 찾을 수 있습니다.
                if (state.dragged.element) state.dragged.element.style.display = 'none';

                const pos = e.changedTouches ? e.changedTouches[0] : e;
                const targetSlot = document.elementFromPoint(pos.clientX, pos.clientY)?.closest('.slot');
                if (targetSlot) {
                    handleDrop(targetSlot);
                }
            } else if (!wasDragging) { // Click logic
                const item = state.dragged.originalItem;
                if (item) {
                    const itemType = item.dataset.itemType;
                    if (itemType === 'vector') useVector(item, parseInt(item.dataset.vx), parseInt(item.dataset.vy));
                    else if (itemType === 'pouch') handlePouchClick({ currentTarget: item });
                }
            }
            
            if(state.dragged.element) document.body.removeChild(state.dragged.element);
            if(state.dragged.originalItem) state.dragged.originalItem.classList.remove('dragging-source');
            
            isDragging = false;
            allSlots.forEach(s => s.classList.remove('over'));
            state.dragged = { element: null, sourceSlot: null, originalItem: null };
            saveProgress();
        }

        
        function handlePouchClick(e) {
            const pouchEl = e.currentTarget;
            const pouchSlot = pouchEl.parentElement;
            if (!pouchSlot.classList.contains('board-slot')) {
                showMessage('소환진은 작업대 위에서만 사용할 수 있습니다.', 'error'); return;
            }
            let count = parseInt(pouchEl.dataset.count);
            if (count <= 0) return;
            const emptySlots = [...boardSlots].filter(slot => !slot.children.length);
            if (emptySlots.length === 0) {
                showMessage('벡터를 소환할 공간이 없습니다.', 'error'); return;
            }
            const targetSlot = emptySlots[randInt(emptySlots.length)];
            count--; pouchEl.dataset.count = count; pouchEl.querySelector('.absolute').textContent = count;
            if (count === 0) {
                pouchSlot.innerHTML = '';
                showMessage('소환진의 에너지가 모두 소진되었습니다.', 'error');
            }
             const spawnableItems = [
                ...Array(21).fill(BASE_VECTORS[0]), ...Array(21).fill(BASE_VECTORS[1]),
                ...Array(21).fill(BASE_VECTORS[2]), ...Array(21).fill(BASE_VECTORS[3]),
                ...Array(8).fill('recycler'),
                ...Array(8).fill('scalar')
            ];
            const itemToSpawn = spawnableItems[randInt(spawnableItems.length)];
            let newItemHTML;
            if(itemToSpawn === 'recycler') { newItemHTML = createRecyclerItemHTML(1);
            } else if (itemToSpawn === 'scalar') { newItemHTML = createScalarItemHTML(-1);
            } else {
                newItemHTML = createVectorItemHTML(itemToSpawn.x, itemToSpawn.y);
            }

            const pouchRect = pouchSlot.getBoundingClientRect();
            const slotRect = targetSlot.getBoundingClientRect();
            const flyingItem = document.createElement('div'); flyingItem.innerHTML = newItemHTML; // flyingItem is a div wrapper
            flyingItem.style.cssText = `position:fixed; left:${pouchRect.left}px; top:${pouchRect.top}px; width:${pouchRect.width}px; height:${pouchRect.height}px; transition:all .4s cubic-bezier(.5,-.5,.5,1.5); z-index:1000;`;
            document.body.appendChild(flyingItem); flyingItem.getBoundingClientRect();
            flyingItem.style.transform = `translate(${slotRect.left - pouchRect.left}px, ${slotRect.top - pouchRect.top}px) scale(1)`;
            setTimeout(() => { 
                document.body.removeChild(flyingItem); 
                targetSlot.innerHTML = newItemHTML; 
                attachItemListeners(targetSlot.firstElementChild); 
                saveProgress();
            }, 400);
        }
        
        function useVector(element, vx, vy) {
            const dest = { x: state.playerPos.x + vx, y: state.playerPos.y + vy };
            if (state.currentStageGem && !state.currentStageGem.collected && dest.x === state.currentStageGem.x && dest.y === state.currentStageGem.y) {
                state.currentStageGem.collected = true; state.playerPos = dest; element.parentElement.innerHTML = '';
                showMessage('보석을 획득했습니다! 아공간이 1칸 확장됩니다.', 'success'); 
                state.gemsCollected.add(state.currentStageGem.id);
                updateInventoryUI();
                updateGemCollectionUI();
                saveProgress();
                updateUI(); 
                return;
            }
            if (dest.x === state.targetPos.x && dest.y === state.targetPos.y) {
                state.playerPos = dest; element.parentElement.innerHTML = '';
                if (state.currentStageGem && state.currentStageGem.collected) state.gemsCollected.add(state.currentStageGem.id);
                
                if (state.hearts < state.maxHearts) { state.hearts++; }
                
                if (state.gemsCollected.size === GEMS.length) { showSpecialEnding(); } 
                else { 
                    showMessage('이동 성공! 다음 목표가 설정됩니다.', 'success'); 
                    state.stageCount++;
                    setupLevel(); // Will save progress
                }
                return;
            }
            const targetItemIndex = state.mapItems.findIndex(item => item.x === dest.x && item.y === dest.y);
            if (targetItemIndex > -1) {
                const collectedItem = state.mapItems[targetItemIndex];
                const emptyInvSlot = [...inventorySlots].find(s => !s.classList.contains('hidden') && !s.children.length);
                if (!emptyInvSlot) { showMessage('아이템을 획득했지만 보관함이 가득 찼습니다!', 'error'); return; }
                state.playerPos = dest; element.parentElement.innerHTML = '';
                if (collectedItem.type === 'question_mark') {
                    const spawnableItems = [...BASE_VECTORS, 'recycler'];
                    const itemToSpawn = spawnableItems[randInt(spawnableItems.length)];
                    if(itemToSpawn === 'recycler') emptyInvSlot.innerHTML = createRecyclerItemHTML(1);
                    else emptyInvSlot.innerHTML = createVectorItemHTML(itemToSpawn.x, itemToSpawn.y);
                }
                else if (collectedItem.type === 'pouch') emptyInvSlot.innerHTML = createPouchItemHTML(collectedItem.count);
                else if (collectedItem.type === 'recycler') emptyInvSlot.innerHTML = createRecyclerItemHTML(1, collectedItem.count);
                else if (collectedItem.type === 'vector') emptyInvSlot.innerHTML = createVectorItemHTML(collectedItem.vector.x, collectedItem.vector.y);
                attachItemListeners(emptyInvSlot.firstElementChild);
                state.mapItems.splice(targetItemIndex, 1);
                showMessage('맵에서 아이템을 획득했습니다!', 'success'); 
                saveProgress();
                updateUI(); 
                return;
            }
            showMessage('벡터가 목표 지점과 일치하지 않습니다.', 'error');
        }

        function checkAndClearObstacles(mergedSlot) {
            const mergedItem = mergedSlot.firstElementChild;
            if (!mergedItem || mergedItem.dataset.itemType !== 'vector') return;
            const vx = parseInt(mergedItem.dataset.vx), vy = parseInt(mergedItem.dataset.vy);
            const mergedVectorColorName = (vx === 0 && vy === 0) ? 'any' : getVectorColorInfo(vx, vy).name;
            const mergedIndex = parseInt(mergedSlot.dataset.index);
            const adjacentIndices = [mergedIndex - BOARD_SIZE, mergedIndex + BOARD_SIZE, (mergedIndex % BOARD_SIZE !== 0) ? mergedIndex - 1 : -1, (mergedIndex % BOARD_SIZE !== BOARD_SIZE - 1) ? mergedIndex + 1 : -1,].filter(i => i >= 0 && i < 16);
            adjacentIndices.forEach(index => {
                const adjacentSlot = boardSlots[index]; if (!adjacentSlot) return;
                const obstacle = adjacentSlot.querySelector('[data-item-type="obstacle"]');
                if (obstacle && (obstacle.dataset.colorName === mergedVectorColorName || (state.stageCount >= 10 && mergedVectorColorName === 'any'))) {
                    const hiddenItemHTML = decodeURIComponent(escape(atob(obstacle.dataset.hiddenItem)));
                    adjacentSlot.innerHTML = hiddenItemHTML;
                    attachItemListeners(adjacentSlot.firstElementChild);
                    showMessage(`방해물이 제거되었습니다!`, 'success');
                }
            });
        }

        function handleDrop(targetSlot) { if (!targetSlot) return; const originalItem = state.dragged.originalItem; const sourceSlot = state.dragged.sourceSlot; if (!originalItem || !sourceSlot || targetSlot === sourceSlot) return; const targetItem = targetSlot.querySelector('.item');
            
            if (!targetItem) {
                targetSlot.appendChild(originalItem);
            } else {
                const sourceType = originalItem.dataset.itemType;
                const targetType = targetItem.dataset.itemType;
                
                if (sourceType === 'vector' && targetType === 'vector' && targetSlot.classList.contains('board-slot') && sourceSlot.classList.contains('board-slot')) {
                    const v1 = { x: parseInt(originalItem.dataset.vx), y: parseInt(originalItem.dataset.vy) };
                    const v2 = { x: parseInt(targetItem.dataset.vx), y: parseInt(targetItem.dataset.vy) };
                    const newV = { x: v1.x + v2.x, y: v1.y + v2.y };
                    
                    targetSlot.innerHTML = createVectorItemHTML(newV.x, newV.y);
                    attachItemListeners(targetSlot.firstElementChild);

                    if (newV.x === 0 && newV.y === 0) {
                        sourceSlot.innerHTML = '';
                    } else {
                        sourceSlot.innerHTML = createResidueItemHTML(1);
                        attachItemListeners(sourceSlot.firstElementChild);
                    }
                    checkAndClearObstacles(targetSlot);

                } else if (sourceType === 'residue' && targetType === 'residue') {
                    const tier1 = parseInt(originalItem.dataset.tier);
                    const tier2 = parseInt(targetItem.dataset.tier);
                    if (tier1 === tier2) {
                        targetSlot.innerHTML = createResidueItemHTML(tier1 + 1);
                        attachItemListeners(targetSlot.firstElementChild);
                        sourceSlot.innerHTML = '';
                    }
                } else if (sourceType === 'recycler' && targetType === 'recycler') {
                    const tier1 = parseInt(originalItem.dataset.tier);
                    const tier2 = parseInt(targetItem.dataset.tier);
                    if (tier1 === tier2) {
                        const count1 = parseInt(originalItem.dataset.count);
                        const count2 = parseInt(targetItem.dataset.count);
                        targetSlot.innerHTML = createRecyclerItemHTML(tier1 + 1, Math.min(count1, count2));
                        attachItemListeners(targetSlot.firstElementChild);
                        sourceSlot.innerHTML = '';
                    }
                } else if (sourceType === 'recycler' && targetType === 'residue') {
                    const recyclerTier = parseInt(originalItem.dataset.tier);
                    const residueTier = parseInt(targetItem.dataset.tier);
                    if (recyclerTier >= residueTier) {
                        const recycler = originalItem;
                        let count = parseInt(recycler.dataset.count) - 1;

                        if (residueTier === 1) {
                            targetSlot.innerHTML = '';
                        } else {
                            const pouchesToSpawn = Math.pow(2, residueTier - 2);
                            targetSlot.innerHTML = createPouchItemHTML(pouchesToSpawn);
                            attachItemListeners(targetSlot.firstElementChild);
                        }

                        if (count > 0) {
                            sourceSlot.innerHTML = createRecyclerItemHTML(recyclerTier, count);
                            attachItemListeners(sourceSlot.firstElementChild);
                        } else {
                            sourceSlot.innerHTML = '';
                        }
                        showMessage(`Lv.${residueTier} 잔여물을 재활용했습니다.`, 'success');
                    }
                } else if (sourceType === 'scalar' && targetType === 'vector') {
                    const scalarValue = parseInt(originalItem.dataset.value);
                    const v = { x: parseInt(targetItem.dataset.vx), y: parseInt(targetItem.dataset.vy) };
                    const newV = { x: v.x * scalarValue, y: v.y * scalarValue };
                    targetSlot.innerHTML = createVectorItemHTML(newV.x, newV.y);
                    attachItemListeners(targetSlot.firstElementChild);
                    sourceSlot.innerHTML = '';
                } else if (sourceType === 'scalar' && targetType === 'scalar') {
                    const val1 = parseInt(originalItem.dataset.value);
                    const val2 = parseInt(targetItem.dataset.value);
                    if (val1 === -1 && val2 === -1) {
                        targetSlot.innerHTML = '';
                        sourceSlot.innerHTML = '';
                        showMessage('스칼라가 상쇄되었습니다.', 'success');
                    }
                }
            }
        }

        function showMessage(msg, type) { const box = document.getElementById('message-box'); box.textContent = msg; box.className = `message-box p-3 rounded-lg text-white font-bold shadow-lg show ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`; setTimeout(() => box.classList.remove('show'), 2000); }
        function randInt(max) { return Math.floor(Math.random() * max); }
        function showSpecialEnding() {
            const finalGemContainer = document.getElementById('final-gem-collection');
            finalGemContainer.innerHTML = '';
            GEMS.forEach(gem => {
                const gemEl = document.createElement('div');
                gemEl.className = `w-12 h-12 flex items-center justify-center text-${gem.color}`;
                gemEl.innerHTML = gem.svg;
                finalGemContainer.appendChild(gemEl);
            });
            endingPopup.classList.remove('invisible', 'opacity-0');
            endingPopup.querySelector('div').classList.add('scale-100');
        }
        function fullReset() {
            setCookie("vectorMergeState", "", -1);
            state.gemsCollected.clear();
            state.stageCount = 1;
            state.hearts = state.maxHearts;
            setupLevel();
        }
        restartBtn.addEventListener('click', () => {
            endingPopup.classList.add('invisible', 'opacity-0');
            endingPopup.querySelector('div').classList.remove('scale-100');
            fullReset();
        });
        resetStageBtn.addEventListener('click', () => {
            if (resetStageBtn.disabled) return;
            if (state.hearts > 0) {
                state.hearts--;
                updateHeartUI();
                showMessage('현재 맵을 초기화합니다.', 'success');
                setupLevel();
            } else {
                gameoverPopup.classList.remove('invisible', 'opacity-0');
                gameoverPopup.querySelector('div').classList.add('scale-100');
            }
        });
        cancelResetBtn.addEventListener('click', () => {
            gameoverPopup.classList.add('invisible', 'opacity-0');
            gameoverPopup.querySelector('div').classList.remove('scale-100');
        });
        confirmFullResetBtn.addEventListener('click', () => {
            gameoverPopup.classList.add('invisible', 'opacity-0');
            gameoverPopup.querySelector('div').classList.remove('scale-100');
            fullReset();
        });
        fullResetBtn.addEventListener('click', () => {
            confirmResetPopup.classList.remove('invisible', 'opacity-0');
        });
        cancelFullResetBtn.addEventListener('click', () => {
            confirmResetPopup.classList.add('invisible', 'opacity-0');
        });
        confirmFinalResetBtn.addEventListener('click', () => {
            confirmResetPopup.classList.add('invisible', 'opacity-0');
            fullReset();
        });


        function initLegends(){
            const removerLegendContainer = document.getElementById('remover-legend-colors');
            removerLegendContainer.innerHTML = '';
            REMOVER_COLORS.forEach((color, index) => {
                const colorEl = document.createElement('div');
                colorEl.className = `w-4 h-4 ${color.bg} ${color.border} rounded-sm flex items-center justify-center text-white text-[10px] font-bold shadow-inner`;
                colorEl.textContent = index + 1;
                removerLegendContainer.appendChild(colorEl);
                if (index < REMOVER_COLORS.length - 1) {
                    const arrowEl = document.createElement('span');
                    arrowEl.className = 'text-gray-500';
                    arrowEl.textContent = '→';
                    removerLegendContainer.appendChild(arrowEl);
                }
            });
        }
        
        mapGrid.style.setProperty('--grid-size', GRID_SIZE);
        mapGrid.innerHTML = Array(GRID_SIZE * GRID_SIZE).fill('<div class="grid-cell"></div>').join('');
        
        const themeToggle = document.getElementById('theme-toggle');
        const darkIcon = document.getElementById('theme-toggle-dark-icon');
        const lightIcon = document.getElementById('theme-toggle-light-icon');

        if (localStorage.getItem('theme') === 'light') {
            document.body.classList.add('light-mode');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            darkIcon.classList.toggle('hidden');
            lightIcon.classList.toggle('hidden');
            
            if (document.body.classList.contains('light-mode')) {
                localStorage.setItem('theme', 'light');
            } else {
                localStorage.removeItem('theme');
            }
        });
        
        helpBtn.addEventListener('click', () => { helpModal.classList.remove('hidden', 'invisible', 'opacity-0'); });
        closeHelpBtn.addEventListener('click', () => { helpModal.classList.add('hidden', 'invisible', 'opacity-0'); });
        helpModal.addEventListener('click', (e) => {
            if(e.target === helpModal) helpModal.classList.add('hidden', 'invisible', 'opacity-0');
        });

        function handleResize() {
            const workbenchPanel = document.getElementById('workbench-panel');
            const mapPanel = document.getElementById('map-panel');
            const desktopParent = document.getElementById('desktop-parent-container');
            const legendPanel = document.getElementById('legend-panel');
            const gemCollectionPanel = document.getElementById('gem-collection-panel');
            const resetBtn = document.getElementById('reset-stage-btn');

            if (window.innerWidth < 1024) { // lg breakpoint
                // Mobile: move workbench into map panel
                if (workbenchPanel.parentElement !== mapPanel) {
                    mapPanel.appendChild(workbenchPanel);
                }
                // Mobile: move legend and gem collection into workbench
                if (legendPanel.parentElement !== workbenchPanel) {
                    workbenchPanel.appendChild(legendPanel);
                    legendPanel.insertAdjacentElement('afterend', resetBtn); // Move reset button after legend
                    workbenchPanel.appendChild(gemCollectionPanel);
                }
                workbenchPanel.classList.remove('hidden');
                workbenchPanel.classList.add('flex');
            } else {
                // Desktop: move workbench back to its original parent
                if (workbenchPanel.parentElement !== desktopParent) {
                    desktopParent.appendChild(workbenchPanel);
                    // Desktop: move legend and gem collection back to map panel
                    mapPanel.appendChild(legendPanel);
                    workbenchPanel.appendChild(resetBtn); // Move reset button back to workbench
                    mapPanel.appendChild(gemCollectionPanel);
                }
                workbenchPanel.classList.remove('hidden'); // Ensure it's visible on desktop too
                workbenchPanel.classList.add('lg:flex');
            }
        }

        drawMapCoords();
        initLegends();
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        loadProgress();
        
    });