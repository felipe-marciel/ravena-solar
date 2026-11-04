const FORECAST_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-23.5017&longitude=-47.4581&hourly=shortwave_radiation';

export async function GET(request) {
  if (process.env.NODE_ENV !== 'production') {
    const testMode = new URL(request.url).searchParams.get('test');

    if (testMode === 'error') {
      return Response.json(
        { error: 'Erro de teste da previsão solar.' },
        { status: 502 },
      );
    }

    if (testMode === 'delay') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  try {
    const response = await fetch(FORECAST_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();

    return Response.json(data, { status: response.status });
  } catch {
    return Response.json(
      { error: 'Não foi possível obter a previsão solar no momento.' },
      { status: 502 },
    );
  }
}
