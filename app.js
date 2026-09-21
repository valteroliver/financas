// Armazenamento Local
let transacoes = JSON.parse(localStorage.getItem('fin_transacoes_v3')) || [];
let orcamentoTotalConfig = parseFloat(localStorage.getItem('fin_orcamento_limite')) || 4000;
let metas = JSON.parse(localStorage.getItem('fin_metas_v3')) || [
  { id: 1, titulo: 'Reserva de Emergência', alvo: 10000, atual: 2500, cor: 'verde' },
  { id: 2, titulo: 'Viagem de Férias', alvo: 3000, atual: 1200, cor: 'azul' }
];
let dividas = JSON.parse(localStorage.getItem('fin_dividas_v3')) || [
  { id: 1, credor: 'Cartão de Crédito', original: 2200, atual: 3200, juros: '12% a.m.' },
  { id: 2, credor: 'Empréstimo Pessoal', original: 4500, atual: 5300, juros: '8% a.m.' }
];

let pinCadastrado = localStorage.getItem('fin_pin') || '1234';
let pinDigitado = '';
let tipoSelecionado = 'despesa';
let graficoInstance = null;

const CATEGORIAS = {
  despesa: ['Alimentação 🍔', 'Transporte 🚗', 'Moradia 🏠', 'Lazer 🎉', 'Saúde 💊', 'Compras 🛍️', 'Acordo Dívida 🛡️'],
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
  if (screenId === 'screen-dividas') carregarTelaDividas();
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

// Lançamentos Rápidos
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

  const listaCat = document.getElementById('listaCategoriasOrcamento');
  const cats = Object.keys(gastosPorCat);
  listaCat.innerHTML = cats.length === 0 ? '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:10px;">Sem despesas neste mês.</p>' :
    cats.map(cat => `
      <div style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;">
          <span>${cat}</span>
          <span>R$ ${gastosPorCat[cat].toFixed(2)}</span>
        </div>
        <div class="barra-container">
          <div class="barra-preenchimento cor-azul" style="width: ${Math.min(100, (gastosPorCat[cat]/orcamentoTotalConfig)*100)}%;"></div>
        </div>
      </div>
    `).join('');
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

// TELA 04: Metas
function carregarTelaMetas() {
  const container = document.getElementById('listaCardsMetas');
  container.innerHTML = metas.length === 0 ? '<p style="text-align:center; color:#94a3b8; font-size:13px; padding:20px;">Nenhuma meta cadastrada.</p>' :
    metas.map((m, idx) => {
      const perc = Math.min(100, Math.round((m.atual / m.alvo) * 100));
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
            <span>Falta: R$ ${(m.alvo - m.atual).toFixed(2)}</span>
          </div>
          <div style="margin-top:10px; display:flex; gap:8px;">
            <button class="btn-acao-secundaria" onclick="guardarDinheiroMeta(${idx})">+ Guardar Valor</button>
            <button class="btn-acao-secundaria" style="background:rgba(0,0,0,0.2); color:white;" onclick="excluirMeta(${m.id})">Excluir</button>
          </div>
        </div>
      `;
    }).join('');
}

function abrirModalNovaMeta() { document.getElementById('modalNovaMeta').classList.add('active'); }
function fecharModalMeta() { document.getElementById('modalNovaMeta').classList.remove('active'); }
function salvarNovaMeta() {
  const titulo = document.getElementById('inputMetaTitulo').value;
  const alvo = parseFloat(document.getElementById('inputMetaAlvo').value);
  const atual = parseFloat(document.getElementById('inputMetaAtual').value) || 0;
  if (!titulo || isNaN(alvo) || alvo <= 0) return alert('Preencha os campos!');
  const cores = ['verde', 'azul', 'roxo'];
  metas.push({ id: Date.now(), titulo, alvo, atual, cor: cores[metas.length % cores.length] });
  localStorage.setItem('fin_metas_v3', JSON.stringify(metas));
  fecharModalMeta();
  carregarTelaMetas();
}
function guardarDinheiroMeta(idx) {
  const val = parseFloat(prompt(`Quanto deseja guardar para "${metas[idx].titulo}"? (R$)`));
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

// TELA 06: DÍVIDAS E QUITAÇÃO
function carregarTelaDividas() {
  let totalDevido = 0;
  let totalOriginal = 0;

  dividas.forEach(d => {
    totalDevido += d.atual;
    totalOriginal += d.original;
  });

  const jurosAcumulados = Math.max(0, totalDevido - totalOriginal);
  document.getElementById('dividaTotalAberto').innerText = `R$ ${totalDevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('dividaEstimativaJuros').innerText = `Juros acumulados: R$ ${jurosAcumulados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Simulação: se pagar R$ 300 por mês
  const aporteEstimado = 300;
  const meses = totalDevido > 0 ? Math.ceil(totalDevido / aporteEstimado) : 0;
  document.getElementById('textoPlanoQuitacao').innerHTML = `Se você destinar <strong>R$ ${aporteEstimado}/mês</strong>, quitará tudo em aproximadamente <strong>${meses} meses</strong>.`;

  // Lista
  const container = document.getElementById('listaDividasCadastradas');
  container.innerHTML = dividas.length === 0 ? '<p style="text-align:center; color:#94a3b8; font-size:13px; padding:20px;">Nenhuma pendência cadastrada!</p>' :
    dividas.map(d => `
      <div class="divida-item">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <strong style="font-size:15px; display:block;">${d.credor}</strong>
            <span style="font-size:12px; color:var(--text-muted);">Original: R$ ${d.original.toFixed(2)}</span>
          </div>
          <span class="tag-juros">${d.juros || 'Com juros'}</span>
        </div>
        <div style="font-size:20px; font-weight:bold; color:var(--red); margin:8px 0;">
          R$ ${d.atual.toFixed(2)}
        </div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn-acao-secundaria" style="background:#dbeafe; color:var(--blue-main);" onclick="transformarEmAcordo(${d.id})">🤝 Transformar em Acordo</button>
          <button class="btn-acao-secundaria" style="background:#fee2e2; color:var(--red);" onclick="excluirDivida(${d.id})">Excluir</button>
        </div>
      </div>
    `).join('');
}

function abrirModalNovaDivida() { document.getElementById('modalNovaDivida').classList.add('active'); }
function fecharModalDivida() { document.getElementById('modalNovaDivida').classList.remove('active'); }
function salvarNovaDivida() {
  const credor = document.getElementById('inputDividaCredor').value;
  const original = parseFloat(document.getElementById('inputDividaOriginal').value);
  const atual = parseFloat(document.getElementById('inputDividaAtual').value);
  const juros = document.getElementById('inputDividaJuros').value || 'Juros altos';

  if (!credor || isNaN(atual) || atual <= 0) return alert('Preencha os dados da dívida!');

  dividas.push({ id: Date.now(), credor, original: original || atual, atual, juros });
  localStorage.setItem('fin_dividas_v3', JSON.stringify(dividas));

  fecharModalDivida();
  carregarTelaDividas();
}

function excluirDivida(id) {
  if (confirm('Deseja excluir esta pendência?')) {
    dividas = dividas.filter(d => d.id !== id);
    localStorage.setItem('fin_dividas_v3', JSON.stringify(dividas));
    carregarTelaDividas();
  }
}

// O Recurso Principal: Transformar em Acordo/Parcela no Fluxo Mensal
function transformarEmAcordo(id) {
  const d = dividas.find(item => item.id === id);
  if (!d) return;

  const parcelas = prompt(`Fechou acordo com "${d.credor}"?\nEm quantas parcelas você negociou? (Ex: 10)`);
  const numParcelas = parseInt(parcelas);
  if (isNaN(numParcelas) || numParcelas <= 0) return;

  const valorParcela = prompt(`Qual é o valor de CADA parcela? (R$)`);
  const val = parseFloat(valorParcela);
  if (isNaN(val) || val <= 0) return;

  // Lança como compromisso de despesa no fluxo mensal do Dashboard
  transacoes.unshift({
    id: Date.now(),
    desc: `Acordo: ${d.credor} (1/${numParcelas})`,
    valor: val,
    tipo: 'despesa',
    cat: 'Acordo Dívida 🛡️',
    data: new Date().toISOString().slice(0, 10)
  });
  localStorage.setItem('fin_transacoes_v3', JSON.stringify(transacoes));

  // Remove da lista de dívidas atrasadas
  dividas = dividas.filter(item => item.id !== id);
  localStorage.setItem('fin_dividas_v3', JSON.stringify(dividas));

  alert(`Sucesso! O acordo foi firmado e a 1ª parcela de R$ ${val.toFixed(2)} agora compõe o seu orçamento do mês!`);
  carregarTelaDividas();
}

// Service Worker Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}