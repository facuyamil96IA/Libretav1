const DB_NAME = 'JournalDB';
const DB_VERSION = 1;
let db;

// Inicialización de IndexedDB
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'date' });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    loadTodayEntry();
};

// Cargar fecha actual
const options = { day: 'numeric', month: 'long', year: 'numeric' };
document.getElementById('currentDate').innerText = new Date().toLocaleDateString('es-ES', options);

function saveEntry() {
    if (!db) return;
    const text = document.getElementById('journalInput').value;
    const date = new Date().toLocaleDateString('es-ES');
    const status = document.getElementById('status');

    const transaction = db.transaction(['entries'], 'readwrite');
    const store = transaction.objectStore('entries');
    store.put({ date: date, content: text, lastUpdated: new Date().getTime() });

    transaction.oncomplete = () => {
        status.innerText = "Guardado";
        setTimeout(() => { status.innerText = "Sincronizado"; }, 2000);
    };
}

function loadTodayEntry() {
    const date = new Date().toLocaleDateString('es-ES');
    const transaction = db.transaction(['entries'], 'readonly');
    const store = transaction.objectStore('entries');
    const getRequest = store.get(date);

    getRequest.onsuccess = () => {
        if (getRequest.result) {
            document.getElementById('journalInput').value = getRequest.result.content;
        }
    };
}

// Auto-guardado y evento de botón
setInterval(saveEntry, 10000);
document.getElementById('saveBtn').addEventListener('click', saveEntry);
