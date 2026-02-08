# Guia de Testes - RadioWave PWA

## 📋 Checklist Completo de Testes

### ✅ Teste 1: Carregamento Inicial e Paginação

**Objetivo:** Verificar se a paginação de 20 em 20 está funcionando

**Passos:**
1. Abra a aplicação em um navegador
2. Observe a tela inicial
3. Conte os cards de rádio visíveis

**Resultado Esperado:**
- ✓ Exatamente 20 cards aparecem inicialmente
- ✓ Skeleton loading aparece durante carregamento
- ✓ Cards aparecem com animação stagger
- ✓ Contador mostra "X emissoras disponíveis"

**Como Verificar:**
```javascript
// Cole no Console do navegador:
document.querySelectorAll('.radio-card').length
// Deve retornar: 20
```

---

### ✅ Teste 2: Infinite Scroll

**Objetivo:** Verificar carregamento automático ao rolar

**Passos:**
1. Na página inicial, role até o fim da lista
2. Observe o que acontece
3. Continue rolando

**Resultado Esperado:**
- ✓ Ao chegar perto do fim, skeleton aparece
- ✓ Mais 20 cards são carregados automaticamente
- ✓ Processo se repete até acabar dados
- ✓ Quando acabar, não tenta carregar mais

**Como Verificar:**
```javascript
// Antes de rolar:
console.log('Página:', state.page, 'Total:', document.querySelectorAll('.radio-card').length);

// Depois de rolar:
console.log('Página:', state.page, 'Total:', document.querySelectorAll('.radio-card').length);
// Página deve incrementar, total deve ser page * 20
```

---

### ✅ Teste 3: Sistema de Favoritos - Adicionar

**Objetivo:** Testar funcionalidade de curtir rádios

**Passos:**
1. Localize o botão de coração em um card
2. Clique no coração
3. Observe as mudanças

**Resultado Esperado:**
- ✓ Coração fica vermelho
- ✓ Toast verde aparece "Emissora adicionada aos favoritos!"
- ✓ Badge no header incrementa (ex: 0 → 1)
- ✓ Animação de heartbeat no botão

**Como Verificar:**
```javascript
// Ver favoritos salvos:
console.log(JSON.parse(localStorage.getItem('radiowave_likes')));
// Deve mostrar array com a estação curtida
```

---

### ✅ Teste 4: Sistema de Favoritos - Visualizar

**Objetivo:** Verificar filtro de favoritos

**Passos:**
1. Curta 3-5 rádios diferentes
2. Clique no filtro "Curtidas"
3. Observe os resultados

**Resultado Esperado:**
- ✓ Apenas rádios curtidas aparecem
- ✓ Número correto de cards
- ✓ Botão "Curtidas" fica ativo (amarelo)

**Como Verificar:**
```javascript
// Contar favoritos no localStorage:
JSON.parse(localStorage.getItem('radiowave_likes')).length
// Comparar com número de cards visíveis:
document.querySelectorAll('.radio-card').length
// Devem ser iguais
```

---

### ✅ Teste 5: Sistema de Favoritos - Remover

**Objetivo:** Testar remoção de favoritos

**Passos:**
1. Esteja na visualização "Curtidas"
2. Clique no coração de uma rádio curtida
3. Observe o comportamento

**Resultado Esperado:**
- ✓ Toast azul "Removido dos favoritos"
- ✓ Card desaparece com animação
- ✓ Badge no header decrementa
- ✓ Se remover todos, aparece "Nenhuma emissora favorita"

---

### ✅ Teste 6: Persistência de Favoritos

**Objetivo:** Verificar se favoritos sobrevivem ao refresh

**Passos:**
1. Curta algumas rádios
2. Pressione F5 para recarregar
3. Verifique o estado

**Resultado Esperado:**
- ✓ Badge mostra número correto
- ✓ Corações continuam vermelhos
- ✓ Filtro "Curtidas" mostra as mesmas rádios

---

### ✅ Teste 7: Loading ao Tocar Rádio

**Objetivo:** Verificar animação de carregamento

**Passos:**
1. Clique em qualquer card de rádio
2. Observe o comportamento visual

**Resultado Esperado:**
- ✓ Overlay escuro aparece no card com spinner
- ✓ Texto "Conectando..." aparece
- ✓ Player mostra mini spinner
- ✓ Após áudio carregar:
  - Overlay desaparece
  - Card fica com borda amarela
  - Ícone muda para "pause"
  - Player mostra informações da rádio

**Nota:** Em conexões rápidas, loading pode ser muito breve

---

### ✅ Teste 8: Player - Controles Básicos

**Objetivo:** Testar player de áudio

**Passos:**
1. Clique em uma rádio para tocar
2. Aguarde carregar
3. Clique no botão do player

**Resultado Esperado:**
- ✓ Player mostra nome da rádio
- ✓ Player mostra país com bandeira
- ✓ Botão pause funciona
- ✓ Botão play retoma reprodução
- ✓ Áudio realmente toca

---

### ✅ Teste 9: Toasts - Tipos

**Objetivo:** Verificar sistema de notificações

**Ações que devem gerar toasts:**

| Ação | Tipo | Mensagem |
|------|------|----------|
| Curtir rádio | Success (verde) | "X adicionada aos favoritos!" |
| Descurtir rádio | Info (azul) | "Removido dos favoritos" |
| Erro ao tocar | Error (vermelho) | "Não foi possível reproduzir..." |
| Ficar offline | Warning (laranja) | "Você está offline. Usando cache." |
| Ficar online | Success (verde) | "Você está online!" |
| Carregar app | Success (verde) | "Bem-vindo ao RadioWave! 🎵" |

**Resultado Esperado:**
- ✓ Nenhum alert() do navegador
- ✓ Toasts aparecem no canto superior direito
- ✓ Cores corretas para cada tipo
- ✓ Ícones apropriados
- ✓ Auto-fecham após 4 segundos
- ✓ Animação suave de entrada/saída

---

### ✅ Teste 10: PWA - Service Worker

**Objetivo:** Verificar instalação do Service Worker

**Passos:**
1. Abra DevTools (F12)
2. Vá em Application → Service Workers
3. Verifique a lista

**Resultado Esperado:**
- ✓ Service Worker "service-worker.js" aparece
- ✓ Status: "activated and is running"
- ✓ Source mostra o arquivo correto
- ✓ Console mostra "[SW] Service Worker loaded"

**Verificar Caches:**
1. Application → Cache Storage
2. Verifique os caches criados

**Deve haver:**
- ✓ radiowave-static-v2.0.0
- ✓ radiowave-images-v2.0.0
- ✓ radiowave-api-v2.0.0

---

### ✅ Teste 11: PWA - Funcionamento Offline

**Objetivo:** Testar modo offline

**Passos:**
1. Use a aplicação normalmente
2. Abra DevTools → Network
3. Selecione "Offline" no dropdown de throttling
4. Recarregue a página (F5)

**Resultado Esperado:**
- ✓ Página carrega do cache
- ✓ Indicador "Modo Offline" aparece na barra
- ✓ Toast laranja: "Você está offline. Usando cache."
- ✓ Rádios previamente carregadas aparecem
- ✓ Imagens já vistas aparecem do cache
- ✓ Favoritos funcionam normalmente

**Testar Reprodução Offline:**
- ✓ Rádios já cacheadas podem tocar
- ✓ Novas rádios mostram erro apropriado

---

### ✅ Teste 12: PWA - Instalação

**Objetivo:** Verificar instalabilidade

**Passos (Chrome Desktop):**
1. Procure ícone de instalação na barra de endereço
2. Ou: Menu ⋮ → "Instalar RadioWave"
3. Clique para instalar

**Resultado Esperado:**
- ✓ Prompt de instalação aparece
- ✓ Mostra ícone e nome "RadioWave"
- ✓ Após instalar, abre em janela standalone
- ✓ Sem barra de endereço do navegador
- ✓ Ícone aparece na área de trabalho/menu

**Passos (Android Chrome):**
1. Menu ⋮ → "Adicionar à tela inicial"
2. Confirme

**Resultado Esperado:**
- ✓ Ícone aparece na tela inicial
- ✓ Abre como app nativo

---

### ✅ Teste 13: Bandeiras de Países

**Objetivo:** Verificar exibição de bandeiras

**Passos:**
1. Filtre por "Brasil"
2. Observe os cards
3. Toque uma rádio

**Resultado Esperado:**
- ✓ Bandeira do Brasil aparece nos cards
- ✓ Bandeira aparece ao lado do nome do país
- ✓ Bandeira aparece no player quando tocando
- ✓ Se imagem não carregar, emoji 🇧🇷 aparece
- ✓ Bandeiras de outros países funcionam igual

**Teste com Bloqueio:**
1. Bloqueie flagcdn.com no DevTools (Network → Request blocking)
2. Recarregue

**Resultado Esperado:**
- ✓ Emojis aparecem como fallback

---

### ✅ Teste 14: Busca

**Objetivo:** Testar funcionalidade de pesquisa

**Passos:**
1. Digite "rock" na barra de busca
2. Aguarde 500ms (debounce)
3. Observe resultados

**Resultado Esperado:**
- ✓ Skeleton aparece durante busca
- ✓ Resultados filtrados por "rock" aparecem
- ✓ Paginação funciona nos resultados
- ✓ Limpar busca volta ao filtro anterior

**Teste Debounce:**
1. Digite rápido "abcdefgh"
2. Observe

**Resultado Esperado:**
- ✓ Não faz 8 requisições
- ✓ Aguarda 500ms após última tecla
- ✓ Faz apenas 1 requisição

---

### ✅ Teste 15: Filtros de País

**Objetivo:** Testar filtros geográficos

**Passos:**
1. Clique em cada filtro de país
2. Observe resultados

**Resultado Esperado para cada:**
- ✓ Botão fica amarelo (ativo)
- ✓ Carrega rádios do país
- ✓ Bandeiras corretas aparecem
- ✓ Paginação funciona

**Países a testar:**
- Brasil (BR)
- Estados Unidos (US)
- Reino Unido (GB)
- França (FR)
- Alemanha (DE)
- Espanha (ES)

---

### ✅ Teste 16: Acessibilidade - Teclado

**Objetivo:** Navegação apenas com teclado

**Passos:**
1. Recarregue a página
2. Use apenas Tab/Shift+Tab/Enter/Espaço

**Resultado Esperado:**
- ✓ Tab navega entre elementos interativos
- ✓ Foco visível em cada elemento
- ✓ Enter/Espaço ativa botões
- ✓ Cards podem ser ativados com Enter/Espaço
- ✓ Player controlável por teclado
- ✓ Filtros navegáveis

**Ordem de foco esperada:**
1. Botão de favoritos no header
2. Campo de busca
3. Filtros (Populares, Curtidas, etc.)
4. Cards de rádio
5. Botão play/pause do player
6. Controle de volume

---

### ✅ Teste 17: Acessibilidade - Leitor de Tela

**Objetivo:** Testar com screen reader

**Preparação:**
- Windows: Win+Ctrl+Enter (Narrator)
- Mac: Cmd+F5 (VoiceOver)
- Linux: Instale Orca

**Resultado Esperado:**
- ✓ Botões anunciam seus labels
- ✓ Cards anunciam "Tocar [nome da rádio]"
- ✓ Toasts são anunciados (role="status")
- ✓ Player anuncia estado (play/pause)
- ✓ Não há elementos sem label

---

### ✅ Teste 18: Responsividade

**Objetivo:** Testar em diferentes tamanhos de tela

**Passos:**
1. Abra DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Teste cada tamanho:

**Desktop (1920x1080):**
- ✓ Grid com 4-5 colunas
- ✓ Controle de volume visível
- ✓ Toasts no canto superior direito

**Tablet (768x1024):**
- ✓ Grid com 2-3 colunas
- ✓ Controle de volume visível
- ✓ Layout se ajusta

**Mobile (375x667):**
- ✓ Grid com 1 coluna
- ✓ Controle de volume oculto
- ✓ Player se ajusta
- ✓ Filtros wrappam corretamente
- ✓ Toasts ocupam largura total

---

### ✅ Teste 19: Performance

**Objetivo:** Verificar métricas de performance

**Passos:**
1. Abra DevTools → Lighthouse
2. Selecione:
   - ✓ Performance
   - ✓ Progressive Web App
   - ✓ Accessibility
   - ✓ Best Practices
   - ✓ SEO
3. Clique "Generate report"

**Scores Esperados:**
- Performance: 90+ (verde)
- Accessibility: 95+ (verde)
- Best Practices: 95+ (verde)
- SEO: 90+ (verde)
- PWA: 100 (verde com checkmark)

**Se scores baixos:**
- Verifique console por erros
- Verifique Network por recursos lentos
- Verifique se Service Worker está ativo

---

### ✅ Teste 20: SEO

**Objetivo:** Verificar otimizações SEO

**Passos:**
1. View Source (Ctrl+U)
2. Procure por:

**Deve conter:**
```html
✓ <title>RadioWave — Ouça Rádios do Mundo Inteiro Online Grátis</title>
✓ <meta name="description" content="...">
✓ <meta property="og:title" content="...">
✓ <meta property="og:description" content="...">
✓ <meta property="og:image" content="...">
✓ <link rel="canonical" href="...">
✓ <script type="application/ld+json">...</script>
```

**Teste Compartilhamento:**
1. Cole URL no [Facebook Debugger](https://developers.facebook.com/tools/debug/)
2. Verifique preview

**Resultado Esperado:**
- ✓ Título correto
- ✓ Descrição presente
- ✓ Imagem preview (quando configurada)

---

## 🐛 Troubleshooting

### Problema: Service Worker não registra

**Sintomas:**
- Console mostra erro de SW
- Application → Service Workers vazio

**Soluções:**
1. Use HTTPS ou localhost
2. Limpe cache (Ctrl+Shift+Del)
3. Verifique caminho do SW está correto
4. Hard refresh (Ctrl+Shift+R)

---

### Problema: Favoritos não persistem

**Sintomas:**
- Após F5, favoritos somem

**Soluções:**
1. Verifique localStorage:
```javascript
localStorage.getItem('radiowave_likes')
```
2. Não está em modo privado/anônimo?
3. Console mostra erros?
4. Cota de storage cheia?

---

### Problema: Infinite scroll não funciona

**Sintomas:**
- Rola até o fim, nada acontece

**Soluções:**
1. Console mostra erros?
2. Verifique:
```javascript
console.log('isFetching:', state.isFetching, 'noMoreData:', state.noMoreData)
```
3. IntersectionObserver suportado?
4. Sentinel está presente?
```javascript
document.getElementById('scrollSentinel')
```

---

### Problema: Toasts não aparecem

**Sintomas:**
- Ações não mostram notificações

**Soluções:**
1. Console mostra erros?
2. Elemento toaster existe?
```javascript
document.getElementById('toaster')
```
3. CSS carregou corretamente?
4. Verifique z-index de outros elementos

---

### Problema: Rádio não toca

**Sintomas:**
- Clica, loading aparece, mas não toca

**Soluções:**
1. Console mostra erro de áudio?
2. URL da rádio válida?
3. CORS permitido?
4. Autoplay bloqueado pelo navegador?
5. Tente outro navegador

---

## 📊 Relatório de Teste (Template)

```
Data: ___/___/___
Testador: _________
Navegador: ________ Versão: ____
SO: _________

[ ] Teste 1 - Paginação: ☐ OK  ☐ FALHA
[ ] Teste 2 - Infinite Scroll: ☐ OK  ☐ FALHA
[ ] Teste 3 - Favoritos Add: ☐ OK  ☐ FALHA
[ ] Teste 4 - Favoritos View: ☐ OK  ☐ FALHA
[ ] Teste 5 - Favoritos Remove: ☐ OK  ☐ FALHA
[ ] Teste 6 - Persistência: ☐ OK  ☐ FALHA
[ ] Teste 7 - Loading: ☐ OK  ☐ FALHA
[ ] Teste 8 - Player: ☐ OK  ☐ FALHA
[ ] Teste 9 - Toasts: ☐ OK  ☐ FALHA
[ ] Teste 10 - Service Worker: ☐ OK  ☐ FALHA
[ ] Teste 11 - Offline: ☐ OK  ☐ FALHA
[ ] Teste 12 - Instalação: ☐ OK  ☐ FALHA
[ ] Teste 13 - Bandeiras: ☐ OK  ☐ FALHA
[ ] Teste 14 - Busca: ☐ OK  ☐ FALHA
[ ] Teste 15 - Filtros: ☐ OK  ☐ FALHA
[ ] Teste 16 - Teclado: ☐ OK  ☐ FALHA
[ ] Teste 17 - Screen Reader: ☐ OK  ☐ FALHA
[ ] Teste 18 - Responsivo: ☐ OK  ☐ FALHA
[ ] Teste 19 - Performance: ☐ OK  ☐ FALHA
[ ] Teste 20 - SEO: ☐ OK  ☐ FALHA

Notas:
_________________________________
_________________________________
_________________________________
```

---

**Boa sorte com os testes! 🎵**