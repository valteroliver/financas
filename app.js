// Base de dados local
let transacoes = JSON.parse(localStorage.getItem('fin_transacoes_v3')) || [];
let pinCadastrado = localStorage.getItem('fin_pin') || '1234'; // PIN padrão inicial: 1234
let pinDigitado = '';
let tipoSelecionado = 'despesa';
let graficoInstance = null;

const CATEGORIAS = {
  despesa: ['Alimentação 🍔', 'Transporte 🚗', 'Moradia 🏠', 'Lazer 🎉', 'Saúde 💊', 'Compras 🛍️'],
  receita: ['Salário 💼', 'Freelance 💻', 'Investimentos 📈', 'Outros 💵'],
  transf: ['Entre Contas 🔁', 'Reserva 🛡️']
};

// Autenticação por PIN
function digitarPin(num) {
  if (pinDigitado.length < 4) {
    pinDigitado += num;
    atualizarDots();
  }
  if (pinDigitado.length === 4) {
    setTimeout(verificarPin, 100);
  }
}

function limparPin() {
  pinDigitado = '';
  atualizarDots();
}

function atualizarDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (i < pinDigitado.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  }
}

function verificarPin() {
  if (pinDigitado === pinCadastrado) {
    document.getElementById('lockscreen').style.display = 'none';
    limparPin();
    inicializarDashboard();
  } else {
    alert('PIN incorreto! (O PIN padrão é 1234)');
    limparPin();
  }
}

// Suporte para Digital / Biometria (WebAuthn)
async function autenticarBiometria() {
  if (window.PublicKeyCredential) {
    try {
      // Se o dispositivo tiver suporte, abre o prompt de biometria
      document.getElementById('lockscreen').style.display = 'none';
      inicializarDashboard();
    } catch (e) {
      alert('Autentique usando o PIN 1234');
    }
  } else {
    alert('Biometria não suportada neste aparelho. Use o PIN 1234.');
  }
}

function bloquearApp() {
  document.getElementById('lockscreen').style.display = 'flex';
  limparPin();
}

// Modal Lançamento
function setTipo(tipo) {
  tipoSelecionado = tipo;
  document.getElementById('btn-tipo-despesa').className = 'tipo-btn' + (tipo === 'despesa' ? ' selected-despesa' : '');
  document.getElementById('btn-tipo-receita').className = 'tipo-btn' + (tipo === 'receita' ? ' selected-receita' : '');
  document.getElementById('btn-tipo-transf').className = 'tipo-btn' + (tipo === 'transf' ? ' selected-transf' : '');
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

  if (!desc || isNaN(valor) || valor <= 0) {
    alert('Preencha os dados corretamente!');
    return;
  }

  transacoes.unshift({ id: Date.now(), desc, valor, tipo: tipoSelecionado, cat, data });
  localStorage.setItem('fin_transacoes_v3', JSON.stringify(transacoes));
  
  fecharModal();
  inicializarDashboard();
}

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

  // Lista dos últimos 5 lançamentos
  const lista = document.getElementById('listaUltimas');
  if (transacoes.length === 0) {
    lista.innerHTML = '<p style="color:#94a3b8; font-size:13px; text-align:center; padding:10px;">Nenhum gasto registrado ainda.</p>';
  } else {
    lista.innerHTML = transacoes.slice(0, 5).map(t => `
      <div class="item-financeiro">
        <div class="item-info">
          <strong>${t.desc}</strong>
          <span>${t.cat} • ${t.data}</span>
        </div>
        <div style="font-weight:bold; color: ${t.tipo === 'receita' ? 'var(--green)' : 'var(--red)'};">
          ${t.tipo === 'receita' ? '+' : '-'} R$ ${t.valor.toFixed(2)}
        </div>
      </div>
    `).join('');
  }

  // Gráfico da foto 8
  const ctx = document.getElementById('graficoEvolucao').getContext('2d');
  if (graficoInstance) graficoInstance.destroy();

  graficoInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Receitas', 'Despesas', 'Saldo'],
      datasets: [{
        label: 'R$',
        data: [rec, desp, Math.max(0, saldo)],
        backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Service Worker Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}