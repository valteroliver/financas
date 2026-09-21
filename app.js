// Base de dados local
let transacoes = JSON.parse(localStorage.getItem('fin_transacoes_v3')) || [];
let orcamentoTotalConfig = parseFloat(localStorage.getItem('fin_orcamento_limite')) || 4000;
let usuario = JSON.parse(localStorage.getItem('fin_usuario')) || {
  nome: 'Valter Oliver',
  foto: ''
};

let pinCadastrado = localStorage.getItem('fin_pin') || '1234';
let pinDigitado = '';
let tipoSelecionado = 'despesa';

// Gráficos
let chartAnualInstance = null;
let chartRoscaRelatorio = null;
let chartMesCalendarioInstance = null;

// Controle de Calendário
let dataAtual = new Date();
let mesCalendarioView = dataAtual.getMonth();
let anoCalendarioView = dataAtual.getFullYear();
let diaSelecionadoCalendario = dataAtual.toISOString().slice(0, 10);

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

  if (screenId === 'screen-dashboard') inicializarDashboard();
  if (screenId === 'screen-calendario') carregarCalendario();
  if (screenId === 'screen-relatorios') filtrarRelatorio('mes');
  if (screenId === 'screen-perfil') carregarPerfil();
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
  CATEGORIAS[tipoSelecionado].forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
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

// TELA 01: DASHBOARD
function inicializarDashboard() {
  // Saudação com nome e data por extenso
  const agora = new Date();
  const opcoesData = { weekday: 'long', day: 'numeric', month: 'long' };
  const dataFormatada = agora.toLocaleDateString('pt-BR', opcoesData);
  document.getElementById('dashDataHoje').innerText = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  document.getElementById('dashSaudacaoNome').innerText = `Olá, ${usuario.nome} 👋`;

  if (usuario.foto) {
    document.getElementById('dashAvatar').src = usuario.foto;
  }

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

  // Lista dos últimos 4
  const lista = document.getElementById('listaUltimas');
  lista.innerHTML = transacoes.length === 0 ? '<p style="color:#94a3b8; font-size:13px; text-align:center;">Nenhum gasto registrado.</p>' :
    transacoes.slice(0, 4).map(t => `
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

  // Gráfico Anual de Janeiro a Dezembro
  renderizarGraficoAnual();
}

function renderizarGraficoAnual() {
  const anoAtual = new Date().getFullYear();
  document.getElementById('anoAtualLabel').innerText = anoAtual;

  const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const receitasMes = new Array(12).fill(0);
  const despesasMes = new Array(12).fill(0);

  transacoes.forEach(t => {
    const [ano, mes] = t.data.split('-');
    if (parseInt(ano) === anoAtual) {
      const mesIndex = parseInt(mes) - 1;
      if (t.tipo === 'receita') receitasMes[mesIndex] += t.valor;
      if (t.tipo === 'despesa') despesasMes[mesIndex] += t.valor;
    }
  });

  const ctx = document.getElementById('graficoAnualMesAMes').getContext('2d');
  if (chartAnualInstance) chartAnualInstance.destroy();

  chartAnualInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: mesesLabels,
      datasets: [
        { label: 'Receitas', data: receitasMes, backgroundColor: '#10b981', borderRadius: 4 },
        { label: 'Despesas', data: despesasMes, backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// TELA 07: CALENDÁRIO COM NAVEGAÇÃO E GRÁFICOS
function carregarCalendario() {
  const grade = document.getElementById('calGradeDias');
  const dataView = new Date(anoCalendarioView, mesCalendarioView, 1);
  const nomeMes = dataView.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  
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

  const totalDias = new Date(anoCalendarioView, mesCalendarioView + 1, 0).getDate();

  let recMes = 0, despMes = 0;

  for (let dia = 1; dia <= totalDias; dia++) {
    const diaFormatado = `${anoCalendarioView}-${String(mesCalendarioView + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    const transacoesDia = transacoes.filter(t => t.data === diaFormatado);
    const temDespesa = transacoesDia.some(t => t.tipo === 'despesa');
    const temReceita = transacoesDia.some(t => t.tipo === 'receita');

    transacoesDia.forEach(t => {
      if (t.tipo === 'receita') recMes += t.valor;
      if (t.tipo === 'despesa') despMes += t.valor;
    });

    let classe = 'cal-dia';
    if (diaFormatado === diaSelecionadoCalendario) classe += ' selecionado';
    if (temDespesa) classe += ' tem-despesa';
    if (temReceita) classe += ' tem-receita';

    grade.innerHTML += `<div class="${classe}" onclick="selecionarDiaCalendario('${diaFormatado}')">${dia}</div>`;
  }

  // Gráfico do Mês da Agenda
  renderizarGraficoMesCalendario(recMes, despMes);
  mostrarLancamentosDoDia(diaSelecionadoCalendario);
}

function navegarMesCalendario(direcao) {
  mesCalendarioView += direcao;
  if (mesCalendarioView < 0) {
    mesCalendarioView = 11;
    anoCalendarioView--;
  } else if (mesCalendarioView > 11) {
    mesCalendarioView = 0;
    anoCalendarioView++;
  }
  carregarCalendario();
}

function renderizarGraficoMesCalendario(rec, desp) {
  const ctx = document.getElementById('graficoMesCalendario').getContext('2d');
  if (chartMesCalendarioInstance) chartMesCalendarioInstance.destroy();

  chartMesCalendarioInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Entradas', 'Saídas'],
      datasets: [{
        data: [rec, desp],
        backgroundColor: ['#10b981', '#ef4444'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function selecionarDiaCalendario(data) {
  diaSelecionadoCalendario = data;
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

// TELA 05: RELATÓRIOS COM FILTRO PERSONALIZADO
function filtrarRelatorio(tipo, el = null) {
  if (el) {
    document.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  document.getElementById('boxPersonalizado').classList.remove('active');

  const hoje = new Date();
  let itensFiltrados = [];

  if (tipo === 'mes') {
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoAtual = String(hoje.getFullYear());
    itensFiltrados = transacoes.filter(t => t.data.startsWith(`${anoAtual}-${mesAtual}`));
  } else if (tipo === 'trimestre') {
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(hoje.getMonth() - 3);
    itensFiltrados = transacoes.filter(t => new Date(t.data) >= tresMesesAtras);
  } else if (tipo === 'ano') {
    const anoAtual = String(hoje.getFullYear());
    itensFiltrados = transacoes.filter(t => t.data.startsWith(anoAtual));
  }

  processarRelatorio(itensFiltrados);
}

function ativarPeriodoPersonalizado(el) {
  document.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('boxPersonalizado').classList.add('active');
}

function aplicarFiltroPersonalizado() {
  const inicio = document.getElementById('relatorioDataInicio').value;
  const fim = document.getElementById('relatorioDataFim').value;

  if (!inicio || !fim) return alert('Selecione data inicial e data final!');

  const itens = transacoes.filter(t => t.data >= inicio && t.data <= fim);
  processarRelatorio(itens);
}

function processarRelatorio(itens) {
  let despTotal = 0, recTotal = 0;
  const gastosPorCat = {};

  itens.forEach(t => {
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
  const ranking = itens.filter(t => t.tipo === 'despesa').sort((a, b) => b.valor - a.valor).slice(0, 3);
  const containerMaiores = document.getElementById('listaMaioresGastos');
  containerMaiores.innerHTML = ranking.length === 0 ? '<p style="color:#94a3b8; font-size:13px; text-align:center;">Sem lançamentos no período.</p>' :
    ranking.map((d, i) => `
      <div class="ranking-item">
        <span><strong>#${i + 1}</strong> ${d.desc} (${d.cat})</span>
        <strong style="color:var(--red);">R$ ${d.valor.toFixed(2)}</strong>
      </div>
    `).join('');
}

// TELA 09: PERFIL E FOTO
function carregarPerfil() {
  document.getElementById('inputNomeUsuario').value = usuario.nome;
  if (usuario.foto) {
    document.getElementById('perfilPreviewAvatar').src = usuario.foto;
  }
}

function processarFotoPerfil(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    usuario.foto = e.target.result;
    document.getElementById('perfilPreviewAvatar').src = usuario.foto;
  };
  reader.readAsDataURL(arquivo);
}

function salvarDadosPerfil() {
  const nome = document.getElementById('inputNomeUsuario').value;
  if (!nome) return alert('Digite seu nome!');
  
  usuario.nome = nome;
  localStorage.setItem('fin_usuario', JSON.stringify(usuario));
  alert('Perfil atualizado com sucesso!');
  inicializarDashboard();
}

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
  const backup = { transacoes, orcamentoTotalConfig, usuario };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup_financas_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

// Service Worker Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}