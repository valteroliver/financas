// Armazenamento Local Consolidado
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
let chartRoscaRelatorio = null;
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

  if (screenId === 'screen-relatorios') carregarRelatorios();
  if (screenId === 'screen-calendario') carregarCalendario();
  if (screenId === 'screen-contas') carregarContas();
  if (screenId === 'screen-orcamento') carregarTelaOrcamento();
  if (screenId === 'screen-dashboard') inicializarDashboard();
}

// PIN e Autenticação
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
    alert('PIN incorreto!');
    limparPin();
  }
}

function autenticarBiometria() {
  document.getElementById('lockscreen').style.display = 'none';
  inicializarDashboard();
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

// TELA 05: RELATÓRIOS INTELIGENTES (Foto 4)
function carregarRelatorios() {
  let despTotal = 0;
  let recTotal = 0;
  const gastosPorCat = {};

  transacoes.forEach(t => {
    if (t.tipo === 'despesa') {
      despTotal += t.valor;
      gastosPorCat[t.cat] = (gastosPorCat[t.cat] || 0) + t.valor;
    } else if (t.tipo === 'receita') {
      recTotal += t.valor;
    }
  });

  document.getElementById('relatorioEconomiaTotal').innerText = `R$ ${(recTotal - despTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Gráfico de Rosca
  const ctx = document.getElementById('graficoRoscaRelatorio').getContext('2d');
  const labels = Object.keys(gastosPorCat);
  const dataValues = Object.values(gastosPorCat);

  if (chartRoscaRelatorio) chartRoscaRelatorio.destroy();
  chartRoscaRelatorio = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sem despesas'],
      datasets: [{
        data: dataValues.length ? dataValues : [1],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Maiores Gastos
  const despesasOrdenadas = transacoes.filter(t => t.tipo === 'despesa').sort((a, b) => b.valor - a.valor).slice(0, 3);
  const containerMaiores = document.getElementById('listaMaioresGastos');
  containerMaiores.innerHTML = despesasOrdenadas.length === 0 ? '<p style="color:#94a3b8; font-size:13px; text-align:center;">Nenhum gasto no período.</p>' :
    despesasOrdenadas.map((d, i) => `
      <div class="ranking-item">
        <span><strong>#${i + 1}</strong> ${d.desc} (${d.cat})</span>
        <strong style="color:var(--red);">R$ ${d.valor.toFixed(2)}</strong>
      </div>
    `).join('');
}

function filtrarRelatorio(tipo, el) {
  document.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  carregarRelatorios();
}

function exportarRelatorioTexto() {
  let texto = "=== RELATÓRIO FINANCEIRO PESSOAL ===\n\n";
  transacoes.forEach(t => {
    texto += `${t.data} - ${t.desc} [${t.cat}]: R$ ${t.valor.toFixed(2)} (${t.tipo.toUpperCase()})\n`;
  });
  navigator.clipboard.writeText(texto);
  alert('Relatório copiado para a Área de Transferência! Você pode colar no WhatsApp ou no Bloco de Notas.');
}

// TELA 07: CALENDÁRIO
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
}

function selecionarDiaCalendario(data) {
  dataFiltroCalendario = data;
  carregarCalendario();
}

function mostrarLancamentosDoDia(data) {
  document.getElementById('labelDiaSelecionado').innerText = data.split('-').reverse().slice(0, 2).join('/');
  const itens = transacoes.filter(t => t.data === data);
  const lista = document.getElementById('listaLancamentosDia');

  lista.innerHTML = itens.length === 0 ? '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:10px;">Nada neste dia.</p>' :
    itens.map(t => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f1f5f9;">
        <div><strong>${t.desc}</strong><br><span style="font-size:11px; color:#64748b;">${t.cat}</span></div>
        <span style="font-weight:bold; color:${t.tipo === 'receita' ? 'var(--green)' : 'var(--red)'};">
          ${t.tipo === 'receita' ? '+' : '-'} R$ ${t.valor.toFixed(2)}
        </span>
      </div>
    `).join('');
}

// TELA 08: CONTAS
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
  const nome = prompt('Nome da nova conta:');
  const saldo = parseFloat(prompt('Saldo inicial:'));
  if (nome && !isNaN(saldo)) {
    contasBancarias.push({ id: Date.now(), nome, saldo, icone: '🏦' });
    localStorage.setItem('fin_contas_bancarias', JSON.stringify(contasBancarias));
    carregarContas();
  }
}
function ajustarSaldoConta(idx) {
  const novo = parseFloat(prompt('Novo saldo:', contasBancarias[idx].saldo));
  if (!isNaN(novo)) {
    contasBancarias[idx].saldo = novo;
    localStorage.setItem('fin_contas_bancarias', JSON.stringify(contasBancarias));
    carregarContas();
  }
}

// TELA 03: ORÇAMENTO
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

// TELA 09: PERFIL, SEGURANÇA E BACKUP (Foto 1)
function alterarPinSeguranca() {
  const novoPin = prompt('Digite seu novo PIN numérico de 4 dígitos:');
  if (novoPin && novoPin.length === 4 && !isNaN(novoPin)) {
    pinCadastrado = novoPin;
    localStorage.setItem('fin_pin', pinCadastrado);
    alert('PIN alterado com sucesso!');
  } else {
    alert('O PIN deve conter exatamente 4 números!');
  }
}

function exportarBackupCompleto() {
  const backup = { transacoes, orcamentoTotalConfig, dividas, contasBancarias };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup_financas_completo_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

function restaurarBackupCompleto(event) {
  const reader = new FileReader();
  reader.onload = function() {
    try {
      const data = JSON.parse(reader.result);
      if (data.transacoes) transacoes = data.transacoes;
      if (data.orcamentoTotalConfig) orcamentoTotalConfig = data.orcamentoTotalConfig;
      if (data.dividas) dividas = data.dividas;
      if (data.contasBancarias) contasBancarias = data.contasBancarias;

      localStorage.setItem('fin_transacoes_v3', JSON.stringify(transacoes));
      localStorage.setItem('fin_orcamento_limite', orcamentoTotalConfig);
      localStorage.setItem('fin_dividas_v3', JSON.stringify(dividas));
      localStorage.setItem('fin_contas_bancarias', JSON.stringify(contasBancarias));

      alert('Backup restaurado com sucesso!');
      location.reload();
    } catch (e) {
      alert('Arquivo de backup inválido!');
    }
  };
  reader.readAsText(event.target.files[0]);
}

function limparTodosOsDados() {
  if (confirm('Tem certeza? Isso apagará todos os seus lançamentos e configurações!')) {
    localStorage.clear();
    location.reload();
  }
}

// Service Worker Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}