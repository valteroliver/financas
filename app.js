// Base de dados local
let transacoes = JSON.parse(localStorage.getItem('fin_transacoes')) || [];
let metas = JSON.parse(localStorage.getItem('fin_metas')) || [
  { titulo: 'Reserva de Emergência', alvo: 10000, atual: 1500 }
];

let chartCategorias = null;

const CATEGORIAS = {
  despesa: ['Alimentação 🍔', 'Moradia 🏠', 'Transporte 🚗', 'Saúde 💊', 'Lazer 🎉', 'Outros 🛒'],
  receita: ['Salário 💼', 'Freelance 💻', 'Rendimentos 📈', 'Outros 💵'],
  investimento: ['Reserva 🛡️', 'Ações/FIIs 📊', 'CDB/Poupança 💰', 'Cripto 🪙']
};

function navegar(tabId, el) {
  document.querySelectorAll('.tab-view').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  el.classList.add('active');
  window.scrollTo(0, 0);
}

function atualizarOpcoesCategorias() {
  const tipo = document.getElementById('tipo').value;
  const selectCat = document.getElementById('categoria');
  selectCat.innerHTML = '';
  CATEGORIAS[tipo].forEach(cat => {
    selectCat.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

function abrirModal() {
  atualizarOpcoesCategorias();
  document.getElementById('modalTransacao').classList.add('active');
}

function fecharModal() {
  document.getElementById('modalTransacao').classList.remove('active');
  document.getElementById('desc').value = '';
  document.getElementById('valor').value = '';
}

function salvarTransacao() {
  const desc = document.getElementById('desc').value;
  const valor = parseFloat(document.getElementById('valor').value);
  const tipo = document.getElementById('tipo').value;
  const categoria = document.getElementById('categoria').value;

  if (!desc || isNaN(valor) || valor <= 0) {
    alert('Preencha os dados corretamente!');
    return;
  }

  transacoes.unshift({
    id: Date.now(),
    desc,
    valor,
    tipo,
    categoria,
    data: new Date().toLocaleDateString('pt-BR')
  });

  localStorage.setItem('fin_transacoes', JSON.stringify(transacoes));
  fecharModal();
  renderizar();
}

function deletarTransacao(id) {
  transacoes = transacoes.filter(t => t.id !== id);
  localStorage.setItem('fin_transacoes', JSON.stringify(transacoes));
  renderizar();
}

function criarMeta() {
  const titulo = document.getElementById('metaTitulo').value;
  const alvo = parseFloat(document.getElementById('metaAlvo').value);

  if (!titulo || isNaN(alvo) || alvo <= 0) {
    alert('Preencha os dados da meta!');
    return;
  }

  metas.push({ titulo, alvo, atual: 0 });
  localStorage.setItem('fin_metas', JSON.stringify(metas));
  document.getElementById('metaTitulo').value = '';
  document.getElementById('metaAlvo').value = '';
  renderizarMetas();
}

function adicionarAporteMeta(index) {
  const valor = prompt('Quanto deseja guardar para essa meta agora? (R$)');
  const valorNum = parseFloat(valor);
  if (!isNaN(valorNum) && valorNum > 0) {
    metas[index].atual += valorNum;
    localStorage.setItem('fin_metas', JSON.stringify(metas));
    renderizarMetas();
  }
}

function renderizarDashboard() {
  let rec = 0, desp = 0, inv = 0;
  const catGastos = {};

  transacoes.forEach(t => {
    if (t.tipo === 'receita') rec += t.valor;
    if (t.tipo === 'despesa') {
      desp += t.valor;
      catGastos[t.categoria] = (catGastos[t.categoria] || 0) + t.valor;
    }
    if (t.tipo === 'investimento') inv += t.valor;
  });

  const saldo = rec - desp - inv;

  document.getElementById('saldoTotal').innerText = `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('totalReceitas').innerText = `+ R$ ${rec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('totalDespesas').innerText = `- R$ ${desp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('totalInvestido').innerText = `R$ ${inv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Gráfico de Categorias
  const ctx = document.getElementById('graficoCategorias').getContext('2d');
  const labels = Object.keys(catGastos);
  const dataValues = Object.values(catGastos);

  if (chartCategorias) chartCategorias.destroy();

  chartCategorias = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sem despesas'],
      datasets: [{
        data: dataValues.length ? dataValues : [1],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });

  // Lista Recente
  const recentesDiv = document.getElementById('listaRecentes');
  recentesDiv.innerHTML = transacoes.slice(0, 4).map(t => formatarLinhaTransacao(t)).join('') || '<p style="color:#888;font-size:13px;">Nenhuma movimentação ainda.</p>';
}

function renderizarExtrato() {
  const lista = document.getElementById('listaCompleta');
  lista.innerHTML = transacoes.map(t => formatarLinhaTransacao(t)).join('') || '<p style="color:#888;font-size:13px;">Nenhum lançamento.</p>';
}

function formatarLinhaTransacao(t) {
  const cor = t.tipo === 'receita' ? 'text-green' : (t.tipo === 'despesa' ? 'text-red' : 'text-blue');
  const sinal = t.tipo === 'receita' ? '+' : '-';
  return `
    <div class="transacao-item">
      <div class="transacao-dados">
        <div class="transacao-nome">${t.desc}</div>
        <div class="transacao-cat">${t.categoria} • ${t.data}</div>
      </div>
      <div style="text-align:right;">
        <div class="${cor}" style="font-weight:bold;">${sinal} R$ ${t.valor.toFixed(2)}</div>
        <button class="btn-danger" onclick="deletarTransacao(${t.id})">Excluir</button>
      </div>
    </div>
  `;
}

function renderizarMetas() {
  const container = document.getElementById('listaMetas');
  container.innerHTML = metas.map((m, index) => {
    const porcento = Math.min(100, Math.round((m.atual / m.alvo) * 100));
    return `
      <div class="card">
        <div class="card-title">
          <span>${m.titulo}</span>
          <span style="color:var(--accent); font-size:13px;">${porcento}%</span>
        </div>
        <div class="meta-progresso">
          <div class="meta-barra" style="width: ${porcento}%"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:13px; color:#64748b; margin-top:4px;">
          <span>Guardado: R$ ${m.atual.toFixed(2)}</span>
          <span>Meta: R$ ${m.alvo.toFixed(2)}</span>
        </div>
        <button class="btn-primary" style="padding:8px; margin-top:10px; font-size:13px;" onclick="adicionarAporteMeta(${index})">+ Guardar Dinheiro</button>
      </div>
    `;
  }).join('');
}

function exportarBackup() {
  const backup = { transacoes, metas };
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup_financas_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

function importarBackup(event) {
  const reader = new FileReader();
  reader.onload = function() {
    try {
      const data = JSON.parse(reader.result);
      if (data.transacoes) transacoes = data.transacoes;
      if (data.metas) metas = data.metas;
      localStorage.setItem('fin_transacoes', JSON.stringify(transacoes));
      localStorage.setItem('fin_metas', JSON.stringify(metas));
      renderizar();
      alert('Dados restaurados com sucesso!');
    } catch(e) {
      alert('Arquivo inválido!');
    }
  };
  reader.readAsText(event.target.files[0]);
}

function renderizar() {
  renderizarDashboard();
  renderizarExtrato();
  renderizarMetas();
}

// Service Worker Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

renderizar();