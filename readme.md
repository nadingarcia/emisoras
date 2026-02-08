# RadioWave PWA - Documentação Completa

## 🎯 Visão Geral

RadioWave é uma Progressive Web App (PWA) para descobrir e ouvir milhares de rádios do mundo inteiro. A aplicação oferece uma experiência rápida, offline-first, com recursos modernos de favoritos, notificações e descoberta de conteúdo.

## ✨ Funcionalidades Implementadas

### ✅ Paginação e Performance
- [x] Carregamento inicial de 20 estações
- [x] Infinite scroll automático com IntersectionObserver
- [x] Skeleton loading durante carregamento
- [x] Lazy loading de imagens
- [x] Debounce de 500ms nas buscas
- [x] Indicador de "carregando" ao tocar uma rádio

### ✅ Sistema de Favoritos
- [x] Botão de curtir em cada card
- [x] Persistência em localStorage
- [x] Badge com contador no header
- [x] Filtro de "Curtidas" funcional
- [x] Animação ao curtir/descurtir
- [x] Toast de confirmação

### ✅ PWA Completa
- [x] manifest.json configurado
- [x] Service Worker com estratégias de cache:
  - Cache First para assets estáticos
  - Cache First com expiração para imagens (30 dias, max 200)
  - Stale-While-Revalidate para API
- [x] Funcionamento offline
- [x] Instalável no dispositivo
- [x] Página offline customizada

### ✅ Notificações Toast
- [x] Sistema de toasts substituindo alerts
- [x] 4 tipos: success, error, info, warning
- [x] Animações suaves
- [x] Acessibilidade (role="status", aria-live)
- [x] Auto-fechamento configurável

### ✅ Descoberta de Rádios
- [x] Filtros por país (com bandeiras)
- [x] Filtro por popularidade
- [x] Busca por nome/tags
- [x] Tags visíveis em cada card
- [x] Metadados (codec, bitrate, país)

### ✅ Bandeiras de Países
- [x] CDN flagcdn.com implementado
- [x] Fallback para emoji quando imagem falha
- [x] Bandeiras nos cards e no player

### ✅ SEO
- [x] Meta tags completas (description, og:*, twitter:*)
- [x] JSON-LD com schema.org WebSite
- [x] Link canônico
- [x] Tags Open Graph para redes sociais
- [x] Preconnect para APIs e CDNs

### ✅ Acessibilidade
- [x] Todos os botões com aria-label
- [x] Cards focáveis e operáveis por teclado
- [x] Contraste adequado
- [x] Player acessível
- [x] Toasts com role="status"
- [x] Navegação por Tab funcional

## 📁 Estrutura de Arquivos

```
radiowave/
├── index.html          # HTML principal com SEO e PWA tags
├── styles.css          # Estilos completos com toasts, loading, etc.
├── main.js            # JavaScript com todas as funcionalidades
├── manifest.json      # Configuração PWA
├── service-worker.js  # Service Worker com estratégias de cache
├── robots.txt         # (criar - instruções abaixo)
├── sitemap.xml        # (criar - instruções abaixo)
└── icons/            # Ícones da PWA (criar - instruções abaixo)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

## 🚀 Como Usar

### Instalação Local

1. **Clone/baixe os arquivos** para um diretório local
2. **Sirva com um servidor HTTP** (obrigatório para Service Worker):

```bash
# Opção 1: Python
python -m http.server 8000

# Opção 2: Node.js
npx http-server -p 8000

# Opção 3: PHP
php -S localhost:8000
```

3. **Acesse** `http://localhost:8000`

### Deploy em Produção

1. **Hospede os arquivos** em qualquer servidor web
2. **Configure HTTPS** (obrigatório para PWA)
3. **Atualize URLs** no manifest.json e service-worker.js
4. **Crie os ícones** (veja seção abaixo)
5. **Gere sitemap.xml** (veja seção abaixo)

## 🎨 Criando os Ícones da PWA

Os ícones precisam ser criados nas seguintes dimensões:

- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192 (maskable)
- 384x384
- 512x512 (maskable)

**Ferramentas recomendadas:**
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Photoshop/Figma/Canva

**Design sugerido:**
- Fundo: gradiente roxo (#667eea → #764ba2)
- Ícone: rádio (🎵 ou ícone de rádio)
- Texto: "RW" ou logo simplificado

## 📄 Criando sitemap.xml

Crie `sitemap.xml` na raiz:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://seu-dominio.example/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://seu-dominio.example/?filter=popular</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://seu-dominio.example/?filter=BR</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## 🤖 Criando robots.txt

Crie `robots.txt` na raiz:

```
User-agent: *
Allow: /
Sitemap: https://seu-dominio.example/sitemap.xml
```

## ✅ Checklist de Aceitação

### Paginação
- [ ] Ao carregar a página, mostra 20 estações inicialmente
- [ ] Ao rolar até o fim, carrega mais 20 automaticamente
- [ ] Skeleton aparece durante carregamento
- [ ] Para de carregar quando não há mais dados

### Favoritos
- [ ] Botão de coração aparece em cada card
- [ ] Ao clicar, adiciona aos favoritos e mostra toast
- [ ] Badge no header mostra número correto
- [ ] Filtro "Curtidas" mostra apenas favoritos
- [ ] Favoritos persistem após recarregar página
- [ ] Funciona offline (lê do localStorage)

### Loading/UX
- [ ] Ao clicar em uma rádio, aparece overlay "Conectando..."
- [ ] Ícone só muda para "pause" após áudio carregar
- [ ] Erros mostram toast (não alert)
- [ ] Player mostra mini spinner durante loading

### PWA
- [ ] Funciona offline (testar com DevTools → Network → Offline)
- [ ] Mostra indicador "Modo Offline" quando offline
- [ ] Pode ser instalado (ver prompt do navegador)
- [ ] Cacheia imagens e resultados
- [ ] Mostra toast quando nova versão disponível

### Bandeiras
- [ ] Bandeiras aparecem nos cards
- [ ] Bandeiras aparecem no player
- [ ] Se imagem falhar, mostra emoji
- [ ] Países sem código mostram emoji globo 🌍

### Toasts
- [ ] Nenhum alert() aparece
- [ ] Toasts aparecem no canto superior direito
- [ ] Diferentes tipos (success verde, error vermelho, etc.)
- [ ] Fecham automaticamente após 4 segundos
- [ ] Animação suave de entrada/saída

### Acessibilidade
- [ ] Todos os botões podem ser acionados por Tab + Enter
- [ ] Cards podem ser navegados por teclado
- [ ] Leitor de tela anuncia toasts
- [ ] Contraste de cores adequado
- [ ] Labels ARIA presentes

### SEO
- [ ] Meta description presente
- [ ] Open Graph tags presentes
- [ ] JSON-LD WebSite presente
- [ ] Título otimizado
- [ ] URLs canônicas

## 🧪 Como Testar

### Teste 1: Paginação
1. Abra a aplicação
2. Conte os cards - deve haver 20
3. Role até o fim da lista
4. Observe skeleton aparecer
5. Novos cards devem aparecer (mais 20)
6. Repita até acabar dados

### Teste 2: Favoritos
1. Clique no coração de uma rádio
2. Observe toast de sucesso
3. Badge no header deve incrementar
4. Clique em "Curtidas" no filtro
5. Deve mostrar apenas essa rádio
6. Recarregue a página (F5)
7. Favoritos devem permanecer

### Teste 3: Loading
1. Clique em uma rádio
2. Observe overlay "Conectando..."
3. Apenas após áudio carregar, overlay some
4. Player mostra informações
5. Card fica com borda amarela

### Teste 4: Offline (PWA)
1. Abra DevTools (F12)
2. Vá em Application → Service Workers
3. Verifique se SW está ativo
4. Vá em Network → Throttling → Offline
5. Recarregue a página
6. Aplicação deve funcionar
7. Indicador "Modo Offline" deve aparecer
8. Tente tocar uma rádio já cacheada

### Teste 5: Instalação PWA
1. No Chrome, clique no ícone de instalação na barra de endereço
2. Ou vá em ⋮ → "Instalar RadioWave"
3. Aplicação abre em janela standalone
4. Funciona como app nativo

### Teste 6: Busca
1. Digite algo na barra de busca
2. Aguarde 500ms (debounce)
3. Resultados filtrados aparecem
4. Skeleton durante busca

### Teste 7: Toasts
1. Curta uma rádio → toast verde
2. Descurta → toast azul
3. Erro ao tocar → toast vermelho
4. Offline/online → toast laranja/verde

### Teste 8: Responsividade
1. Redimensione a janela
2. Teste em mobile (DevTools → Device Mode)
3. Grid se adapta
4. Player se ajusta
5. Controle de volume some em mobile

## 🔧 Configurações Avançadas

### Ajustar Tamanho da Página
Em `main.js`, linha ~13:
```javascript
pageSize: 20,  // Altere para 30, 50, etc.
```

### Alterar Cache de Imagens
Em `service-worker.js`, linha ~20:
```javascript
const IMAGES_MAX_ENTRIES = 200;  // Número de imagens
const IMAGES_MAX_AGE = 30 * 24 * 60 * 60 * 1000;  // 30 dias
```

### Personalizar Cores
Em `styles.css`, linha ~2:
```css
:root {
    --primary-color: #0F172A;
    --accent-color: #F59E0B;
    /* ... mais cores */
}
```

## 🐛 Troubleshooting

### Service Worker não registra
- Verifique se está usando HTTPS (ou localhost)
- Limpe cache do navegador (Ctrl+Shift+Del)
- Verifique console por erros

### Favoritos não salvam
- Verifique se localStorage está habilitado
- Modo privado/anônimo pode bloquear
- Verifique console por erros

### Imagens não carregam
- Verifique conexão
- CDNs podem estar bloqueados
- Veja console Network tab

### Infinite scroll não funciona
- Verifique se há mais dados (state.noMoreData)
- IntersectionObserver pode não ser suportado em navegadores antigos
- Veja console por erros

## 📊 Performance

### Lighthouse Scores Esperados
- Performance: 90-100
- Accessibility: 95-100
- Best Practices: 95-100
- SEO: 90-100
- PWA: 100

### Otimizações Implementadas
- Lazy loading de imagens
- Debounce em buscas
- Cache agressivo de assets
- Compressão via Service Worker
- Skeleton para perceived performance

## 📱 Compatibilidade

### Navegadores Suportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Opera 76+

### Recursos que Requerem Navegadores Modernos
- Service Worker
- IntersectionObserver
- Fetch API
- CSS Grid
- localStorage

## 🔐 Segurança

- HTTPS obrigatório em produção
- Service Worker só funciona em origem segura
- localStorage acessível apenas no mesmo domínio
- Sem armazenamento de dados sensíveis

## 📚 Recursos Adicionais

### APIs Utilizadas
- [Radio Browser API](https://api.radio-browser.info/) - Dados de rádios
- [FlagCDN](https://flagcdn.com/) - Bandeiras de países

### Bibliotecas
- [Bulma CSS](https://bulma.io/) - Framework CSS
- [Font Awesome](https://fontawesome.com/) - Ícones
- [Google Fonts](https://fonts.google.com/) - Tipografia

### Documentação de Referência
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## 🤝 Contribuindo

Para melhorias futuras:

1. **Server-Side Rendering (SSR)**: Gerar HTML estático para principais páginas
2. **Análise de dados**: Rastrear rádios mais ouvidas
3. **Recomendações**: Algoritmo baseado em preferências
4. **Compartilhamento**: Botões de compartilhar rádio
5. **Histórico**: Últimas rádios ouvidas
6. **Equalizer**: Controles de áudio avançados

## 📄 Licença

Este projeto é fornecido como está, para fins educacionais e demonstração.

---

**Versão:** 2.0.0  
**Data:** 2024  
**Desenvolvido para:** Experiência PWA moderna e acessível