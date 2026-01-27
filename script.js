// Inicialização de Ícones
lucide.createIcons();

// Dados Locais
let accesses = JSON.parse(localStorage.getItem('sinir_by_allan_final')) || [];

// Elementos Principais
const accessGrid = document.getElementById('accessGrid');
const searchBar = document.getElementById('searchBar');
const totalCountLabel = document.getElementById('totalCount');
const toast = document.getElementById('toast');

/**
 * Interface - Modais
 */
function toggleModal() {
    document.getElementById('accessModal').classList.toggle('hidden');
    if (!document.getElementById('accessModal').classList.contains('hidden')) {
        document.getElementById('empresa').focus();
    }
}

function toggleImportModal() {
    document.getElementById('importModal').classList.toggle('hidden');
}

/**
 * utilitários - Cópia e Notificação
 */
function showToast(msg) {
    toast.textContent = msg || 'COPIADO!';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

function copyToClipboard(text) {
    if (!text || text === '---') return;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast();
}

/**
 * Persistência
 */
function saveData() {
    localStorage.setItem('sinir_by_allan_final', JSON.stringify(accesses));
}

function deleteEntry(id, event) {
    if (event) event.stopPropagation();
    if (confirm('REMOVER ESTE REGISTRO PERMANENTEMENTE?')) {
        accesses = accesses.filter(a => a.id !== id);
        saveData();
        render();
        closeDetails();
    }
}

/**
 * Formulário Manual
 */
document.getElementById('accessForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = {
        id: Date.now(),
        empresa: document.getElementById('empresa').value,
        cnpj_cpf: document.getElementById('cnpj_cpf').value,
        unidade: document.getElementById('unidade').value,
        usuario: document.getElementById('usuario').value,
        cpf_acesso: document.getElementById('cpf_acesso').value,
        senha: document.getElementById('senha').value,
        obs: document.getElementById('obs').value,
        date: new Date().toLocaleDateString()
    };
    accesses.push(entry);
    saveData();
    render();
    e.target.reset();
    toggleModal();
});

/**
 * Backup JSON
 */
function exportBackup() {
    if (accesses.length === 0) return alert('Sem dados.');
    const blob = new Blob([JSON.stringify(accesses, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SINIR-ALLAN-BACKUP-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data)) {
                accesses = [...accesses, ...data];
                saveData();
                render();
                toggleImportModal();
                showToast('RESTAURADO!');
            }
        } catch (err) { alert('Erro no JSON.'); }
    };
    reader.readAsText(file);
}

/**
 * Prancheta Inteligente - Importação em Massa
 */
function processBulkImport() {
    const text = document.getElementById('bulkImportArea').value;
    if (!text.trim()) return;

    // Split por Empresa ou CNPJ/CPF inicial
    const blocks = text.split(/(?=cnpj\/cpf:)|(?=empresa:)/i).filter(b => b.trim() !== "");
    
    let addedCount = 0;
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        const extract = (label) => {
            // Regex refinada com Lookbehind Negativo (?<!\/) para não confundir 'cpf:' com 'cnpj/cpf:'
            const regex = new RegExp(`(?:^|\\n)(?<!\\/)${label}\\s*[:\\-]?\\s*(.*)`, 'i');
            const match = block.match(regex);
            return match ? match[1].trim() : "";
        };

        // Identifica onde está a senha para pegar o que sobrou como OBS
        const senhaLineIdx = lines.findIndex(l => l.toLowerCase().includes('senha:'));
        let obsValue = "";
        if (senhaLineIdx !== -1 && lines.length > senhaLineIdx + 1) {
            obsValue = lines.slice(senhaLineIdx + 1).join(' ');
        }

        const entry = {
            id: Date.now() + Math.random(),
            cnpj_cpf: extract('cnpj\\/cpf'),
            unidade: extract('codigo unidade'),
            empresa: extract('empresa'),
            usuario: extract('usuario'),
            cpf_acesso: extract('cpf'), 
            senha: extract('senha'),
            obs: obsValue,
            date: new Date().toLocaleDateString()
        };

        if (entry.empresa || entry.senha) {
            accesses.push(entry);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        saveData();
        render();
        document.getElementById('bulkImportArea').value = "";
        toggleImportModal();
        showToast(`${addedCount} IMPORTADOS!`);
    } else {
        alert('Formato de texto não reconhecido.');
    }
}

/**
 * Janela de Detalhes
 */
function showDetails(id) {
    const item = accesses.find(a => a.id === id);
    if (!item) return;

    let modal = document.getElementById('detailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'detailsModal';
        modal.className = 'modal-overlay hidden';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content max-w-xl">
            <div class="modal-header">
                <h2 class="text-xl font-black text-indigo-900 uppercase truncate pr-4">${item.empresa || 'DETALHES'}</h2>
                <button onclick="closeDetails()" class="close-btn"><i data-lucide="x"></i></button>
            </div>
            <div class="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                ${renderField('CNPJ / CPF DA EMPRESA:', item.cnpj_cpf)}
                ${renderField('CÓDIGO UNIDADE:', item.unidade)}
                ${renderField('NOME DA EMPRESA:', item.empresa)}
                ${renderField('USUÁRIO DE ACESSO:', item.usuario)}
                ${renderField('CPF DO USUÁRIO:', item.cpf_acesso)}
                ${renderField('SENHA:', item.senha, true)}
                
                ${item.obs ? `
                    <div class="bg-amber-50 p-5 rounded-[2rem] border-2 border-amber-100 mt-6">
                        <span class="text-[9px] font-black text-amber-500 uppercase tracking-widest">Observações em Negrito</span>
                        <p class="text-sm font-black text-slate-800 mt-2 leading-tight uppercase italic">"${item.obs}"</p>
                    </div>
                ` : ''}
            </div>
            <div class="p-6 bg-slate-50 border-t flex justify-between items-center text-[10px] font-black text-slate-400">
                <span>CADASTRADO: ${item.date}</span>
                <button onclick="deleteEntry(${item.id})" class="text-red-400 hover:text-red-600 tracking-tighter uppercase">Excluir Permanente</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    lucide.createIcons();
}

function renderField(label, value, isPass = false) {
    const val = value && value.trim() !== "" ? value : "---";
    return `
        <div class="detail-box">
            <div class="truncate mr-4">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">${label}</span>
                <span class="text-sm font-bold text-slate-800 ${isPass ? 'font-mono tracking-widest' : ''}">${val}</span>
            </div>
            <button onclick="copyToClipboard('${val}')" class="copy-btn">
                <i data-lucide="copy" class="w-4 h-4"></i>
            </button>
        </div>
    `;
}

function closeDetails() {
    const m = document.getElementById('detailsModal');
    if (m) m.classList.add('hidden');
}

/**
 * Render Principal (ORDEM ALFABÉTICA)
 */
function render() {
    const query = searchBar.value.toLowerCase();
    
    // Filtro e Ordenação A-Z
    const filtered = accesses
        .filter(a => 
            (a.empresa || "").toLowerCase().includes(query) ||
            (a.cnpj_cpf || "").toLowerCase().includes(query) ||
            (a.usuario || "").toLowerCase().includes(query) ||
            (a.unidade || "").toLowerCase().includes(query)
        )
        .sort((a, b) => (a.empresa || "").toLowerCase().localeCompare((b.empresa || "").toLowerCase()));

    totalCountLabel.textContent = `TOTAL: ${filtered.length} REGISTROS`;
    
    if (filtered.length === 0) {
        accessGrid.innerHTML = '';
        document.getElementById('emptyState').classList.remove('hidden');
    } else {
        document.getElementById('emptyState').classList.add('hidden');
        accessGrid.innerHTML = filtered.map(a => `
            <div onclick="showDetails(${a.id})" class="access-card group">
                <div class="p-8 flex-1">
                    <div class="flex justify-between items-start mb-5">
                        <div class="bg-indigo-50 text-indigo-700 w-14 h-14 rounded-[1.25rem] flex items-center justify-center font-black text-2xl uppercase group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                            ${(a.empresa || "?").charAt(0)}
                        </div>
                        <div class="text-slate-100 group-hover:text-indigo-200 transition-colors">
                            <i data-lucide="arrow-up-right" class="w-6 h-6"></i>
                        </div>
                    </div>

                    <h3 class="font-black text-xl text-slate-800 mb-1 truncate uppercase tracking-tight group-hover:text-indigo-700 transition-colors">
                        ${a.empresa || 'SEM NOME'}
                    </h3>
                    
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            <i data-lucide="file-text" class="w-3 h-3 mr-1.5"></i> DOC: ${a.cnpj_cpf || '---'}
                        </div>
                        <div class="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            <i data-lucide="map-pin" class="w-3 h-3 mr-1.5"></i> UNID: ${a.unidade || 'N/A'}
                        </div>
                    </div>
                    
                    <div class="mt-6 pt-4 border-t-2 border-slate-50 flex items-center justify-between">
                         <span class="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">ABRIR CREDENCIAIS</span>
                         <i data-lucide="chevron-right" class="w-5 h-5 text-slate-300 group-hover:translate-x-2 transition-transform"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }
    lucide.createIcons();
}

// Iniciar sistema
window.onload = render;
