import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { 
  Box, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Typography, 
  IconButton, 
  Chip,
  Button
} from '@mui/material';
import { 
  Notifications, 
  AlternateEmail, 
  Message, 
  Close, 
  History,
  Person
} from '@mui/icons-material';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return context;
};

// Função para tocar beep de notificação usando Web Audio API
const playNotificationBeep = () => {
  try {
    // Criar contexto de áudio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Criar oscilador para gerar o som
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configurar o som
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frequência 800Hz
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configurar volume e envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    // Tocar o som
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    console.log('[NOTIFICATIONS] Beep de notificação tocado com sucesso');
    return true;
  } catch (error) {
    console.log('[NOTIFICATIONS] Erro ao tocar beep:', error);
    return false;
  }
};

// Função para tocar som específico para menções
const playMentionSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Criar dois osciladores para um som mais distintivo
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configurar os sons
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configurar volume e envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    // Tocar o som
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.4);
    oscillator2.stop(audioContext.currentTime + 0.4);
    
    console.log('[NOTIFICATIONS] Som de menção tocado com sucesso');
    return true;
  } catch (error) {
    console.log('[NOTIFICATIONS] Erro ao tocar som de menção:', error);
    return false;
  }
};

export const NotificationProvider = ({ children, conversationContext }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [toasts, setToasts] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const socketRef = useRef(null);
  const originalTitleRef = useRef(null);
  const titleTimeoutRef = useRef(null);

  // Buscar usuário atual
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      console.log('[NOTIFICATIONS] Usuário carregado:', user);
      setCurrentUser(user);
    }

    // Solicitar permissão de notificação
    if ('Notification' in window && Notification.permission === 'default') {
      console.log('[NOTIFICATIONS] Solicitando permissão de notificação');
      Notification.requestPermission().then(permission => {
        console.log('[NOTIFICATIONS] Permissão de notificação:', permission);
      });
    } else {
      console.log('[NOTIFICATIONS] Status da permissão de notificação:', Notification.permission);
    }
  }, []);

  // Configurar WebSocket global
  useEffect(() => {
    if (!currentUser) return;

    console.log('[NOTIFICATIONS] Conectando WebSocket global');
    socketRef.current = io('http://localhost:3001');

    // Escutar mensagens internas
    socketRef.current.on('internal-message', (messageData) => {
      console.log('[NOTIFICATIONS] Nova mensagem interna recebida:', messageData);
      
      // Verificar se a mensagem é para o usuário atual
      if (messageData.receiver_id == currentUser.id) {
        console.log('[NOTIFICATIONS] Processando notificação interna para usuário:', currentUser.id);
        
        // Notificar no título da página
        if (!originalTitleRef.current) {
          originalTitleRef.current = document.title;
        }
        
        // Limpar timeout anterior se existir
        if (titleTimeoutRef.current) {
          clearTimeout(titleTimeoutRef.current);
        }
        
        const notificationTitle = `🔔 ${messageData.sender_name}: ${messageData.message}`;
        document.title = notificationTitle;
        
        // Restaurar título original após 3 segundos
        titleTimeoutRef.current = setTimeout(() => {
          document.title = originalTitleRef.current;
        }, 3000);
        
        console.log('[NOTIFICATIONS] Título da página atualizado:', notificationTitle);
        
        // Mostrar notificação do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          console.log('[NOTIFICATIONS] Enviando notificação do navegador');
          new Notification('Nova Mensagem Interna', {
            body: `${messageData.sender_name}: ${messageData.message}`,
            icon: 'http://localhost:3001/vite.svg',
            badge: 'http://localhost:3001/vite.svg',
            tag: 'internal-message',
            requireInteraction: false,
            silent: false
          });
        } else {
          console.log('[NOTIFICATIONS] Notificação do navegador não disponível:', {
            hasNotification: 'Notification' in window,
            permission: Notification.permission
          });
        }

        // Tocar som de notificação
        playNotificationBeep();

        // Atualizar contador de mensagens não lidas
        setUnreadCounts(prev => {
          const newCounts = {
            ...prev,
            [messageData.sender_id]: (prev[messageData.sender_id] || 0) + 1
          };
          console.log('[NOTIFICATIONS] Contador de mensagens não lidas atualizado:', {
            sender_id: messageData.sender_id,
            previous_count: prev[messageData.sender_id] || 0,
            new_count: newCounts[messageData.sender_id],
            all_counts: newCounts
          });
          return newCounts;
        });

        // Adicionar toast
        addToast({
          id: Date.now(),
          type: 'message',
          title: 'Nova Mensagem Interna',
          message: `${messageData.sender_name}: ${messageData.message}`,
          sender: messageData.sender_name,
          duration: 0, // Não fecha sozinho
          persistent: true
        });
      }
    });

    // Escutar menções
    socketRef.current.on('new-mention', (mentionData) => {
      console.log('[NOTIFICATIONS] Nova menção recebida:', mentionData);
      
      // Verificar se a menção é para o usuário atual
      if (mentionData.mentionedUserId == currentUser.id) {
        console.log('[NOTIFICATIONS] Processando notificação de menção para usuário:', currentUser.id);
        
        // Notificar no título da página
        if (!originalTitleRef.current) {
          originalTitleRef.current = document.title;
        }
        
        // Limpar timeout anterior se existir
        if (titleTimeoutRef.current) {
          clearTimeout(titleTimeoutRef.current);
        }
        
        const notificationTitle = `@${currentUser.username} foi mencionado`;
        document.title = notificationTitle;
        
        // Restaurar título original após 3 segundos
        titleTimeoutRef.current = setTimeout(() => {
          document.title = originalTitleRef.current;
        }, 3000);
        
        console.log('[NOTIFICATIONS] Título da página atualizado:', notificationTitle);
        
        // Mostrar notificação do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          console.log('[NOTIFICATIONS] Enviando notificação do navegador para menção');
          new Notification('Você foi mencionado!', {
            body: `${mentionData.mentionedBy} mencionou você em uma mensagem: "${mentionData.messageContent}"`,
            icon: 'http://localhost:3001/vite.svg',
            badge: 'http://localhost:3001/vite.svg',
            tag: 'mention',
            requireInteraction: false,
            silent: false
          });
        }

        // Tocar som específico para menções
        playMentionSound();

        // Atualizar contador de menções não lidas
        setUnreadCounts(prev => {
          const newCounts = {
            ...prev,
            mentions: (prev.mentions || 0) + 1
          };
          console.log('[NOTIFICATIONS] Contador de menções não lidas atualizado:', {
            previous_count: prev.mentions || 0,
            new_count: newCounts.mentions,
            all_counts: newCounts
          });
          return newCounts;
        });

        // Adicionar toast
        addToast({
          id: Date.now(),
          type: 'mention',
          title: 'Você foi mencionado!',
          message: `${mentionData.mentionedBy} mencionou você em uma mensagem`,
          mentionText: mentionData.mentionText,
          conversationId: mentionData.conversationId,
          messageId: mentionData.messageId,
          duration: 0, // Não fecha sozinho
          persistent: true,
          clickable: true
        });
      }
    });

    // Escutar mensagens de conversas (WhatsApp)
    socketRef.current.on('chatwood', (data) => {
      if (data.type === 'message') {
        console.log('[NOTIFICATIONS] Nova mensagem de conversa recebida:', data);
        
        // Verificar se é newsletter ou status - não mostrar notificação
        const isNewsletter = data.from && (data.from.includes('@newsletter') || data.from.includes('newsletter'));
        const isStatus = data.from === 'status@broadcast';
        
        if (isNewsletter || isStatus) {
          console.log('[NOTIFICATIONS] Ignorando notificação de newsletter/status:', data.from);
          return;
        }
        
        // Atualizar conversa no contexto global
        if (conversationContext && conversationContext.updateConversationMessage) {
          conversationContext.updateConversationMessage(data.conversationId, {
            content: data.message,
            timestamp: data.timestamp,
            direction: 'inbound'
          });
        }
        
        // Verificar se a conversa não está sendo visualizada atualmente
        const isConversationOpen = window.location.pathname.includes('attendance') && 
          document.querySelector('[data-conversation-id="' + data.conversationId + '"]');
        
        if (!isConversationOpen) {
          console.log('[NOTIFICATIONS] Processando notificação de conversa');
          
          // Notificar no título da página
          if (!originalTitleRef.current) {
            originalTitleRef.current = document.title;
          }
          
          // Limpar timeout anterior se existir
          if (titleTimeoutRef.current) {
            clearTimeout(titleTimeoutRef.current);
          }
          
          const customerName = data.from.split('@')[0] || 'Cliente';
          const notificationTitle = `💬 ${customerName}: ${data.message}`;
          document.title = notificationTitle;
          
          // Restaurar título original após 3 segundos
          titleTimeoutRef.current = setTimeout(() => {
            document.title = originalTitleRef.current;
          }, 3000);
          
          console.log('[NOTIFICATIONS] Título da página atualizado:', notificationTitle);
          
          // Mostrar notificação do navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            console.log('[NOTIFICATIONS] Enviando notificação do navegador');
            new Notification('Nova Mensagem de Cliente', {
              body: `${customerName}: ${data.message}`,
              icon: 'http://localhost:3001/vite.svg',
              badge: 'http://localhost:3001/vite.svg',
              tag: 'conversation-message',
              requireInteraction: false,
              silent: false
            });
          } else {
            console.log('[NOTIFICATIONS] Notificação do navegador não disponível:', {
              hasNotification: 'Notification' in window,
              permission: Notification.permission
            });
          }

          // Tocar som de notificação
          playNotificationBeep();

          // Adicionar toast
          addToast({
            id: Date.now(),
            type: 'message',
            title: 'Nova Mensagem de Cliente',
            message: `${customerName}: ${data.message}`,
            sender: customerName,
            conversationId: data.conversationId,
            duration: 0, // Não fecha sozinho
            persistent: true,
            clickable: true
          });
        } else {
          console.log('[NOTIFICATIONS] Conversa está aberta, não mostrando notificação');
        }
      }
    });

    socketRef.current.on('connect', () => {
      console.log('[NOTIFICATIONS] WebSocket global conectado:', socketRef.current.id);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[NOTIFICATIONS] WebSocket global desconectado');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Limpar timeout do título
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
    };
  }, [currentUser]);

  // Função para adicionar toast
  const addToast = useCallback((toast) => {
    const newToast = {
      ...toast,
      timestamp: new Date()
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Adicionar ao histórico
    setNotificationHistory(prev => [newToast, ...prev.slice(0, 49)]); // Manter apenas as últimas 50
    
    // Remover toast automaticamente apenas se não for persistente
    if (!toast.persistent && toast.duration > 0) {
      setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
    }
  }, []);

  // Função para remover toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Função para limpar contador de mensagens não lidas
  const clearUnreadCount = useCallback((userId) => {
    setUnreadCounts(prev => ({
      ...prev,
      [userId]: 0
    }));
  }, []);

  // Função para limpar contador de menções
  const clearMentionsCount = useCallback(() => {
    setUnreadCounts(prev => ({
      ...prev,
      mentions: 0
    }));
  }, []);

  // Função para obter contador total de mensagens não lidas
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  }, [unreadCounts]);

  // Função para navegar para conversa
  const navigateToConversation = useCallback((conversationId, messageId = null) => {
    console.log('[NOTIFICATIONS] Navegando para conversa:', { conversationId, messageId });
    
    // Disparar evento para mudar para a view de atendimento
    const navigationEvent = new CustomEvent('navigateToAttendance', {
      detail: { conversationId, messageId }
    });
    window.dispatchEvent(navigationEvent);
  }, []);

  // Função para lidar com clique no toast
  const handleToastClick = useCallback((toast) => {
    if (toast.clickable && toast.conversationId) {
      console.log('[NOTIFICATIONS] Toast clicado:', toast);
      
      // Sempre usar a navegação unificada
      navigateToConversation(toast.conversationId, toast.messageId);
      removeToast(toast.id);
    }
  }, [navigateToConversation, removeToast]);

  const value = useMemo(() => ({
    currentUser,
    unreadCounts,
    toasts,
    notificationHistory,
    addToast,
    removeToast,
    clearUnreadCount,
    clearMentionsCount,
    getTotalUnreadCount,
    navigateToConversation,
    showHistoryDialog,
    setShowHistoryDialog,
    socket: socketRef.current
  }), [currentUser, unreadCounts, toasts, notificationHistory, addToast, removeToast, clearUnreadCount, clearMentionsCount, getTotalUnreadCount, navigateToConversation, showHistoryDialog]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} onToastClick={handleToastClick} />
      <NotificationHistoryDialog 
        open={showHistoryDialog} 
        onClose={() => setShowHistoryDialog(false)}
        notifications={notificationHistory}
        onNotificationClick={handleToastClick}
      />
    </NotificationContext.Provider>
  );
};

// Componente Toast
const ToastContainer = ({ toasts, removeToast, onToastClick }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} removeToast={removeToast} onClick={onToastClick} />
      ))}
    </div>
  );
};

const Toast = ({ toast, removeToast, onClick }) => {
  const getToastStyle = () => {
    const baseStyle = {
      minWidth: '300px',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      animation: 'slideIn 0.3s ease-out',
      cursor: toast.clickable ? 'pointer' : 'default',
      fontFamily: 'Arial, sans-serif',
      transition: 'all 0.2s ease'
    };

    switch (toast.type) {
      case 'message':
        return {
          ...baseStyle,
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          color: '#1565c0'
        };
      case 'mention':
        return {
          ...baseStyle,
          backgroundColor: '#fff3e0',
          border: '1px solid #ff9800',
          color: '#e65100'
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          color: '#2e7d32'
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          color: '#c62828'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: '#f5f5f5',
          border: '1px solid #9e9e9e',
          color: '#424242'
        };
    }
  };

  const handleClick = () => {
    if (toast.clickable && onClick) {
      onClick(toast);
    } else {
      removeToast(toast.id);
    }
  };

  return (
    <div
      style={getToastStyle()}
      onClick={handleClick}
      title={toast.clickable ? "Clique para abrir a conversa" : "Clique para fechar"}
      onMouseEnter={(e) => {
        if (toast.clickable) {
          e.target.style.transform = 'scale(1.02)';
          e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (toast.clickable) {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '4px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {toast.type === 'mention' && (
            <span style={{ fontSize: '16px' }}>@</span>
          )}
          {toast.title}
          {toast.clickable && (
            <Chip 
              label="Clique para abrir" 
              size="small" 
              color="primary" 
              variant="outlined"
              style={{ marginLeft: '8px', fontSize: '10px' }}
            />
          )}
        </div>
        <div style={{ 
          fontSize: '13px',
          lineHeight: '1.4'
        }}>
          {toast.message}
        </div>
        {toast.sender && (
          <div style={{ 
            fontSize: '11px',
            marginTop: '4px',
            opacity: 0.8
          }}>
            De: {toast.sender}
          </div>
        )}
        {toast.mentionText && (
          <div style={{ 
            fontSize: '11px',
            marginTop: '4px',
            opacity: 0.8,
            fontStyle: 'italic'
          }}>
            "{toast.mentionText}"
          </div>
        )}
        <div style={{ 
          fontSize: '10px',
          marginTop: '4px',
          opacity: 0.6
        }}>
          {toast.timestamp?.toLocaleTimeString()}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeToast(toast.id);
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          opacity: 0.6,
          padding: '0',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ×
      </button>
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

// Componente de histórico de notificações
const NotificationHistoryDialog = ({ open, onClose, notifications, onNotificationClick }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <History />
            <Typography variant="h6">Histórico de Notificações</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {notifications.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              Nenhuma notificação no histórico
            </Typography>
          </Box>
        ) : (
          <List>
            {notifications.map((notification) => (
              <ListItem 
                key={notification.id}
                button={notification.clickable}
                onClick={() => {
                  if (notification.clickable && onNotificationClick) {
                    onNotificationClick(notification);
                    onClose();
                  }
                }}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: notification.clickable ? 'action.hover' : 'transparent'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ 
                    bgcolor: notification.type === 'mention' ? 'warning.main' : 'primary.main' 
                  }}>
                    {notification.type === 'mention' ? <AlternateEmail /> : <Message />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {notification.title}
                      </Typography>
                      {notification.clickable && (
                        <Chip 
                          label="Clique para abrir" 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      {notification.sender && (
                        <Typography variant="caption" color="text.secondary">
                          De: {notification.sender}
                        </Typography>
                      )}
                      {notification.mentionText && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          "{notification.mentionText}"
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {notification.timestamp?.toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}; 