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

const radiacaoSolar = document.querySelector('#solar-radiation-value');

if (radiacaoSolar) {
  const parametros = new URLSearchParams(window.location.search);
  const modoTeste = parametros.get('solar_test');
  const consulta = modoTeste && ['delay', 'error'].includes(modoTeste)
    ? `/api/solar?test=${modoTeste}`
    : '/api/solar';

  fetch(consulta)
    .then((response) => {
      if (!response.ok) throw new Error('Falha ao consultar a previsão');
      return response.json();
    })
    .then((previsao) => {
      const horas = previsao.hourly?.time;
      const valores = previsao.hourly?.shortwave_radiation;
      const unidade = previsao.hourly_units?.shortwave_radiation || 'W/m²';
      const agora = Date.now();
      const indice = horas?.findIndex((hora) => new Date(hora).getTime() >= agora) ?? -1;
      const valor = indice >= 0 ? valores?.[indice] : null;

      radiacaoSolar.textContent = Number.isFinite(valor)
        ? `${new Intl.NumberFormat('pt-BR').format(valor)} ${unidade} na próxima hora`
        : 'Previsão indisponível no momento';
    })
    .catch(() => {
      radiacaoSolar.textContent = 'Previsão indisponível no momento';
    });
}
