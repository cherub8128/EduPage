function drawCayleyGraph(groupData, selectedGenerators) {
    const { elements, table } = groupData;
    const container = d3.select("#cayley-graph");
    container.html(""); // 기존 SVG 클리어

    const width = container.node().getBoundingClientRect().width;
    const height = 600;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .style("cursor", "move"); // 커서를 이동 모양으로 변경

    const g = svg.append("g"); // 줌/패닝을 적용할 그룹 요소

    // 생성원별 색상
    // Tableau 10 색상 팔레트 사용 (색약 친화적이며 심미적으로 우수)
    const genColors = [
        "#4e79a7", // Blue
        "#ff9da7",  // Pink
        "#59a14f", // Green
        "#f28e2c", // Orange
        "#e15759", // Red
        "#76b7b2", // Teal
        "#edc949", // Yellow
        "#af7aa1", // Purple
    ];

    // 노드와 링크 데이터 구성
    const nodes = elements.map(el => ({ id: el }));
    const links = [];
    const elementMap = new Map(elements.map((el, i) => [el, i]));

    selectedGenerators.forEach((gen, genIndex) => {
        const genMapIndex = elementMap.get(gen);
        if (genMapIndex === undefined) return;

        elements.forEach((el, elIndex) => {
            const targetIndex = table[elIndex][genMapIndex];
            links.push({
                source: el,
                target: elements[targetIndex],
                color: genColors[genIndex % genColors.length]
            });
        });
    });

    // --- SVG 정의(defs) 섹션: 화살표 마커 및 텍스트 후광 필터 ---
    const defs = svg.append("defs");

    // 화살표 마커
    defs.selectAll("marker")
        .data(genColors)
        .join("marker")
        .attr("id", (d, i) => `arrow-${i}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 19) // 노드 크기에 따라 조정
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", d => d)
        .attr("d", "M0,-5L10,0L0,5");

    // 텍스트 후광(halo) 효과를 위한 SVG 필터
    const filter = defs.append("filter")
        .attr("id", "halo")
        .attr("x", "-50%").attr("y", "-50%")
        .attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 2.5).attr("result", "blur");
    filter.append("feFlood").attr("flood-color", "var(--panel-bg-color)").attr("flood-opacity", "1").attr("result", "color");
    filter.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "shadow");
    filter.append("feMerge").html(`<feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" />`);

    // D3 Force Simulation 설정
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(0, 0));

    // 링크(간선)
    const link = g.append("g")
        .attr("stroke-opacity", 0.7)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", d => d.color)
        .attr("stroke-width", 1.5)
        .attr("marker-end", d => `url(#arrow-${genColors.indexOf(d.color)})`);

    // 노드 그룹 (원 + 텍스트)
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("class", "node"); // CSS에서 스타일을 적용하기 위한 클래스

    node.append("circle").attr("r", 12);
    node.append("text")
        .text(d => d.id)
        .attr("text-anchor", "middle")
        .attr("filter", "url(#halo)") // 정의된 후광 필터 적용
        .attr("dy", ".35em")
        .style("font-size", "10px");

    // 드래그 기능 추가
    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // 시뮬레이션 틱마다 위치 업데이트
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // --- 줌/패닝 기능 추가 ---
    const zoom = d3.zoom()
        .scaleExtent([0.1, 5]) // 10% ~ 500% 까지 줌 가능
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);
    // -------------------------

    // 줌 컨트롤 버튼 이벤트 리스너 추가
    const zoomInBtn = d3.select("#zoom-in-btn");
    const zoomOutBtn = d3.select("#zoom-out-btn");
    const resetZoomBtn = d3.select("#reset-zoom-btn");

    zoomInBtn.on("click", () => {
        svg.transition().duration(200).call(zoom.scaleBy, 1.2); // 20% 확대
    });

    zoomOutBtn.on("click", () => {
        svg.transition().duration(200).call(zoom.scaleBy, 1 / 1.2); // 20% 축소
    });

    resetZoomBtn.on("click", () => {
        svg.transition().duration(200).call(zoom.transform, d3.zoomIdentity); // 초기 줌 상태로 리셋
    });

    function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
}