let currentView = 'student';
let lastShuffledData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    document.getElementById('studentList').addEventListener('input', updateCount);
});

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tab + 'Settings').classList.add('active');
}

function updateCount() {
    const list = document.getElementById('studentList').value.split('\n').filter(s => s.trim() !== "");
    document.getElementById('studentCount').innerText = list.length;
}

function saveStudents() {
    localStorage.setItem('class_students_v2', document.getElementById('studentList').value);
    alert('명단이 브라우저에 안전하게 저장되었습니다.');
}

function loadStudents() {
    const saved = localStorage.getItem('class_students_v2');
    if (saved) { 
        document.getElementById('studentList').value = saved; 
        updateCount(); 
    }
}

function togglePerspective(mode) {
    currentView = mode;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(mode === 'student' ? 'viewStudent' : 'viewTeacher').classList.add('active');
    
    const pTop = document.getElementById('podiumTop');
    const pBottom = document.getElementById('podiumBottom');

    if (mode === 'teacher') {
        pTop.classList.add('hidden');
        pBottom.classList.remove('hidden');
    } else {
        pTop.classList.remove('hidden');
        pBottom.classList.add('hidden');
    }

    if (lastShuffledData.length > 0) {
        renderSeating(lastShuffledData);
    }
}

function parseConditions() {
    const fixedSeats = [];
    document.getElementById('fixedSeatsInput').value.split('\n').forEach(line => {
        const tokens = line.split(',').map(t => t.trim());
        if (tokens.length === 3 && tokens[0]) {
            fixedSeats.push({ name: tokens[0], r: parseInt(tokens[1]) - 1, c: parseInt(tokens[2]) - 1 });
        }
    });

    const separatePairs = [];
    document.getElementById('separateInput').value.split('\n').forEach(line => {
        const tokens = line.split(',').map(t => t.trim());
        if (tokens.length === 2 && tokens[0] && tokens[1]) separatePairs.push([tokens[0], tokens[1]]);
    });

    const pairButt = [];
    document.getElementById('pairInput').value.split('\n').forEach(line => {
        const tokens = line.split(',').map(t => t.trim());
        if (tokens.length === 2 && tokens[0] && tokens[1]) pairButt.push([tokens[0], tokens[1]]);
    });

    return { fixedSeats, separatePairs, pairButt };
}

function findCoords(name, grid, rows, cols) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === name) return { r, c };
        }
    }
    return null;
}

// [수정됨] 1. 물리적 인접 (통로 무시, 거리두기 검증용)
function isPhysicalAdjacent(p1, p2) {
    if (!p1 || !p2) return false;
    const dr = Math.abs(p1.r - p2.r);
    const dc = Math.abs(p1.c - p2.c);
    // 상하(1칸) 또는 좌우(1칸)이면 인접한 것으로 간주 (대각선 제외)
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1); 
}

// [수정됨] 2. 짝꿍 인접 (통로 고려, 짝꿍 맺기용)
function isPairAdjacent(p1, p2, isPairMode) {
    if (!isPhysicalAdjacent(p1, p2)) return false; // 기본적으로 물리적 인접이어야 함
    
    const dc = Math.abs(p1.c - p2.c);
    // 좌우로 인접해 있는데 짝꿍 모드인 경우
    if (dc === 1 && isPairMode) {
        const leftCol = Math.min(p1.c, p2.c);
        if (leftCol % 2 !== 0) return false; // 왼쪽 좌석의 열 번호가 홀수면 둘 사이에 통로가 있음
    }
    return true; // 앞뒤거나, 통로가 없는 같은 책상 짝꿍임
}

function generateSeating() {
    const list = document.getElementById('studentList').value.split('\n').map(s => s.trim()).filter(s => s !== "");
    if (list.length === 0) return alert('학생 명단을 입력해주세요.');
    
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const isPairMode = document.getElementById('pairSeating').checked;
    const totalSeats = rows * cols;

    if (totalSeats < list.length) {
        return alert(`설정된 좌석 수(${totalSeats}칸)가 학생 수(${list.length}명)보다 적습니다.`);
    }

    const { fixedSeats, separatePairs, pairButt } = parseConditions();

    const allCondNames = [...fixedSeats.map(f=>f.name), ...separatePairs.flat(), ...pairButt.flat()];
    for (let name of allCondNames) {
        if (name && !list.includes(name)) {
            return alert(`⚠️ 입력 오류: 조건에 적힌 '${name}' 학생이 전체 명단에 없습니다. 오타나 띄어쓰기를 확인해주세요.`);
        }
    }

    const fixedNames = fixedSeats.map(f => f.name);
    const randomPool = list.filter(name => !fixedNames.includes(name));

    while (randomPool.length < (totalSeats - fixedSeats.length)) {
        randomPool.push(null);
    }

    let success = false;
    let finalGrid1D = [];
    const MAX_ATTEMPTS = 15000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let grid = Array(rows).fill().map(() => Array(cols).fill(null));
        let isConfigValid = true;

        for (let f of fixedSeats) {
            if (f.r >= 0 && f.r < rows && f.c >= 0 && f.c < cols && grid[f.r][f.c] === null) {
                grid[f.r][f.c] = f.name;
            } else {
                isConfigValid = false;
            }
        }
        if (!isConfigValid) break;

        let shuffled = [...randomPool].sort(() => Math.random() - 0.5);
        let sIdx = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] === null) {
                    grid[r][c] = shuffled[sIdx++];
                }
            }
        }

        // [수정됨] 무조건 짝꿍 강제 스왑 시 isPairAdjacent 사용
        for (let pair of pairButt) {
            let p1 = findCoords(pair[0], grid, rows, cols);
            let p2 = findCoords(pair[1], grid, rows, cols);
            
            if (p1 && p2 && !isPairAdjacent(p1, p2, isPairMode)) {
                const neighbors = [
                    {r: p1.r-1, c: p1.c}, {r: p1.r+1, c: p1.c}, 
                    {r: p1.r, c: p1.c-1}, {r: p1.r, c: p1.c+1}
                ].filter(n => n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols);

                let validTarget = neighbors.find(n => 
                    isPairAdjacent(p1, n, isPairMode) && 
                    !fixedSeats.some(f => f.r === n.r && f.c === n.c)
                );

                if (validTarget) {
                    let temp = grid[validTarget.r][validTarget.c];
                    grid[validTarget.r][validTarget.c] = grid[p2.r][p2.c];
                    grid[p2.r][p2.c] = temp;
                }
            }
        }

        // 4. 최종 검증
        let constraintPassed = true;
        
        // [수정됨] 거리두기는 무조건 통로 무시하고 물리적(isPhysicalAdjacent)으로 가까우면 실패!
        for (let pair of separatePairs) {
            const p1 = findCoords(pair[0], grid, rows, cols);
            const p2 = findCoords(pair[1], grid, rows, cols);
            if (p1 && p2 && isPhysicalAdjacent(p1, p2)) constraintPassed = false; 
        }

        // [수정됨] 짝꿍은 통로 고려(isPairAdjacent)해서 안 붙어있으면 실패!
        for (let pair of pairButt) {
            const p1 = findCoords(pair[0], grid, rows, cols);
            const p2 = findCoords(pair[1], grid, rows, cols);
            if (p1 && p2 && !isPairAdjacent(p1, p2, isPairMode)) constraintPassed = false;
        }

        if (constraintPassed) {
            finalGrid1D = grid.flat();
            success = true;
            break;
        }
    }

    if (!success) {
        alert('⚠️ 입력하신 조건이 너무 복잡하여 자리를 찾지 못했습니다.\n서로 모순되는 조건이 없는지 확인하시거나, 거리두기 대상을 조금만 줄여주세요.');
        return;
    }

    lastShuffledData = finalGrid1D;
    renderSeating(lastShuffledData);
}

function renderSeating(data) {
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const isPair = document.getElementById('pairSeating').checked;
    const resultArea = document.getElementById('resultArea');
    resultArea.innerHTML = '';

    const gridLayout = document.createElement('div');
    gridLayout.className = 'seating-grid';
    gridLayout.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    let displayData = [...data];

    if (currentView === 'teacher') {
        let matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix.push(displayData.slice(i * cols, (i + 1) * cols));
        }
        matrix.reverse();
        matrix = matrix.map(row => row.reverse());
        displayData = matrix.flat();
    }

    displayData.forEach((name, idx) => {
        const seat = document.createElement('div');
        seat.className = 'seat';
        if (!name) {
            seat.innerText = '빈 자리';
            seat.classList.add('empty');
        } else {
            seat.innerText = name;
        }

        if (isPair && (idx + 1) % 2 === 0 && (idx + 1) % cols !== 0) {
            seat.style.marginRight = '20px';
        }

        gridLayout.appendChild(seat);
    });

    resultArea.appendChild(gridLayout);
}

function generateGroups() {
    const list = document.getElementById('studentList').value.split('\n').map(s => s.trim()).filter(s => s !== "");
    if (list.length === 0) return alert('명단을 입력해주세요.');
    const size = parseInt(document.getElementById('groupSize').value);
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    
    const resultArea = document.getElementById('resultArea');
    resultArea.innerHTML = '<div class="groups-container" style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center; width:100%;"></div>';
    const container = resultArea.querySelector('.groups-container');

    for (let i = 0; i < shuffled.length; i += size) {
        const group = shuffled.slice(i, i + size);
        const card = document.createElement('div');
        card.style = "background:#f8fafc; border:2px solid #e2e8f0; border-radius:8px; padding:15px; width:150px; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.02);";
        card.innerHTML = `<b style="color:#3b82f6; display:block; margin-bottom:8px; font-size:1rem;">${Math.floor(i/size)+1}모둠</b>` + group.join('<br>');
        container.appendChild(card);
    }
}
