// Inicia os ícones
lucide.createIcons();

// Banco de dados local
let accesses = JSON.parse(localStorage.getItem('sinir_by_allan_data')) || [];

// Elementos
const accessForm = document.getElementById('accessForm');
const searchBar = document.getElementById('searchBar');
const accessGrid = document.getElementById('accessGrid');
const emptyState = document.getElementById('emptyState');
const totalCountLabel = document.getElementById('totalCount');
const toast = document.getElementById('toast');

/**
 * Funções de Modal
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
 * Notificações e Cópia
 */
function showToast(msg) {
    toast.textContent = msg || 'COPIADO!';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

function copy(text) {
    if (!text) return;
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast();
}

/**
 * CRUD e Persistência
 */
function saveData() {
    localStorage.setItem('sinir_by_allan_data', JSON.stringify(accesses));
}

function deleteItem(id, event) {
    // Impede que o clique no botão de excluir abra o modal de detalhes
    if (event) event.stopPropagation();
    
    if (confirm('Deseja remover este registro permanentemente?')) {
        accesses = accesses.filter(a => a.id !== id);
        saveData();
        render();
        // Se o modal de detalhes estiver aberto, fecha ele
        closeDetails();
    }
}

accessForm.addEventListener('submit', (e) => {
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
    accessForm.reset();
    toggleModal();
});

/**
 * Importação e Exportação
 */
function exportBackup() {
    if (accesses.length === 0) return alert('Sem dados para exportar.');
    const blob = new Blob([JSON.stringify(accesses, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BACKUP-SINIR-ALLAN-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data)) {
                accesses = [...accesses, ...data];
                saveData();
                render();
                toggleImportModal();
                showToast('RESTAURADO!');
            }
        } catch (err) { alert('Erro no arquivo JSON.'); }
    };
    reader.readAsText(file);
}

function processBulkImport() {
    const text = document.getElementById('bulkImportArea').value;
    if (!text.trim()) return;

    // Split por palavras chave comuns de início de bloco
    const blocks = text.split(/(?=cnpj\/cpf:)|(?=empresa:)/i).filter(b => b.trim() !== "");
    
    let added = 0;
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        const find = (label) => {
            const match = block.match(new RegExp(`${label}\\s*[:\\-]?\\s*(.*)`, 'i'));
            return match ? match[1].trim() : "";
        };

        const senhaIdx = lines.findIndex(l => l.toLowerCase().includes('senha:'));
        let obsText = "";
        if (senhaIdx !== -1 && lines.length > senhaIdx + 1) {
            obsText = lines.slice(senhaIdx + 1).join(' ');
        }

        const entry = {
            id: Date.now() + Math.random(),
            cnpj_cpf: find('cnpj/cpf'),
            unidade: find('codigo unidade'),
            empresa: find('empresa'),
            usuario: find('usuario'),
            cpf_acesso: find('cpf'),
            senha: find('senha'),
            obs: obsText,
            date: new Date().toLocaleDateString()
        };

        if (entry.empresa || entry.senha) {
            accesses.push(entry);
            added++;
        }
    });

    if (added > 0) {
        saveData();
        render();
        document.getElementById('bulkImportArea').value = "";
        toggleImportModal();
        showToast(`${added} IMPORTADOS!`);
    }
}

/**
 * Função para visualizar detalhes do card
 */
function showDetails(id) {
    const item = accesses.find(a => a.id === id);
    if (!item) return;

    // Cria o elemento do modal se não existir
    let detailsModal = document.getElementById('detailsModal');
    if (!detailsModal) {
        detailsModal = document.createElement('div');
        detailsModal.id = 'detailsModal';
        detailsModal.className = 'modal-overlay hidden';
        document.body.appendChild(detailsModal);
    }

    detailsModal.innerHTML = `
        <div class="modal-content max-w-xl">
            <div class="modal-header">
                <h2 class="text-xl font-black text-indigo-800 uppercase truncate pr-4">${item.empresa}</h2>
                <button onclick="closeDetails()" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button>
            </div>
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                ${renderDetailField('CNPJ/CPF', item.cnpj_cpf)}
                ${renderDetailField('Código Unidade', item.unidade)}
                ${renderDetailField('Empresa', item.empresa)}
                ${renderDetailField('Usuário', item.usuario)}
                ${renderDetailField('CPF de Acesso', item.cpf_acesso)}
                ${renderDetailField('Senha', item.senha, true)}
                
                ${item.obs ? `
                    <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <span class="text-[10px] font-black text-amber-600 uppercase tracking-widest">Observações</span>
                        <p class="text-sm font-black text-slate-800 mt-1">${item.obs}</p>
                    </div>
                ` : ''}
            </div>
            <div class="p-4 bg-slate-50 border-t flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>CADASTRADO EM: ${item.date}</span>
                <button onclick="deleteItem(${item.id})" class="text-red-500 hover:underline">EXCLUIR REGISTRO</button>
            </div>
        </div>
    `;

    detailsModal.classList.remove('hidden');
    lucide.createIcons();
}

function renderDetailField(label, value, isPassword = false) {
    if (!value) return '';
    return `
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center group">
            <div class="truncate mr-2">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">${label}</span>
                <span class="text-sm font-bold text-slate-700 ${isPassword ? 'font-mono tracking-widest' : ''}">${value}</span>
            </div>
            <button onclick="copy('${value}')" class="bg-white p-2 rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">
                <i data-lucide="copy" class="w-4 h-4"></i>
            </button>
        </div>
    `;
}

function closeDetails() {
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal) detailsModal.classList.add('hidden');
}

/**
 * Renderização dos Cards (Organizados em Ordem Alfabética)
 */
function render() {
    const query = searchBar.value.toLowerCase();
    
    // Filtra e organiza em ordem alfabética pela Empresa
    const filtered = accesses
        .filter(a => 
            (a.empresa || "").toLowerCase().includes(query) ||
            (a.cnpj_cpf || "").toLowerCase().includes(query) ||
            (a.usuario || "").toLowerCase().includes(query) ||
            (a.unidade || "").toLowerCase().includes(query)
        )
        .sort((a, b) => {
            const nameA = (a.empresa || "").toLowerCase();
            const nameB = (b.empresa || "").toLowerCase();
            return nameA.localeCompare(nameB);
        });

    totalCountLabel.textContent = `Total: ${filtered.length}`;
    
    if (filtered.length === 0) {
        accessGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        accessGrid.innerHTML = filtered.map(a => `
            <div onclick="showDetails(${a.id})" class="access-card cursor-pointer group active:scale-95 transition-transform">
                <div class="p-6 flex-1">
                    <div class="flex justify-between items-start mb-3">
                        <div class="bg-indigo-50 text-indigo-700 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl uppercase group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            ${(a.empresa || "?").charAt(0)}
                        </div>
                        <button onclick="deleteItem(${a.id}, event)" class="text-slate-200 hover:text-red-500 transition-all p-1">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <h3 class="font-black text-lg text-slate-800 mb-1 truncate uppercase">${a.empresa || 'S/ NOME'}</h3>
                    <div class="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <span>CNPJ: ${a.cnpj_cpf || '---'}</span>
                    </div>
                    
                    <div class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                         <span class="text-[9px] font-black text-indigo-500 uppercase">Clique para ver mais</span>
                         <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }
    lucide.createIcons();
}

// Inicia
window.onload = render;
