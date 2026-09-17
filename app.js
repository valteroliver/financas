let transacoes = JSON.parse(localStorage.getItem('financas_dados')) || [];

function atualizarTela() {
  const lista = document.getElementById('listaTransacoes');
  const saldoTotal = document.getElementById('saldoTotal');
  lista.innerHTML = '';

  let saldo = 0;

  transacoes.forEach((item, index) => {
    const valorNum = parseFloat(item.valor);
    if (item.tipo === 'receita') {
      saldo += valorNum;
    } else {
      saldo -= valorNum;
    }

    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${item.descricao}</strong><br>
        <span class="${item.tipo}">${item.tipo === 'receita' ? '+' : '-'} R$ ${valorNum.toFixed(2)}</span>
      </div>
      <button class="btn-deletar" onclick="removerItem(${index})">X</button>
    `;
    lista.appendChild(li);
  });

  saldoTotal.innerText = `R$ ${saldo.toFixed(2)}`;
  saldoTotal.style.color = saldo >= 0 ? '#ffffff' : '#ffcdd2';
}

function adicionarItem() {
  const desc = document.getElementById('descricao').value;
  const val = document.getElementById('valor').value;
  const tipo = document.getElementById('tipo').value;

  if (!desc || !val) {
    alert('Por favor, preencha a descrição e o valor!');
    return;
  }

  transacoes.push({ descricao: desc, valor: val, tipo: tipo });
  salvarLocalmente();
  
  document.getElementById('descricao').value = '';
  document.getElementById('valor').value = '';
  atualizarTela();
}

function removerItem(index) {
  transacoes.splice(index, 1);
  salvarLocalmente();
  atualizarTela();
}

function salvarLocalmente() {
  localStorage.setItem('financas_dados', JSON.stringify(transacoes));
}

function exportarBackup() {
  const blob = new Blob([JSON.stringify(transacoes)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_financas_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

// Ativa o funcionamento Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

atualizarTela();