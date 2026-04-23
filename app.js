document.addEventListener('DOMContentLoaded', () => {
    const journalInput = document.getElementById('journalInput');
    const saveBtn = document.getElementById('saveBtn');

    // Cargar entrada anterior
    journalInput.value = localStorage.getItem('journal_entry') || "";

    // Guardar al hacer clic
    saveBtn.addEventListener('click', () => {
        localStorage.setItem('journal_entry', journalInput.value);
        alert('Entrada guardada en tu libreta digital.');
    });

    // Auto-guardado opcional cada 30 segundos
    setInterval(() => {
        localStorage.setItem('journal_entry', journalInput.value);
    }, 30000);
});
