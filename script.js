// 초기화 및 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    document.getElementById('studentList').addEventListener('input', updateStudentCount);
});

// 탭 전환 로직
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.settings-section').forEach(sec => sec.classList.remove('active'));

    if (tabName === 'seating') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('seatingSettings').classList.add('active');
        document.getElementById('resultTitle').innerText = "자리 배치도";
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('groupingSettings').classList.add('active');
        document.getElementById('resultTitle').innerText = "모둠 구성도";
    }
}

// 학생 명단 관리
function getStudents() {
    const text = document.getElementById('studentList').value;
    return text.split('\n').map(s => s.trim()).filter(s => s !== "");
}

function updateStudentCount() {
    const count = getStudents().length;
    document.getElementById('studentCount').innerText = count;
}

function saveStudents() {
    const students = document.getElementById('studentList').value;
    localStorage.setItem('savedStudents', students);
    alert('명단이 저장되었습니다. (새로고침해도 유지됩니다.)');
}

function loadStudents() {
    const saved = localStorage.getItem('savedStudents');
    if (saved) {
        document.getElementById('studentList').value = saved;
        updateStudentCount();
    }
}

// 무작위 섞기 알고리즘 (Fisher-Yates Shuffle)
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 자리 배치도 생성
function generateSeating() {
    const students = getStudents();
    if (students.length === 0) {
        alert("학생 명단을 입력해주세요.");
        return;
    }

    const rows = parseInt(document.getElementById('rows').value);
    const cols = parseInt(document.getElementById('cols').value);
    const isPair = document.getElementById('pairSeating').checked;

    if (rows * cols < students.length) {
        alert(`좌석 수(${rows * cols})가 학생 수(${students.length})보다 부족합니다.`);
        return;
    }

    const shuffled = shuffleArray(students);
    const resultArea = document.getElementById('resultArea');
    
    // 기존 결과 초기화
    resultArea.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'seating-grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    if (isPair) {
        grid.classList.add('pair-seating');
    }

    let studentIndex = 0;
    for (let i = 0; i < rows * cols; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        
        if (studentIndex < shuffled.length) {
            seat.innerText = shuffled[studentIndex];
            studentIndex++;
        } else {
            seat.classList.add('empty');
            seat.innerText = "빈 자리";
        }
        grid.appendChild(seat);
    }

    resultArea.appendChild(grid);
}

// 모둠 구성 생성
function generateGroups() {
    const students = getStudents();
    if (students.length === 0) {
        alert("학생 명단을 입력해주세요.");
        return;
    }

    const groupSize = parseInt(document.getElementById('groupSize').value);
    const shuffled = shuffleArray(students);
    const resultArea = document.getElementById('resultArea');
    
    // 기존 결과 초기화
    resultArea.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'groups-container';

    let groupNumber = 1;
    for (let i = 0; i < shuffled.length; i += groupSize) {
        const groupMembers = shuffled.slice(i, i + groupSize);
        
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        
        const title = document.createElement('div');
        title.className = 'group-title';
        title.innerText = `${groupNumber}모둠 (${groupMembers.length}명)`;
        groupCard.appendChild(title);

        groupMembers.forEach(member => {
            const p = document.createElement('div');
            p.className = 'group-member';
            p.innerText = member;
            groupCard.appendChild(p);
        });

        container.appendChild(groupCard);
        groupNumber++;
    }

    resultArea.appendChild(container);
}
