// Inicia os ícones da biblioteca Lucide
lucide.createIcons();

// Banco de dados local (localStorage)
let accesses = JSON.parse(localStorage.getItem('sinir_by_allan_data')) || [];

// Referências dos elementos da interface
const accessForm = document.getElementById('accessForm');
const searchBar = document.getElementById('searchBar');
const accessGrid = document.getElementById('accessGrid');
const emptyState = document.getElementById('emptyState');
const totalCountLabel = document.getElementById('totalCount');
const toast = document.getElementById('toast');

/**
 * Funções de controle dos Modais
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
 * Sistema de Notificação e Cópia
 */
function showToast(msg) {
    toast.textContent = msg || 'COPIADO!';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

function copy(text) {
    if (!text || text === '---') return;
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast();
}

/**
 * Gerenciamento de Dados (Persistência)
 */
function saveData() {
    localStorage.setItem('sinir_by_allan_data', JSON.stringify(accesses));
}

function deleteItem(id, event) {
    if (event) event.stopPropagation();
    
    if (confirm('Deseja remover este registro permanentemente?')) {
        accesses = accesses.filter(a => a.id !== id);
        saveData();
        render();
        closeDetails();
    }
}

// Cadastro manual via formulário
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
 * Exportação e Importação de Arquivos
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

/**
 * Processamento da Prancheta (Importação em Massa)
 * Refinado para distinguir "cnpj/cpf" de "cpf"
 */
function processBulkImport() {
    const text = document.getElementById('bulkImportArea').value;
    if (!text.trim()) return;

    // Divide o texto em blocos (cada bloco começa com CNPJ ou Empresa)
    const blocks = text.split(/(?=cnpj\/cpf:)|(?=empresa:)/i).filter(b => b.trim() !== "");
    
    let added = 0;
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l !== "");
        
        const find = (label) => {
            // Regex que garante que o rótulo não é precedido por '/' (ex: evita que 'cpf' pegue 'cnpj/cpf')
            // O rótulo deve estar no início da linha ou após uma quebra de linha
            const regex = new RegExp(`(^|\\n)(?<!\\/)${label}\\s*[:\\-]?\\s*(.*)`, 'i');
            const match = block.match(regex);
            return match ? match[2].trim() : "";
        };

        const senhaIdx = lines.findIndex(l => l.toLowerCase().includes('senha:'));
        let obsText = "";
        if (senhaIdx !== -1 && lines.length > senhaIdx + 1) {
            obsText = lines.slice(senhaIdx + 1).join(' ');
        }

        const entry = {
            id: Date.now() + Math.random(),
            cnpj_cpf: find('cnpj\\/cpf'), // Escapa a barra para o regex
            unidade: find('codigo unidade'),
            empresa: find('empresa'),
            usuario: find('usuario'),
            cpf_acesso: find('cpf'), // O lookbehind (?<!\/) impede de pegar o 'cnpj/cpf'
            senha: find('senha'),
            obs: obsText,
            date: new Date().toLocaleDateString()
        };

        // Só adiciona se tiver pelo menos o nome da empresa ou senha
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
    } else {
        alert('Não foi possível encontrar dados. Verifique o formato do texto.');
    }
}

/**
 * Visualização Detalhada do Card
 */
function showDetails(id) {
    const item = accesses.find(a => a.id === id);
    if (!item) return;

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
                <h2 class="text-xl font-black text-indigo-800 uppercase truncate pr-4">${item.empresa || 'DETALHES'}</h2>
                <button onclick="closeDetails()" class="text-slate-400 hover:text-red-500 transition-colors"><i data-lucide="x"></i></button>
            </div>
            <div class="p-6 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                ${renderDetailField('CNPJ / CPF:', item.cnpj_cpf)}
                ${renderDetailField('CÓDIGO UNIDADE:', item.unidade)}
                ${renderDetailField('EMPRESA:', item.empresa)}
                ${renderDetailField('USUÁRIO:', item.usuario)}
                ${renderDetailField('CPF (ACESSO):', item.cpf_acesso)}
                ${renderDetailField('SENHA:', item.senha, true)}
                
                ${item.obs ? `
                    <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100 mt-4">
                        <span class="text-[10px] font-black text-amber-600 uppercase tracking-widest">Observações</span>
                        <p class="text-sm font-black text-slate-800 mt-1 leading-tight">${item.obs}</p>
                    </div>
                ` : ''}
            </div>
            <div class="p-4 bg-slate-50 border-t flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>REF: ${item.date}</span>
                <button onclick="deleteItem(${item.id})" class="text-red-400 hover:text-red-600 uppercase tracking-tighter">Excluir este registro</button>
            </div>
        </div>
    `;

    detailsModal.classList.remove('hidden');
    lucide.createIcons();
}

/**
 * Renderiza cada linha de campo com botão de cópia
 */
function renderDetailField(label, value, isPassword = false) {
    const displayValue = value && value.trim() !== "" ? value : "---";
    return `
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-white hover:border-indigo-200 transition-all group">
            <div class="truncate mr-2">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">${label}</span>
                <span class="text-sm font-bold text-slate-700 ${isPassword ? 'font-mono tracking-widest' : ''}">${displayValue}</span>
            </div>
            <button onclick="copy('${displayValue}')" class="bg-white p-2 rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all active:scale-90" title="Copiar">
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
 * Renderização da Grade de Cards (Ordem Alfabética)
 */
function render() {
    const query = searchBar.value.toLowerCase();
    
    // Filtra pela busca e ordena de A-Z pela Empresa
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
                        <div class="text-slate-200 group-hover:text-indigo-200 transition-colors">
                            <i data-lucide="external-link" class="w-5 h-5"></i>
                        </div>
                    </div>

                    <h3 class="font-black text-lg text-slate-800 mb-1 truncate uppercase group-hover:text-indigo-700 transition-colors">${a.empresa || 'S/ NOME'}</h3>
                    <div class="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <i data-lucide="hash" class="w-3 h-3 mr-1"></i> CNPJ: ${a.cnpj_cpf || '---'}
                    </div>
                    
                    <div class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                         <span class="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">Clique para ver tudo</span>
                         <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }
    lucide.createIcons();
}

// Inicialização ao carregar a página
window.onload = render;
