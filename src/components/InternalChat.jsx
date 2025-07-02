import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Divider,
  Alert,
  Chip,
  Badge,
  IconButton,
  Drawer,
  AppBar,
  Toolbar,
  ListItemButton
} from '@mui/material';
import {
  Send,
  Person,
  Chat,
  Close,
  ArrowBack
} from '@mui/icons-material';
import { io } from 'socket.io-client';

const InternalChat = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Buscar usuário atual
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Conectar ao socket
  useEffect(() => {
    socketRef.current = io('http://localhost:3001');
    
    // Escutar mensagens internas
    socketRef.current.on('internal-message', (messageData) => {
      console.log('[INTERNAL CHAT] Nova mensagem recebida:', messageData);
      
      // Adicionar mensagem se for da conversa atual
      if (selectedConversation && 
          (messageData.senderId === selectedConversation.other_user_id || 
           messageData.receiverId === selectedConversation.other_user_id)) {
        setMessages(prev => [...prev, messageData]);
      }
      
      // Atualizar lista de conversas
      fetchConversations();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedConversation]);

  // Buscar conversas
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('[INTERNAL CHAT] Buscando conversas...');
      const response = await fetch('http://localhost:3001/api/internal/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[INTERNAL CHAT] Resposta da API:', response.status);
      const data = await response.json();
      console.log('[INTERNAL CHAT] Dados recebidos:', data);
      
      if (data.success) {
        setConversations(data.conversations);
      } else {
        setError('Erro ao carregar conversas');
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  // Buscar mensagens de uma conversa
  const fetchMessages = async (otherUserId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/internal/messages/${otherUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError('Erro ao carregar mensagens');
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      setError('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  // Selecionar conversa
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.other_user_id);
    setDrawerOpen(false);
  };

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/internal/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedConversation.other_user_id,
          message: newMessage.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        // A mensagem será adicionada via socket
      } else {
        setError(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  // Formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Carregar conversas iniciais
  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <Chat />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Chat Interno
          </Typography>
          {selectedConversation && (
            <Typography variant="body2">
              {selectedConversation.other_user_name}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, display: 'flex' }}>
        {/* Lista de conversas (drawer) */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 300,
              boxSizing: 'border-box',
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Conversas
            </Typography>
          </Box>
          <List>
            {conversations.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="Nenhuma conversa encontrada"
                  secondary="Inicie uma conversa com outro funcionário"
                />
              </ListItem>
            ) : (
              conversations.map((conversation) => (
                <ListItemButton
                  key={conversation.other_user_id}
                  onClick={() => handleSelectConversation(conversation)}
                  selected={selectedConversation?.other_user_id === conversation.other_user_id}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conversation.unread_count}
                      color="error"
                      invisible={conversation.unread_count === 0}
                    >
                      <Avatar>
                        <Person />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={conversation.other_user_name}
                    secondary={
                      <Box>
                        <Typography variant="body2" noWrap>
                          {conversation.message_count} mensagens
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(conversation.last_message_time)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Drawer>

        {/* Área de chat */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Mensagens */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                <List>
                  {messages.map((message, index) => (
                    <ListItem
                      key={message.id || index}
                      sx={{
                        justifyContent: message.senderId === currentUser?.id ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1,
                          maxWidth: '70%',
                          backgroundColor: message.senderId === currentUser?.id ? 'primary.main' : 'grey.100',
                          color: message.senderId === currentUser?.id ? 'white' : 'text.primary'
                        }}
                      >
                        <Typography variant="body2">
                          {message.message}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          {formatDate(message.created_at || message.timestamp)}
                        </Typography>
                      </Paper>
                    </ListItem>
                  ))}
                  <div ref={messagesEndRef} />
                </List>
              </Box>

              {/* Input de mensagem */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={loading}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || loading}
                  >
                    <Send />
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Chat sx={{ fontSize: 64, color: 'grey.400' }} />
              <Typography variant="h6" color="text.secondary">
                Selecione uma conversa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Escolha um funcionário para iniciar o chat
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default InternalChat; 