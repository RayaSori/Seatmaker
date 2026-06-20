let currentView = 'student';
let lastShuffledData = []; // 항상 학생 시점 기준의 1차원 완성 배열을 저장

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

// 텍스트 구역으로부터 조건 파싱 엔진
function parseConditions() {
    const fixedSeats = [];
    document.getElementById('fixedSeatsInput').value.split('\n').forEach(line => {
        const tokens = line.split(',').map(t => t.trim());
        if (tokens.length === 3 && tokens[0]) {
            const name = tokens[0];
            const r = parseInt(tokens[1]) - 1; // 사용자의 1행 -> 코드의 0번 인덱스
            const c = parseInt(tokens[2]) - 1;
            if (!isNaN(r) && !isNaN(c)) fixedSeats.push({ name, r, c });
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

// 핵심 알고리즘: 조건 충족 최적화 시뮬레이터
function generateSeating() {
    const list = document.getElementById('studentList').value.split('\n').map(s => s.trim()).filter(s => s !== "");
    if (list.length === 0) return alert('학생 명단을 입력해주세요.');
    
    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const totalSeats = rows * cols;

    if (totalSeats < list.length) {
        return alert(`설정된 좌석 수(${totalSeats}칸)가 학생 수(${list.length}명)보다 적습니다.`);
    }

    const { fixedSeats, separatePairs, pairButt } = parseConditions();

    // 고정석 이름 추출
    const fixedNames = fixedSeats.map(f => f.name);
    // 고정석을 제외하고 순수하게 랜덤 배치할 학생 풀 생성
    const randomPool = list.filter(name => !fixedNames.includes(name));

    // 빈자리 채우기용 null 삽입
    while (randomPool.length < (totalSeats - fixedSeats.length)) {
        randomPool.push(null);
    }

    let success = false;
    let finalGrid1D = [];
    const MAX_ATTEMPTS = 5000; // 최대 5천 번 연산 시도

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        // 빈 격자판 양식 구성
        let grid = Array(rows).fill().map(() => Array(cols).fill(null));
        let isConfigValid = true;

        // 1단계: 고정석 먼저 확실하게 배치
        for (let f of fixedSeats) {
            if (f.r >= 0 && f.r < rows && f.c >= 0 && f.c < cols) {
                grid[f.r][f.c] = f.name;
            } else {
                isConfigValid = false; // 격자 크기를 벗어난 고정석 배치 요구 예외처리
            }
        }
        if (!isConfigValid) {
            alert('고정석의 행/열 값이 현재 격자 크기를 벗어났습니다.');
            return;
        }

        // 2단계: 남은 학생 풀 무작위 셔플
        let shuffled = [...randomPool].sort(() => Math.random() - 0.5);
        let sIdx = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] === null) {
                    grid[r][c] = shuffled[sIdx++];
                }
            }
        }

        // 3단계: 만들어진 임시 배치안 검증
        if (validateConstraints(grid, rows, cols, separatePairs, pairButt)) {
            finalGrid1D = grid.flat();
            success = true;
            break;
        }
    }

    if (!success) {
        alert('⚠️ 입력하신 조건(거리두기/짝꿍)이 너무 복잡하여 최적의 자리를 찾지 못했습니다.\n조건을 완화하거나 다시 시도해 주세요.');
        return;
    }

    lastShuffledData = finalGrid1D;
    renderSeating(lastShuffledData);
}

// 상하좌우 인접성 검사 및 정밀 검증
function validateConstraints(grid, rows, cols, separatePairs, pairButt) {
    function findCoords(name) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] === name) return { r, c };
            }
        }
        return null;
    }

    function isAdjacent(p1, p2) {
        if (!p1 || !p2) return false;
        const dr = Math.abs(p1.r - p2.r);
        const dc = Math.abs(p1.c - p2.c);
        return (dr === 1 && dc === 0) || (dr === 0 && dc === 1); // 상하 또는 좌우로 1칸 격차 의미
    }

    // 조건 A 검증: 거리두기 대상이 붙어있는가?
    for (let pair of separatePairs) {
        const p1 = findCoords(pair[0]);
        const p2 = findCoords(pair[1]);
        if (p1 && p2 && isAdjacent(p1, p2)) return false; 
    }

    // 조건 B 검증: 무조건 붙어야 할 대상이 떨어져 있는가?
    for (let pair of pairButt) {
        const p1 = findCoords(pair[0]);
        const p2 = findCoords(pair[1]);
        if (p1 && p2 && !isAdjacent(p1, p2)) return false;
    }

    return true;
}

// 화면 랜더링 함수 (시점 전환 연동 기술 적용)
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

    // 중요: 교사 시점 선택 시 상하반전 후 좌우반전 매핑 가동
    if (currentView === 'teacher') {
        let matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix.push(displayData.slice(i * cols, (i + 1) * cols));
        }
        matrix.reverse(); // 1) 맨 앞줄과 맨 뒷줄 뒤집기 (상하반전)
        matrix = matrix.map(row => row.reverse()); // 2) 선생님 시선의 좌우 대칭 뒤집기 (좌우반전)
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

        // 짝꿍 통로 여백 주기 스타일 적용
        if (isPair && (idx + 1) % 2 === 0 && (idx + 1) % cols !== 0) {
            seat.style.marginRight = '20px';
        }

        gridLayout.appendChild(seat);
    });

    resultArea.appendChild(gridLayout);
}

// 모둠 구성 로직
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
