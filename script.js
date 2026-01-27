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

function deleteItem(id) {
    if (confirm('Deseja remover este registro permanentemente?')) {
        accesses = accesses.filter(a => a.id !== id);
        saveData();
        render();
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
 * Renderização dos Cards
 */
function render() {
    const query = searchBar.value.toLowerCase();
    const filtered = accesses.filter(a => 
        (a.empresa || "").toLowerCase().includes(query) ||
        (a.cnpj_cpf || "").toLowerCase().includes(query) ||
        (a.usuario || "").toLowerCase().includes(query) ||
        (a.unidade || "").toLowerCase().includes(query)
    );

    totalCountLabel.textContent = `Total: ${filtered.length}`;
    
    if (filtered.length === 0) {
        accessGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        accessGrid.innerHTML = filtered.map(a => `
            <div class="access-card">
                <div class="p-6 flex-1">
                    <!-- Topo Card -->
                    <div class="flex justify-between items-start mb-4">
                        <div class="bg-indigo-50 text-indigo-700 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl uppercase">
                            ${(a.empresa || "?").charAt(0)}
                        </div>
                        <button onclick="deleteItem(${a.id})" class="text-slate-300 hover:text-red-500 transition-all p-1">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <h3 class="font-black text-xl text-slate-800 mb-1 truncate uppercase">${a.empresa || 'S/ NOME'}</h3>
                    
                    <!-- Linha CNPJ -->
                    <div class="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">
                        <span>CNPJ: ${a.cnpj_cpf || '---'}</span>
                        <button onclick="copy('${a.cnpj_cpf}')" class="copy-badge"><i data-lucide="copy" class="w-3 h-3"></i></button>
                    </div>

                    <div class="space-y-2">
                        <!-- Usuário -->
                        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center group">
                            <div class="truncate mr-2">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">Usuário / CPF</span>
                                <span class="text-sm font-bold text-slate-700">${a.usuario || '---'}</span>
                            </div>
                            <button onclick="copy('${a.usuario || a.cpf_acesso}')" class="copy-badge opacity-0 group-hover:opacity-100"><i data-lucide="copy" class="w-4 h-4"></i></button>
                        </div>

                        <!-- Senha -->
                        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center group">
                            <div class="truncate mr-2">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">Senha</span>
                                <span class="text-sm font-mono font-bold text-slate-700 tracking-widest">••••••••</span>
                            </div>
                            <button onclick="copy('${a.senha}')" class="copy-badge opacity-0 group-hover:opacity-100"><i data-lucide="copy" class="w-4 h-4"></i></button>
                        </div>

                        <!-- CPF Acesso (se houver e for diferente do usuário) -->
                        ${a.cpf_acesso && a.cpf_acesso !== a.usuario ? `
                        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center group">
                            <div class="truncate mr-2">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">CPF ACESSO</span>
                                <span class="text-sm font-bold text-slate-700">${a.cpf_acesso}</span>
                            </div>
                            <button onclick="copy('${a.cpf_acesso}')" class="copy-badge opacity-0 group-hover:opacity-100"><i data-lucide="copy" class="w-4 h-4"></i></button>
                        </div>
                        ` : ''}

                        <!-- Observação em Negrito -->
                        ${a.obs ? `
                            <div class="bg-amber-50 p-3 rounded-2xl border border-amber-100 mt-2">
                                <span class="text-[9px] font-black text-amber-600 uppercase">Observação</span>
                                <p class="text-xs font-black text-slate-800 leading-tight mt-1">${a.obs}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Rodapé Card -->
                <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    <div class="flex items-center gap-1">
                        <span>UNID: ${a.unidade || 'N/A'}</span>
                        <button onclick="copy('${a.unidade}')" class="copy-badge p-1"><i data-lucide="copy" class="w-2.5 h-2.5"></i></button>
                    </div>
                    <span>REF: ${a.date}</span>
                </div>
            </div>
        `).join('');
    }
    lucide.createIcons();
}

// Inicia
window.onload = render;
