/**
 * Gerenciador de Acessos - Lógica principal
 */

// Inicializar ícones da biblioteca Lucide
lucide.createIcons();

// Estado Global - Busca do localStorage ou inicia vazio
let accesses = JSON.parse(localStorage.getItem('myAccessVault')) || [];

// Referências de Elementos do DOM
const accessForm = document.getElementById('accessForm');
const searchBar = document.getElementById('searchBar');
const accessGrid = document.getElementById('accessGrid');
const totalCountLabel = document.getElementById('totalCount');
const emptyState = document.getElementById('emptyState');
const modal = document.getElementById('accessModal');
const importModal = document.getElementById('importModal');
const toast = document.getElementById('toast');

/**
 * Alterna a visibilidade do modal de cadastro individual
 */
function toggleModal() {
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        document.getElementById('empresa').focus();
    }
}

/**
 * Alterna a visibilidade do modal de importação
 */
function toggleImportModal() {
    importModal.classList.toggle('hidden');
}

/**
 * Exibe uma notificação temporária
 */
function showToast(message) {
    toast.textContent = message || 'Copiado!';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

/**
 * Copia texto para a área de transferência
 */
function copyToClipboard(text) {
    if (!text) return;
    
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast('Copiado com sucesso!');
    } catch (err) {
        console.error('Erro ao copiar', err);
    }
    
    document.body.removeChild(textarea);
}

/**
 * Salva os dados no LocalStorage
 */
function saveData() {
    localStorage.setItem('myAccessVault', JSON.stringify(accesses));
}

/**
 * Remove um item de acesso pelo ID
 */
function deleteAccess(id) {
    if (confirm('Deseja excluir este acesso permanentemente?')) {
        accesses = accesses.filter(item => item.id !== id);
        saveData();
        render();
    }
}

/**
 * Processa o envio do formulário individual
 */
accessForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newEntry = {
        id: Date.now(),
        empresa: document.getElementById('empresa').value,
        cnpj_cpf: document.getElementById('cnpj_cpf').value,
        unidade: document.getElementById('unidade').value,
        usuario: document.getElementById('usuario').value,
        cpf_acesso: document.getElementById('cpf_acesso').value,
        senha: document.getElementById('senha').value,
        createdAt: new Date().toLocaleDateString()
    };

    accesses.push(newEntry);
    saveData();
    render();
    
    accessForm.reset();
    toggleModal();
});

/**
 * Backup: Exporta os dados para um arquivo JSON
 */
function exportBackup() {
    if (accesses.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    
    const dataStr = JSON.stringify(accesses, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `backup-accessvault-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

/**
 * Restauração: Importa dados de um arquivo JSON
 */
function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if (confirm(`Deseja importar ${importedData.length} registros? Isso manterá os atuais e adicionará os novos.`)) {
                    accesses = [...accesses, ...importedData];
                    saveData();
                    render();
                    toggleImportModal();
                    showToast('Importação concluída!');
                }
            } else {
                alert('Arquivo inválido.');
            }
        } catch (err) {
            alert('Erro ao ler o arquivo JSON.');
        }
    };
    reader.readAsText(file);
}

/**
 * Importação em Massa: Processa texto da prancheta
 */
function processBulkImport() {
    const text = document.getElementById('bulkImportArea').value;
    if (!text.trim()) return;

    // Split por blocos (tenta identificar onde começa um novo registro)
    // Se o usuário colar vários blocos que começam com "cnpj/cpf:", usamos isso como separador
    const blocks = text.split(/cnpj\/cpf:/i).filter(b => b.trim() !== "");
    
    let count = 0;
    const newItems = blocks.map(block => {
        // Função auxiliar para extrair valor baseado em rótulo
        const extract = (label) => {
            const regex = new RegExp(`${label}\\s*[:\\-]?\\s*(.*)`, 'i');
            const match = block.match(regex);
            return match ? match[1].trim().split('\n')[0] : "";
        };

        const item = {
            id: Date.now() + Math.random(),
            cnpj_cpf: extract(''), // O primeiro valor do split é o conteúdo após cnpj/cpf:
            unidade: extract('codigo unidade'),
            empresa: extract('empresa'),
            usuario: extract('usuario'),
            cpf_acesso: extract('cpf'),
            senha: extract('senha'),
            createdAt: new Date().toLocaleDateString()
        };

        // Fallback: Se não encontrou rótulos, tenta pegar por ordem de linha se for um bloco simples
        if (!item.empresa && !item.senha) {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l !== "");
            if (lines.length >= 2) {
                item.empresa = lines[2] || lines[0];
                item.senha = lines[lines.length - 1];
            }
        }

        if (item.empresa || item.senha) count++;
        return item;
    });

    if (count > 0) {
        accesses = [...accesses, ...newItems];
        saveData();
        render();
        document.getElementById('bulkImportArea').value = "";
        toggleImportModal();
        showToast(`${count} acessos importados!`);
    } else {
        alert('Não foi possível identificar dados válidos no texto.');
    }
}

/**
 * Escuta o campo de busca
 */
searchBar.addEventListener('input', render);

/**
 * Renderiza a lista de acessos na tela
 */
function render() {
    const searchTerm = searchBar.value.toLowerCase();
    
    const filtered = accesses.filter(item => 
        (item.empresa || "").toLowerCase().includes(searchTerm) || 
        (item.usuario || "").toLowerCase().includes(searchTerm) || 
        (item.cnpj_cpf || "").toLowerCase().includes(searchTerm)
    );

    totalCountLabel.textContent = `Total: ${filtered.length}`;

    if (filtered.length === 0) {
        accessGrid.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        accessGrid.innerHTML = filtered.map(item => `
            <div class="access-card group">
                <div class="p-5">
                    <div class="flex justify-between items-start mb-4">
                        <div class="bg-indigo-50 text-indigo-700 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl uppercase">
                            ${(item.empresa || "?").charAt(0)}
                        </div>
                        <button onclick="deleteAccess(${item.id})" class="text-slate-300 hover:text-red-500 transition-colors">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <h3 class="font-bold text-lg text-slate-800 mb-1 truncate" title="${item.empresa}">${item.empresa || 'Sem Nome'}</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                        CNPJ/CPF: ${item.cnpj_cpf || '---'}
                    </p>
                    
                    <div class="space-y-3">
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-[9px] font-bold text-slate-400 uppercase">Usuário / Acesso</span>
                                <button onclick="copyToClipboard('${item.usuario || item.cpf_acesso}')" class="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 font-bold">
                                    <i data-lucide="copy" class="w-3 h-3"></i> COPIAR
                                </button>
                            </div>
                            <div class="text-sm font-medium text-slate-700 truncate">
                                ${item.usuario || '---'} ${item.cpf_acesso ? `<span class="text-slate-400 font-normal">| ${item.cpf_acesso}</span>` : ''}
                            </div>
                        </div>

                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-[9px] font-bold text-slate-400 uppercase">Senha</span>
                                <button onclick="copyToClipboard('${item.senha}')" class="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 font-bold">
                                    <i data-lucide="copy" class="w-3 h-3"></i> COPIAR
                                </button>
                            </div>
                            <div class="text-sm font-mono font-medium text-slate-700 flex justify-between items-center">
                                <span>••••••••</span>
                                <i data-lucide="lock" class="w-3 h-3 text-slate-300"></i>
                            </div>
                        </div>
                    </div>
                    
                    ${item.unidade ? `
                        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                            <i data-lucide="map-pin" class="w-3 h-3"></i>
                            Unidade: <span class="font-bold text-slate-700">${item.unidade}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    lucide.createIcons();
}

// Inicializar a lista ao carregar a página
window.addEventListener('DOMContentLoaded', render);
