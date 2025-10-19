document.addEventListener('DOMContentLoaded', () => {
  // --- 프리셋 데이터 ---
  const presets = {
    default: {
      name: '기본 루브릭 (수행평가)',
      rubric: [
        {
          name: '이해도',
          type: '3-point',
          scores: { A: 3, B: 2, C: 1 },
          descriptions: {
            A: '과제 목표를 완벽히 이해하고 결과물에 반영함',
            B: '과제 목표를 대부분 이해하였으나 일부 부족함',
            C: '과제 목표 이해가 미흡함',
          },
        },
        {
          name: '창의성',
          type: '3-point',
          scores: { A: 3, B: 2, C: 1 },
          descriptions: {
            A: '독창적이고 창의적인 아이디어가 돋보임',
            B: '일부 창의적인 시도가 보이나 평이한 수준임',
            C: '독창성이 부족하고 기존 아이디어를 그대로 사용함',
          },
        },
        {
          name: '완성도',
          type: '3-point',
          scores: { A: 3, B: 2, C: 1 },
          descriptions: {
            A: '결과물의 완성도가 매우 높고 요구사항을 모두 충족함',
            B: '결과물이 대부분 완성되었으나 일부 미흡한 부분이 있음',
            C: '결과물이 미완성이거나 완성도가 크게 떨어짐',
          },
        },
      ],
      overview: '기본 수행평가에 대한 개요입니다.',
    },
    project: {
      name: '프로젝트 루브릭 (탐구 보고서)',
      rubric: [
        {
          name: '문제인식',
          type: '5-point',
          scores: { A: 5, B: 4, C: 3, D: 2, E: 1 },
          descriptions: {
            A: '연구 문제의 중요성과 필요성을 명확하게 제시함',
            B: '연구 문제가 비교적 잘 정의됨',
            C: '연구 문제가 다소 평이하거나 일반적임',
            D: '연구 문제가 불분명함',
            E: '연구 문제가 부적절함',
          },
        },
        {
          name: '탐구과정',
          type: '5-point',
          scores: { A: 5, B: 4, C: 3, D: 2, E: 1 },
          descriptions: {
            A: '논리적이고 체계적인 방법으로 탐구를 수행함',
            B: '탐구 과정이 대체로 체계적임',
            C: '탐구 방법에 일부 비논리적인 부분이 있음',
            D: '탐구 방법이 부적절하거나 오류가 있음',
            E: '탐구 과정이 거의 수행되지 않음',
          },
        },
        {
          name: '결론도출',
          type: '5-point',
          scores: { A: 5, B: 4, C: 3, D: 2, E: 1 },
          descriptions: {
            A: '탐구 결과를 바탕으로 타당한 결론을 도출함',
            B: '결론이 탐구 결과를 잘 반영함',
            C: '결론이 일부 결과와 일치하지 않음',
            D: '결론 도출 과정에 논리적 비약이 있음',
            E: '결론이 없거나 부적절함',
          },
        },
      ],
      overview: '탐구 보고서 프로젝트 평가에 대한 개요입니다.',
    },
  };

  // --- 상태 관리 ---
  const state = {
    running: false,
    results: [],
    rubric: JSON.parse(JSON.stringify(presets.default.rubric)),
    overview: presets.default.overview,
  };

  // --- 유틸리티 ---
  const byId = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function logln(level, ...args) {
    const s = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.innerHTML = `<span class="text-slate-400 mr-2">${timestamp}</span>[<span class="font-semibold">${level}</span>] ${s}`;
    if (level === 'ERROR') logEntry.classList.add('text-red-600');
    else if (level === 'SUCCESS') logEntry.classList.add('text-green-600');
    byId('log').appendChild(logEntry);
    byId('log').scrollTop = byId('log').scrollHeight;
  }

  // --- 사이드바 UI ---
  const sidebar = byId('sidebar');
  const overlay = byId('sidebar-overlay');
  byId('openSidebarBtn').addEventListener('click', () => sidebar.classList.add('open'));
  byId('closeSidebarBtn').addEventListener('click', () => sidebar.classList.remove('open'));
  overlay.addEventListener('click', () => sidebar.classList.remove('open'));

  // --- API 설정 UI ---
  const providers = {
    google: { name: 'Google (Gemini)', defaultModel: 'gemini-1.5-flash-latest' },
    openai: { name: 'OpenAI (GPT)', defaultModel: 'gpt-4o-mini' },
    openrouter: { name: 'OpenRouter', defaultModel: 'meta-llama/llama-3-8b-instruct' },
    ollama: { name: 'Ollama (로컬)', defaultModel: 'llama3' },
    mock: { name: '모의 채점 (Test)', defaultModel: '' },
  };
  const providerSelect = byId('provider');
  Object.entries(providers).forEach(([key, { name }]) => {
    providerSelect.add(new Option(name, key));
  });
  providerSelect.addEventListener('change', (e) => {
    byId('model').value = providers[e.target.value].defaultModel;
  });
  providerSelect.dispatchEvent(new Event('change'));

  // --- 루브릭 UI 및 로직 ---
  const rubricAccordion = byId('rubric-accordion');
  const scoreTypeConfig = {
    single: { label: '단일', levels: ['득점'] },
    '3-point': { label: '3단계', levels: ['A', 'B', 'C'] },
    '5-point': { label: '5단계', levels: ['A', 'B', 'C', 'D', 'E'] },
  };

  function renderRubric() {
    rubricAccordion.innerHTML = '';
    state.rubric.forEach((item, index) => {
      const details = document.createElement('details');
      details.className = 'bg-white border rounded-lg';
      details.dataset.index = index;

      const summary = document.createElement('summary');
      summary.className = 'p-3 flex items-center justify-between font-semibold cursor-pointer';
      summary.innerHTML = `
                <span class="item-name">${item.name}</span>
                <div class="flex items-center gap-2">
                    <span class="text-sm font-normal bg-slate-100 px-2 py-1 rounded">${
                      scoreTypeConfig[item.type].label
                    }</span>
                    <svg class="w-5 h-5 transition-transform transform details-arrow" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                </div>`;

      const content = document.createElement('div');
      content.className = 'p-4 border-t space-y-4';

      const levels = scoreTypeConfig[item.type].levels;
      const descriptionInputs = levels
        .map(
          (level) => `
                <div class="grid grid-cols-12 gap-2 items-start">
                    <label class="col-span-1 text-sm font-bold text-slate-600 text-center pt-2">${level}</label>
                    <div class="col-span-9">
                        <textarea class="w-full rounded-lg text-sm" rows="2" data-desc-level="${level}" placeholder="${level}일 때의 만족 기준 서술...">${
            item.descriptions[level] || ''
          }</textarea>
                    </div>
                    <div class="col-span-2">
                         <input type="number" class="w-full rounded-lg text-center" data-level="${level}" value="${
            item.scores[level] || 0
          }">
                    </div>
                </div>`
        )
        .join('');

      content.innerHTML = `
                <div class="flex items-end gap-2">
                    <div class="flex-1"><label class="text-sm font-medium">항목명</label><input type="text" class="w-full font-semibold rounded mt-1" value="${
                      item.name
                    }" data-field="name"></div>
                    <div class="flex-1"><label class="text-sm font-medium">유형</label><select data-field="type" class="w-full rounded mt-1">${Object.entries(
                      scoreTypeConfig
                    )
                      .map(
                        ([k, v]) =>
                          `<option value="${k}" ${item.type === k ? 'selected' : ''}>${
                            v.label
                          }</option>`
                      )
                      .join('')}</select></div>
                    <button class="delete-rubric-item p-2 text-slate-400 hover:text-red-600" title="항목 삭제"><svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
                </div>
                <div><p class="text-sm font-medium mt-2">만족 기준 및 점수</p><div class="space-y-2 mt-1">${descriptionInputs}</div></div>`;

      details.append(summary, content);
      rubricAccordion.append(details);
    });
  }

  byId('addRubricItem').addEventListener('click', () => {
    state.rubric.push({
      name: `항목 ${state.rubric.length + 1}`,
      type: '3-point',
      scores: { A: 3, B: 2, C: 1 },
      descriptions: { A: '', B: '', C: '' },
    });
    renderRubric();
  });

  rubricAccordion.addEventListener('input', (e) => {
    const itemDiv = e.target.closest('[data-index]');
    if (!itemDiv) return;
    const item = state.rubric[itemDiv.dataset.index];
    const { field, level, descLevel } = e.target.dataset;
    if (field === 'name')
      itemDiv.querySelector('.item-name').textContent = item.name = e.target.value;
    if (level) item.scores[level] = parseFloat(e.target.value) || 0;
    if (descLevel) item.descriptions[descLevel] = e.target.value;
  });

  rubricAccordion.addEventListener('change', (e) => {
    if (e.target.dataset.field === 'type') {
      const itemDiv = e.target.closest('[data-index]');
      const item = state.rubric[itemDiv.dataset.index];
      item.type = e.target.value;
      const newLevels = scoreTypeConfig[item.type].levels;
      item.scores = {};
      item.descriptions = {};
      newLevels.forEach((level, i) => {
        item.scores[level] = newLevels.length - i;
        item.descriptions[level] = '';
      });
      renderRubric();
    }
  });

  rubricAccordion.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-rubric-item');
    if (deleteBtn) {
      const itemDiv = deleteBtn.closest('[data-index]');
      state.rubric.splice(itemDiv.dataset.index, 1);
      renderRubric();
    }
  });

  byId('evaluation-overview').addEventListener('input', (e) => {
    state.overview = e.target.value;
  });

  // --- 파일/텍스트 기반 루브릭 관리 ---
  function setupPresets() {
    const presetSelect = byId('preset-select');
    presetSelect.innerHTML = '<option value="">프리셋 선택...</option>';
    Object.entries(presets).forEach(([key, { name }]) => {
      presetSelect.add(new Option(name, key));
    });
    presetSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (key && presets[key]) {
        state.rubric = JSON.parse(JSON.stringify(presets[key].rubric));
        state.overview = presets[key].overview || '';
        byId('evaluation-overview').value = state.overview;
        renderRubric();
        logln('INFO', `"${presets[key].name}" 프리셋을 불러왔습니다.`);
      }
    });
  }

  function handleFileUpload(file, parser, successMsg) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parser(e.target.result);
        const newRubric = result.rubric || result;
        if (newRubric && newRubric.length > 0) {
          state.rubric = newRubric;
          if (result.overview) {
            state.overview = result.overview;
            byId('evaluation-overview').value = state.overview;
          }
          renderRubric();
          logln('SUCCESS', successMsg);
        } else {
          throw new Error('파일 내용이 비어있거나 형식이 잘못되었습니다.');
        }
      } catch (error) {
        logln('ERROR', `파일 처리 중 오류: ${error.message}`);
        alert(`파일을 처리하는 중 오류가 발생했습니다: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  byId('apply-pasted-rubric').addEventListener('click', () => {
    const text = byId('rubric-paste-area').value;
    try {
      const { overview, rubric } = parsePastedText(text);
      if (rubric && rubric.length > 0) {
        state.rubric = rubric;
        state.overview = overview;
        byId('evaluation-overview').value = overview;
        renderRubric();
        logln('SUCCESS', '텍스트로 루브릭을 적용했습니다.');
      } else {
        throw new Error('텍스트에서 유효한 채점 요소를 찾을 수 없습니다.');
      }
    } catch (error) {
      logln('ERROR', `텍스트 처리 중 오류: ${error.message}`);
      alert(`텍스트를 처리하는 중 오류가 발생했습니다: ${error.message}`);
    }
  });

  byId('preset-upload').addEventListener('change', (e) =>
    handleFileUpload(e.target.files[0], JSON.parse, '프리셋(.json)을 불러왔습니다.')
  );
  byId('csv-upload').addEventListener('change', (e) =>
    handleFileUpload(
      e.target.files[0],
      (text) => ({ rubric: parseRubricCSV(text) }),
      'CSV 파일을 불러왔습니다.'
    )
  );

  byId('preset-save').addEventListener('click', () => {
    const dataToSave = { overview: state.overview, rubric: state.rubric };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'rubric_preset.json',
    });
    a.click();
    URL.revokeObjectURL(url);
  });

  byId('downloadTemplate').addEventListener('click', () => {
    const content = `"평가 기준","평가 내용","점수"\n"지식","지식 성취 A수준",10\n"지식","지식 성취 B수준",8\n"지식","지식 성취 C수준",6\n"태도","성실하게 참여함",5`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'rubric_template.csv',
    });
    a.click();
    URL.revokeObjectURL(url);
  });

  function parseRubricCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    const headerTest = (lines[0] || '').toLowerCase();
    if (headerTest.includes('평가 기준') && headerTest.includes('평가 내용')) {
      lines.shift();
    }

    const rubricMap = new Map();
    lines.forEach((line) => {
      const parts = line.split(',').map((s) => s.trim().replace(/"/g, ''));
      const [criterion, description, scoreStr] = parts;
      if (!criterion || !description || isNaN(parseFloat(scoreStr))) return;
      if (!rubricMap.has(criterion)) {
        rubricMap.set(criterion, []);
      }
      rubricMap.get(criterion).push({ description, score: parseFloat(scoreStr) });
    });

    return createRubricFromMap(rubricMap);
  }

  function parsePastedText(text) {
    const overviewParts = [];
    const rubricLines = [];
    let isRubricSection = false;

    text
      .trim()
      .split('\n')
      .forEach((line) => {
        if (line.includes('채점 요소') && line.includes('채점 기준')) {
          isRubricSection = true;
          return; // Skip header line
        }
        if (isRubricSection) {
          rubricLines.push(line);
        } else {
          overviewParts.push(line);
        }
      });

    const overview = overviewParts.join('\n').trim();
    const rubricMap = new Map();
    let currentCriterion = '';

    rubricLines.forEach((line) => {
      const parts = line.trim().split(/\s{2,}|	/); // 두 칸 이상 공백 또는 탭으로 분리
      if (parts.length >= 3 && !isNaN(parseFloat(parts[parts.length - 1]))) {
        currentCriterion = parts[0].trim() ? parts[0].trim().replace(/·/g, '') : currentCriterion;
        const description = parts.slice(1, -1).join(' ').trim();
        const score = parseFloat(parts[parts.length - 1]);
        if (!rubricMap.has(currentCriterion)) {
          rubricMap.set(currentCriterion, []);
        }
        rubricMap.get(currentCriterion).push({ description, score });
      } else if (
        parts.length >= 2 &&
        !isNaN(parseFloat(parts[parts.length - 1])) &&
        currentCriterion
      ) {
        // 기준 이름이 생략된 경우 (이전 기준을 그대로 사용)
        const description = parts.slice(0, -1).join(' ').trim();
        const score = parseFloat(parts[parts.length - 1]);
        rubricMap.get(currentCriterion).push({ description, score });
      }
    });

    return { overview, rubric: createRubricFromMap(rubricMap) };
  }

  function createRubricFromMap(rubricMap) {
    const newRubric = [];
    for (const [name, levelsData] of rubricMap.entries()) {
      levelsData.sort((a, b) => b.score - a.score);
      const numLevels = levelsData.length;
      let type = 'single';
      if (numLevels === 3) type = '3-point';
      else if (numLevels === 5) type = '5-point';
      else {
        logln(
          'WARN',
          `'${name}' 항목은 ${numLevels}개 수준을 가져 비표준입니다. 단일 항목들로 분리 처리합니다.`
        );
        levelsData.forEach((ld) => {
          const subName = `${name}: ${ld.description.substring(0, 15)}...`;
          newRubric.push({
            name: subName,
            type: 'single',
            scores: { 득점: ld.score },
            descriptions: { 득점: ld.description },
          });
        });
        continue;
      }

      const typeLevels = scoreTypeConfig[type].levels;
      const scores = {};
      const descriptions = {};
      levelsData.forEach((levelData, i) => {
        const levelKey = typeLevels[i];
        if (levelKey) {
          scores[levelKey] = levelData.score;
          descriptions[levelKey] = levelData.description;
        }
      });
      newRubric.push({ name, type, scores, descriptions });
    }
    return newRubric;
  }

  // --- 평가 로직 ---
  let abort = false;
  byId('stopBtn').addEventListener('click', () => {
    abort = true;
  });

  byId('startBtn').addEventListener('click', async () => {
    const files = Array.from(byId('fileInput').files || []);
    if (!files.length) return alert('PDF 파일을 선택하세요.');
    if (state.rubric.length === 0) return alert('평가 기준을 1개 이상 설정하세요.');

    abort = false;
    setRunningState(true);
    const opts = {
      provider: byId('provider').value,
      apiKey: byId('apiKey').value.trim(),
      model: byId('model').value.trim(),
      maxChars: Number(byId('maxChars').value || 8000),
    };
    logln('INFO', `평가를 시작합니다. (Provider: ${opts.provider}, Model: ${opts.model})`);

    for (let i = 0; i < files.length; i++) {
      if (abort) {
        logln('WARN', '사용자에 의해 작업이 중단되었습니다.');
        break;
      }
      const f = files[i];
      if (state.results.some((r) => r.fileName === f.name)) {
        logln(
          'INFO',
          `[${i + 1}/${files.length}] "${f.name}"은(는) 이미 평가된 파일이므로 건너뜁니다.`
        );
        continue;
      }
      logln('INFO', `[${i + 1}/${files.length}] "${f.name}" 처리 중...`);
      try {
        const text = await extractPdfText(f, opts.maxChars);
        logln('INFO', 'AI 모델을 호출합니다...');
        const out = await callAI({ ...opts, input: text });
        const meta = parseMetaFromFilename(f.name);
        state.results.push({
          fileName: f.name,
          studentId: meta.studentId,
          studentName: meta.studentName,
          ...out,
        });
        saveResults();
        renderSummary();
        logln('SUCCESS', `"${f.name}" 평가 완료!`);
        await sleep(350);
      } catch (err) {
        logln('ERROR', `"${f.name}" 처리 중 오류 발생: ${err.message}`);
        console.error(err);
      }
    }
    setRunningState(false);
    logln('INFO', '모든 작업이 종료되었습니다.');
  });

  function setRunningState(running) {
    state.running = running;
    byId('startBtn').disabled = running;
    byId('spinner').classList.toggle('hidden', !running);
  }

  async function extractPdfText(file, maxChars) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      fullText += content.items.map((i) => i.str).join(' ');
      if (fullText.length >= maxChars) break;
    }
    return fullText.slice(0, maxChars);
  }

  function buildPrompt(input) {
    const rubricText = state.rubric
      .map((item) => {
        const descriptions = scoreTypeConfig[item.type].levels
          .map((level) => `  - ${level} (${item.scores[level]}점): ${item.descriptions[level]}`)
          .join('\n');
        return `- ${item.name}:\n${descriptions}`;
      })
      .join('\n');

    const scoreKeys = state.rubric
      .map((item) => {
        const key = item.name
          .toLowerCase()
          .replace(/[\s:·-]+/g, '_')
          .slice(0, 30);
        if (item.type === 'single') {
          const maxScore = item.scores['득점'] || 5;
          return `"${key}": ${maxScore} (0에서 ${maxScore}점 사이의 점수)`;
        } else {
          return `"${key}": "선택된 등급(예: A)"`;
        }
      })
      .join(',\n    ');

    return `다음 보고서를 읽고, 아래의 평가 개요와 상세한 루브릭 기준에 따라 각 항목을 평가하세요.

[평가 개요]
${state.overview}

[루브릭 평가 기준]
${rubricText}

[출력 형식]
반드시 JSON 형식만 출력하며, 다른 설명은 절대 포함하지 마세요.
'scores' 객체에는 각 항목에 대해 가장 적합하다고 판단되는 등급(문자열) 또는 점수(숫자)를 할당하세요.
- 단계별 항목 (3/5단계): 해당하는 등급(예: "A", "B")을 문자열로 부여하세요.
- 단일 기준 항목: 만점을 기준으로 점수를 숫자로 직접 부여하세요.

{
  "scores": {
    ${scoreKeys}
  },
  "strengths": "보고서의 가장 큰 강점 1~2가지를 명료하게 서술합니다.",
  "improvements": "개선이 필요한 부분 1~2가지를 구체적인 방법과 함께 제안합니다.",
  "final_comment": "위의 평가 내용을 종합하여, 학생의 역량이 잘 드러나도록 과목별 세부능력 및 특기사항 예시를 학생의 성장과 역량이 드러나도록 객관적 사실을 기반으로 개조식 문체로 서술합니다."
}

[보고서 원문]
${input}`;
  }

  async function callAI({ provider, apiKey, model, input }) {
    const fullPrompt = buildPrompt(input);
    if (provider === 'mock') {
      await sleep(500);
      const mockScores = {};
      state.rubric.forEach((item) => {
        const key = item.name
          .toLowerCase()
          .replace(/[\s:·-]+/g, '_')
          .slice(0, 30);
        if (item.type === 'single') {
          const maxScore = item.scores['득점'] || 5;
          mockScores[key] = parseFloat((Math.random() * maxScore).toFixed(1));
        } else {
          const levels = scoreTypeConfig[item.type].levels;
          mockScores[key] = levels[Math.floor(Math.random() * levels.length)];
        }
      });
      return {
        scores: mockScores,
        strengths: '모의 강점: 구조가 명확하고 예시가 적절함.',
        improvements: '모의 개선점: 이론적 배경 설명 보강 필요.',
        final_comment:
          '모의 과세특: 라이브러리를 능숙하게 활용하여 문제 상황을 모델링하고 시각적으로 표현하는 역량이 돋보임.',
      };
    }
    const apiEndpoints = {
      google: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      openai: 'https://api.openai.com/v1/chat/completions',
    };
    const url = apiEndpoints[provider];
    if (!url) throw new Error('선택된 API 제공자는 현재 지원되지 않습니다.');

    const headers = { 'Content-Type': 'application/json' };
    let body;
    if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model,
        messages: [
          { role: 'system', content: 'You are a strict rubric grader. Output JSON only.' },
          { role: 'user', content: fullPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      };
    } else {
      // google
      body = {
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.2 },
      };
    }

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${provider} API 오류: ${await res.text()}`);
    const data = await res.json();
    const textToParse =
      provider === 'openai'
        ? data.choices?.[0]?.message?.content
        : data.candidates?.[0]?.content?.parts?.[0]?.text;
    return sanitizeJSON(textToParse ?? '{}');
  }

  function sanitizeJSON(text) {
    let cleanText = text.trim();
    const jsonMatch = cleanText.match(```json)?\s*([\s\S]*?)\s*```);
    if (jsonMatch) cleanText = jsonMatch[1];
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleanText.slice(start, end + 1));
      } catch (e) {
        throw new Error('LLM이 올바른 JSON을 반환하지 않았습니다.');
      }
    }
    throw new Error('응답에서 유효한 JSON 객체를 찾을 수 없습니다.');
  }

  // --- 결과 렌더링 ---
  function renderSummary() {
    const header = byId('summaryHeader');
    const body = byId('summaryBody');
    const rubricHeaders = state.rubric
      .map((item) => `<th class="p-2 text-right">${item.name}</th>`)
      .join('');
    header.innerHTML = `<tr><th class="p-2 text-left">파일명</th><th class="p-2 text-left">학번</th><th class="p-2 text-left">이름</th>${rubricHeaders}<th class="p-2 text-right font-semibold">평균점수</th></tr>`;

    body.innerHTML = '';
    state.results.forEach((r) => {
      const { meanScore } = calculateScores(r.scores);
      const tr = document.createElement('tr');
      tr.dataset.filename = r.fileName;
      const scoreCells = state.rubric
        .map((item) => {
          const key = item.name
            .toLowerCase()
            .replace(/[\s:·-]+/g, '_')
            .slice(0, 30);
          const value = r.scores?.[key];
          let displayText = '-';

          if (item.type === 'single') {
            const score = typeof value === 'number' ? value : 0;
            displayText = score.toFixed(1);
          } else {
            const level = value ?? '-';
            const score = item.scores[level] ?? 0;
            displayText = `${score.toFixed(1)} (${level})`;
          }
          return `<td class="p-2 text-right">${displayText}</td>`;
        })
        .join('');
      tr.innerHTML = `<td class="p-2 truncate" title="${r.fileName}">${
        r.fileName
      }</td><td class="p-2">${r.studentId || ''}</td><td class="p-2">${
        r.studentName || ''
      }</td>${scoreCells}<td class="p-2 text-right font-semibold">${meanScore.toFixed(2)}</td>`;
      body.appendChild(tr);
    });
  }

  function renderCards(selectedFilename = null) {
    const cardsContainer = byId('cards');
    const detailSection = byId('detailSection');
    cardsContainer.innerHTML = '';
    const r = state.results.find((res) => res.fileName === selectedFilename);
    if (!r) {
      detailSection.classList.add('hidden');
      return;
    }

    const { meanScore, scoreValues, labels } = calculateScores(r.scores);
    const maxPossibleScores = state.rubric.map((item) => {
      if (item.type === 'single') return item.scores['득점'] || 0;
      return Math.max(...Object.values(item.scores));
    });
    const maxPossibleScore = Math.max(...maxPossibleScores, 1);

    const card = document.createElement('article');
    card.className = 'space-y-4';
    card.innerHTML = `<div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold text-lg">${
      r.studentName || '이름 미상'
    } (${r.studentId || '학번 미상'})</h3><p class="text-sm text-slate-500 truncate" title="${
      r.fileName
    }">${
      r.fileName
    }</p></div><div class="text-right flex-shrink-0"><div class="text-xs text-slate-500">평균 점수</div><div class="text-2xl font-extrabold mono text-indigo-600">${meanScore.toFixed(
      2
    )}</div></div></div><div style="height:320px"><canvas></canvas></div><div class="grid sm:grid-cols-2 gap-3 text-sm">${createFeedbackBox(
      '잘한 점',
      r.strengths,
      'emerald'
    )}${createFeedbackBox(
      '개선점',
      r.improvements,
      'amber'
    )}</div><div class="mt-4 text-sm">${createFeedbackBox(
      '과목별 세부능력 및 특기사항 (예시)',
      r.final_comment,
      'violet',
      true
    )}</div>`;
    cardsContainer.appendChild(card);

    new Chart(card.querySelector('canvas').getContext('2d'), {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: '점수',
            data: scoreValues,
            fill: true,
            backgroundColor: 'rgba(79,70,229,.16)',
            borderColor: 'rgba(79,70,229,1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: Math.ceil(maxPossibleScore),
            ticks: { stepSize: 1 },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
    detailSection.classList.remove('hidden');
    detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function createFeedbackBox(title, content, color, fullWidth = false) {
    return `<div class="${
      fullWidth ? 'col-span-full ' : ''
    }bg-slate-50 rounded-lg p-3 border"><div class="font-semibold text-${color}-700 mb-1">${title}</div><div>${
      content || ''
    }</div></div>`;
  }

  // --- 데이터 처리 및 이벤트 ---
  function parseMetaFromFilename(name) {
    const base = name.replace(/\.pdf$/i, '');
    const m = base.match(/(\d{4,})[_-]([\p{L}\p{N}\s]+)/u);
    return m ? { studentId: m[1], studentName: m[2].trim() } : { studentId: '', studentName: base };
  }

  function calculateScores(scoresObj) {
    if (!scoresObj) return { meanScore: 0, scoreValues: [], labels: [] };
    const scoreValues = [];
    const labels = [];
    state.rubric.forEach((item) => {
      const key = item.name
        .toLowerCase()
        .replace(/[\s:·-]+/g, '_')
        .slice(0, 30);
      const value = scoresObj[key];
      labels.push(item.name);

      if (item.type === 'single') {
        scoreValues.push(typeof value === 'number' ? value : 0);
      } else {
        scoreValues.push(item.scores[value] || 0);
      }
    });
    const sum = scoreValues.reduce((a, b) => a + b, 0);
    const meanScore = scoreValues.length > 0 ? sum / scoreValues.length : 0;
    return { meanScore, scoreValues, labels };
  }

  byId('summaryBody').addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    document.querySelectorAll('#summaryBody tr').forEach((r) => r.classList.remove('selected-row'));
    row.classList.add('selected-row');
    renderCards(row.dataset.filename);
  });

  byId('downloadCsv').addEventListener('click', () => {
    if (state.results.length === 0) return;
    const rubricHeaders = state.rubric.flatMap((item) => [
      `${item.name}_점수`,
      `${item.name}_등급`,
    ]);
    const headers = [
      'file',
      'studentId',
      'studentName',
      ...rubricHeaders,
      'mean_score',
      'final_comment',
    ];
    const rows = state.results.map((r) => {
      const { meanScore } = calculateScores(r.scores);
      const scoreValues = state.rubric.flatMap((item) => {
        const key = item.name
          .toLowerCase()
          .replace(/[\s:·-]+/g, '_')
          .slice(0, 30);
        const value = r.scores?.[key];
        let score, level;
        if (item.type === 'single') {
          score = (typeof value === 'number' ? value : 0).toFixed(1);
          level = 'N/A';
        } else {
          level = value ?? '-';
          score = (item.scores[level] ?? 0).toFixed(1);
        }
        return [score, level];
      });
      const sanitized = (str) => `"${(str || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      return [
        sanitized(r.fileName),
        r.studentId,
        sanitized(r.studentName),
        ...scoreValues,
        meanScore.toFixed(2),
        sanitized(r.final_comment),
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'rubric_results.csv',
    });
    a.click();
    URL.revokeObjectURL(url);
  });

  byId('clearBtn').addEventListener('click', () => {
    if (confirm('모든 평가 결과를 초기화하시겠습니까?')) {
      state.results = [];
      localStorage.removeItem('rubricAppResults');
      renderSummary();
      renderCards();
      logln('INFO', '모든 결과가 초기화되었습니다.');
    }
  });

  // --- 데이터 저장/로드 ---
  function saveResults() {
    const dataToSave = {
      overview: state.overview,
      results: state.results,
      rubric: state.rubric,
      settings: {
        provider: byId('provider').value,
        apiKey: byId('apiKey').value,
        model: byId('model').value,
      },
    };
    localStorage.setItem('rubricAppResults', JSON.stringify(dataToSave));
  }
  function loadResults() {
    const saved = localStorage.getItem('rubricAppResults');
    if (saved) {
      const data = JSON.parse(saved);
      state.overview = data.overview || '';
      state.results = data.results || [];
      if (data.rubric && data.rubric.length > 0) state.rubric = data.rubric;
      if (data.settings) {
        byId('provider').value = data.settings.provider || 'google';
        byId('apiKey').value = data.settings.apiKey || '';
        byId('model').value = data.settings.model || providers[byId('provider').value].defaultModel;
      }
      byId('evaluation-overview').value = state.overview;
      logln('INFO', `${state.results.length}개의 저장된 평가 결과를 불러왔습니다.`);
    }
  }

  window.addEventListener('beforeunload', saveResults);

  // --- 초기화 ---
  loadResults();
  setupPresets();
  renderRubric();
  renderSummary();
});
