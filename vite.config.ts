import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  plugins: [{ name: 'dev-csp', transformIndexHtml(html, context) {
    return context.server ? html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '') : html;
  } }],
});
