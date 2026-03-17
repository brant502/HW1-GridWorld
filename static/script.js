/* ===========================
   Grid World – script.js
   =========================== */

// ── State ──────────────────────────────────────────────
let n = 5;
let start = null;   // [row, col]
let end = null;   // [row, col]
let obstacles = [];     // [[row, col], …]
let clickPhase = 0;     // 0=need start, 1=need end, 2=obstacles
let gridReady = false;

// ── DOM Refs ────────────────────────────────────────────
const nSelect = document.getElementById('nSelect');
const algoSelect = document.getElementById('algoSelect');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const evaluateBtn = document.getElementById('evaluateBtn');
const gridContainer = document.getElementById('gridContainer');
const statusMsg = document.getElementById('statusMsg');
const obstacleCount = document.getElementById('obstacleCount');
const infoCard = document.getElementById('infoCard');

// ── Helpers ─────────────────────────────────────────────
const key = (r, c) => `${r},${c}`;

function cellEl(r, c) {
    return document.getElementById(`cell-${r}-${c}`);
}

function updateStatus() {
    const maxObs = n - 2;
    if (!gridReady) { statusMsg.textContent = '請先生成網格。'; obstacleCount.textContent = ''; return; }
    if (clickPhase === 0) {
        statusMsg.textContent = '點擊任意格子設定起點 🟢';
        obstacleCount.textContent = '';
    } else if (clickPhase === 1) {
        statusMsg.textContent = '點擊任意空格設定終點 🔴';
        obstacleCount.textContent = '';
    } else {
        const rem = maxObs - obstacles.length;
        statusMsg.textContent = rem > 0
            ? `點擊空格設定障礙物（還可設 ${rem} 個）`
            : `已達障礙物上限（${maxObs} 個）`;
        obstacleCount.textContent = `障礙物：${obstacles.length} / ${maxObs}`;
    }
}

// ── Generate Grid ───────────────────────────────────────
function generateGrid() {
    n = parseInt(nSelect.value);
    start = null; end = null; obstacles = [];
    clickPhase = 0;
    gridReady = true;
    infoCard.style.display = 'none';
    evaluateBtn.disabled = true;
    resetBtn.disabled = false;

    // Build table
    const table = document.createElement('table');
    table.className = 'grid-table';

    for (let r = 0; r < n; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < n; c++) {
            const td = document.createElement('td');
            td.className = 'grid-cell';
            td.id = `cell-${r}-${c}`;
            td.dataset.row = r;
            td.dataset.col = c;

            const inner = document.createElement('div');
            inner.className = 'cell-inner';
            td.appendChild(inner);

            td.addEventListener('click', onCellClick);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

    gridContainer.innerHTML = '';
    gridContainer.appendChild(table);
    updateStatus();
}

// ── Cell Click Handler ──────────────────────────────────
function onCellClick(e) {
    const td = e.currentTarget;
    const r = parseInt(td.dataset.row);
    const c = parseInt(td.dataset.col);
    const k = key(r, c);
    const maxObs = n - 2;

    // Ignore clicks on obstacles
    if (td.classList.contains('cell-obstacle')) return;

    if (clickPhase === 0) {
        // Set start
        if (td.classList.contains('cell-end')) return; // ignore if it's end
        clearCellState(r, c);
        start = [r, c];
        td.classList.add('cell-start');
        setInnerLabel(td, '🏁', '');
        clickPhase = 1;

    } else if (clickPhase === 1) {
        // Set end (cannot be same as start)
        const startKey = start ? key(start[0], start[1]) : null;
        if (k === startKey) return;
        clearCellState(r, c);
        end = [r, c];
        td.classList.add('cell-end');
        setInnerLabel(td, '🎯', '');
        clickPhase = 2;
        evaluateBtn.disabled = false;

    } else {
        // Toggle obstacle
        const startKey = start ? key(start[0], start[1]) : null;
        const endKey = end ? key(end[0], end[1]) : null;
        if (k === startKey || k === endKey) return;

        if (td.classList.contains('cell-obstacle')) {
            // Remove obstacle  (won't reach here because we guard above, but keep for safety)
            td.classList.remove('cell-obstacle');
            obstacles = obstacles.filter(([or, oc]) => !(or === r && oc === c));
            setInnerLabel(td, '', '');
        } else {
            if (obstacles.length >= maxObs) return;
            clearCellState(r, c);
            td.classList.add('cell-obstacle');
            obstacles.push([r, c]);
        }
    }
    updateStatus();
}

function clearCellState(r, c) {
    const td = cellEl(r, c);
    td.classList.remove('cell-start', 'cell-end', 'cell-path');
    setInnerLabel(td, '', '');
}

function setInnerLabel(td, arrow, value) {
    const inner = td.querySelector('.cell-inner');
    inner.innerHTML = '';
    if (arrow) {
        const a = document.createElement('span');
        a.className = 'cell-arrow';
        a.textContent = arrow;
        inner.appendChild(a);
    }
    if (value !== '') {
        const v = document.createElement('span');
        v.className = 'cell-value';
        v.textContent = value;
        inner.appendChild(v);
    }
}

// ── Reset ────────────────────────────────────────────────
function resetGrid() {
    generateGrid();
}

// ── Policy Evaluation ────────────────────────────────────
async function evaluatePolicy() {
    if (!start || !end) { alert('請先設定起點與終點！'); return; }

    evaluateBtn.disabled = true;
    evaluateBtn.textContent = '⏳ 計算中…';

    try {
        const resp = await fetch('/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                n, 
                start, 
                end, 
                obstacles,
                algorithm: algoSelect.value
            })
        });
        if (!resp.ok) { const e = await resp.json(); alert(e.error); return; }

        const data = await resp.json();
        renderResults(data.policy, data.values, data.path || []);
        infoCard.style.display = 'block';

    } catch (err) {
        alert('評估失敗：' + err.message);
    } finally {
        evaluateBtn.disabled = false;
        evaluateBtn.textContent = '🔍 評估策略 & 計算 V(s)';
    }
}

function renderResults(policy, values, path) {
    const endKey = key(end[0], end[1]);
    const obsKeys = new Set(obstacles.map(([r, c]) => key(r, c)));
    const pathKeys = new Set(path.map(([r, c]) => key(r, c)));

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const td = cellEl(r, c);
            const k = key(r, c);

            if (obsKeys.has(k)) continue; // obstacles keep ✕

            const inner = td.querySelector('.cell-inner');
            inner.innerHTML = '';

            if (k === endKey) {
                // Terminal cell
                td.classList.add('cell-path');
                const a = document.createElement('span');
                a.className = 'cell-arrow animate';
                a.textContent = '🎯';
                const v = document.createElement('span');
                v.className = 'cell-value animate';
                v.textContent = 'V=0';
                inner.appendChild(a);
                inner.appendChild(v);
                continue;
            }

            const startKey2 = key(start[0], start[1]);
            const arrow = policy[r][c];
            const val = values[r][c];

            const a = document.createElement('span');
            a.className = 'cell-arrow animate';
            a.textContent = arrow;

            const v = document.createElement('span');
            v.className = 'cell-value animate';
            v.textContent = val.toFixed(1);

            inner.appendChild(a);
            inner.appendChild(v);

            if (pathKeys.has(k)) {
                td.classList.add('cell-path');
            }

            // Remove start label overwrite so the policy arrow stays visible
            // if (k === startKey2) {
            //     a.textContent = '🏁';
            // }
        }
    }
}

// ── Event Listeners ──────────────────────────────────────
generateBtn.addEventListener('click', generateGrid);
resetBtn.addEventListener('click', resetGrid);
evaluateBtn.addEventListener('click', evaluatePolicy);

// Auto-generate on load
generateGrid();
