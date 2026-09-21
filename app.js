// Armazenamento Local
let transacoes = JSON.parse(localStorage.getItem('fin_transacoes_v3')) || [];
let orcamentoTotalConfig = parseFloat(localStorage.getItem('fin_orcamento_limite')) || 4000;
let metas = JSON.parse(localStorage.getItem('fin_metas_v3')) || [
  { id: 1, titulo: 'Reserva de Emergência', alvo: 10000, atual: 2500, cor: 'verde' },
  { id: 2, titulo: 'Viagem de Férias', alvo: 3000, atual: 1200, cor: 'azul' }
];

let pinCadastrado = localStorage.getItem('fin_pin') || '1234';
let pinDigitado = '';
let tipoSelecionado = 'despesa';
let graficoInstance = null;

const CATEGORIAS = {
  despesa: ['Alimentação 🍔', 'Transporte 🚗', 'Moradia 🏠', 'Lazer 🎉', 'Saúde 💊', 'Compras 🛍️'],
  receita: ['Salário 💼', 'Freelance 💻', 'Investimentos 📈', 'Outros 💵']
};

// Gerenciamento de Abas
function mudarAba(screenId, indexBotao) {
  document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.menu-btn').forEach((b, idx) => {
    if (idx === indexBotao) b.classList.add('active');
    else b.classList.remove('active');
  });

  document.getElementById(screenId).classList.add('active');
  window.scrollTo(0, 0);

  if (screenId === 'screen-orcamento') carregarTelaOrcamento();
  if (screenId === 'screen-metas') carregarTelaMetas();
  if (screenId === 'screen-dashboard') inicializarDashboard();
}

// PIN e Bloqueio
function digitarPin(num) {
  if (pinDigitado.length < 4) {
    pinDigitado += num;
    atualizarDots();
  }
  if (pinDigitado.length === 4) setTimeout(verificarPin, 100);
}

function limparPin() {
  pinDigitado = '';
  atualizarDots();
}

function atualizarDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (i < pinDigitado.length) dot.classList.add('filled');
    else dot.classList.remove('filled');
  }
}

function verificarPin() {
  if (pinDigitado === pinCadastrado) {
    document.getElementById('lockscreen').style.display = 'none';
    limparPin();
    inicializarDashboard();
  } else {
    alert('PIN incorreto! Padrão: 1234');
    limparPin();
  }
}

function autenticarBiometria() {
  document.getElementById('lockscreen').style.display = 'none';
  inicializarDashboard();
}

function bloquearApp() {
  document.getElementById('lockscreen').style.display = 'flex';
  limparPin();
}

// Modais Lançamentos
function setTipo(tipo) {
  tipoSelecionado = tipo;
  document.getElementById('btn-tipo-despesa').className = 'tipo-btn' + (tipo === 'despesa' ? ' selected-despesa' : '');
  document.getElementById('btn-tipo-receita').className = 'tipo-btn' + (tipo === 'receita' ? ' selected-receita' : '');
  carregarCategorias();
}

function carregarCategorias() {
  const select = document.getElementById('campoCategoria');
  select.innerHTML = '';
  CATEGORIAS[tipoSelecionado].forEach(c => {
    select.innerHTML += `<option value="${c}">${c}</option>`;
  });
}

function abrirModal(tipo = 'despesa') {
  setTipo(tipo);
  document.getElementById('campoData').value = new Date().toISOString().slice(0, 10);
  document.getElementById('modalLancamento').classList.add('active');
}

function fecharModal() {
  document.getElementById('modalLancamento').classList.remove('active');
  document.getElementById('campoDescricao').value = '';
  document.getElementById('campoValor').value = '';
}

function salvarLancamento() {
  const desc = document.getElementById('campoDescricao').value;
  const valor = parseFloat(document.getElementById('campoValor').value);
  const cat = document.getElementById('campoCategoria').value;
  const data = document.getElementById('campoData').value;

  if (!desc || isNaN(valor) || valor <= 0) return alert('Preencha os dados!');

  transacoes.unshift({ id: Date.now(), desc, valor, tipo: tipoSelecionado, cat, data });
  localStorage.setItem('fin_transacoes_v3', JSON.stringify(transacoes));
  
  fecharModal();
  inicializarDashboard();
}

// TELA 01: Dashboard
function inicializarDashboard() {
  let rec = 0, desp = 0;
  transacoes.forEach(t => {
    if (t.tipo === 'receita') rec += t.valor;
    if (t.tipo === 'despesa') desp += t.valor;
  });

  const saldo = rec - desp;
  document.getElementById('dashSaldo').innerText = `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('dashReceitas').innerText = `+ R$ ${rec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('dashDespesas').innerText = `- R$ ${desp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('dashSaldoMes').innerText = `R$ ${(rec - desp).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const lista = document.getElementById('listaUltimas');
  lista.innerHTML = transacoes.length === 0 ? '<p style="color:#94a3b8; font-size:13px; text-align:center;">Nenhum gasto registrado.</p>' :
    transacoes.slice(0, 5).map(t => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9;">
        <div>
          <strong style="font-size:14px; display:block;">${t.desc}</strong>
          <span style="font-size:12px; color:#64748b;">${t.cat} • ${t.data}</span>
        </div>
        <div style="font-weight:bold; color: ${t.tipo === 'receita' ? 'var(--green)' : 'var(--red)'};">
          ${t.tipo === 'receita' ? '+' : '-'} R$ ${t.valor.toFixed(2)}
        </div>
      </div>
    `).join('');

  const ctx = document.getElementById('graficoEvolucao').getContext('2d');
  if (graficoInstance) graficoInstance.destroy();
  graficoInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Receitas', 'Despesas', 'Economia'],
      datasets: [{
        data: [rec, desp, Math.max(0, saldo)],
        backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
        borderRadius: 8
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// TELA 03: Orçamento
function carregarTelaOrcamento() {
  let totalGasto = 0;
  const gastosPorCat = {};

  transacoes.forEach(t => {
    if (t.tipo === 'despesa') {
      totalGasto += t.valor;
      gastosPorCat[t.cat] = (gastosPorCat[t.cat] || 0) + t.valor;
    }
  });

  const restante = Math.max(0, orcamentoTotalConfig - totalGasto);
  const percentual = Math.min(100, Math.round((totalGasto / orcamentoTotalConfig) * 100));

  document.getElementById('orcamentoGasto').innerText = `R$ ${totalGasto.toFixed(2)}`;
  document.getElementById('orcamentoTotal').innerText = `R$ ${orcamentoTotalConfig.toFixed(2)}`;
  document.getElementById('orcamentoPercentual').innerText = `${percentual}% usado`;
  
  const barra = document.getElementById('barraOrcamentoGeral');
  barra.style.width = `${percentual}%`;
  barra.className = 'barra-preenchimento ' + (percentual > 90 ? 'cor-vermelho' : (percentual > 70 ? 'cor-laranja' : 'cor-azul'));

  const aviso = document.getElementById('textoAvisoOrcamento');
  if (totalGasto > orcamentoTotalConfig) {
    aviso.innerText = `Atenção! Você ultrapassou o orçamento em R$ ${(totalGasto - orcamentoTotalConfig).toFixed(2)}`;
    document.getElementById('avisoOrcamento').style.background = '#fee2e2';
  } else {
    aviso.innerText = `Você ainda tem R$ ${restante.toFixed(2)} para gastar este mês`;
    document.getElementById('avisoOrcamento').style.background = '#dcfce7';
  }

  // Lista de Categorias no Orçamento
  const listaCat = document.getElementById('listaCategoriasOrcamento');
  const cats = Object.keys(gastosPorCat);
  if (cats.length === 0) {
    listaCat.innerHTML = '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:10px;">Sem despesas neste mês.</p>';
  } else {
    listaCat.innerHTML = cats.map(cat => {
      const gasto = gastosPorCat[cat];
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;">
            <span>${cat}</span>
            <span>R$ ${gasto.toFixed(2)}</span>
          </div>
          <div class="barra-container">
            <div class="barra-preenchimento cor-azul" style="width: ${Math.min(100, (gasto/orcamentoTotalConfig)*100)}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function abrirModalDefinirOrcamento() {
  document.getElementById('inputLimiteGeral').value = orcamentoTotalConfig;
  document.getElementById('modalDefinirOrcamento').classList.add('active');
}
function fecharModalOrcamento() {
  document.getElementById('modalDefinirOrcamento').classList.remove('active');
}
function salvarLimiteOrcamento() {
  const val = parseFloat(document.getElementById('inputLimiteGeral').value);
  if (val > 0) {
    orcamentoTotalConfig = val;
    localStorage.setItem('fin_orcamento_limite', orcamentoTotalConfig);
    fecharModalOrcamento();
    carregarTelaOrcamento();
  }
}

// TELA 04: Metas e Objetivos
function carregarTelaMetas() {
  const container = document.getElementById('listaCardsMetas');
  if (metas.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#94a3b8; font-size:13px; padding:20px;">Nenhuma meta cadastrada.</p>';
    return;
  }

  container.innerHTML = metas.map((m, idx) => {
    const perc = Math.min(100, Math.round((m.atual / m.alvo) * 100));
    const falta = Math.max(0, m.alvo - m.atual);
    return `
      <div class="meta-card ${m.cor || 'verde'}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:16px;">${m.titulo}</strong>
          <span style="font-size:13px; opacity:0.9;">${perc}%</span>
        </div>
        <div class="barra-container" style="background:rgba(255,255,255,0.3); height:8px;">
          <div class="barra-preenchimento" style="width:${perc}%; background:white;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; opacity:0.9; margin-top:5px;">
          <span>Guardado: R$ ${m.atual.toFixed(2)}</span>
          <span>Falta: R$ ${falta.toFixed(2)}</span>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="btn-acao-secundaria" onclick="guardarDinheiroMeta(${idx})">+ Guardar Valor</button>
          <button class="btn-acao-secundaria" style="background:rgba(0,0,0,0.2); color:white;" onclick="excluirMeta(${m.id})">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

function abrirModalNovaMeta() {
  document.getElementById('modalNovaMeta').classList.add('active');
}
function fecharModalMeta() {
  document.getElementById('modalNovaMeta').classList.remove('active');
}
function salvarNovaMeta() {
  const titulo = document.getElementById('inputMetaTitulo').value;
  const alvo = parseFloat(document.getElementById('inputMetaAlvo').value);
  const atual = parseFloat(document.getElementById('inputMetaAtual').value) || 0;

  if (!titulo || isNaN(alvo) || alvo <= 0) return alert('Preencha os campos!');

  const cores = ['verde', 'azul', 'roxo'];
  const corSorteada = cores[metas.length % cores.length];

  metas.push({ id: Date.now(), titulo, alvo, atual, cor: corSorteada });
  localStorage.setItem('fin_metas_v3', JSON.stringify(metas));

  fecharModalMeta();
  carregarTelaMetas();
}

function guardarDinheiroMeta(idx) {
  const aporte = prompt(`Quanto deseja guardar para "${metas[idx].titulo}"? (R$)`);
  const val = parseFloat(aporte);
  if (!isNaN(val) && val > 0) {
    metas[idx].atual += val;
    localStorage.setItem('fin_metas_v3', JSON.stringify(metas));
    carregarTelaMetas();
  }
}

function excluirMeta(id) {
  if (confirm('Deseja excluir esta meta?')) {
    metas = metas.filter(m => m.id !== id);
    localStorage.setItem('fin_metas_v3', JSON.stringify(metas));
    carregarTelaMetas();
  }
}

// Service Worker Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}