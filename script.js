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
const toast = document.getElementById('toast');

/**
 * Alterna a visibilidade do modal
 */
function toggleModal() {
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        document.getElementById('empresa').focus();
    }
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
 * Processa o envio do formulário
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
 * Escuta o campo de busca
 */
searchBar.addEventListener('input', render);

/**
 * Renderiza a lista de acessos na tela
 */
function render() {
    const searchTerm = searchBar.value.toLowerCase();
    
    const filtered = accesses.filter(item => 
        item.empresa.toLowerCase().includes(searchTerm) || 
        item.usuario.toLowerCase().includes(searchTerm) || 
        item.cnpj_cpf.toLowerCase().includes(searchTerm)
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
                            ${item.empresa.charAt(0)}
                        </div>
                        <button onclick="deleteAccess(${item.id})" class="text-slate-300 hover:text-red-500 transition-colors">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <h3 class="font-bold text-lg text-slate-800 mb-1 truncate" title="${item.empresa}">${item.empresa}</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                        CNPJ/CPF: ${item.cnpj_cpf || 'Não informado'}
                    </p>
                    
                    <div class="space-y-3">
                        <!-- Campo Usuário -->
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-[9px] font-bold text-slate-400 uppercase">Usuário / Acesso</span>
                                <button onclick="copyToClipboard('${item.usuario || item.cpf_acesso}')" class="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 font-bold">
                                    <i data-lucide="copy" class="w-3 h-3"></i> COPIAR
                                </button>
                            </div>
                            <div class="text-sm font-medium text-slate-700 truncate">
                                ${item.usuario} ${item.cpf_acesso ? `<span class="text-slate-400 font-normal">| ${item.cpf_acesso}</span>` : ''}
                            </div>
                        </div>

                        <!-- Campo Senha -->
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

    // Re-renderizar ícones inseridos dinamicamente
    lucide.createIcons();
}

// Inicializar a lista ao carregar a página
window.addEventListener('DOMContentLoaded', render);
