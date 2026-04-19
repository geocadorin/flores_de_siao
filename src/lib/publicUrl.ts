/**
 * URL para arquivos em `public/` (Vite).
 * Respeita `base` (ex.: `/flores_de_siao/` no GitHub Pages).
 * Evita `src="/img/..."`, que ignora o base e aponta para a raiz do domínio.
 */
export function publicUrl(path: string): string {
  const clean = path.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}
