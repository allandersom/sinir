/**
 * ACESSO DO SINIR BY ALLAN - Versão Premium
 * Foco em Design, Ordem Alfabética e Senha sempre Visível.
 */

lucide.createIcons();

let accesses = JSON.parse(localStorage.getItem('sinir_by_allan_final')) || [];
let editingId = null;

const accessGrid = document.getElementById('accessGrid');
const searchBar = document.getElementById('searchBar');
const totalCountLabel = document.getElementById('totalCount');
const toast = document.getElementById('toast');
const accessForm = document.getElementById('accessForm');

function toggleModal() {
    const modal = document.getElementById('accessModal');
    modal.classList.toggle('hidden');
    if (modal.classList.contains('hidden')) {
        editingId = null;
        accessForm.reset();
    }
}

function toggleImportModal() {
    document.getElementById('importModal').classList.toggle('hidden');
}

function prepareNewEntry() {
    editingId = null;
    document.getElementById('modalTitle').textContent = "Novo Registro";
    document.getElementById('saveBtnText').textContent = "SALVAR DADOS";
    accessForm.reset();
    toggleModal();
}

function editEntry(id) {
    const item = accesses.find(a => a.id === id);
    if (!item) return;

    editingId = id;
    document.getElementById('modalTitle').textContent = "Atualizar Acesso";
    document.getElementById('saveBtnText').textContent = "ATUALIZAR REGISTRO";

    document.getElementById('empresa').value = item.empresa || "";
    document.getElementById('cnpj_cpf').value = item.cnpj_cpf || "";
    document.getElementById('unidade').value = item.unidade || "";
    document.getElementById('usuario').value = item.usuario || "";
    document.getElementById('cpf_acesso').value = item.cpf_acesso || "";
    document.getElementById('senha').value = item.senha || "";
    document.getElementById('obs').value = item.obs || "";

    closeDetails();
    toggleModal();
}

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

accessForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
        empresa: document.getElementById('empresa').value,
        cnpj_cpf: document.getElementById('cnpj_cpf').value,
        unidade: document.getElementById('unidade').value,
        usuario: document.getElementById('usuario').value,
        cpf_acesso: document.getElementById('cpf_acesso').value,
        senha: document.getElementById('senha').value,
        obs: document.getElementById('obs').value,
    };

    if (editingId) {
        const index = accesses.findIndex(a => a.id === editingId);
        if (index !== -1) {
            accesses[index] = { ...accesses[index], ...data };
            showToast('ATUALIZADO!');
        }
    } else {
        const entry = {
            id: Date.now(),
            ...data,
            date: new Date().toLocaleDateString()
        };
        accesses.push(entry);
        showToast('CADASTRO REALIZADO!');
    }

    saveData();
    render();
    editingId = null;
    accessForm.reset();
    toggleModal();
});

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
        } catch (err) { alert('Erro no arquivo JSON.'); }
    };
    reader.readAsText(file);
}

/**
 * Função de Processamento de Importação em Massa (Prancheta)
 * Corrigida para mapear exatamente os campos CNPJ, Unidade, Empresa, Usuário, CPF e Senha.
 */
function processBulkImport() {
    const text = document.getElementById('bulkImportArea').value;
    if (!text.trim()) return;

    // Divide em blocos caso o usuário cole vários seguidos (iniciando por CNPJ ou Empresa)
    const blocks = text.split(/(?=cnpj:)|(?=empresa:)|(?=cnpj\/cpf:)/i).filter(b => b.trim() !== "");
    
    let addedCount = 0;
    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l !== "");
        const entry = {
            id: Date.now() + Math.random(),
            date: new Date().toLocaleDateString(),
            cnpj_cpf: "", unidade: "", empresa: "", usuario: "", cpf_acesso: "", senha: "", obs: ""
        };

        // Mapeamento linha a linha baseado nos rótulos específicos
        lines.forEach(line => {
            const lower = line.toLowerCase();
            const val = line.split(/[:\-](.+)/)[1]?.trim() || "";

            if (lower.startsWith('cnpj:')) entry.cnpj_cpf = val;
            else if (lower.startsWith('cnpj/cpf:')) entry.cnpj_cpf = val;
            else if (lower.startsWith('código unidade:') || lower.startsWith('codigo unidade:')) entry.unidade = val;
            else if (lower.startsWith('empresa:')) entry.empresa = val;
            else if (lower.startsWith('usuário:') || lower.startsWith('usuario:')) entry.usuario = val;
            else if (lower.startsWith('cpf:')) entry.cpf_acesso = val;
            else if (lower.startsWith('senha:')) entry.senha = val;
        });

        // Captura o que sobrou após a linha da senha como Observação
        const senhaLineIdx = lines.findIndex(l => l.toLowerCase().startsWith('senha:'));
        if (senhaLineIdx !== -1 && lines.length > senhaLineIdx + 1) {
            entry.obs = lines.slice(senhaLineIdx + 1).join(' ').trim();
        }

        // Critério para considerar o registro válido
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
        showToast(`${addedCount} ACESSOS IMPORTADOS!`);
    } else {
        alert('Formato não reconhecido. Certifique-se de usar "Campo: Valor"');
    }
}

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
                <div>
                    <h2 class="text-2xl font-black text-indigo-900 uppercase truncate pr-4">${item.empresa || 'DETALHES'}</h2>
                </div>
                <div class="flex items-center gap-4">
                    <button onclick="editEntry(${item.id})" class="text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <i data-lucide="edit-3" class="w-4 h-4"></i> Editar
                    </button>
                    <button onclick="closeDetails()" class="close-btn"><i data-lucide="x"></i></button>
                </div>
            </div>
            <div class="p-10 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
                ${renderField('CNPJ / CPF DA EMPRESA:', item.cnpj_cpf)}
                ${renderField('CÓDIGO UNIDADE:', item.unidade)}
                ${renderField('NOME DA EMPRESA:', item.empresa)}
                ${renderField('USUÁRIO DE ACESSO:', item.usuario)}
                ${renderField('CPF DO USUÁRIO:', item.cpf_acesso)}
                ${renderField('SENHA:', item.senha)}
                
                ${item.obs ? `
                    <div class="bg-amber-50 p-6 rounded-[2.5rem] border-2 border-amber-100/50 mt-8 relative">
                        <span class="absolute -top-3 left-6 bg-amber-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Anotações</span>
                        <p class="text-sm font-black text-slate-800 leading-relaxed uppercase italic">"${item.obs}"</p>
                    </div>
                ` : ''}
            </div>
            <div class="p-6 bg-slate-50 border-t flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Data: ${item.date}</span>
                <button onclick="deleteEntry(${item.id})" class="text-red-400 hover:text-red-600">Eliminar</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    lucide.createIcons();
}

function renderField(label, value) {
    const val = value && value.trim() !== "" ? value : "---";
    return `
        <div class="detail-box">
            <div class="truncate mr-4">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">${label}</span>
                <span class="text-sm font-bold text-slate-800">${val}</span>
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

function render() {
    const query = searchBar.value.toLowerCase();
    
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
                    <div class="flex justify-between items-start mb-6">
                        <div class="bg-indigo-600 text-white w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-3xl uppercase">
                            ${(a.empresa || "?").charAt(0)}
                        </div>
                        <i data-lucide="expand" class="w-6 h-6 text-slate-200 group-hover:text-indigo-600 transition-colors"></i>
                    </div>

                    <h3 class="font-black text-xl text-slate-800 mb-1 truncate uppercase tracking-tight group-hover:text-indigo-600">
                        ${a.empresa || 'SEM NOME'}
                    </h3>
                    
                    <div class="flex flex-col gap-2 mt-4">
                        <div class="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            <i data-lucide="file-text" class="w-3 h-3 mr-2"></i> ${a.cnpj_cpf || '---'}
                        </div>
                    </div>
                    
                    <div class="mt-8 pt-5 border-t border-slate-50 flex items-center justify-between">
                         <span class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Credenciais</span>
                         <i data-lucide="chevron-right" class="w-5 h-5 text-slate-300 group-hover:translate-x-2 transition-transform"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }
    lucide.createIcons();
}

window.onload = render;
