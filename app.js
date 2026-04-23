let db, currentId = null;
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let drawing = false, color = '#3e3e3e';

// DB Init
const request = indexedDB.open('JournalProDB', 1);
request.onupgradeneeded = (e) => { e.target.result.createObjectStore('entries', { keyPath: 'id', autoIncrement: true }); };
request.onsuccess = (e) => { db = e.target.result; updateMenu(); };

// Canvas Logic
function setupCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
setupCanvas();

canvas.onmousedown = (e) => { if(!canvas.classList.contains('active')) return; drawing = true; ctx.beginPath(); };
canvas.onmouseup = () => drawing = false;
canvas.onmousemove = (e) => {
    if(!drawing) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke();
};

// UI Actions
document.getElementById('drawModeBtn').onclick = () => {
    canvas.classList.toggle('active');
    document.getElementById('drawingTools').classList.toggle('active');
};

document.getElementById('saveBtn').onclick = () => {
    const text = document.getElementById('journalInput').value;
    const drawingData = canvas.toDataURL();
    const date = document.getElementById('currentDate').innerText;
    
    const tx = db.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');
    const entry = { date, text, drawing: drawingData, timestamp: Date.now() };
    if(currentId) entry.id = currentId;

    store.put(entry).onsuccess = (e) => { currentId = currentId || e.target.result; updateMenu(); alert('Guardado'); };
};

function updateMenu() {
    const list = document.getElementById('entriesList');
    list.innerHTML = '';
    db.transaction('entries').objectStore('entries').getAll().onsuccess = (e) => {
        e.target.result.forEach(entry => {
            const item = document.createElement('div');
            item.innerText = entry.date + " - " + entry.text.substring(0,10);
            item.onclick = () => {
                currentId = entry.id;
                document.getElementById('journalInput').value = entry.text;
                const img = new Image(); img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); };
                img.src = entry.drawing;
                document.getElementById('sideMenu').classList.remove('active');
                document.getElementById('deleteBtn').style.visibility = 'visible';
            };
            list.appendChild(item);
        });
    };
}

document.getElementById('menuBtn').onclick = () => document.getElementById('sideMenu').classList.add('active');
document.getElementById('closeMenu').onclick = () => document.getElementById('sideMenu').classList.remove('active');

document.getElementById('currentDate').innerText = new Date().toLocaleDateString('es-ES', {day:'numeric', month:'long'});
