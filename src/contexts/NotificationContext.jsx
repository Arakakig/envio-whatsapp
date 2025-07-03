import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';

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

export const NotificationProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [toasts, setToasts] = useState([]);
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
          duration: 5000
        });
      }
    });

    // Escutar mensagens de conversas (WhatsApp)
    socketRef.current.on('chatwood', (data) => {
      if (data.type === 'message') {
        console.log('[NOTIFICATIONS] Nova mensagem de conversa recebida:', data);
        
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
            duration: 5000
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
    setToasts(prev => [...prev, toast]);
    
    // Remover toast automaticamente após a duração
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);
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

  // Função para obter contador total de mensagens não lidas
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  }, [unreadCounts]);

  const value = useMemo(() => ({
    currentUser,
    unreadCounts,
    toasts,
    addToast,
    removeToast,
    clearUnreadCount,
    getTotalUnreadCount,
    socket: socketRef.current
  }), [currentUser, unreadCounts, toasts, addToast, removeToast, clearUnreadCount, getTotalUnreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </NotificationContext.Provider>
  );
};

// Componente Toast
const ToastContainer = ({ toasts, removeToast }) => {
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
        <Toast key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const Toast = ({ toast, removeToast }) => {
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
      cursor: 'pointer',
      fontFamily: 'Arial, sans-serif'
    };

    switch (toast.type) {
      case 'message':
        return {
          ...baseStyle,
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          color: '#1565c0'
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

  return (
    <div
      style={getToastStyle()}
      onClick={() => removeToast(toast.id)}
      title="Clique para fechar"
    >
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '4px',
          fontSize: '14px'
        }}>
          {toast.title}
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