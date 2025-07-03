# 🔔 Notificações do Chat Interno

## Funcionalidades Implementadas

### 1. Notificações em Tempo Real
- **WebSocket**: Conexão em tempo real para receber mensagens instantaneamente
- **Notificações do Navegador**: Pop-up nativo do navegador quando uma nova mensagem chega
- **Som de Notificação**: Áudio para alertar sobre novas mensagens (com fallback)
- **Notificação no Título**: Título da página muda temporariamente para chamar atenção
- **Contador de Mensagens Não Lidas**: Badge visual nos avatares dos usuários

### 2. Como Funciona

#### Backend (server.js)
```javascript
// Quando uma mensagem é enviada, o servidor emite um evento WebSocket
io.emit('internal-message', {
  id: result.id,
  sender_id: req.user.id,
  receiver_id: userId,
  message: message.trim(),
  created_at: new Date().toISOString(),
  sender_name: sender.full_name || sender.username,
  receiver_name: receiver.full_name || receiver.username
});
```

#### Frontend (InternalChat.jsx)
```javascript
// Escuta eventos WebSocket
socketRef.current.on('internal-message', (messageData) => {
  // Verifica se a mensagem é para o usuário atual
  if (messageData.receiver_id === currentUser.id) {
    // Mostra notificação do navegador
    // Toca som de notificação
    // Atualiza contador de mensagens não lidas
    // Adiciona mensagem à conversa se estiver aberta
  }
});
```

## Como Usar

### 1. Primeira Vez
1. Acesse o **Chat Interno** na plataforma
2. O navegador solicitará permissão para notificações
3. Clique em **"Permitir"** para receber notificações

### 2. Recebendo Mensagens
- **Notificação do Navegador**: Aparece no canto da tela
- **Som**: Toca automaticamente
- **Badge**: Número vermelho no avatar do remetente
- **Mensagem Instantânea**: Se a conversa estiver aberta, a mensagem aparece imediatamente

### 3. Visualizando Mensagens Não Lidas
- **Lista de Usuários**: Badge vermelho com número de mensagens não lidas
- **Ao Clicar**: O contador é zerado automaticamente
- **Conversa Ativa**: Mensagens aparecem em tempo real

## Configurações

### Permissões de Notificação
- **Permitir**: Recebe todas as notificações
- **Bloquear**: Não recebe notificações (pode ser alterado nas configurações do navegador)
- **Perguntar**: Navegador pergunta a cada acesso

### Som de Notificação
- **Tecnologia**: Web Audio API (beep sintético)
- **Frequência**: 800Hz (tom agudo)
- **Duração**: 300ms
- **Volume**: 30% (configurável)
- **Compatibilidade**: Funciona em todos os navegadores modernos
- **Vantagem**: Não depende de arquivos externos

### Notificação no Título
- **Duração**: 3 segundos
- **Formato**: `🔔 [Remetente]: [Mensagem]`
- **Restauração**: Volta ao título original automaticamente

## Testes

### Arquivos de Teste
Use os arquivos de teste para verificar as funcionalidades:

**`test-real-time-notifications.html`** - Teste completo:
1. Verificar permissões de notificação
2. Testar som de notificação
3. Testar notificações do navegador
4. Verificar conexão WebSocket
5. Simular mensagens internas

**`test-audio-notification.html`** - Teste específico de áudio:
1. Verificar suporte de áudio
2. Testar diferentes caminhos de som
3. Controles de volume
4. Teste de notificação completa
5. Teste de título da página

### Como Testar
1. Abra `test-internal-notifications.html` no navegador
2. Clique em "Solicitar Permissão"
3. Teste cada funcionalidade individualmente
4. Verifique o log de eventos

## Solução de Problemas

### Notificações Não Aparecem
1. Verifique se a permissão foi concedida
2. Teste com o arquivo `test-internal-notifications.html`
3. Verifique se o servidor está rodando
4. Confirme se o WebSocket está conectado

### Som Não Toca
1. Verifique se o arquivo `/public/notification.mp3` existe
2. Confirme se o navegador não está mudo
3. Teste o som no arquivo de teste

### WebSocket Não Conecta
1. Verifique se o servidor está rodando na porta 3001
2. Confirme se não há firewall bloqueando
3. Verifique o console do navegador para erros

### Badge Não Atualiza
1. Recarregue a página
2. Verifique se o usuário está logado
3. Confirme se o WebSocket está conectado

## Arquivos Modificados

### Backend
- `server.js`: Adicionado emissão de eventos WebSocket

### Frontend
- `src/components/InternalChat.jsx`: Implementado sistema completo de notificações

### Testes
- `test-internal-notifications.html`: Arquivo de teste completo

## Próximas Melhorias

1. **Notificações Push**: Enviar notificações mesmo com a aba fechada
2. **Configurações de Som**: Permitir escolher diferentes sons
3. **Notificações por Email**: Enviar email para mensagens importantes
4. **Status Online**: Mostrar quem está online
5. **Mensagens Lidas**: Marcar mensagens como lidas
6. **Notificações Móveis**: Suporte para dispositivos móveis

## Comandos Úteis

```bash
# Reiniciar servidor
npm run server

# Verificar logs do servidor
# (no console onde o servidor está rodando)

# Testar notificações
# Abrir test-internal-notifications.html no navegador
```

## Suporte

Se encontrar problemas:
1. Verifique o console do navegador (F12)
2. Teste com o arquivo `test-internal-notifications.html`
3. Verifique se todas as dependências estão instaladas
4. Confirme se o servidor está rodando corretamente 