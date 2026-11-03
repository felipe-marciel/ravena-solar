const campoConta = document.querySelector('#foto-conta');
const nomeArquivo = document.querySelector('#nome-arquivo');
const formulario = document.querySelector('#simulation-form');

if (campoConta && nomeArquivo) {
  campoConta.addEventListener('change', () => {
    const arquivo = campoConta.files?.[0];
    nomeArquivo.textContent = arquivo
      ? `Arquivo selecionado: ${arquivo.name}`
      : 'Nenhum arquivo selecionado.';
  });
}

// Arquivos locais não podem seguir no envio GET; guardamos apenas o nome para a prévia.
formulario?.addEventListener('submit', () => {
  const arquivo = campoConta?.files?.[0];
  if (arquivo) sessionStorage.setItem('ravena-arquivo-conta', arquivo.name);
  else sessionStorage.removeItem('ravena-arquivo-conta');
});

const valorConta = document.querySelector('#valor-conta');
const faixaEconomia = document.querySelector('#faixa-economia');
const contaEstimada = document.querySelector('#conta-estimada');
const formatoReais = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function atualizarEstimativa() {
  const valor = Number(valorConta?.value);
  if (!faixaEconomia || !contaEstimada) return;

  if (!Number.isFinite(valor) || valor <= 0) {
    faixaEconomia.textContent = 'Informe sua conta para calcular';
    contaEstimada.textContent = 'Estimativa baseada na economia média dos clientes Ravena (75% a 90%).';
    return;
  }

  const economiaMinima = valor * 0.75;
  const economiaMaxima = valor * 0.9;
  const contaMinima = valor - economiaMaxima;
  const contaMaxima = valor - economiaMinima;

  faixaEconomia.textContent = `${formatoReais.format(economiaMinima)} a ${formatoReais.format(economiaMaxima)} por mês`;
  contaEstimada.textContent = `Sua conta poderia ficar em torno de ${formatoReais.format(contaMinima)} a ${formatoReais.format(contaMaxima)} por mês.`;
}

valorConta?.addEventListener('input', atualizarEstimativa);
