document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // =================================================================================
    // CONSTANTS & CONFIG
    // =================================================================================
    const C = {
        BOARD_W: 10,
        BOARD_H: 8,
        CELL_BASE: 40, 
        DRAG_THRESHOLD: 5,
        EPS: 1e-6,
    };

    const GEMS = {
        red_parallelogram: {
            label: '빨강 평행사변형', color: 'red', viewBox: '0 0 120 40',
            svgPath: 'M 40,0 L 120,0 L 80,40 L 0,40 Z',
            shape: [{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1}],
            cellShapes: {
                '1,0': 'SQUARE',
                '2,0': 'TRIANGLE_SW',
                '0,1': 'TRIANGLE_NE',
                '1,1': 'SQUARE'
            }
        },
        blue_rhombus: {
            label: '흰 마름모', color: 'white', viewBox: '0 0 80 80',
            svgPath: 'M 40,0 L 80,40 L 40,80 L 0,40 Z',
            shape: [{x:1,y:0},{x:0,y:1},{x:2,y:1},{x:1,y:2}],
            cellShapes: {
                '1,0': 'TRIANGLE_SE',
                '0,1': 'TRIANGLE_NE',
                '2,1': 'TRIANGLE_SW',
                '1,2': 'TRIANGLE_NW'
            }
        },
        yellow_triangle_2x2: {
            label: '노랑 직각삼각형', color: 'yellow', viewBox: '0 0 80 80',
            svgPath: 'M 0,0 L 80,0 L 0,80 Z',
            shape: [{x:0,y:0},{x:1,y:0},{x:0,y:1}],
            cellShapes: {
                '0,0': 'TRIANGLE_NW',
                '1,0': 'SQUARE',
                '0,1': 'SQUARE'
            }
        },
        white_isosceles_triangle: {
            label: '흰 이등변삼각형', color: 'white', viewBox: '0 0 160 80',
            svgPath: 'M 0,80 L 160,80 L 80,0 Z',
            shape: [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1}, {x:1,y:0},{x:2,y:0}],
            cellShapes: {
                '1,0': 'TRIANGLE_SE',
                '2,0': 'TRIANGLE_SW',
                '0,1': 'TRIANGLE_NE',
                '1,1': 'SQUARE',
                '2,1': 'SQUARE',
                '3,1': 'TRIANGLE_NW'
            }
        },
         white_isosceles_triangle_2: {
            label: '파랑 이등변삼각형', color: 'blue', viewBox: '0 0 160 80',
            svgPath: 'M 0,80 L 160,80 L 80,0 Z',
            shape: [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1}, {x:1,y:0},{x:2,y:0}],
            cellShapes: {
                '1,0': 'TRIANGLE_SE',
                '2,0': 'TRIANGLE_SW',
                '0,1': 'TRIANGLE_NE',
                '1,1': 'SQUARE',
                '2,1': 'SQUARE',
                '3,1': 'TRIANGLE_NW'
            }
        }
    };

    const INITIAL_PALETTE = ['red_parallelogram', 'blue_rhombus', 'yellow_triangle_2x2', 'white_isosceles_triangle', 'white_isosceles_triangle_2'];

    // =================================================================================
    // DOM ELEMENTS
    // =================================================================================
    const $ = sel => document.querySelector(sel);
    const $$ = sel => document.querySelectorAll(sel);

    const elements = {
        appContainer: $('#app-container'),
        playBoard: $('#play-board'),
        solutionBoard: $('#solution-board'),
        solutionContainer: $('#solution-board-container'),
        palette: $('#gem-palette'),
        laserCanvas: $('#laser-canvas'),
        questionCountSpan: $('#question-count'),
        historyLog: $('#history-log'),
        modal: $('#result-modal'),
        modalTitle: $('#modal-title'),
        modalText: $('#modal-text'),
        epTop: $('#ep-top'),
        epBottom: $('#ep-bottom'),
        epLeft: $('#ep-left'),
        epRight: $('#ep-right'),
    };
    const ctx = elements.laserCanvas.getContext('2d');

    // =================================================================================
    // GAME STATE
    // =================================================================================
    const state = {
        placedGems: {},
        solution: {},
        playGrid: null,
        solutionGrid: null,
        draggedGem: null,
        dragState: null,
        pressRotate: { gemId: null, prevRotation: 0 },
        gemCounter: 0,
        questionCount: 0,
    };

    // =================================================================================
    // INITIALIZATION
    // =================================================================================
    
    function init() {
        setupEventListeners();
        createPalette();
        createEntryPoints();
        startNewGame();
        handleResize();
    }

    function setupEventListeners() {
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        window.addEventListener('resize', handleResize);

        $('#reset-btn').addEventListener('click', startNewGame);
        $('#toggle-solution-btn').addEventListener('click', toggleSolution);
        $('#submit-answer-btn').addEventListener('click', checkAnswer);
        $('#modal-close-btn').addEventListener('click', closeModal);
    }

    function createPalette() {
        elements.palette.innerHTML = '';
        INITIAL_PALETTE.forEach(id => {
            const gem = createGemElement(id, { isPaletteItem: true });
            elements.palette.appendChild(gem);
        });
    }

    function createEntryPoints() {
        elements.epTop.innerHTML = '';
        elements.epBottom.innerHTML = '';
        elements.epLeft.innerHTML = '';
        elements.epRight.innerHTML = '';
        const topLabels = Array.from({length: C.BOARD_W}, (_, i) => i + 1);
        const bottomLabels = ['I','J','K','L','M','N','O','P','Q','R'];
        const leftLabels = Array.from({length: C.BOARD_H}, (_, i) => String.fromCharCode(65 + i));
        const rightLabels = Array.from({length: C.BOARD_H}, (_, i) => 11 + i);

        const createPoint = (side, index, label) => {
            const el = document.createElement('div');
            el.className = 'entry-point';
            el.textContent = label;
            el.addEventListener('click', () => fireLaserFrom(side, index, label));
            return el;
        };

        topLabels.forEach((l, i) => elements.epTop.appendChild(createPoint('top', i, l)));
        bottomLabels.forEach((l, i) => elements.epBottom.appendChild(createPoint('bottom', i, l)));
        leftLabels.forEach((l, i) => elements.epLeft.appendChild(createPoint('left', i, l)));
        rightLabels.forEach((l, i) => elements.epRight.appendChild(createPoint('right', i, l)));
    }

    function startNewGame() {
        Object.values(state.placedGems).forEach(g => document.getElementById(g.uniqueId)?.remove());
        state.placedGems = {};
        
        state.solution = generateRandomSolution();
        renderSolutionToBoard();
        
        updatePlayGrid();
        updateSolutionGrid();
        state.questionCount = 0;
        
        elements.solutionContainer.style.display = 'none';
        elements.historyLog.innerHTML = '';
        updateUI();
        clearBeam();
    }

    // =================================================================================
    // GEM & BOARD LOGIC
    // =================================================================================

    function createGemElement(id, { isPaletteItem = false } = {}) {
        const gemData = GEMS[id];
        const gem = document.createElement('div');
        const uniqueId = `${id}_${state.gemCounter++}`;
        gem.id = uniqueId;
        gem.className = 'gem';
        gem.dataset.id = id;
        gem.dataset.color = gemData.color;
        gem.dataset.rotation = '0';
        gem.dataset.flipped = 'false';
        
        const svg = createGemSVG(gemData);
        gem.appendChild(svg);

        if (isPaletteItem) {
            gem.style.position = 'relative';
            gem.style.transform = 'scale(0.7)';
            gem.dataset.isPaletteItem = 'true';
        }
        
        gem.addEventListener('pointerdown', onPointerDown);
        gem.addEventListener('dblclick', onGemDoubleClick);
        return gem;
    }

    function createGemSVG(data) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', data.viewBox);
        const { pxW, pxH } = sizeFromViewBox(data.viewBox);
        svg.style.width = `${pxW}px`;
        svg.style.height = `${pxH}px`;
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', data.svgPath);
        path.classList.add('gem-shape');
        svg.appendChild(path);
        return svg;
    }

    function generateRandomSolution() {
        let sol = {};
        let occupied = [];
        let success = false;
        let attemptLimit = 20; // Prevent infinite loops

        while(!success && attemptLimit > 0) {
            sol = {};
            occupied = Array(C.BOARD_H).fill(0).map(() => Array(C.BOARD_W).fill(false));
            let allPlaced = true;

            const palette = [...INITIAL_PALETTE];

            for(let i = 0; i < palette.length; i++) {
                const id = palette[i];
                let placed = false;
                let attempts = 0;
                while (attempts++ < 200 && !placed) {
                    const rot = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
                    const flip = Math.random() < 0.5;
                    const t = getTransformedGem(id, rot, flip);
                    
                    const shapeWidth = t.shape.length > 0 ? Math.max(...t.shape.map(p => p.x)) + 1 : 0;
                    const shapeHeight = t.shape.length > 0 ? Math.max(...t.shape.map(p => p.y)) + 1 : 0;
                    const maxX = C.BOARD_W - shapeWidth;
                    const maxY = C.BOARD_H - shapeHeight;

                    if (maxX < 0 || maxY < 0) continue;

                    const x = Math.floor(Math.random() * (maxX + 1));
                    const y = Math.floor(Math.random() * (maxY + 1));

                    if (t.shape.every(p => !occupied[y + p.y][x + p.x])) {
                        t.shape.forEach(p => occupied[y + p.y][x + p.x] = true);
                        sol[id + '_' + i] = { id, x, y, rotation: rot, flipped: flip };
                        placed = true;
                    }
                }
                if (!placed) {
                    allPlaced = false;
                    break; 
                }
            }
            if (allPlaced) {
                success = true;
            }
            attemptLimit--;
        }
        return sol;
    }

    // =================================================================================
    // EVENT HANDLERS (INPUT)
    // =================================================================================

    function onPointerDown(e) {
        if (e.button !== 0) return;
        const gem = e.target.closest('.gem');
        if (!gem) return;

        e.preventDefault();
        gem.setPointerCapture(e.pointerId);

        const isPaletteItem = gem.dataset.isPaletteItem === 'true';
        if (isPaletteItem) {
            const newGem = createGemElement(gem.dataset.id);
            elements.playBoard.appendChild(newGem);
            startDrag(e, newGem);
        } else {
            startDrag(e, gem);
        }
    }
    
    function onPointerMove(e) {
        if (!state.draggedGem) return;
        const { gem, dragState } = state.draggedGem;

        const dx = e.clientX - dragState.initialX;
        const dy = e.clientY - dragState.initialY;

        if (!dragState.isDragging && (Math.abs(dx) > C.DRAG_THRESHOLD || Math.abs(dy) > C.DRAG_THRESHOLD)) {
            dragState.isDragging = true;
            if (state.pressRotate.gemId === gem.id) {
                gem.dataset.rotation = String(state.pressRotate.prevRotation);
                applyTransform(gem);
                state.pressRotate = { gemId: null, prevRotation: 0 };
            }
        }

        if (dragState.isDragging) {
            gem.style.left = `${dragState.initialLeft + dx}px`;
            gem.style.top = `${dragState.initialTop + dy}px`;
        }
    }

    function onPointerUp(e) {
        if (!state.draggedGem) return;
        
        const { gem, dragState } = state.draggedGem;
        gem.releasePointerCapture(e.pointerId);
        gem.classList.remove('dragging');

        const wasDragging = dragState.isDragging;
        const wasPaletteClone = dragState.originPlacement === null;

        if (!wasDragging && !wasPaletteClone) {
            handleGemClick(gem);
        } else {
            handleGemDrop(gem, e.clientX, e.clientY);
        }
        
        state.draggedGem = null;
        state.pressRotate = { gemId: null, prevRotation: 0 };
    }

    function onGemDoubleClick(e) {
        const gem = e.target.closest('.gem');
        if (!gem || state.draggedGem || gem.dataset.isPaletteItem) return;
        
        e.preventDefault();
        const prev = gem.dataset.flipped === 'true';
        gem.dataset.flipped = String(!prev);
        applyTransform(gem);
        
        const snap = snapshotFromElement(gem);
        if (!canPlaceAt(snap.uniqueId, snap.id, snap.x, snap.y, snap.rotation, !prev)) {
            gem.dataset.flipped = String(prev);
            applyTransform(gem);
            shake(elements.playBoard);
        } else {
            if (state.placedGems[gem.id]) {
                state.placedGems[gem.id].flipped = !prev;
                updatePlayGrid();
            }
        }
    }
    
    function startDrag(e, gem) {
        gem.classList.add('dragging');

        const origin = gem.parentElement === elements.playBoard ? snapshotFromElement(gem) : null;
        if (origin) {
            delete state.placedGems[gem.id];
            updatePlayGrid();
        }

        const boardRect = elements.playBoard.getBoundingClientRect();
        
        if (!origin) {
            const svg = gem.querySelector('svg');
            const w = parseFloat(svg.style.width), h = parseFloat(svg.style.height);
            const newLeft = e.clientX - boardRect.left - w / 2;
            const newTop = e.clientY - boardRect.top - h / 2;
            gem.style.left = `${newLeft}px`;
            gem.style.top = `${newTop}px`;
        }
        
        state.draggedGem = {
            gem,
            dragState: {
                isDragging: false,
                initialX: e.clientX,
                initialY: e.clientY,
                initialLeft: gem.offsetLeft,
                initialTop: gem.offsetTop,
                originPlacement: origin,
            }
        };
    }

    function handleGemClick(gem) {
        const prev = parseInt(gem.dataset.rotation) || 0;
        const next = (prev + 90) % 360;
        gem.dataset.rotation = String(next);
        applyTransform(gem);

        const snap = snapshotFromElement(gem);
        if (!canPlaceAt(snap.uniqueId, snap.id, snap.x, snap.y, next, snap.flipped)) {
            gem.dataset.rotation = String(prev);
            applyTransform(gem);
            shake(elements.playBoard);
        } else {
            if (state.placedGems[gem.id]) {
                state.placedGems[gem.id].rotation = next;
                updatePlayGrid();
            }
        }
    }

    function handleGemDrop(gem, clientX, clientY) {
        const boardRect = elements.playBoard.getBoundingClientRect();
        const cell = getCellSize();
        const { originPlacement } = state.draggedGem.dragState;

        const isInside = clientX >= boardRect.left && clientX <= boardRect.right &&
                         clientY >= boardRect.top && clientY <= boardRect.bottom;

        if (isInside) {
            const gx = Math.round(gem.offsetLeft / cell);
            const gy = Math.round(gem.offsetTop / cell);
            const rot = parseInt(gem.dataset.rotation) || 0;
            const flip = gem.dataset.flipped === 'true';

            if (canPlaceAt(gem.id, gem.dataset.id, gx, gy, rot, flip)) {
                placeGem(gem, gx, gy, rot, flip);
                state.placedGems[gem.id] = { uniqueId: gem.id, id: gem.dataset.id, x: gx, y: gy, rotation: rot, flipped: flip };
                updatePlayGrid();
            } else {
                revertOrRemoveGem(gem, originPlacement);
                shake(elements.playBoard);
            }
        } else {
            revertOrRemoveGem(gem, originPlacement);
        }
    }

    function revertOrRemoveGem(gem, origin) {
        if (origin) {
            placeGem(gem, origin.x, origin.y, origin.rotation, origin.flipped);
            state.placedGems[gem.id] = { ...origin };
            updatePlayGrid();
        } else {
            gem.remove();
        }
    }

    // =================================================================================
    // GEM TRANSFORMATION & COLLISION
    // =================================================================================

    function canPlaceAt(uniqueId, id, x, y, rotation, flipped) {
        const t = getTransformedGem(id, rotation, flipped);
        for (const p of t.shape) {
            const gx = x + p.x, gy = y + p.y;
            if (gx < 0 || gx >= C.BOARD_W || gy < 0 || gy >= C.BOARD_H) return false;
        }
        const occ = buildOccupancy(uniqueId);
        for (const p of t.shape) {
            if (occ[y + p.y][x + p.x]) return false;
        }
        return true;
    }

    function buildOccupancy(excludeId = null) {
        const grid = Array(C.BOARD_H).fill(0).map(() => Array(C.BOARD_W).fill(false));
        Object.values(state.placedGems).forEach(g => {
            if (excludeId && g.uniqueId === excludeId) return;
            const t = getTransformedGem(g.id, g.rotation, g.flipped);
            for (const p of t.shape) {
                const x = g.x + p.x, y = g.y + p.y;
                if (x >= 0 && x < C.BOARD_W && y >= 0 && y < C.BOARD_H) grid[y][x] = true;
            }
        });
        return grid;
    }

    function getTransformedGem(id, rotation, flipped) {
        const src = GEMS[id];
        let shape = JSON.parse(JSON.stringify(src.shape));
        let cellShapes = JSON.parse(JSON.stringify(src.cellShapes));
        
        let w = shape.length > 0 ? Math.max(...shape.map(p => p.x)) : -1;
        let h = shape.length > 0 ? Math.max(...shape.map(p => p.y)) : -1;

        if (flipped) {
            shape.forEach(p => p.x = w - p.x);
            cellShapes = xformCellShapes(cellShapes, (x, y) => ({ x: w - x, y }), 'H');
        }

        const k = ((rotation / 90) | 0) % 4;
        for (let i = 0; i < k; i++) {
            shape.forEach(p => { const tx = p.x; p.x = h - p.y; p.y = tx; });
            cellShapes = xformCellShapes(cellShapes, (x, y) => ({ x: h - y, y: x }), 'R');
            [w, h] = [h, w];
        }

        const minX = shape.length > 0 ? Math.min(...shape.map(p => p.x)) : 0;
        const minY = shape.length > 0 ? Math.min(...shape.map(p => p.y)) : 0;
        shape.forEach(p => { p.x -= minX; p.y -= minY; });
        cellShapes = remapCellShapeKeysOffset(cellShapes, -minX, -minY);
        
        return { shape, cellShapes };
    }

    function xformCellShapes(cellShapes, mapXY, transformType) {
        const out = {};
        const transformRule = {
            'H': { 'SQUARE': 'SQUARE', 'TRIANGLE_NW': 'TRIANGLE_NE', 'TRIANGLE_NE': 'TRIANGLE_NW', 'TRIANGLE_SW': 'TRIANGLE_SE', 'TRIANGLE_SE': 'TRIANGLE_SW' },
            'R': { 'SQUARE': 'SQUARE', 'TRIANGLE_NW': 'TRIANGLE_NE', 'TRIANGLE_NE': 'TRIANGLE_SE', 'TRIANGLE_SE': 'TRIANGLE_SW', 'TRIANGLE_SW': 'TRIANGLE_NW' }
        };
        Object.entries(cellShapes).forEach(([k, v]) => {
            const [x, y] = k.split(',').map(Number);
            const { x: nx, y: ny } = mapXY(x, y);
            out[`${nx},${ny}`] = transformRule[transformType][v];
        });
        return out;
    }

    function remapCellShapeKeysOffset(cellShapes, dx, dy) {
        const out = {};
        Object.entries(cellShapes).forEach(([k, v]) => {
            const [x, y] = k.split(',').map(Number);
            out[`${x + dx},${y + dy}`] = v;
        });
        return out;
    }
    
    // =================================================================================
    // LASER LOGIC
    // =================================================================================
    
    function fireLaserFrom(side, index, startLabel) {
        state.questionCount++;
        updateUI();
        clearBeam();

        const grid = state.solutionGrid;
        const board = elements.playBoard; 
        
        let laser = {};
        switch (side) {
            case 'top':    laser = { pos: { x: index + 0.5, y: -C.EPS }, dir: { dx: 0, dy: 1 } }; break;
            case 'bottom': laser = { pos: { x: index + 0.5, y: C.BOARD_H + C.EPS }, dir: { dx: 0, dy: -1 } }; break;
            case 'left':   laser = { pos: { x: -C.EPS, y: index + 0.5 }, dir: { dx: 1, dy: 0 } }; break;
            case 'right':  laser = { pos: { x: C.BOARD_W + C.EPS, y: index + 0.5 }, dir: { dx: -1, dy: 0 } }; break;
        }

        const segments = [];
        let currentPath = [laser.pos];
        const hitColors = new Set();
        let safety = 0;

        while (safety++ < 400) {
            const step = nextCrossing(laser.pos, laser.dir);
            const { hitPos, kind, cx, cy, entryDir } = step;
            
            if (kind === 'exit') {
                currentPath.push(hitPos);
                logHistory(startLabel, hitPos, hitColors);
                break;
            }

            const cell = grid[cy][cx];
            const reflection = cell ? getReflection(cell.cellShape, entryDir) : null;
            
            const isDiagonal = reflection && reflection.type === 'DIAGONAL';

            if (isDiagonal) {
                const cellCenter = { x: cx + 0.5, y: cy + 0.5 };
                currentPath.push(cellCenter);
            } else {
                currentPath.push(hitPos);
            }
            
            if (cell && cell.color && !hitColors.has(cell.color)) {
                hitColors.add(cell.color);
                segments.push({ path: [...currentPath], color: getMixedColor(hitColors).hex });
                currentPath = isDiagonal ? [{...cellCenter}] : [{...hitPos}];
            }

            if (reflection) {
                laser.dir = reflection.newDir;
                laser.pos = isDiagonal 
                    ? { x: cx + 0.5 + laser.dir.dx * C.EPS, y: cy + 0.5 + laser.dir.dy * C.EPS }
                    : { x: hitPos.x + laser.dir.dx * C.EPS, y: hitPos.y + laser.dir.dy * C.EPS };
            } else {
                laser.pos = { ...hitPos };
            }
        }
        if (currentPath.length > 1) {
            segments.push({ path: [...currentPath], color: getMixedColor(hitColors).hex });
        }
        drawBeamSegments(segments, board);
    }

    function nextCrossing(pos, dir) {
        let tX = Infinity, tY = Infinity;
        if (Math.abs(dir.dx) > C.EPS) {
            const nextGX = dir.dx > 0 ? Math.floor(pos.x + C.EPS) + 1 : Math.ceil(pos.x - C.EPS) - 1;
            tX = (nextGX - pos.x) / dir.dx;
        }
        if (Math.abs(dir.dy) > C.EPS) {
            const nextGY = dir.dy > 0 ? Math.floor(pos.y + C.EPS) + 1 : Math.ceil(pos.y - C.EPS) - 1;
            tY = (nextGY - pos.y) / dir.dy;
        }
        
        const t = Math.min(tX, tY) + C.EPS;
        const hitPos = { x: pos.x + dir.dx * t, y: pos.y + dir.dy * t };
        
        let cx, cy, entryDir, kind = 'cell';

        if (Math.abs(tX - (t - C.EPS)) < C.EPS) {
            entryDir = dir.dx > 0 ? 'W' : 'E';
            cx = dir.dx > 0 ? Math.floor(hitPos.x) : Math.ceil(hitPos.x) - 1;
            cy = Math.floor(hitPos.y);
        } else {
            entryDir = dir.dy > 0 ? 'N' : 'S';
            cx = Math.floor(hitPos.x);
            cy = dir.dy > 0 ? Math.floor(hitPos.y) : Math.ceil(hitPos.y) - 1;
        }

        if (cx < 0 || cx >= C.BOARD_W || cy < 0 || cy >= C.BOARD_H) {
            kind = 'exit';
        }
        return { hitPos, kind, cx, cy, entryDir };
    }

    function getReflection(cellShape, entryDir) {
    // Table-driven reflection rules:
    // - SQUARE: 180° reflection
    // - TRIANGLE_*: hypotenuse => diagonal reflection, right-angle sides => 180°
    const reflect180 = (d) => ({ type: 'STRAIGHT', newDir: { dx: -d.dx, dy: -d.dy } });
    const diag = (dx, dy) => ({ type: 'DIAGONAL', newDir: { dx, dy } });

    const rules = {
        'SQUARE': {
            'N': (d)=>reflect180(d),
            'S': (d)=>reflect180(d),
            'E': (d)=>reflect180(d),
            'W': (d)=>reflect180(d),
        },
        // right angle at NW: hypotenuse goes ↘
        'TRIANGLE_NW': {
            'N': (d)=>reflect180(d),
            'W': (d)=>reflect180(d),
            'S': (_)=>diag(1, 0),  // -> E
            'E': (_)=>diag(0, 1),  // -> S
        },
        // right angle at NE: hypotenuse goes ↙
        'TRIANGLE_NE': {
            'N': (d)=>reflect180(d),
            'E': (d)=>reflect180(d),
            'S': (_)=>diag(-1, 0), // -> W
            'W': (_)=>diag(0, 1),  // -> S
        },
        // right angle at SW: hypotenuse goes ↗
        'TRIANGLE_SW': {
            'S': (d)=>reflect180(d),
            'W': (d)=>reflect180(d),
            'N': (_)=>diag(1, 0),  // -> E
            'E': (_)=>diag(0, -1), // -> N
        },
        // right angle at SE: hypotenuse goes ↖
        'TRIANGLE_SE': {
            'S': (d)=>reflect180(d),
            'E': (d)=>reflect180(d),
            'N': (_)=>diag(-1, 0), // -> W
            'W': (_)=>diag(0, -1), // -> N
        }
    };

    const inDir = { dx: entryDir==='E'? -1 : entryDir==='W'? 1 : 0, dy: entryDir==='S'? -1 : entryDir==='N'? 1 : 0 };
    const fn = rules[cellShape] && rules[cellShape][entryDir];
    if (fn) return fn(inDir);
    return null;
}

    function getMixedColor(set) {
        const CMap = {
            clear:  { name: '투명', hex: '#00ffff' },
            red:    { name: '빨강', hex: '#e74c3c' },
            yellow: { name: '노랑', hex: '#f1c40f' },
            blue:   { name: '파랑', hex: '#3498db' },
            white:  { name: '흰색', hex: '#ecf0f1' },
            orange: { name: '주홍색', hex: '#e67e22' },
            purple: { name: '보라색', hex: '#8e44ad' },
            green:  { name: '녹색', hex: '#2ecc71' },
            pink:   { name: '분홍색', hex: '#ff86c3' },
            lemon:  { name: '레몬색', hex: '#f9e79f' },
            sky:    { name: '하늘색', hex: '#87ceeb' },
            black:  { name: '검은색', hex: '#2c3e50' },
            gray:   { name: '회색', hex: '#95a5a6' }
        };
        if (!set || set.size === 0) return CMap.clear;

        const has = c => set.has(c);
        const r = has('red'), y = has('yellow'), b = has('blue'), w = has('white');

        if (r && y && b && w) return CMap.gray;
        if (r && y && b) return CMap.black;
        
        if (r && y && w) return { name: '연주황', hex: '#ffc49a' };
        if (r && b && w) return { name: '연보라', hex: '#c7a0e8' };
        if (y && b && w) return { name: '연두', hex: '#b6f2b6' };

        if (r && y) return CMap.orange;
        if (r && b) return CMap.purple;
        if (y && b) return CMap.green;
        
        if (r && w) return CMap.pink;
        if (y && w) return CMap.lemon;
        if (b && w) return CMap.sky;

        if (r) return CMap.red;
        if (y) return CMap.yellow;
        if (b) return CMap.blue;
        if (w) return CMap.white;

        return CMap.clear;
    }

    // =================================================================================
    // GAME LOGIC & STATE UPDATES
    // =================================================================================

    function updatePlayGrid() {
        state.playGrid = buildGridFromPlaced();
    }

    function updateSolutionGrid() {
        state.solutionGrid = buildGridFromSolution();
    }

    function buildGridFromPlaced() {
    const grid = Array(C.BOARD_H).fill(0).map(() => Array(C.BOARD_W).fill(null));
    Object.values(state.placedGems).forEach(g => {
        const t = getTransformedGem(g.id, g.rotation, g.flipped);
        t.shape.forEach(p => {
            const x = g.x + p.x, y = g.y + p.y;
            if (x < 0 || x >= C.BOARD_W || y < 0 || y >= C.BOARD_H) return;
            const key = `${p.x},${p.y}`;
            grid[y][x] = {
                color: GEMS[g.id].color,
                cellShape: t.cellShapes[key] || null,
                gemType: g.id,
                uniqueId: g.uniqueId
            };
        });
    });
    return grid;
}
    
    function buildGridFromSolution() {
    const grid = Array(C.BOARD_H).fill(0).map(() => Array(C.BOARD_W).fill(null));
    Object.entries(state.solution).forEach(([uniqueId, g]) => {
        const t = getTransformedGem(g.id, g.rotation, g.flipped);
        t.shape.forEach(p => {
            const x = g.x + p.x, y = g.y + p.y;
            if (x < 0 || x >= C.BOARD_W || y < 0 || y >= C.BOARD_H) return;
            const key = `${p.x},${p.y}`;
            grid[y][x] = {
                color: GEMS[g.id].color,
                cellShape: t.cellShapes[key] || null,
                gemType: g.id,
                uniqueId
            };
        });
    });
    return grid;
}
    
    function checkAnswer() {
        const placedArr = Object.values(state.placedGems);
        const solArr = Object.values(state.solution);

        if (placedArr.length !== solArr.length) {
            showModal('실패', `보석의 개수가 맞지 않습니다. (정답: ${solArr.length}개, 현재: ${placedArr.length}개)`);
            return;
        }

        const placedCounts = placedArr.reduce((acc, p) => ({ ...acc, [p.id]: (acc[p.id] || 0) + 1 }), {});
        const solCounts = solArr.reduce((acc, s) => ({ ...acc, [s.id]: (acc[s.id] || 0) + 1 }), {});

        for (const id in solCounts) {
            if (placedCounts[id] !== solCounts[id]) {
                showModal('실패', `${GEMS[id].label}의 개수가 맞지 않습니다.`);
                return;
            }
        }

        const solCopy = [...solArr];
        for (const p of placedArr) {
            const matchIndex = solCopy.findIndex(s => 
                s.id === p.id && s.x === p.x && s.y === p.y && s.rotation === p.rotation && s.flipped === p.flipped
            );
            if (matchIndex > -1) {
                solCopy.splice(matchIndex, 1);
            } else {
                showModal('실패', '일치하지 않는 보석이 있습니다. 위치, 회전, 또는 뒤집기 상태를 확인하세요.');
                return;
            }
        }

        if (solCopy.length === 0) {
            showModal('성공!', `축하합니다! ${state.questionCount}번의 질문으로 정답을 맞혔습니다!`);
        } else {
             showModal('오류', '알 수 없는 오류가 발생했습니다.');
        }
    }
    
    // =================================================================================
    // UI & RENDERING
    // =================================================================================

    function updateUI() {
        elements.questionCountSpan.textContent = state.questionCount;
    }
    
    function renderSolutionToBoard() {
        elements.solutionBoard.innerHTML = '';
        Object.values(state.solution).forEach(g => {
            const el = createGemElement(g.id);
            placeGem(el, g.x, g.y, g.rotation, g.flipped);
            elements.solutionBoard.appendChild(el);
        });
    }

    function placeGem(gem, gx, gy, rot, flip) {
        const cell = getCellSize();
        gem.style.left = `${gx * cell}px`;
        gem.style.top = `${gy * cell}px`;
        gem.dataset.rotation = String(rot);
        gem.dataset.flipped = String(!!flip);
        applyTransform(gem);
    }

    function applyTransform(gem) {
        const rot = parseInt(gem.dataset.rotation) || 0;
        const scaleX = gem.dataset.flipped === 'true' ? -1 : 1;
        const svg = gem.querySelector('svg');
        const w = parseFloat(svg.style.width), h = parseFloat(svg.style.height);
        gem.style.transformOrigin = `${w / 2}px ${h / 2}px`;
        gem.style.transform = `rotate(${rot}deg) scaleX(${scaleX})`;
    }
    
    function drawBeamSegments(segments, board) {
        const cell = getCellSize();
        const rect = board.getBoundingClientRect();
        const toScreen = p => ({ x: rect.left + p.x * cell, y: rect.top + p.y * cell });
        
        segments.forEach(seg => {
            const pts = seg.path.map(toScreen);
            for (let i = 1; i < pts.length; i++) {
                drawLine(pts[i - 1], pts[i], seg.color);
            }
        });
        setTimeout(clearBeam, 2000);
    }

    function drawLine(p1, p2, color) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.stroke();
    }

    function clearBeam() {
        ctx.clearRect(0, 0, elements.laserCanvas.width, elements.laserCanvas.height);
    }
    
    function shake(el) {
        el.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(0)' }
        ], { duration: 200 });
    }
    
    function logHistory(startLabel, endPos, colors) {
        const exitLabel = getExitLabel(endPos);
        const mixedColor = getMixedColor(colors);

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = mixedColor.hex;
        
        const text = document.createElement('span');
        text.textContent = `${startLabel} ➞ ${exitLabel} (${mixedColor.name})`;

        logEntry.appendChild(swatch);
        logEntry.appendChild(text);
        elements.historyLog.prepend(logEntry);
    }

    function getExitLabel(pos) {
        const {x, y} = pos;
        const ix = Math.round(x), iy = Math.round(y);

        if (iy <= 0) return `${ix}`;
        if (iy >= C.BOARD_H) return ['I','J','K','L','M','N','O','P','Q','R'][ix - 1];
        if (ix <= 0) return `${String.fromCharCode(65 + iy - 1)}`;
        if (ix >= C.BOARD_W) return `${11 + iy - 1}`;
        return '?';
    }

    function toggleSolution() {
        const isVisible = elements.solutionContainer.style.display === 'block';
        elements.solutionContainer.style.display = isVisible ? 'none' : 'block';
    }

    function showModal(title, text) {
        elements.modalTitle.textContent = title;
        elements.modalText.textContent = text;
        elements.modal.style.display = 'flex';
    }

    function closeModal() {
        elements.modal.style.display = 'none';
    }
    
    // =================================================================================
    // HELPERS & RESIZE
    // =================================================================================

    function snapshotFromElement(gem) {
        const cell = getCellSize();
        return {
            uniqueId: gem.id,
            id: gem.dataset.id,
            x: Math.round(gem.offsetLeft / cell),
            y: Math.round(gem.offsetTop / cell),
            rotation: parseInt(gem.dataset.rotation) || 0,
            flipped: gem.dataset.flipped === 'true'
        };
    }

    function getCellSize() {
        return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size') || '40', 10);
    }
    
    function sizeFromViewBox(vb) {
        const [, , w, h] = vb.split(' ').map(Number);
        const unit = getCellSize() / C.CELL_BASE;
        return { pxW: w * unit, pxH: h * unit };
    }

    function handleResize() {
        const newCellSize = window.innerWidth < 1000 ? 30 : 40;
        document.documentElement.style.setProperty('--cell-size', `${newCellSize}px`);

        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (elements.laserCanvas.width !== w * dpr || elements.laserCanvas.height !== h * dpr) {
            elements.laserCanvas.width = w * dpr;
            elements.laserCanvas.height = h * dpr;
            ctx.scale(dpr, dpr);
        }
        
        $$('.gem').forEach(gem => {
            const gemData = GEMS[gem.dataset.id];
            if(!gemData) return;
            const svg = gem.querySelector('svg');
            const { pxW, pxH } = sizeFromViewBox(gemData.viewBox);
            svg.style.width = `${pxW}px`;
            svg.style.height = `${pxH}px`;
            applyTransform(gem);
        });
        
        Object.values(state.placedGems).forEach(g => {
            const el = document.getElementById(g.uniqueId);
            if (el) placeGem(el, g.x, g.y, g.rotation, g.flipped);
        });
        renderSolutionToBoard();
        clearBeam();
    }

    // =================================================================================
    // START THE GAME
    // =================================================================================
    init();
});




// ================================================================
// EXPORT HELPERS (precise shape/cell info per gem for debugging/API)
// ================================================================
window.getBoardSnapshot = function(kind = 'solution') {
    const src = kind === 'play' ? state.placedGems : state.solution;
    const result = [];
    Object.entries(src).forEach(([key, g]) => {
        const uniqueId = g.uniqueId || key;
        const t = getTransformedGem(g.id, g.rotation, g.flipped);
        const cells = t.shape.map(p => ({
            x: g.x + p.x,
            y: g.y + p.y,
            cellShape: t.cellShapes[`${p.x},${p.y}`] || null
        }));
        result.push({
            uniqueId,
            gemType: g.id,
            color: GEMS[g.id].color,
            x: g.x, y: g.y,
            rotation: g.rotation,
            flipped: g.flipped,
            cells
        });
    });
    return result;
};
