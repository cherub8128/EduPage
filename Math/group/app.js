document.addEventListener('DOMContentLoaded', () => {
    const groupSelect = document.getElementById('group-select');
    const generatorSelect = document.getElementById('generator-select');
    const startElementSelect = document.getElementById('start-element');
    const endElementSelect = document.getElementById('end-element');
    const findPathBtn = document.getElementById('find-path-btn');
    const pathOutput = document.querySelector('#path-output p');
    const cayleyTableWrapper = document.getElementById('cayley-table-wrapper');
    const tableFilterInput = document.getElementById('table-filter');

    let currentGroupData = null;

    let resizeObserver;

    // 초기화 함수
    async function init() {
        try {
            // data/index.json에서 사용 가능한 그룹 목록을 동적으로 불러오기
            const response = await fetch('data/index.json');
            if (!response.ok) throw new Error('Failed to load group index.');
            const availableGroups = await response.json();

            // 그룹 선택 드롭다운 채우기
            availableGroups.forEach(groupFile => {
                const option = document.createElement('option');
                option.value = groupFile;
                const groupName = groupFile.replace(/_cayley_table\.json|_standard/g, '');
                option.textContent = groupName; // KaTeX 렌더링 대신 텍스트로 표시
                groupSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Initialization failed:", error);
            alert("애플리케이션 초기화에 실패했습니다. 그룹 목록을 불러올 수 없습니다.");
            return;
        }

        // 이벤트 리스너 등록
        groupSelect.addEventListener('change', () => loadGroup(groupSelect.value));
        generatorSelect.addEventListener('change', updateGraph);
        findPathBtn.addEventListener('click', findAndDisplayShortestPath);
        tableFilterInput.addEventListener('input', filterCayleyTable);

        // 첫 번째 그룹 로드
        if (groupSelect.options.length > 0) {
            await loadGroup(groupSelect.value);
        }

        // ResizeObserver로 #table-container 크기 변경 감지
        const tableContainer = document.getElementById('table-container');
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(adjustHeaderWidth);
            resizeObserver.observe(tableContainer);
        }
    }

    // 그룹 데이터 로드 및 UI 업데이트
    async function loadGroup(fileName) {
        try {
            const response = await fetch(`data/${fileName}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${fileName}`);
            }
            currentGroupData = await response.json();

            // UI 요소들 업데이트
            updateElementDropdowns();
            updateGeneratorDropdown();
            renderCayleyTable();
            updateGraph();
            pathOutput.textContent = '최단 경로: ';

        } catch (error) {
            console.error('Error loading group data:', error);
            alert('그룹 데이터를 불러오는 데 실패했습니다.');
        }
    }

    // 원소 드롭다운 업데이트
    function updateElementDropdowns() {
        const { elements } = currentGroupData;
        [startElementSelect, endElementSelect].forEach(select => {
            select.innerHTML = '';
            elements.forEach(el => {
                const option = document.createElement('option');
                option.value = el; // 값은 원본 문자열 유지
                // KaTeX 렌더링 대신 텍스트로 표시
                option.textContent = el;
                select.appendChild(option);
            });
        });
    }

    // 생성원 드롭다운 업데이트
    function updateGeneratorDropdown() {
        const { minimal_generators } = currentGroupData;
        generatorSelect.innerHTML = '';
        if (minimal_generators && minimal_generators.length > 0) {
            minimal_generators.forEach((genSet, index) => {
                const option = document.createElement('option');
                option.value = index;
                // KaTeX 렌더링 대신 텍스트로 표시
                option.textContent = `Set ${index + 1}: {${genSet.join(', ')}}`;
                generatorSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.textContent = '사용 가능한 생성원 없음';
            generatorSelect.appendChild(option);
        }
    }

    // 케일리 테이블 렌더링
    function renderCayleyTable() {
        const { elements, table: tableData } = currentGroupData;
        cayleyTableWrapper.innerHTML = ''; // 기존 테이블 초기화

        // --- 테이블 컨테이너 및 통합 테이블 생성 ---
        const dataTableContainer = document.createElement('div');
        dataTableContainer.className = 'cayley-data-table-container';
        const dataTable = document.createElement('table');
        dataTable.className = 'cayley-data-table';

        // --- 헤더(thead) 생성 ---
        const thead = dataTable.createTHead();
        const headerRow = thead.insertRow();
        const cornerCell = document.createElement('th');
        cornerCell.innerHTML = '<span>•</span>';
        headerRow.appendChild(cornerCell);
        elements.forEach(el => {
            const th = document.createElement('th');
            katex.render(el, th, { throwOnError: false, displayMode: true });
            headerRow.appendChild(th);
        });

        // --- 데이터 본문(tbody) 생성 ---
        const dataTbody = dataTable.createTBody();
        tableData.forEach((rowData, i) => {
            const row = dataTbody.insertRow();
            const th = document.createElement('th');
            katex.render(elements[i], th, { throwOnError: false, displayMode: true });
            row.appendChild(th);
            rowData.forEach(cellIndex => {
                const cell = row.insertCell();
                katex.render(elements[cellIndex], cell, { throwOnError: false, displayMode: true });
            });
        });

        dataTableContainer.appendChild(dataTable);
        cayleyTableWrapper.appendChild(dataTableContainer);
    }

    // 스크롤바 너비를 계산하여 헤더 테이블 너비 조정
    function adjustHeaderWidth() {
        const headerTable = cayleyTableWrapper.querySelector('.cayley-header-table');
        const dataTableContainer = cayleyTableWrapper.querySelector('.cayley-data-table-container');
        if (!headerTable || !dataTableContainer) return;

        // 스크롤바의 너비 계산
        const scrollbarWidth = dataTableContainer.offsetWidth - dataTableContainer.clientWidth;
        // 헤더 테이블의 오른쪽 패딩을 스크롤바 너비만큼 설정
        headerTable.style.paddingRight = `${scrollbarWidth}px`;
    }

    // 케일리 테이블 필터링 함수 (이제 highlight 방식 사용)
    function filterCayleyTable() {
        const filterText = tableFilterInput.value.toLowerCase().replace(/\\/g, '');
        const dataTable = cayleyTableWrapper.querySelector('.cayley-data-table');
        if (!dataTable) return;
    
        const { elements } = currentGroupData;
        const rows = dataTable.querySelectorAll('tbody tr');
    
        // 모든 하이라이트 초기화
        dataTable.querySelectorAll('.highlight').forEach(cell => {
            cell.classList.remove('highlight');
        });
    
        if (!filterText) return; // 필터 텍스트가 없으면 여기서 종료
    
        rows.forEach((row, rowIndex) => {
            const rowHeaderKatex = elements[rowIndex].toLowerCase().replace(/\\/g, '');
            let rowMatch = rowHeaderKatex.includes(filterText);
    
            row.querySelectorAll('td').forEach((td, colIndex) => {
                const colHeaderKatex = elements[colIndex].toLowerCase().replace(/\\/g, '');
                const cellKatex = td.textContent.toLowerCase().replace(/\\/g, '');
    
                let colMatch = colHeaderKatex.includes(filterText);
                let cellMatch = cellKatex.includes(filterText);
    
                // 행 헤더, 열 헤더, 또는 셀 내용 중 하나라도 일치하면 하이라이트
                if (rowMatch || colMatch || cellMatch) {
                    td.classList.add('highlight');
                }
            });
        });
    }

    // 그래프 업데이트
    function updateGraph() {
        if (!currentGroupData) return;

        const selectedGenIndex = parseInt(generatorSelect.value, 10);
        const selectedGenerators = currentGroupData.minimal_generators?.[selectedGenIndex] || [];
        
        // graph.js의 drawCayleyGraph 함수 호출
        drawCayleyGraph(currentGroupData, selectedGenerators);
    }

    // 최단 경로 찾기 및 표시
    function findAndDisplayShortestPath() {
        if (!currentGroupData) return;

        const startElement = startElementSelect.value;
        const endElement = endElementSelect.value;
        const selectedGenIndex = parseInt(generatorSelect.value, 10);
        const generators = currentGroupData.minimal_generators?.[selectedGenIndex];

        if (!generators || generators.length === 0) {
            pathOutput.textContent = '최단 경로: 유효한 생성원 집합을 선택하세요.';
            return;
        }

        const path = bfsShortestPath(startElement, endElement, generators);

        if (path) {
            const pathString = path.map(p => katex.renderToString(p, { throwOnError: false })).join(' → ');
            pathOutput.innerHTML = `최단 경로: ${pathString} (길이: ${path.length - 1})`;
        } else {
            pathOutput.textContent = '최단 경로: 경로를 찾을 수 없습니다.';
        }
    }

    // BFS를 이용한 최단 경로 탐색
    function bfsShortestPath(start, end, generators) {
        const { elements, table } = currentGroupData;
        const elementMap = new Map(elements.map((el, i) => [el, i]));

        const startIndex = elementMap.get(start);
        const endIndex = elementMap.get(end);

        if (startIndex === undefined || endIndex === undefined) return null;

        const queue = [[startIndex, [elements[startIndex]]]];
        const visited = new Set([startIndex]);

        while (queue.length > 0) {
            const [currentIndex, path] = queue.shift();

            if (currentIndex === endIndex) {
                return path;
            }

            for (const gen of generators) {
                const genIndex = elementMap.get(gen);
                if (genIndex === undefined) continue;

                const nextIndex = table[currentIndex][genIndex];
                if (!visited.has(nextIndex)) {
                    visited.add(nextIndex);
                    const newPath = [...path, elements[nextIndex]];
                    queue.push([nextIndex, newPath]);
                }
            }
        }

        return null; // 경로를 찾지 못한 경우
    }

    // 애플리케이션 시작
    init();
});