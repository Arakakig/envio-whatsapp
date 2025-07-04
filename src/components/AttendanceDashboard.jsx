import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AssignmentInd,
  Business,
  Add
} from '@mui/icons-material';
import { useConversations } from '../contexts/ConversationContext';

const AttendanceDashboard = ({ onSelectConversation, selectedConversation }) => {
  const { conversations, loading, fetchConversations, markConversationAsRead, updateConversation } = useConversations();
  const [stats, setStats] = useState({
    total_conversations: 0,
    open_conversations: 0,
    total_customers: 0,
    total_messages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [chatTypeFilter, setChatTypeFilter] = useState('all'); // 'all', 'private', 'group'
  const [sectorFilter, setSectorFilter] = useState('all'); // 'all' ou nome do setor
  const [sectors, setSectors] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Estados para atribuição de conversas
  const [agents, setAgents] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedConversationForAssignment, setSelectedConversationForAssignment] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedConversationForMenu, setSelectedConversationForMenu] = useState(null);
  const [selectedAttendant, setSelectedAttendant] = useState('');
  
  // Estados para nova conversa
  const [newConversationDialogOpen, setNewConversationDialogOpen] = useState(false);
  const [newConversationPhone, setNewConversationPhone] = useState('');
  const [newConversationName, setNewConversationName] = useState('');
  const [newConversationLoading, setNewConversationLoading] = useState(false);
  const [newConversationError, setNewConversationError] = useState('');

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      console.log('[DASHBOARD] Buscando dados...', forceRefresh ? '(refresh forçado)' : '', 'Chamada #', Date.now(), 'Inicializado:', isInitialized);
      const response = await fetch('http://localhost:3001/api/attendance/dashboard');
      const data = await response.json();
      
      console.log('[DASHBOARD] Resposta recebida:', data);
      
      if (data.success) {
        setStats(data.stats);
        console.log('[DASHBOARD] Estatísticas atualizadas');
        
        // Buscar conversas apenas se for refresh forçado ou se não houver conversas no cache
        if (forceRefresh || conversations.length === 0) {
          await fetchConversations(forceRefresh);
        } else {
          console.log('[DASHBOARD] Usando cache de conversas existente');
        }
      } else {
        console.error('[DASHBOARD] Erro na resposta:', data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    }
  };

  // Filtrar conversas usando useMemo para melhor performance
  const filteredConversations = useMemo(() => {
    if (conversations.length === 0) return [];
    
    const filtered = conversations.filter(conv => {
      // Filtrar canais @newsletter - NÃO mostrar
      if (conv.chat_name && conv.chat_name.includes('@newsletter')) {
        return false;
      }
      
      // Filtrar outros tipos de canais (broadcast, status, etc.)
      if (conv.chat_name && (
        conv.chat_name.includes('@broadcast') ||
        conv.chat_name.includes('@status') ||
        conv.chat_name.includes('@channel') ||
        conv.chat_name.includes('@group') && conv.chat_name.includes('newsletter')
      )) {
        return false;
      }
      
      // Filtrar por tipo de chat
      if (chatTypeFilter !== 'all' && conv.chat_type !== chatTypeFilter) {
        return false;
      }
      
      // Filtrar por atendente
      if (selectedAttendant && conv.assigned_agent_id !== parseInt(selectedAttendant)) {
        return false;
      }
      
      // Filtrar por setor
      if (sectorFilter !== 'all' && conv.sector_id !== parseInt(sectorFilter)) {
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
    
    console.log('[DASHBOARD] Conversas filtradas:', filtered.length, '(canais @newsletter removidos)');
    return filtered;
  }, [conversations, chatTypeFilter, selectedAttendant, sectorFilter, searchTerm]);

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

  // Carregar setores disponíveis
  const fetchSectors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/sectors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSectors(data.sectors);
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
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
    setSelectedSector('');
    setAssignmentError('');
  };

  // Atribuir conversa a um agente ou setor
  const handleAssignConversation = async () => {
    if (!selectedAgentId && !selectedSector) {
      setAssignmentError('Selecione um agente ou setor');
      return;
    }

    setAssignmentLoading(true);
    setAssignmentError('');

    try {
      const token = localStorage.getItem('token');
      
      // Se selecionou agente, atribuir agente
      if (selectedAgentId) {
        console.log('[ASSIGN] Atribuindo agente:', selectedAgentId, 'para conversa:', selectedConversationForAssignment.id);
        
        const response = await fetch(`http://localhost:3001/api/conversations/${selectedConversationForAssignment.id}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ agentId: selectedAgentId })
        });

        const data = await response.json();
        console.log('[ASSIGN] Resposta da API:', data);

        if (response.ok) {
          console.log('[ASSIGN] Agente atribuído com sucesso');
          
          // Atualizar apenas a conversa específica no contexto
          const agent = agents.find(a => a.id === parseInt(selectedAgentId));
          updateConversation(selectedConversationForAssignment.id, {
            assigned_agent_id: parseInt(selectedAgentId),
            assigned_agent_name: agent?.full_name
          });
          
          handleAssignDialogClose();
        } else {
          setAssignmentError(data.error || 'Erro ao atribuir conversa');
        }
      }
      
      // Se selecionou setor, atribuir setor
      if (selectedSector) {
        console.log('[ASSIGN] Atribuindo setor:', selectedSector, 'para conversa:', selectedConversationForAssignment.id);
        
        const response = await fetch(`http://localhost:3001/api/conversations/${selectedConversationForAssignment.id}/assign-sector`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sectorId: selectedSector })
        });

        const data = await response.json();
        console.log('[ASSIGN] Resposta da API:', data);

        if (response.ok) {
          console.log('[ASSIGN] Setor atribuído com sucesso');
          
          // Atualizar apenas a conversa específica no contexto
          const selectedSectorData = sectors.find(s => s.id === parseInt(selectedSector));
          updateConversation(selectedConversationForAssignment.id, { 
            sector_id: parseInt(selectedSector),
            sector_name: selectedSectorData?.name,
            sector_color: selectedSectorData?.color
          });
          
          handleAssignDialogClose();
        } else {
          setAssignmentError(data.error || 'Erro ao atribuir setor');
        }
      }
    } catch (error) {
      console.error('[ASSIGN] Erro:', error);
      setAssignmentError('Erro de conexão');
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Remover atribuição de conversa
  const handleUnassignConversation = async () => {
    console.log('[UNASSIGN] Removendo atribuição da conversa:', selectedConversationForMenu.id);
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
        console.log('[UNASSIGN] Atribuição removida com sucesso');
        
        // Atualizar apenas a conversa específica no contexto
        updateConversation(selectedConversationForMenu.id, { 
          assigned_agent_id: null,
          assigned_agent_name: null
        });
        
        handleMenuClose();
      }
    } catch (error) {
      console.error('[UNASSIGN] Erro:', error);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Atribuir conversa a um setor
  const handleAssignSectorClick = () => {
    setSelectedConversationForAssignment(selectedConversationForMenu);
    setSelectedSector('');
    setAssignmentError('');
    setAssignDialogOpen(true);
    handleMenuClose();
  };

  // Remover setor de uma conversa
  const handleUnassignSector = async () => {
    console.log('[UNASSIGN-SECTOR] Removendo setor da conversa:', selectedConversationForMenu.id);
    setAssignmentLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/conversations/${selectedConversationForMenu.id}/unassign-sector`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('[UNASSIGN-SECTOR] Setor removido com sucesso');
        
        // Atualizar apenas a conversa específica no contexto
        updateConversation(selectedConversationForMenu.id, { 
          sector_id: null,
          sector_name: null,
          sector_color: null
        });
        
        handleMenuClose();
      }
    } catch (error) {
      console.error('[UNASSIGN-SECTOR] Erro:', error);
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Funções para nova conversa
  const handleNewConversationClick = () => {
    setNewConversationDialogOpen(true);
    setNewConversationPhone('');
    setNewConversationName('');
    setNewConversationError('');
  };

  const handleNewConversationClose = () => {
    setNewConversationDialogOpen(false);
    setNewConversationPhone('');
    setNewConversationName('');
    setNewConversationError('');
  };

  const handleCreateNewConversation = async () => {
    if (!newConversationPhone.trim()) {
      setNewConversationError('Número de telefone é obrigatório');
      return;
    }

    setNewConversationLoading(true);
    setNewConversationError('');

    try {
      const token = localStorage.getItem('token');
      console.log('[NEW-CONVERSATION] Enviando requisição para:', 'http://localhost:3001/api/attendance/new-conversation');
      console.log('[NEW-CONVERSATION] Dados:', { phone: newConversationPhone.trim(), name: newConversationName.trim() || null });
      
      const response = await fetch('http://localhost:3001/api/attendance/new-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: newConversationPhone.trim(),
          name: newConversationName.trim() || null
        })
      });

      console.log('[NEW-CONVERSATION] Status da resposta:', response.status);
      console.log('[NEW-CONVERSATION] Headers da resposta:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('[NEW-CONVERSATION] Resposta bruta:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[NEW-CONVERSATION] Erro ao fazer parse da resposta:', parseError);
        console.error('[NEW-CONVERSATION] Resposta que causou erro:', responseText);
        throw new Error('Resposta inválida do servidor');
      }

      if (data.success) {
        console.log('[NEW-CONVERSATION] Nova conversa criada:', data.conversation);
        
        // Adicionar nova conversa ao contexto
        if (data.conversation) {
          // Fazer refresh para buscar a nova conversa
          await fetchDashboardData(true);
        }
        
        handleNewConversationClose();
      } else {
        setNewConversationError(data.error || 'Erro ao criar nova conversa');
      }
    } catch (error) {
      console.error('[NEW-CONVERSATION] Erro:', error);
      setNewConversationError('Erro ao criar nova conversa');
    } finally {
      setNewConversationLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      console.log('[DASHBOARD] Componente já inicializado, pulando chamadas duplicadas');
      return;
    }
    
    console.log('[DASHBOARD] useEffect executado - montando componente');
    setIsInitialized(true);
    fetchDashboardData();
    fetchAgents();
    fetchSectors();
  }, [isInitialized]);

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
      // Usar a função do contexto global que já faz tudo
      await markConversationAsRead(conversationId);
      console.log('[DASHBOARD] Conversa marcada como lida via contexto:', conversationId);
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
      
          <Box display="flex" alignItems="center" gap={1}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
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
            
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Setor</InputLabel>
              <Select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                label="Setor"
              >
                <MenuItem value="all">
                  <em>Todos os setores</em>
                </MenuItem>
                {sectors.map((sector) => (
                  <MenuItem key={sector.id} value={sector.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        width={16}
                        height={16}
                        borderRadius="50%"
                        sx={{ backgroundColor: sector.color }}
                      />
                      {sector.name}
                    </Box>
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
          
          {/* Botões de ação */}
          <Box ml="auto" display="flex" gap={1}>
            <IconButton
              onClick={handleNewConversationClick}
              size="small"
              title="Nova conversa"
              color="primary"
            >
              <Add />
            </IconButton>
            <IconButton
              onClick={() => {
                fetchDashboardData(true); // Refresh forçado
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
                        {conversation.sector_name && (
                          <Chip
                            icon={<Business />}
                            label={conversation.sector_name}
                            size="small"
                            variant="outlined"
                            color="info"
                            style={{ backgroundColor: conversation.sector_color || '#e3f2fd' }}
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
                    disabled={assignmentLoading}
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
            
            <Divider />
            
            {!selectedConversationForMenu.sector_id ? (
              <MenuItem onClick={handleAssignSectorClick}>
                <Business sx={{ mr: 1 }} />
                Atribuir a setor
              </MenuItem>
            ) : (
              <MenuItem onClick={handleUnassignSector}>
                <Business sx={{ mr: 1 }} />
                Remover setor ({selectedConversationForMenu.sector_name})
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
                <MenuItem value="">
                  <em>Nenhum agente</em>
                </MenuItem>
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Selecionar Setor</InputLabel>
              <Select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                label="Selecionar Setor"
              >
                <MenuItem value="">
                  <em>Nenhum setor</em>
                </MenuItem>
                {sectors.map((sector) => (
                  <MenuItem key={sector.id} value={sector.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        width={16}
                        height={16}
                        borderRadius="50%"
                        sx={{ backgroundColor: sector.color }}
                      />
                      {sector.name}
                    </Box>
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
            disabled={assignmentLoading || (!selectedAgentId && !selectedSector)}
            startIcon={assignmentLoading ? <CircularProgress size={16} /> : null}
          >
            {assignmentLoading ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de nova conversa */}
      <Dialog open={newConversationDialogOpen} onClose={handleNewConversationClose} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Conversa</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 2 }}>
            {newConversationError && (
              <Alert severity="error" onClose={() => setNewConversationError('')}>
                {newConversationError}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="Número de telefone"
              value={newConversationPhone}
              onChange={(e) => setNewConversationPhone(e.target.value)}
              placeholder="(67) 99999-9999"
              helperText="Digite o número com DDD"
            />
            
            <TextField
              fullWidth
              label="Nome do cliente (opcional)"
              value={newConversationName}
              onChange={(e) => setNewConversationName(e.target.value)}
              placeholder="Nome do cliente"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewConversationClose}>Cancelar</Button>
          <Button 
            onClick={handleCreateNewConversation} 
            variant="contained"
            disabled={newConversationLoading || !newConversationPhone.trim()}
            startIcon={newConversationLoading ? <CircularProgress size={16} /> : null}
          >
            {newConversationLoading ? 'Criando...' : 'Criar Conversa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceDashboard; 