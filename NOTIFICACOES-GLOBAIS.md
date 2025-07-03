# 🔔 Sistema de Notificações Globais

## Visão Geral

O sistema de notificações globais foi implementado para funcionar em **todas as páginas** da aplicação, não apenas no chat interno. Ele utiliza um contexto React global que gerencia WebSocket, notificações do navegador, toasts visuais e contadores de mensagens não lidas.

## 🏗️ Arquitetura

### Componentes Principais

1. **NotificationContext** (`src/contexts/NotificationContext.jsx`)
   - Contexto global que gerencia todas as notificações
   - Conecta ao WebSocket automaticamente
   - Gerencia toasts, contadores e notificações do navegador

2. **NotificationBadge** (`src/components/NotificationBadge.jsx`)
   - Badge no header mostrando total de mensagens não lidas
   - Clique redireciona para o chat interno

3. **InternalChat** (`src/components/InternalChat.jsx`)
   - Simplificado para usar o contexto global
   - Não gerencia mais WebSocket localmente

### Integração no App

- `NotificationProvider` envolve toda a aplicação
- Badge de notificações no header
- Toasts aparecem em todas as páginas

## 🚀 Funcionalidades

### 1. Notificações em Tempo Real
- **WebSocket global**: Conecta uma vez e funciona em todas as páginas
- **Mensagens internas**: Recebe notificações de mensagens entre usuários
- **Persistência**: Mantém conexão ao navegar entre páginas

### 2. Múltiplos Tipos de Notificação

#### Toast Visual
- Aparece no canto superior direito
- Animação de entrada suave
- Fechamento automático após 5 segundos
- Clique para fechar manualmente

#### Notificação do Navegador
- Solicita permissão automaticamente
- Mostra título, corpo e ícone
- Funciona mesmo com a aba minimizada

#### Som de Notificação
- Beep usando Web Audio API
- Frequência 800Hz, duração 0.3s
- Funciona em todos os navegadores modernos

#### Título da Página
- Altera temporariamente o título da aba
- Mostra remetente e mensagem
- Restaura título original após 3 segundos

### 3. Contadores de Mensagens Não Lidas
- Badge no header com total de mensagens
- Contadores individuais por usuário
- Limpeza automática ao abrir conversa

## 📱 Como Usar

### Para Usuários
1. **Receber notificações**: As notificações aparecem automaticamente em qualquer página
2. **Ver contadores**: O badge no header mostra mensagens não lidas
3. **Acessar chat**: Clique no badge para ir ao chat interno
4. **Fechar toasts**: Clique no X ou aguarde fechamento automático

### Para Desenvolvedores

#### Adicionar Notificação Manual
```javascript
import { useNotifications } from '../contexts/NotificationContext';

const MyComponent = () => {
  const { addToast } = useNotifications();
  
  const showNotification = () => {
    addToast({
      id: Date.now(),
      type: 'success', // 'message', 'success', 'error'
      title: 'Título da Notificação',
      message: 'Mensagem da notificação',
      duration: 5000
    });
  };
};
```

#### Acessar Contadores
```javascript
const { unreadCounts, getTotalUnreadCount, clearUnreadCount } = useNotifications();

// Total de mensagens não lidas
const total = getTotalUnreadCount();

// Contador de usuário específico
const userCount = unreadCounts[userId] || 0;

// Limpar contador de usuário
clearUnreadCount(userId);
```

## 🔧 Configuração

### Backend (server.js)
O backend deve emitir eventos WebSocket:

```javascript
// Ao enviar mensagem interna
socket.emit('internal-message', {
  id: messageId,
  sender_id: senderId,
  receiver_id: receiverId,
  message: messageText,
  created_at: timestamp,
  sender_name: senderName,
  receiver_name: receiverName
});
```

### Frontend
1. **NotificationProvider** deve envolver toda a aplicação
2. **Badge** no header para acesso rápido ao chat
3. **Contexto** disponível em todos os componentes

## 🧪 Testes

### Arquivo de Teste
Use `test-notifications-global.html` para testar:
- Notificações do navegador
- Som de notificação
- Toasts visuais
- Integração WebSocket

### Testes Manuais
1. Abra diferentes páginas da aplicação
2. Envie mensagem interna de outro usuário
3. Verifique se notificações aparecem em todas as páginas
4. Teste clique no badge para ir ao chat

## 🐛 Solução de Problemas

### Erro de Loop Infinito
- **Causa**: Dependências incorretas em useEffect
- **Solução**: Use useCallback e useMemo no contexto

### Notificações Não Aparecem
- **Verificar**: Permissão do navegador
- **Verificar**: Conexão WebSocket
- **Verificar**: Console para erros

### Som Não Toca
- **Causa**: Política de áudio do navegador
- **Solução**: Interação do usuário necessária primeiro

### Toasts Não Aparecem
- **Verificar**: CSS e z-index
- **Verificar**: Container de toasts no DOM

## 📊 Performance

### Otimizações Implementadas
- **useCallback**: Evita recriação de funções
- **useMemo**: Evita recriação do valor do contexto
- **WebSocket único**: Uma conexão para toda a aplicação
- **Cleanup automático**: Limpeza de timeouts e conexões

### Monitoramento
- Logs detalhados no console
- Status de conexão WebSocket
- Contadores de mensagens não lidas

## 🔄 Atualizações Futuras

### Possíveis Melhorias
1. **Notificações push**: Integração com service workers
2. **Preferências**: Configuração de tipos de notificação
3. **Histórico**: Log de notificações recebidas
4. **Som personalizado**: Upload de arquivos de áudio
5. **Temas**: Personalização visual dos toasts

### Integração com Outros Sistemas
- Notificações de WhatsApp
- Alertas de sistema
- Notificações de usuários
- Lembretes e agendamentos 