import React, { useEffect, useRef } from 'react';
import { Snackbar, Alert, Box, Typography, Button } from '@mui/material';
import { io } from 'socket.io-client';

const NotificationSystem = () => {
  const [open, setOpen] = React.useState(false);
  const [currentNotification, setCurrentNotification] = React.useState(null);
  const socketRef = useRef(null);
  const originalTitle = useRef(document.title);
  const notificationCount = useRef(0);
  const lastCheckTime = useRef(new Date().toISOString());

  useEffect(() => {
    // Conectar ao socket
    socketRef.current = io('http://localhost:3001');
    console.log('[FRONTEND] Tentando conectar socket para notificações...');

    // Escutar notificações
    socketRef.current.on('new-notification', (notification) => {
      console.log('[FRONTEND] Nova notificação recebida:', notification);
      setCurrentNotification(notification);
      setOpen(true);
      playNotificationSound();
      updateTitle();
    });

    // Escutar mensagens novas diretamente do backend (chatwood)
    socketRef.current.on('chatwood', (data) => {
      if (data.type === 'message') {
        // Emitir notificação para si mesmo
        const notificationData = {
          type: 'new-message',
          conversationId: data.conversationId,
          from: data.from,
          message: `Nova mensagem: ${data.message || 'Mídia recebida'}`,
          timestamp: data.timestamp
        };
        socketRef.current.emit('new-notification', notificationData);
      }
    });
    
    // Log de conexão
    socketRef.current.on('connect', () => {
      console.log('[FRONTEND] Socket conectado para notificações, ID:', socketRef.current.id);
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('[FRONTEND] Socket desconectado das notificações');
    });
    
    socketRef.current.on('connect_error', (error) => {
      console.error('[FRONTEND] Erro de conexão do socket:', error);
    });

    // Verificar permissão de notificação
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Função para buscar apenas mensagens novas
  const checkNewMessages = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/attendance/new-messages?since=${lastCheckTime.current}`);
      const data = await response.json();
      
      if (data.success && data.newMessages.length > 0) {
        console.log(`[NOTIFICATION] ${data.newMessages.length} conversas com mensagens novas detectadas`);
        
        // Emitir notificação para cada conversa com mensagens novas
        data.newMessages.forEach(conv => {
          if (conv.has_unread_messages && socketRef.current && socketRef.current.connected) {
            const notificationData = {
              type: 'new-message',
              conversationId: conv.conversation_id,
              from: conv.customer_phone || conv.chat_id,
              message: `Nova mensagem de ${conv.customer_name || 'Cliente'}`,
              timestamp: new Date().toISOString()
            };
            console.log('[NOTIFICATION] Emitindo notificação:', notificationData);
            socketRef.current.emit('new-notification', notificationData);
          }
        });
      }
      
      // Atualizar timestamp da última verificação
      lastCheckTime.current = data.timestamp || new Date().toISOString();
    } catch (error) {
      console.error('[NOTIFICATION] Erro ao verificar mensagens novas:', error);
    }
  };

  // Verificar mensagens novas periodicamente (mais leve que antes)
  useEffect(() => {
    // Primeira verificação após 5 segundos
    const initialCheck = setTimeout(() => {
      checkNewMessages();
    }, 5000);
    
    // Verificar a cada 30 segundos (mais eficiente)
    const interval = setInterval(() => {
      checkNewMessages();
    }, 30000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, []);

  const playNotificationSound = () => {
    console.log('[FRONTEND] Tocando som de notificação');
    try {
      // Usar beep simples do navegador
      playBeep();
    } catch (error) {
      console.log('Erro ao tocar som:', error);
    }
  };

  const playBeep = () => {
    try {
      // Criar beep simples usando Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Erro ao tocar beep:', error);
    }
  };

  const updateTitle = () => {
    notificationCount.current++;
    
    console.log(`[FRONTEND] Atualizando título para: (${notificationCount.current}) ${originalTitle.current}`);
    
    // Atualizar título com contador
    document.title = `(${notificationCount.current}) ${originalTitle.current}`;
    
    // Restaurar título após 5 segundos
    setTimeout(() => {
      notificationCount.current = Math.max(0, notificationCount.current - 1);
      if (notificationCount.current === 0) {
        document.title = originalTitle.current;
      } else {
        document.title = `(${notificationCount.current}) ${originalTitle.current}`;
      }
    }, 5000);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentNotification(null);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Cliente';
    
    // Limpar número para exibição
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.slice(0,2)}) ${cleanPhone.slice(2,7)}-${cleanPhone.slice(7)}`;
    } else if (cleanPhone.length === 10) {
      return `(${cleanPhone.slice(0,2)}) ${cleanPhone.slice(2,6)}-${cleanPhone.slice(6)}`;
    }
    return cleanPhone;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new-message':
        return '💬';
      default:
        return '🔔';
    }
  };

  return (
    <>
      {/* Snackbar de notificação */}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ zIndex: 9999 }}
      >
        <Alert
          onClose={handleClose}
          severity="info"
          sx={{ 
            width: '100%',
            minWidth: 300,
            maxWidth: 400,
            backgroundColor: 'primary.main',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white'
            }
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {getNotificationIcon(currentNotification?.type)} Nova mensagem
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              De: {formatPhoneNumber(currentNotification?.from)}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              {currentNotification?.message}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotificationSystem; 