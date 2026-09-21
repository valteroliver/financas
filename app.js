// Armazenamento Local
let transacoes = JSON.parse(localStorage.getItem('fin_transacoes_v3')) || [];
let orcamentoTotalConfig = parseFloat(localStorage.getItem('fin_orcamento_limite')) || 4000;
let dividas = JSON.parse(localStorage.getItem('fin_dividas_v3')) || [];
let contasBancarias = JSON.parse(localStorage.getItem('fin_contas_bancarias')) || [
  { id: 1, nome: 'Nubank (Conta Digital)', saldo: 1280.75, icone: '🟣' },
  { id: 2, nome: 'Banco do Brasil', saldo: 2450.30, icone: '🟡' },
  { id: 3, nome: 'Dinheiro na Carteira', saldo: 150.00, icone: '💵' }
];

let pinCadastrado = localStorage.getItem('fin_pin') || '1234';
let pinDigitado = '';
let tipoSelecionado = 'despesa';
let graficoInstance = null;
let dataFiltroCalendario = new Date().toISOString().slice(0, 10);

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

  if (screenId === 'screen-calendario') carregarCalendario();
  if (screenId === 'screen-contas') carregarContas();
  if (screenId === 'screen-orcamento') carregarTelaOrcamento();
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

// TELA 07: CALENDÁRIO FINANCEIRO (Fotos 2 e 7)
function carregarCalendario() {
  const grade = document.getElementById('calGradeDias');
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  
  const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('calMesAnoLabel').innerText = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  grade.innerHTML = `
    <div class="cal-dia-semana">D</div>
    <div class="cal-dia-semana">S</div>
    <div class="cal-dia-semana">T</div>
    <div class="cal-dia-semana">Q</div>
    <div class="cal-dia-semana">Q</div>
    <div class="cal-dia-semana">S</div>
    <div class="cal-dia-semana">S</div>
  `;

  const totalDias = new Date(ano, mes + 1, 0).getDate();

  for (let dia = 1; dia <= totalDias; dia++) {
    const diaFormatado = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const temDespesa = transacoes.some(t => t.data === diaFormatado && t.tipo === 'despesa');
    const temReceita = transacoes.some(t => t.data === diaFormatado && t.tipo === 'receita');

    let classe = 'cal-dia';
    if (diaFormatado === dataFiltroCalendario) classe += ' selecionado';
    if (temDespesa) classe += ' tem-despesa';
    if (temReceita) classe += ' tem-receita';

    grade.innerHTML += `<div class="${classe}" onclick="selecionarDiaCalendario('${diaFormatado}')">${dia}</div>`;
  }

  mostrarLancamentosDoDia(dataFiltroCalendario);
  mostrarProximos7Dias();
}

function selecionarDiaCalendario(data) {
  dataFiltroCalendario = data;
  carregarCalendario();
}

function mostrarLancamentosDoDia(data) {
  document.getElementById('labelDiaSelecionado').innerText = data.split('-').reverse().slice(0, 2).join('/');
  const itens = transacoes.filter(t => t.data === data);
  const lista = document.getElementById('listaLancamentosDia');

  if (itens.length === 0) {
    lista.innerHTML = '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:10px;">Nada previsto para este dia.</p>';
  } else {
    lista.innerHTML = itens.map(t => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;">
        <div><strong>${t.desc}</strong><br><span style="font-size:11px; color:#64748b;">${t.cat}</span></div>
        <span style="font-weight:bold; color:${t.tipo === 'receita' ? 'var(--green)' : 'var(--red)'};">
          ${t.tipo === 'receita' ? '+' : '-'} R$ ${t.valor.toFixed(2)}
        </span>
      </div>
    `).join('');
  }
}

function mostrarProximos7Dias() {
  const container = document.getElementById('listaProximos7Dias');
  const proximos = transacoes.slice(0, 4); // Exibe os compromissos mais recentes/próximos
  container.innerHTML = proximos.length === 0 ? '<p style="color:#94a3b8; font-size:13px;">Sem contas nos próximos dias.</p>' :
    proximos.map(t => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13px;">
        <span>${t.desc} (${t.data.split('-').reverse().slice(0, 2).join('/')})</span>
        <strong style="color:var(--red);">R$ ${t.valor.toFixed(2)}</strong>
      </div>
    `).join('');
}

// TELA 08: CONTAS E CARTÕES
function carregarContas() {
  const container = document.getElementById('listaContasBancarias');
  container.innerHTML = contasBancarias.map((c, idx) => `
    <div class="conta-bancaria-item">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:22px;">${c.icone}</span>
        <div>
          <strong style="font-size:14px; display:block;">${c.nome}</strong>
          <span style="font-size:12px; color:var(--text-muted);">Saldo Disponível</span>
        </div>
      </div>
      <div style="text-align:right;">
        <strong style="font-size:15px; color:var(--blue-main);">R$ ${c.saldo.toFixed(2)}</strong><br>
        <button class="btn-acao-secundaria" style="padding:2px 8px; font-size:10px;" onclick="ajustarSaldoConta(${idx})">Ajustar</button>
      </div>
    </div>
  `).join('');
}

function adicionarNovaConta() {
  const nome = prompt('Nome da nova conta ou banco (ex: Inter, Carteira):');
  const saldo = parseFloat(prompt('Saldo inicial (R$):'));
  if (nome && !isNaN(saldo)) {
    contasBancarias.push({ id: Date.now(), nome, saldo, icone: '🏦' });
    localStorage.setItem('fin_contas_bancarias', JSON.stringify(contasBancarias));
    carregarContas();
  }
}

function ajustarSaldoConta(idx) {
  const novo = parseFloat(prompt(`Novo saldo para "${contasBancarias[idx].nome}":`, contasBancarias[idx].saldo));
  if (!isNaN(novo)) {
    contasBancarias[idx].saldo = novo;
    localStorage.setItem('fin_contas_bancarias', JSON.stringify(contasBancarias));
    carregarContas();
  }
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
  aviso.innerText = `Você ainda tem R$ ${restante.toFixed(2)} para gastar este mês`;

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
function fecharModalOrcamento() { document.getElementById('modalDefinirOrcamento').classList.remove('active'); }
function salvarLimiteOrcamento() {
  const val = parseFloat(document.getElementById('inputLimiteGeral').value);
  if (val > 0) {
    orcamentoTotalConfig = val;
    localStorage.setItem('fin_orcamento_limite', orcamentoTotalConfig);
    fecharModalOrcamento();
    carregarTelaOrcamento();
  }
}

// TELA 06: Dívidas
function carregarTelaDividas() {
  let totalDevido = 0;
  dividas.forEach(d => totalDevido += d.atual);
  document.getElementById('dividaTotalAberto').innerText = `R$ ${totalDevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  const container = document.getElementById('listaDividasCadastradas');
  container.innerHTML = dividas.length === 0 ? '<p style="text-align:center; color:#94a3b8; font-size:13px; padding:20px;">Nenhuma pendência cadastrada!</p>' :
    dividas.map(d => `
      <div class="divida-item">
        <strong>${d.credor}</strong>
        <div style="font-size:18px; font-weight:bold; color:var(--red); margin:5px 0;">R$ ${d.atual.toFixed(2)}</div>
        <button class="btn-acao-secundaria" style="background:#dbeafe; color:var(--blue-main);" onclick="transformarEmAcordo(${d.id})">🤝 Transformar em Acordo</button>
      </div>
    `).join('');
}

function abrirModalNovaDivida() { document.getElementById('modalNovaDivida').classList.add('active'); }
function fecharModalDivida() { document.getElementById('modalNovaDivida').classList.remove('active'); }
function salvarNovaDivida() {
  const credor = document.getElementById('inputDividaCredor').value;
  const original = parseFloat(document.getElementById('inputDividaOriginal').value);
  const atual = parseFloat(document.getElementById('inputDividaAtual').value);
  if (!credor || isNaN(atual)) return alert('Preencha os dados!');
  dividas.push({ id: Date.now(), credor, original: original || atual, atual, juros: '10%' });
  localStorage.setItem('fin_dividas_v3', JSON.stringify(dividas));
  fecharModalDivida();
  carregarTelaDividas();
}
function transformarEmAcordo(id) {
  const d = dividas.find(item => item.id === id);
  if (!d) return;
  const val = parseFloat(prompt(`Valor da parcela negociada para "${d.credor}": (R$)`));
  if (val > 0) {
    transacoes.unshift({ id: Date.now(), desc: `Acordo: ${d.credor}`, valor: val, tipo: 'despesa', cat: 'Acordo Dívida 🛡️', data: new Date().toISOString().slice(0, 10) });
    dividas = dividas.filter(item => item.id !== id);
    localStorage.setItem('fin_transacoes_v3', JSON.stringify(transacoes));
    localStorage.setItem('fin_dividas_v3', JSON.stringify(dividas));
    alert('Acordo firmado e integrado ao seu orçamento!');
    carregarTelaDividas();
  }
}

// Service Worker Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}