let currentView = 'student';
let lastShuffledData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    const studentListEl = document.getElementById('studentList');
    if (studentListEl) {
        studentListEl.addEventListener('input', updateCount);
    }
});

// 💡 고급 조건 접기/펴기 함수 (안전장치 추가)
function toggleAdvanced() {
    const content = document.getElementById('advancedContent');
    const icon = document.getElementById('advancedIcon');
    
    // HTML이 아직 수정되지 않았더라도 에러가 나지 않도록 방지
    if (!content || !icon) return; 
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        icon.innerText = '▲';
    } else {
        content.style.display = 'none';
        icon.innerText = '▼';
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    const targetSettings = document.getElementById(tab + 'Settings');
    if (targetSettings) targetSettings.classList.add('active');
}

function updateCount() {
    const listEl = document.getElementById('studentList');
    if (!listEl) return;
    const list = listEl.value.split('\n').filter(s => s.trim() !== "");
    const countEl = document.getElementById('studentCount');
    if (countEl) countEl.innerText = list.length;
}

function saveStudents() {
    const listEl = document.getElementById('studentList');
    if (listEl) {
        localStorage.setItem('class_students_v2', listEl.value);
        alert('명단이 브라우저에 안전하게 저장되었습니다.');
    }
}

function loadStudents() {
    const saved = localStorage.getItem('class_students_v2');
    const listEl = document.getElementById('studentList');
    if (saved && listEl) { 
        listEl.value = saved; 
        updateCount(); 
    }
}

function togglePerspective(mode) {
    currentView = mode;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    
    const activeBtn = document.getElementById(mode === 'student' ? 'viewStudent' : 'viewTeacher');
    if (activeBtn) activeBtn.classList.add('active');
    
    const pTop = document.getElementById('podiumTop');
    const pBottom = document.getElementById('podiumBottom');

    if (pTop && pBottom) {
        if (mode === 'teacher') {
            pTop.classList.add('hidden');
            pBottom.classList.remove('hidden');
        } else {
            pTop.classList.remove('hidden');
            pBottom.classList.add('hidden');
        }
    }

    if (lastShuffledData.length > 0) {
