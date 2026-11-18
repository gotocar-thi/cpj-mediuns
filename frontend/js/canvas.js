// Peças comuns dos geradores de imagem (canvas): quebra de texto, retângulo arredondado e logo.

// Quebra o texto em linhas que cabem em max (respeita as quebras de linha do texto).
export function quebrar(ctx, t, max) {
  const out = [];
  String(t).split('\n').forEach((par) => {
    let linha = '';
    par.split(' ').forEach((w) => {
      const teste = linha ? linha + ' ' + w : w;
      if (ctx.measureText(teste).width > max && linha) { out.push(linha); linha = w; } else linha = teste;
    });
    out.push(linha);
  });
  return out;
}

export function retangulo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function carregarLogo() {
  try {
    const img = new Image();
    img.src = '/img/terreiro.png';
    await img.decode();
    return img;
  } catch { return null; }
}
