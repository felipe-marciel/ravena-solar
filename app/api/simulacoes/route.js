import { randomUUID } from 'node:crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

async function supabaseRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não está configurado no servidor.');

  return fetch(`${url.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...options.headers,
    },
  });
}

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonError('Não foi possível ler os dados enviados.');
  }

  const nome = String(form.get('nome') || '').trim();
  const telefone = String(form.get('whatsapp') || '').trim();
  const cidade = String(form.get('cidade') || '').trim();
  const valor = Number(form.get('conta'));
  const autorizado = form.get('contato_autorizado') === 'sim';
  const foto = form.get('foto_conta');

  if (!nome || !telefone || !cidade || !Number.isFinite(valor) || valor <= 0 || !autorizado) {
    return jsonError('Confira os campos obrigatórios antes de enviar.');
  }
  if (foto && foto.size > 0 && (!ALLOWED_TYPES.has(foto.type) || foto.size > MAX_FILE_SIZE)) {
    return jsonError('Anexe uma imagem ou PDF de até 10 MB.');
  }

  let fotoPath = null;
  if (foto && foto.size > 0) {
    const extension = foto.type === 'application/pdf'
      ? 'pdf'
      : foto.type.split('/')[1].replace('jpeg', 'jpg');
    fotoPath = `${randomUUID()}.${extension}`;
    let upload;
    try {
      upload = await supabaseRequest(`/storage/v1/object/fotos-contas/${fotoPath}`, {
        method: 'POST',
        headers: { 'Content-Type': foto.type, 'x-upsert': 'false' },
        body: Buffer.from(await foto.arrayBuffer()),
      });
    } catch {
      return jsonError('Não foi possível enviar a foto da conta.', 502);
    }
    if (!upload.ok) return jsonError('Não foi possível enviar a foto da conta.', 502);
  }

  let saved;
  try {
    saved = await supabaseRequest('/rest/v1/rpc/criar_simulacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_nome: nome,
        p_telefone: telefone,
        p_cidade: cidade,
        p_valor_medio_conta: valor,
        p_foto_path: fotoPath,
      }),
    });
  } catch {
    return jsonError('Não foi possível salvar a solicitação no momento.', 502);
  }

  if (!saved.ok) {
    const details = await saved.text();
    let errorCode = 'desconhecido';
    try {
      errorCode = JSON.parse(details).code || errorCode;
    } catch {}
    console.error('Supabase rejeitou a gravação:', saved.status, errorCode);
    if (fotoPath) {
      try {
        await supabaseRequest(`/storage/v1/object/fotos-contas/${fotoPath}`, { method: 'DELETE' });
      } catch {}
    }
    return jsonError('Não foi possível salvar a solicitação no momento.', 502);
  }

  return Response.redirect(new URL('/simulacao?enviada=1', request.url), 303);
}
