import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Divider,
  TextField,
  Button,
  CircularProgress,
  IconButton,
  Chip,
  Badge
} from '@mui/material';
import { Send, Person, Refresh, Notifications } from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';

const API_BASE_URL = 'http://localhost:3001/api';

const InternalChat = () => {
  const { currentUser, unreadCounts, clearUnreadCount } = useNotifications();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Buscar lista de usuários
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/internal/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Erro ao buscar usuários');
      }
    } catch (err) {
      setError('Erro ao buscar usuários: ' + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Buscar mensagens com usuário selecionado
  const fetchMessages = async (userId) => {
    setLoadingMessages(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/internal/messages/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages.reverse()); // ordem cronológica
      } else {
        setError(data.error || 'Erro ao buscar mensagens');
      }
    } catch (err) {
      setError('Erro ao buscar mensagens: ' + err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Enviar mensagem
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    setSending(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/internal/messages/${selectedUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage.trim() })
      });
      const data = await response.json();
      if (data.success) {
        // Adicionar mensagem localmente para feedback imediato
        const newMessageData = {
          id: data.id,
          sender_id: currentUser.id,
          receiver_id: selectedUser.id,
          message: newMessage.trim(),
          created_at: new Date().toISOString(),
          sender_name: currentUser.full_name || currentUser.username,
          receiver_name: selectedUser.full_name || selectedUser.username
        };
        
        setMessages(prev => [...prev, newMessageData]);
        setNewMessage('');
      } else {
        setError(data.error || 'Erro ao enviar mensagem');
      }
    } catch (err) {
      setError('Erro ao enviar mensagem: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // Scroll para o final das mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Buscar usuários ao montar
  useEffect(() => {
    fetchUsers();
  }, []);

  // Buscar mensagens ao selecionar usuário
  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      // Limpar contador de mensagens não lidas ao abrir conversa
      clearUnreadCount(selectedUser.id);
    } else {
      setMessages([]);
    }
  }, [selectedUser]);

  return (
    <Box>
      <Box display="flex" height="70vh" minHeight={400}>
      {/* Lista de usuários */}
      <Paper sx={{ width: 300, mr: 2, p: 0, display: 'flex', flexDirection: 'column' }}>
        <Box p={2} display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Usuários</Typography>
          <IconButton onClick={fetchUsers} disabled={loadingUsers} size="small">
            <Refresh />
          </IconButton>
        </Box>
        <Divider />
        {loadingUsers ? (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1} py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <List dense sx={{ flex: 1, overflowY: 'auto' }}>
            {users.length === 0 ? (
              <ListItem>
                <ListItemText primary="Nenhum usuário encontrado" />
              </ListItem>
            ) : (
              users.map(user => (
                <ListItem
                  key={user.id}
                  button
                  selected={selectedUser && selectedUser.id === user.id}
                  onClick={() => setSelectedUser(user)}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={unreadCounts[user.id] || 0}
                      color="error"
                      invisible={!unreadCounts[user.id]}
                    >
                      <Avatar>
                        <Person />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.full_name || user.username}
                    secondary={user.role}
                  />
                  {user.role === 'admin' && (
                    <Chip label="Admin" size="small" color="primary" />
                  )}
                </ListItem>
              ))
            )}
          </List>
        )}
      </Paper>

      {/* Área de mensagens */}
      <Paper sx={{ flex: 1, p: 0, display: 'flex', flexDirection: 'column' }}>
        <Box p={2} borderBottom="1px solid #eee" display="flex" alignItems="center" gap={2}>
          {selectedUser ? (
            <>
              <Avatar>
                <Person />
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedUser.full_name || selectedUser.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedUser.role}
                </Typography>
              </Box>
            </>
          ) : (
            <Typography variant="h6" color="text.secondary">
              Selecione um usuário para conversar
            </Typography>
          )}
        </Box>
        <Divider />
        <Box flex={1} p={2} overflow="auto" display="flex" flexDirection="column">
          {loadingMessages ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress />
            </Box>
          ) : selectedUser ? (
            messages.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" mt={4}>
                Nenhuma mensagem ainda
              </Typography>
            ) : (
              messages.map((msg, idx) => (
                <Box
                  key={msg.id || idx}
                  display="flex"
                  flexDirection="column"
                  alignItems={msg.sender_id === selectedUser.id ? 'flex-start' : 'flex-end'}
                  mb={2}
                >
                  <Paper
                    sx={{
                      p: 1.5,
                      backgroundColor: msg.sender_id === selectedUser.id ? 'grey.100' : 'primary.main',
                      color: msg.sender_id === selectedUser.id ? 'text.primary' : 'white',
                      borderRadius: 2,
                      maxWidth: 400
                    }}
                  >
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {msg.message}
                    </Typography>
                  </Paper>
                  <Typography variant="caption" color="text.secondary" mt={0.5}>
                    {new Date(msg.created_at).toLocaleString('pt-BR')}
                  </Typography>
                </Box>
              ))
            )
          ) : null}
          <div ref={messagesEndRef} />
        </Box>
        {/* Input de mensagem */}
        {selectedUser && (
          <Box p={2} borderTop="1px solid #eee" display="flex" gap={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite sua mensagem..."
              disabled={sending}
              size="small"
            />
            <Button
              variant="contained"
              color="primary"
              endIcon={<Send />}
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              sx={{ minWidth: 48, minHeight: 48 }}
            >
              Enviar
            </Button>
          </Box>
        )}
        {error && (
          <Box p={2}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
      </Paper>
      </Box>
    </Box>
  );
};

export default InternalChat; 