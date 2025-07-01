import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Paper,
  Divider,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  People,
  Chat,
  Message,
  TrendingUp,
  WhatsApp,
  AccessTime,
  Person,
  Group,
  Search,
  FilterList,
  Refresh
} from '@mui/icons-material';

const AttendanceDashboard = ({ onSelectConversation, selectedConversation }) => {
  const [stats, setStats] = useState({
    total_conversations: 0,
    open_conversations: 0,
    total_customers: 0,
    total_messages: 0
  });
  const [allConversations, setAllConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatTypeFilter, setChatTypeFilter] = useState('all'); // 'all', 'private', 'group', 'channel'

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/attendance/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setAllConversations(data.recentConversations);
        filterConversations(data.recentConversations, searchTerm, chatTypeFilter);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterConversations = (conversations, search, chatType) => {
    let filtered = conversations;

    // Filtrar por tipo de chat
    if (chatType !== 'all') {
      filtered = filtered.filter(c => c.chat_type === chatType);
    }

    // Filtrar por termo de busca
    if (search) {
      filtered = filtered.filter(c => 
        (c.customer_name && c.customer_name.toLowerCase().includes(search.toLowerCase())) ||
        (c.customer_phone && c.customer_phone.toLowerCase().includes(search.toLowerCase())) ||
        (c.chat_name && c.chat_name.toLowerCase().includes(search.toLowerCase()))
      );
    }

    setFilteredConversations(filtered);
  };

  useEffect(() => {
    fetchDashboardData();
    // Remover atualização automática - apenas carregar uma vez
  }, []);

  useEffect(() => {
    filterConversations(allConversations, searchTerm, chatTypeFilter);
  }, [searchTerm, allConversations, chatTypeFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'warning';
      case 'closed':
        return 'default';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open':
        return 'Aberta';
      case 'closed':
        return 'Fechada';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getConversationName = (conversation) => {
    // Prioridade: nome do contato do WhatsApp
    if (conversation.contactName) {
      return conversation.contactName;
    }
    
    // Segunda prioridade: nome salvo no banco
    if (conversation.customer_name) {
      return conversation.customer_name;
    }
    
    // Terceira prioridade: nome do chat (para grupos)
    if (conversation.chat_name && conversation.chat_name !== conversation.customer_phone) {
      return conversation.chat_name;
    }
    
    // Quarta prioridade: número formatado
    if (conversation.customer_phone) {
      // Limpar número para exibição
      const phone = conversation.customer_phone.replace(/\D/g, '');
      if (phone.length === 11) {
        return `(${phone.slice(0,2)}) ${phone.slice(2,7)}-${phone.slice(7)}`;
      }
      return phone;
    }
    
    return 'Cliente';
  };

  const getConversationAvatar = (conversation) => {
    // Se tem foto de perfil, usar ela
    if (conversation.profilePicture) {
      return (
        <Avatar 
          src={conversation.profilePicture} 
          alt={getConversationName(conversation)}
          sx={{ width: 40, height: 40 }}
        />
      );
    }
    
    // Se é grupo, usar ícone de grupo
    if (conversation.chat_type === 'group') {
      return <Group />;
    }
    
    // Se é canal, usar ícone do WhatsApp
    if (conversation.chat_type === 'channel') {
      return <WhatsApp />;
    }
    
    // Padrão: ícone de pessoa
    return <Person />;
  };

  const getUnreadCount = (conversation) => {
    // Usar o campo has_unread_messages do backend
    return conversation.has_unread_messages ? 1 : 0;
  };

  const markConversationAsSeen = async (conversationId) => {
    try {
      // Marcar imediatamente no estado local para feedback instantâneo
      setAllConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, has_unread_messages: false }
            : conv
        )
      );
      
      // Fazer a requisição em background
      fetch(`http://localhost:3001/api/attendance/conversations/${conversationId}/seen`, {
        method: 'POST'
      }).catch(error => {
        console.error('Erro ao marcar conversa como visualizada:', error);
        // Reverter se falhar
        setAllConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, has_unread_messages: true }
              : conv
          )
        );
      });
    } catch (error) {
      console.error('Erro ao marcar conversa como visualizada:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box height="100vh" display="flex" flexDirection="column">
      {/* Header */}
      <Paper sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Conversas
          </Typography>
          <IconButton 
            onClick={fetchDashboardData}
            disabled={loading}
            title="Atualizar conversas"
          >
            <Refresh />
          </IconButton>
        </Box>
        
        {/* Filtro de tipo de chat */}
        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip
            label="Todas"
            color={chatTypeFilter === 'all' ? 'primary' : 'default'}
            variant={chatTypeFilter === 'all' ? 'filled' : 'outlined'}
            onClick={() => setChatTypeFilter('all')}
            size="small"
          />
          <Chip
            label="Privadas"
            color={chatTypeFilter === 'private' ? 'primary' : 'default'}
            variant={chatTypeFilter === 'private' ? 'filled' : 'outlined'}
            onClick={() => setChatTypeFilter('private')}
            size="small"
            icon={<Person />}
          />
          <Chip
            label="Grupos"
            color={chatTypeFilter === 'group' ? 'primary' : 'default'}
            variant={chatTypeFilter === 'group' ? 'filled' : 'outlined'}
            onClick={() => setChatTypeFilter('group')}
            size="small"
            icon={<Group />}
          />
          <Chip
            label="Canais"
            color={chatTypeFilter === 'channel' ? 'primary' : 'default'}
            variant={chatTypeFilter === 'channel' ? 'filled' : 'outlined'}
            onClick={() => setChatTypeFilter('channel')}
            size="small"
            icon={<WhatsApp />}
          />
        </Box>
        
        {/* Campo de busca */}
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar conversas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

      </Paper>

      {/* Lista de conversas */}
      <Box flex={1} overflow="auto">
        {filteredConversations.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%" p={3}>
            <Typography color="text.secondary" textAlign="center">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredConversations.map((conversation) => (
                              <ListItem
                  key={conversation.id}
                  selected={selectedConversation?.id === conversation.id}
                  onClick={() => {
                    onSelectConversation(conversation);
                    // Marcar como visualizada quando clicar
                    if (conversation.has_unread_messages) {
                      markConversationAsSeen(conversation.id);
                    }
                  }}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: conversation.has_unread_messages ? 'warning.light' : 'transparent',
                    fontWeight: conversation.has_unread_messages ? 'bold' : 'normal',
                    '&:hover': {
                      backgroundColor: conversation.has_unread_messages ? 'warning.main' : 'action.hover'
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.light'
                      }
                    }
                  }}
                >
                                  <ListItemAvatar>
                    <Badge
                      badgeContent={getUnreadCount(conversation)}
                      color="error"
                      invisible={getUnreadCount(conversation) === 0}
                    >
                      {conversation.profilePicture ? (
                        <Avatar 
                          src={conversation.profilePicture} 
                          alt={getConversationName(conversation)}
                          sx={{ 
                            width: 40, 
                            height: 40,
                            bgcolor: conversation.has_unread_messages ? 'warning.main' : 'primary.main'
                          }}
                        />
                      ) : (
                        <Avatar sx={{ 
                          bgcolor: conversation.has_unread_messages ? 'warning.main' : 
                                  conversation.chat_type === 'group' ? 'secondary.main' : 
                                  conversation.chat_type === 'channel' ? 'info.main' : 'primary.main' 
                        }}>
                          {getConversationAvatar(conversation)}
                        </Avatar>
                      )}
                    </Badge>
                  </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                        {getConversationName(conversation)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(conversation.last_message_time || conversation.created_at)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <React.Fragment>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {conversation.message_count || 0} mensagens
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <Chip
                          label={getStatusText(conversation.status)}
                          color={getStatusColor(conversation.status)}
                          size="small"
                          variant="outlined"
                        />
                        {conversation.chat_type === 'group' && (
                          <Chip
                            icon={<Group />}
                            label="Grupo"
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        )}
                        {conversation.chat_type === 'channel' && (
                          <Chip
                            icon={<WhatsApp />}
                            label="Canal"
                            size="small"
                            variant="outlined"
                            color="info"
                          />
                        )}
                      </Box>
                    </React.Fragment>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default AttendanceDashboard; 