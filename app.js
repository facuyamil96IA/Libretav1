```javascript
// --- Base de Datos (IndexedDB) ---
let db;
let currentNoteId = null;

const dbRequest = indexedDB.open("JournalProV1", 1);

dbRequest.onupgradeneeded = e => {
    db = e.target.result;
    db.createObjectStore("entries", { keyPath: "id", autoIncrement: true });
};

dbRequest.onsuccess = e => {
    db = e.target.result;
    updateMenuList();
    initApp();
};

// --- Configuración de Dibujo ---
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('container');
let isDrawing = false;
let brushType = 'pen';
let selectedColor = '#3e3e3e';
let undoStack = [];

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    updateBrush();
}

function updateBrush() {
    ctx.strokeStyle = selectedColor;
    if (brushType === 'pencil') {
        ctx.globalAlpha = 0.12; // Grafito suave
        ctx.lineWidth = 1.2;    // Trazo ultra fino
        ctx.shadowBlur = 0.6;
        ctx.shadowColor = selectedColor;
    } else {
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 0;
    }
}

// --- Lógica del Canvas ---
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener('mousedown', e => {
    if (canvas.classList.contains('inactive')) return;
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('mousemove', e => {
    if (!isDrawing) return;
    const pos = getPos(e);
    if (brushType === 'pencil') {
        // Jitter sutil para textura de grafito
        const jX = (Math.random() - 0.5) * 1.1;
        const jY = (Math.random() - 0.5) * 1.1;
        ctx.lineTo(pos.x + jX, pos.y + jY);
    } else {
        ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        ctx.closePath();
        undoStack.push(canvas.toDataURL());
    }
});

// Eventos Táctiles
canvas.addEventListener('touchstart', e => {
    if (canvas.classList.contains('inactive')) return;
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    if (brushType === 'pencil') {
        const jX = (Math.random() - 0.5) * 1.2;
        const jY = (Math.random() - 0.5) * 1.2;
        ctx.lineTo(pos.x + jX, pos.y + jY);
    } else {
        ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
}, { passive: false });

canvas.addEventListener('touchend', () => {
    if (isDrawing) {
        isDrawing = false;
        ctx.closePath();
        undoStack.push(canvas.toDataURL());
    }
});

// --- Interfaz de Usuario ---
const toggleDraw = document.getElementById('toggleDraw');
const drawIcon = document.getElementById('drawIcon');
const textIcon = document.getElementById('textIcon');
const journalText = document.getElementById('journalText');
const drawingTools = document.getElementById('drawingTools');
const appHeader = document.getElementById('appHeader');

toggleDraw.onclick = () => {
    const isDrawingActive = canvas.classList.toggle('inactive');
    if (!isDrawingActive) {
        drawIcon.style.display = 'none';
        textIcon.style.display = 'block';
        toggleDraw.classList.add('active');
        journalText.classList.add('dimmed');
        drawingTools.classList.remove('hidden');
        appHeader.classList.add('hidden');
    } else {
        drawIcon.style.display = 'block';
        textIcon.style.display = 'none';
        toggleDraw.classList.remove('active');
        journalText.classList.remove('dimmed');
        drawingTools.classList.add('hidden');
        appHeader.classList.remove('hidden');
    }
};

// Paleta
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.onclick = () => {
        document.querySelector('.color-dot.active').classList.remove('active');
        dot.classList.add('active');
        selectedColor = dot.dataset.color;
        updateBrush();
    };
});

document.getElementById('setPen').onclick = function() {
    brushType = 'pen';
    this.classList.add('active');
    document.getElementById('setPencil').classList.remove('active');
    updateBrush();
};

document.getElementById('setPencil').onclick = function() {
    brushType = 'pencil';
    this.classList.add('active');
    document.getElementById('setPen').classList.remove('active');
    updateBrush();
};

document.getElementById('undoBtn').onclick = () => {
    if (undoStack.length <= 1) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        undoStack = [];
        return;
    }
    undoStack.pop();
    const prevState = undoStack[undoStack.length - 1];
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
        ctx.drawImage(img, 0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
    };
    img.src = prevState;
};

// --- Acciones de Nota ---
const saveBtn = document.getElementById('saveNote');
const noteTitle = document.getElementById('noteTitle');

saveBtn.onclick = () => {
    const tx = db.transaction("entries", "readwrite");
    const store = tx.objectStore("entries");
    const data = {
        title: noteTitle.value || "Nota sin nombre",
        content: journalText.value,
        drawing: canvas.toDataURL(),
        date: document.getElementById('dateDisplay').innerText,
        timestamp: Date.now()
    };
    if (currentNoteId) data.id = currentNoteId;

    store.put(data).onsuccess = e => {
        currentNoteId = currentNoteId || e.target.result;
        updateMenuList();
        // Feedback visual
        saveBtn.style.color = "#2ecc71";
        setTimeout(() => saveBtn.style.color = "", 1000);
    };
};

document.getElementById('newNote').onclick = () => {
    currentNoteId = null;
    noteTitle.value = "";
    journalText.value = "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    undoStack = [];
    initApp();
};

document.getElementById('deleteNote').onclick = () => {
    if (!currentNoteId) return;
    if (confirm("¿Eliminar esta memoria para siempre?")) {
        const tx = db.transaction("entries", "readwrite");
        tx.objectStore("entries").delete(currentNoteId).onsuccess = () => {
            location.reload();
        };
    }
};

// --- Menú Lateral ---
const sidebar = document.getElementById('sidebar');
document.getElementById('openMenu').onclick = () => sidebar.classList.add('active');
document.getElementById('closeMenu').onclick = () => sidebar.classList.remove('active');

function updateMenuList() {
    const list = document.getElementById('menuList');
    list.innerHTML = "";
    const tx = db.transaction("entries", "readonly");
    tx.objectStore("entries").getAll().onsuccess = e => {
        e.target.result.sort((a,b) => b.timestamp - a.timestamp).forEach(note => {
            const item = document.createElement('div');
            item.className = "note-item";
            item.innerHTML = `<h4>${note.title}</h4><span>${note.date}</span>`;
            item.onclick = () => loadNote(note);
            list.appendChild(item);
        });
    };
}

function loadNote(note) {
    currentNoteId = note.id;
    noteTitle.value = note.title;
    journalText.value = note.content;
    document.getElementById('dateDisplay').innerText = note.date;
    
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
        ctx.drawImage(img, 0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
        undoStack = [note.drawing];
    };
    img.src = note.drawing;
    sidebar.classList.remove('active');
}

function initApp() {
    const options = { day: 'numeric', month: 'long' };
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('es-ES', options);
    resizeCanvas();
}

window.onresize = resizeCanvas;

```
