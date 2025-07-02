import React, { useState, useEffect, useRef } from 'react';
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
  Badge,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  ListItemSecondaryAction,
  CircularProgress
} from '@mui/material';
import {
  People,
  Chat,
  Message,
  TrendingUp,
  AccessTime,
  Person,
  Group,
  Search,
  FilterList,
  Refresh,
  Assignment,
  PersonAdd,
  MoreVert,
  AssignmentInd
} from '@mui/icons-material';
import { io } from 'socket.io-client';

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
  const [chatTypeFilter, setChatTypeFilter] = useState('all'); // 'all', 'private', 'group'
  
  // Estados para atribuição de conversas
  const [agents, setAgents] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedConversationForAssignment, setSelectedConversationForAssignment] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedConversationForMenu, setSelectedConversationForMenu] = useState(null);
  const [selectedAttendant, setSelectedAttendant] = useState('');
  const [viewedConversations, setViewedConversations] = useState(new Map());
  const socketRef = useRef(null);

  const fetchDashboardData = async () => {
    try {
      console.log('[DASHBOARD] Buscando dados...');
      const response = await fetch('http://localhost:3001/api/attendance/dashboard');
      const data = await response.json();
      
      console.log('[DASHBOARD] Resposta recebida:', data);
      
      if (data.success) {
        setStats(data.stats);
        console.log('[DASHBOARD] Conversas recebidas:', data.recentConversations.length);
        setAllConversations(data.recentConversations);
        
        // Filtrar as conversas
        const filtered = data.recentConversations.filter(conv => {
          // Filtrar por tipo de chat
          if (chatTypeFilter !== 'all' && conv.chat_type !== chatTypeFilter) {
            return false;
          }
          
          // Filtrar por atendente
          if (selectedAttendant && conv.assigned_agent_id !== parseInt(selectedAttendant)) {
            return false;
          }
          
          // Filtrar por termo de busca
          if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matches = 
              (conv.customer_name && conv.customer_name.toLowerCase().includes(search)) ||
              (conv.customer_phone && conv.customer_phone.toLowerCase().includes(search)) ||
              (conv.chat_name && conv.chat_name.toLowerCase().includes(search));
            if (!matches) return false;
          }
          
          return true;
        });
        
        console.log('[DASHBOARD] Conversas filtradas:', filtered.length);
        setFilteredConversations(filtered);
      } else {
        console.error('[DASHBOARD] Erro na resposta:', data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar agentes disponíveis
  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/agents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
    }
  };

  // Abrir menu de ações da conversa
  const handleMenuOpen = (event, conversation) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedConversationForMenu(conversation);
  };

  // Fechar menu de ações
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedConversationForMenu(null);
  };

  // Abrir diálogo de atribuição
  const handleAssignClick = () => {
    setSelectedConversationForAssignment(selectedConversationForMenu);
    setSelectedAgentId('');
    setAssignmentError('');
    setAssignDialogOpen(true);
    handleMenuClose();
  };

  // Fechar diálogo de atribuição
  const handleAssignDialogClose = () => {
    setAssignDialogOpen(false);
    setSelectedConversationForAssignment(null);
    setSelectedAgentId('');
    setAssignmentError('');
  };

  // Atribuir conversa a um agente
  const handleAssignConversation = async () => {
    if (!selectedAgentId) {
      setAssignmentError('Selecione um agente');
      return;
    }

    setAssignmentLoading(true);
    setAssignmentError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/conversations/${selectedConversationForAssignment.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agentId: selectedAgentId })
      });

      const data = await response.json();

      if (response.ok) {
        // Atualizar a conversa na lista
        setAllConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversationForAssignment.id 
              ? { ...conv, assigned_agent_id: selectedAgentId }
              : conv
          )
        );
        
        handleAssignDialogClose();
        fetchDashboardData(); // Recarregar dados
      } else {
        setAssignmentError(data.error || 'Erro ao atribuir conversa');
      }
    } catch (error) {
      setAssignmentError('Erro de conexão');
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Remover atribuição de conversa
  const handleUnassignConversation = async () => {
    setAssignmentLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/conversations/${selectedConversationForMenu.id}/unassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Atualizar a conversa na lista
        setAllConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversationForMenu.id 
              ? { ...conv, assigned_agent_id: null }
              : conv
          )
        );
        
        handleMenuClose();
        fetchDashboardData(); // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao remover atribuição:', error);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Função para atualizar apenas uma conversa específica
  const updateConversationWithNewMessage = (conversationId, messageData) => {
    setAllConversations(prev => {
      // Encontrar a conversa atual
      const conversationIndex = prev.findIndex(conv => conv.id === conversationId);
      if (conversationIndex === -1) return prev;
      
      // Criar nova lista com a conversa atualizada
      const updatedConversations = [...prev];
      const updatedConversation = {
        ...updatedConversations[conversationIndex],
        has_unread_messages: true,
        last_message_time: messageData.timestamp,
        message_count: (updatedConversations[conversationIndex].message_count || 0) + 1
      };
      
      // Remover a conversa da posição atual
      updatedConversations.splice(conversationIndex, 1);
      
      // Adicionar no topo da lista
      updatedConversations.unshift(updatedConversation);
      
      return updatedConversations;
    });
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAgents();
  }, []);

  // Efeito para refazer a filtragem quando os filtros mudarem
  useEffect(() => {
    if (allConversations.length > 0) {
      const filtered = allConversations.filter(conv => {
        // Filtrar por tipo de chat
        if (chatTypeFilter !== 'all' && conv.chat_type !== chatTypeFilter) {
          return false;
        }
        
        // Filtrar por atendente
        if (selectedAttendant && conv.assigned_agent_id !== parseInt(selectedAttendant)) {
          return false;
        }
        
        // Filtrar por termo de busca
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const matches = 
            (conv.customer_name && conv.customer_name.toLowerCase().includes(search)) ||
            (conv.customer_phone && conv.customer_phone.toLowerCase().includes(search)) ||
            (conv.chat_name && conv.chat_name.toLowerCase().includes(search));
          if (!matches) return false;
        }
        
        return true;
      });
      
      setFilteredConversations(filtered);
    }
  }, [searchTerm, chatTypeFilter, selectedAttendant, allConversations]);

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
    // Ajustar para fuso horário local (GMT-4 - Campo Grande)
    const localDate = new Date(date.getTime() + (4 * 60 * 60 * 1000));
    const now = new Date();
    const diffInHours = (now - localDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return localDate.toLocaleTimeString('pt-BR', { 
        timeZone: 'America/Campo_Grande',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return 'Ontem';
    } else {
      return localDate.toLocaleDateString('pt-BR', { 
        timeZone: 'America/Campo_Grande',
        day: '2-digit', 
        month: '2-digit' 
      });
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
    
    return 'Cliente';
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    
    // Limpar número para exibição
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.slice(0,2)}) ${cleanPhone.slice(2,7)}-${cleanPhone.slice(7)}`;
    } else if (cleanPhone.length === 10) {
      return `(${cleanPhone.slice(0,2)}) ${cleanPhone.slice(2,6)}-${cleanPhone.slice(6)}`;
    }
    return cleanPhone;
  };

  const getConversationAvatar = (conversation) => {
    // Se tem foto de perfil, usar ela
    if (conversation.profilePicture) {
      return (
        <Avatar 
          src={conversation.profilePicture} 
          alt={getConversationName(conversation)}
          sx={{ width: 40, height: 40 }}
          onError={(e) => {
            // Se a imagem falhar ao carregar, usar ícone padrão
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        >
          {/* Fallback se a imagem falhar */}
          <Box display="none" alignItems="center" justifyContent="center" width="100%" height="100%">
            {conversation.chat_type === 'group' ? <Group /> : <Person />}
          </Box>
        </Avatar>
      );
    }
    
    // Se é grupo, usar ícone de grupo
    if (conversation.chat_type === 'group') {
      return (
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}>
          <Group />
        </Avatar>
      );
    }
    
    // Padrão: ícone de pessoa
    return (
      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
        <Person />
      </Avatar>
    );
  };

  const getUnreadCount = (conversation) => {
    // Usar o campo has_unread_messages do backend
    return conversation.has_unread_messages ? 1 : 0;
  };

  // Obter nome do agente atribuído
  const getAssignedAgentName = (conversation) => {
    if (!conversation.assigned_agent_id) return null;
    
    const agent = agents.find(a => a.id === conversation.assigned_agent_id);
    return agent ? agent.full_name : 'Agente desconhecido';
  };

  const markConversationAsSeen = async (conversationId) => {
    try {
      // Encontrar a conversa atual para obter o timestamp da última mensagem
      const currentConversation = allConversations.find(conv => conv.id === conversationId);
      const lastMessageTime = currentConversation?.last_message_time;
      
      // Adicionar à lista de conversas visualizadas com o timestamp
      setViewedConversations(prev => new Map(prev.set(conversationId, lastMessageTime)));
      
      // Marcar imediatamente no estado local para feedback instantâneo
      setAllConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, has_unread_messages: false }
            : conv
        )
      );
      
      // Atualizar também a lista filtrada
      setFilteredConversations(prev => 
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
        setViewedConversations(prev => {
          const newMap = new Map(prev);
          newMap.delete(conversationId);
          return newMap;
        });
        setAllConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, has_unread_messages: true }
              : conv
          )
        );
        setFilteredConversations(prev => 
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

  // Conectar ao socket para atualizações em tempo real
  useEffect(() => {
    socketRef.current = io('http://localhost:3001');
    
    // Escutar novas mensagens
    socketRef.current.on('chatwood', (data) => {
      if (data.type === 'message') {
        console.log('[DASHBOARD] Nova mensagem recebida via socket:', data);
        // Atualizar apenas a conversa específica
        updateConversationWithNewMessage(data.conversationId, data);
        // Não emitir notificação aqui!
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

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
          <Box display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Atendente</InputLabel>
              <Select
                value={selectedAttendant}
                onChange={(e) => setSelectedAttendant(e.target.value)}
                label="Atendente"
              >
                <MenuItem value="">
                  <em>Todos os atendentes</em>
                </MenuItem>
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
       
            
         
          </Box>
        </Box>
        
        {/* Filtro de tipo de chat */}
        <Box display="flex" alignItems="center" gap={1} mb={2}>
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
          
          {/* Botão de refresh manual */}
          <Box ml="auto">
            <IconButton
              onClick={() => {
                fetchDashboardData();
                fetchAgents();
              }}
              size="small"
              title="Atualizar dados"
            >
              <Refresh />
            </IconButton>
          </Box>
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
                                conversation.chat_type === 'group' ? 'secondary.main' : 'primary.main' 
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
                        {formatPhoneNumber(conversation.customer_phone)} • {conversation.message_count || 0} mensagens
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
                        {getAssignedAgentName(conversation) && (
                          <Chip
                            icon={<Assignment />}
                            label={getAssignedAgentName(conversation)}
                            size="small"
                            variant="outlined"
                            color="success"
                          />
                        )}
                      </Box>
                    </React.Fragment>
                  }
                />
                
                {/* Menu de ações */}
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => handleMenuOpen(e, conversation)}
                    size="small"
                  >
                    <MoreVert />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Menu de ações da conversa */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {selectedConversationForMenu && (
          <>
            {!selectedConversationForMenu.assigned_agent_id ? (
              <MenuItem onClick={handleAssignClick}>
                <Assignment sx={{ mr: 1 }} />
                Atribuir a agente
              </MenuItem>
            ) : (
              <MenuItem onClick={handleUnassignConversation}>
                <PersonAdd sx={{ mr: 1 }} />
                Remover atribuição
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      {/* Diálogo de atribuição */}
      <Dialog open={assignDialogOpen} onClose={handleAssignDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Atribuir Conversa</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 2 }}>
            {assignmentError && (
              <Alert severity="error" onClose={() => setAssignmentError('')}>
                {assignmentError}
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Conversa: <strong>{selectedConversationForAssignment?.customer_name || 'Cliente'}</strong>
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel>Selecionar Agente</InputLabel>
              <Select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                label="Selecionar Agente"
              >
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignDialogClose}>Cancelar</Button>
          <Button 
            onClick={handleAssignConversation} 
            variant="contained"
            disabled={assignmentLoading || !selectedAgentId}
          >
            {assignmentLoading ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceDashboard; 