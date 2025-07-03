import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Avatar,
  Slide,
  Fade
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  QrCode as QrCodeIcon,
  Send as SendIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Support,
  Dashboard,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Chat as ChatIcon,
  Note as NoteIcon,
  Download as DownloadIcon,
  Business
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import AttendanceDashboard from './components/AttendanceDashboard';
import AttendanceChat from './components/AttendanceChat';
import Login from './components/Login';
import Register from './components/Register';
import UserManagement from './components/UserManagement';
import SectorManagement from './components/SectorManagement';

import CustomerNotes from './components/CustomerNotes';
import InternalChat from './components/InternalChat';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConversationProvider, useConversations } from './contexts/ConversationContext';
import NotificationBadge from './components/NotificationBadge';

// Componente wrapper para passar o contexto das conversas para o NotificationProvider
const NotificationProviderWrapper = ({ children }) => {
  const conversationContext = useConversations();
  
  return (
    <NotificationProvider conversationContext={conversationContext}>
      {children}
    </NotificationProvider>
  );
};

// URL da API backend
const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [qrCode, setQrCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [newPhone, setNewPhone] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [sendingStatus, setSendingStatus] = useState({});
  const [error, setError] = useState('');
  const [csvData, setCsvData] = useState([]);
  const [importMethod, setImportMethod] = useState('manual');
  const [validationResults, setValidationResults] = useState(null);
  const [invalidNumbers, setInvalidNumbers] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionId, setNewSessionId] = useState('');
  const [chatwoodLogs, setChatwoodLogs] = useState([]);
  const [showChatwood, setShowChatwood] = useState(false);
  const [socket, setSocket] = useState(null);
  
  // Estados para atendimento
  const [currentView, setCurrentView] = useState('bulk'); // 'bulk', 'attendance', 'userManagement', 'sectorManagement', 'internalChat', 'customerNotes'
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Estado para notificação de sucesso
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Estados de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login', 'register'
  const [anchorEl, setAnchorEl] = useState(null);

  // Configurar Socket.IO
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('chatwood-log', (logEntry) => {
      setChatwoodLogs(prev => [...prev, logEntry].slice(-100)); // Manter apenas os últimos 100 logs
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Carregar sessões
  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
    }
  };

  // Verificar status da conexão periodicamente
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();
        setIsConnected(data.isConnected);
        setCurrentSessionId(data.currentSessionId);
        
        if (data.hasQRCode && !qrCode) {
          fetchQRCode();
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    // Carregar sessões e verificar status imediatamente
    loadSessions();
    checkStatus();

    // Verificar a cada 2 segundos
    const interval = setInterval(() => {
      loadSessions();
      checkStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [qrCode]);

  // Buscar QR Code
  const fetchQRCode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/qr`);
      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
      }
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
    }
  };

  // Validar números
  const validateNumbers = async () => {
    console.log('Iniciando validação de números...');
    console.log('Contatos para validar:', phoneNumbers);
    
    if (phoneNumbers.length === 0) {
      setError('Adicione contatos antes de validar');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      console.log('Fazendo requisição para validar números...');
      const response = await fetch(`${API_BASE_URL}/validate-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: phoneNumbers
        })
      });

      console.log('Resposta recebida:', response);
      const data = await response.json();
      console.log('Dados da resposta:', data);

      if (response.ok) {
        setValidationResults(data);
        setInvalidNumbers(data.validationResults.filter(r => !r.validated.shouldSend));
        console.log('Validação concluída com sucesso');
        const validationMessage = `Validação concluída! ${data.summary.valid} válidos, ${data.summary.invalid} inválidos.`;
        setError(validationMessage);
        
        // Notificação de validação concluída
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('✅ Validação Concluída', {
            body: validationMessage,
            icon: '/public/vite.svg',
            badge: '/public/vite.svg',
            tag: 'whatsapp-validacao',
            requireInteraction: false,
            silent: false
          });
        }
        
        setTimeout(() => setError(''), 5000);
      } else {
        console.error('Erro na resposta:', data);
        const errorMessage = data.error || 'Erro ao validar números';
        setError(errorMessage);
        
        // Notificação de erro na validação
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('❌ Erro na Validação', {
            body: errorMessage,
            icon: '/public/vite.svg',
            badge: '/public/vite.svg',
            tag: 'whatsapp-validacao-erro',
            requireInteraction: false,
            silent: false
          });
        }
      }
    } catch (err) {
      console.error('Erro ao validar números:', err);
      const errorMessage = 'Erro ao validar números: ' + err.message;
      setError(errorMessage);
      
      // Notificação de erro de validação
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('❌ Erro na Validação', {
          body: errorMessage,
          icon: '/public/vite.svg',
          badge: '/public/vite.svg',
          tag: 'whatsapp-validacao-erro-rede',
          requireInteraction: false,
          silent: false
        });
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Adicionar número de telefone manual
  const addPhoneNumber = () => {
    if (newPhone.trim() && !phoneNumbers.some(p => p.phone === newPhone.trim())) {
      setPhoneNumbers([...phoneNumbers, { name: '', phone: newPhone.trim() }]);
      setNewPhone('');
      // Limpar validações anteriores
      setValidationResults(null);
      setInvalidNumbers([]);
    }
  };

  // Remover número de telefone
  const removePhoneNumber = (phone) => {
    setPhoneNumbers(phoneNumbers.filter(p => p.phone !== phone));
    // Limpar validações anteriores
    setValidationResults(null);
    setInvalidNumbers([]);
  };

  // Processar arquivo CSV
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const contacts = results.data.map((row, index) => ({
            id: index,
            name: row[0]?.trim() || '',
            phone: row[1]?.trim() || ''
          })).filter(contact => contact.name && contact.phone);
          
          setCsvData(contacts);
          setPhoneNumbers(contacts);
          setImportMethod('csv');
          // Limpar validações anteriores
          setValidationResults(null);
          setInvalidNumbers([]);
        },
        error: (error) => {
          setError('Erro ao processar arquivo CSV: ' + error.message);
        }
      });
    }
  };

  // Lidar com upload de imagem
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      
      // Verificar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 5MB');
        return;
      }
      
      setSelectedImage(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  // Remover imagem
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  // Personalizar mensagem com nome do cliente
  const getPersonalizedMessage = (contactName) => {
    if (!contactName) return message;
    return message.replace(/\{nome_cliente\}/g, contactName);
  };

  // Gerar ID aleatório
  const generateRandomId = () => {
    return Math.floor(Math.random() * 1000) + 1;
  };

  // Criar nova sessão
  const createSession = async () => {
    if (!newSessionId.trim() || !newSessionName.trim()) {
      setError('ID e nome da sessão são obrigatórios');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: newSessionId.trim(),
          sessionName: newSessionName.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setShowSessionModal(false);
        setNewSessionId('');
        setNewSessionName('');
        setError('');
        await loadSessions();
      } else {
        setError(data.error || 'Erro ao criar sessão');
      }
    } catch (err) {
      setError('Erro ao criar sessão: ' + err.message);
    }
  };

  // Alterar sessão atual
  const changeCurrentSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/current`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentSessionId(sessionId);
        setError('');
      } else {
        setError(data.error || 'Erro ao alterar sessão');
      }
    } catch (err) {
      setError('Erro ao alterar sessão: ' + err.message);
    }
  };

  // Remover sessão
  const removeSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setError('Sessão removida com sucesso');
        await loadSessions();
      } else {
        const data = await response.json();
        setError(`Erro ao remover sessão: ${data.error}`);
      }
    } catch (error) {
      setError(`Erro ao remover sessão: ${error.message}`);
    }
  };

  const reconnectSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/reconnect`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setError('Sessão reconectada com sucesso');
        await loadSessions();
      } else {
        setError(`Erro ao reconectar sessão: ${data.error}`);
      }
    } catch (error) {
      setError(`Erro ao reconectar sessão: ${error.message}`);
    }
  };

  // Limpar logs do chatwood
  const clearChatwoodLogs = () => {
    setChatwoodLogs([]);
  };

  // Testar notificação
  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Teste de Notificação', {
        body: 'Esta é uma notificação de teste do WhatsApp Disparador',
        icon: '/public/vite.svg',
        badge: '/public/vite.svg',
        tag: 'teste-notificacao',
        requireInteraction: false,
        silent: false
      });
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          testNotification();
        }
      });
    }
  };

  // Gerar planilha com resultados do disparo
  const generateReport = () => {
    if (!successData) {
      setError('Nenhum resultado de disparo disponível para gerar relatório');
      return;
    }

    try {
      // Preparar dados para a planilha
      const reportData = [];
      
      // Adicionar cabeçalho
      reportData.push([
        'Nome',
        'Telefone',
        'Status',
        'Mensagem Enviada',
        'Data/Hora do Disparo',
        'Observações'
      ]);

      // Adicionar dados dos contatos
      phoneNumbers.forEach(contact => {
        const status = sendingStatus[contact.phone] || 'Não enviado';
        const personalizedMessage = getPersonalizedMessage(contact.name);
        const timestamp = successData.timestamp;
        
        let statusText = '';
        let observacoes = '';
        
        switch (status) {
          case 'success':
            statusText = '✅ Enviado com Sucesso';
            break;
          case 'error':
            statusText = '❌ Erro no Envio';
            observacoes = 'Falha na entrega da mensagem';
            break;
          case 'pending':
            statusText = '⏳ Pendente';
            observacoes = 'Aguardando processamento';
            break;
          default:
            statusText = '❓ Status Desconhecido';
            observacoes = 'Status não identificado';
        }

        reportData.push([
          contact.name || 'Sem nome',
          contact.phone,
          statusText,
          personalizedMessage,
          new Date(timestamp).toLocaleString('pt-BR'),
          observacoes
        ]);
      });

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(reportData);

      // Configurar largura das colunas
      const colWidths = [
        { wch: 20 }, // Nome
        { wch: 15 }, // Telefone
        { wch: 20 }, // Status
        { wch: 50 }, // Mensagem
        { wch: 20 }, // Data/Hora
        { wch: 30 }  // Observações
      ];
      ws['!cols'] = colWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Disparo');

      // Adicionar planilha de resumo
      const summaryData = [
        ['RESUMO DO DISPARO'],
        [''],
        ['Data/Hora do Disparo:', new Date(successData.timestamp).toLocaleString('pt-BR')],
        ['Total de Contatos:', successData.total],
        ['Enviados com Sucesso:', successData.successful],
        ['Falharam:', successData.failed],
        ['Taxa de Sucesso:', `${((successData.successful / successData.total) * 100).toFixed(1)}%`],
        [''],
        ['Mensagem Original:', message],
        [''],
        ['Detalhes por Status:'],
        ['✅ Enviados com Sucesso:', successData.successful],
        ['❌ Erros:', successData.failed],
        ['⏳ Pendentes:', Object.values(sendingStatus).filter(s => s === 'pending').length]
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo');

      // Gerar nome do arquivo com timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `relatorio-disparo-${timestamp}.xlsx`;

      // Fazer download do arquivo
      XLSX.writeFile(wb, fileName);

      // Notificar sucesso
      setError(`Relatório gerado com sucesso: ${fileName}`);
      setTimeout(() => setError(''), 5000);

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setError('Erro ao gerar relatório: ' + error.message);
    }
  };

  // Funções para atendimento
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToDashboard = () => {
    setSelectedConversation(null);
  };

  // Obter cor do tipo de log
  const getLogColor = (type) => {
    switch (type) {
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      case 'system': return '#9c27b0';
      default: return '#757575';
    }
  };

  // Enviar mensagem em massa
  const sendMessage = async () => {
    if (!isConnected) {
      setError('WhatsApp não está conectado');
      return;
    }

    if (!message.trim()) {
      setError('Digite uma mensagem');
      return;
    }

    if (phoneNumbers.length === 0) {
      setError('Adicione pelo menos um número de telefone');
      return;
    }

    setIsLoading(true);
    setError('');

    const status = {};
    phoneNumbers.forEach(contact => {
      status[contact.phone] = 'pending';
    });
    setSendingStatus(status);

    try {
      // Preparar dados para envio
      const formData = new FormData();
      formData.append('contacts', JSON.stringify(phoneNumbers));
      formData.append('message', message);
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch(`${API_BASE_URL}/send-bulk-messages`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Atualizar status baseado nos resultados
        data.results.forEach(result => {
          status[result.phone] = result.status;
        });
        setSendingStatus(status);
        
        // Mostrar números inválidos se houver
        if (data.invalidNumbers && data.invalidNumbers.length > 0) {
          setInvalidNumbers(data.invalidNumbers);
        }
        
        // Mostrar mensagem de sucesso na tela
        setSuccessData({
          successful: data.successful,
          failed: data.failed,
          total: phoneNumbers.length,
          timestamp: new Date().toISOString()
        });
        setShowSuccessMessage(true);
        
        // Limpar mensagem de sucesso após 8 segundos
        setTimeout(() => {
          setShowSuccessMessage(false);
          setSuccessData(null);
        }, 8000);
        
        // Notificação do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          const notificationTitle = '✅ Disparo Concluído!';
          const notificationBody = `${data.successful} mensagens enviadas com sucesso${data.failed > 0 ? `, ${data.failed} falharam` : ''}`;
          
          new Notification(notificationTitle, {
            body: notificationBody,
            icon: '/public/vite.svg',
            badge: '/public/vite.svg',
            tag: 'whatsapp-disparo',
            requireInteraction: false,
            silent: false,
            data: {
              successful: data.successful,
              failed: data.failed,
              total: phoneNumbers.length,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Tocar som de notificação se disponível
        try {
          const audio = new Audio('/public/notification.mp3');
          audio.play().catch(err => console.log('Erro ao tocar som:', err));
        } catch (err) {
          console.log('Erro ao carregar som de notificação:', err);
        }
      } else {
        const errorMessage = data.error || 'Erro ao enviar mensagens';
        setError(errorMessage);
        
        // Notificação de erro
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('❌ Erro no Disparo', {
            body: errorMessage,
            icon: '/public/vite.svg',
            badge: '/public/vite.svg',
            tag: 'whatsapp-disparo-erro',
            requireInteraction: false,
            silent: false
          });
        }
      }
    } catch (err) {
      const errorMessage = 'Erro ao enviar mensagens: ' + err.message;
      setError(errorMessage);
      
      // Notificação de erro de rede
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('❌ Erro de Conexão', {
          body: errorMessage,
          icon: '/public/vite.svg',
          badge: '/public/vite.svg',
          tag: 'whatsapp-disparo-erro-rede',
          requireInteraction: false,
          silent: false
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar mensagem individual
  const sendIndividualMessage = async (contact) => {
    if (!isConnected) {
      setError('WhatsApp não está conectado');
      return;
    }

    if (!message.trim()) {
      setError('Digite uma mensagem');
      return;
    }

    setSendingStatus({ ...sendingStatus, [contact.phone]: 'pending' });

    try {
      const personalizedMessage = getPersonalizedMessage(contact.name);
      
      // Preparar dados para envio
      const formData = new FormData();
      formData.append('phone', contact.phone);
      formData.append('message', personalizedMessage);
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch(`${API_BASE_URL}/send-message`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSendingStatus({ ...sendingStatus, [contact.phone]: 'success' });
      } else {
        setSendingStatus({ ...sendingStatus, [contact.phone]: 'error' });
        setError(`Erro ao enviar para ${contact.phone}: ${data.error}`);
      }
    } catch (err) {
      setSendingStatus({ ...sendingStatus, [contact.phone]: 'error' });
      setError(`Erro ao enviar para ${contact.phone}: ${err.message}`);
    }
  };

  // Colunas da tabela
  const columns = [
    {
      field: 'name',
      headerName: 'Nome',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <PersonIcon color="primary" />
          {params.value || 'Sem nome'}
        </Box>
      )
    },
    {
      field: 'phone',
      headerName: 'Telefone',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <WhatsAppIcon color="success" />
          {params.value}
        </Box>
      )
    },
    {
      field: 'validation',
      headerName: 'Validação',
      width: 150,
      renderCell: (params) => {
        if (!validationResults) return null;
        
        const validation = validationResults.validationResults.find(
          v => v.original.phone === params.row.phone
        );
        
        if (!validation) return null;
        
        return validation.validated.shouldSend ? (
          <Chip
            label="Válido"
            color="success"
            size="small"
            icon={<CheckCircleIcon />}
          />
        ) : (
          <Chip
            label="Inválido"
            color="error"
            size="small"
            icon={<WarningIcon />}
          />
        );
      }
    },
    {
      field: 'preview',
      headerName: 'Preview da Mensagem',
      flex: 2,
      renderCell: (params) => {
        const preview = getPersonalizedMessage(params.row.name);
        return (
          <Typography variant="body2" sx={{ 
            fontStyle: 'italic', 
            color: 'text.secondary',
            maxWidth: 300,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {preview}
          </Typography>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => {
        const status = sendingStatus[params.row.phone] || 'idle';
        return (
          <Chip
            label={
              status === 'pending' ? 'Enviando...' :
              status === 'success' ? 'Enviado' :
              status === 'error' ? 'Erro' : 'Pendente'
            }
            color={
              status === 'success' ? 'success' :
              status === 'error' ? 'error' :
              status === 'pending' ? 'warning' : 'default'
            }
            size="small"
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 200,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => sendIndividualMessage(params.row)}
            disabled={!isConnected || isLoading}
          >
            Enviar
          </Button>
          <IconButton
            size="small"
            color="error"
            onClick={() => removePhoneNumber(params.row.phone)}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];

  const rows = phoneNumbers.map((contact, index) => ({
    id: index,
    ...contact
  }));

  // Verificar se o cliente está pronto para envio
  const isClientReady = (client) => {
    return client && client.isConnected && client.pupPage && !client.pupPage.isClosed();
  };

  // ==================== FUNÇÕES DE AUTENTICAÇÃO ====================

  // Verificar token ao carregar a aplicação
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      verifyToken(token, JSON.parse(user));
    }
  }, []);

  // Verificar token
  const verifyToken = async (token, user) => {
    try {
      console.log('Verificando token...');
      console.log('Token presente:', !!token);
      console.log('Usuário:', user);
      
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Status da verificação:', response.status);
      
      if (response.ok) {
        console.log('Token válido, autenticando usuário');
        setIsAuthenticated(true);
        setCurrentUser(user);
      } else {
        console.log('Token inválido, limpando localStorage');
        // Token inválido, limpar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  // Função de login
  const handleLogin = (token, user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setAuthView('login');
    
    // Solicitar permissão de notificação
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Função de registro
  const handleRegister = (user) => {
    setAuthView('login');
    setError('Conta criada com sucesso! Faça login para continuar.');
    setTimeout(() => setError(''), 5000);
  };

  // Função de logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAnchorEl(null);
  };

  // Alternar entre login e registro
  const switchToLogin = () => {
    setAuthView('login');
    setError('');
  };

  const switchToRegister = () => {
    setAuthView('register');
    setError('');
  };

  // Abrir/fechar menu do usuário
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Se não estiver autenticado, mostrar tela de login/registro
  if (!isAuthenticated) {
    return (
      <>
        {authView === 'login' ? (
          <Login onLogin={handleLogin} onSwitchToRegister={switchToRegister} />
        ) : (
          <Register onRegister={handleRegister} onSwitchToLogin={switchToLogin} />
        )}
      </>
    );
  }

  return (
    <ConversationProvider>
      <NotificationProviderWrapper>
        <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header com AppBar */}
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            📱 Plataforma WhatsApp Omnichannel
          </Typography>
          
          {/* Menu do usuário */}
          <Box display="flex" alignItems="center" gap={2}>
            <NotificationBadge onClick={() => setCurrentView('internalChat')} />
            <Typography variant="body2" color="inherit">
              Olá, {currentUser?.full_name || currentUser?.username}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleMenuOpen}
            >
              <AccountCircleIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleMenuClose}>
                <PersonIcon sx={{ mr: 1 }} />
                Perfil: {currentUser?.role}
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Sair
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navegação */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant={currentView === 'bulk' ? 'contained' : 'outlined'}
            startIcon={<SendIcon />}
            onClick={() => setCurrentView('bulk')}
          >
            Envio em Massa
          </Button>
          <Button
            variant={currentView === 'attendance' ? 'contained' : 'outlined'}
            startIcon={<Support />}
            onClick={() => setCurrentView('attendance')}
          >
            Atendimento ao Cliente
          </Button>
          <Button
            variant={currentView === 'internalChat' ? 'contained' : 'outlined'}
            startIcon={<ChatIcon />}
            onClick={() => setCurrentView('internalChat')}
          >
            Chat Interno
          </Button>
          <Button
            variant={currentView === 'customerNotes' ? 'contained' : 'outlined'}
            startIcon={<NoteIcon />}
            onClick={() => setCurrentView('customerNotes')}
          >
            Observações
          </Button>
          {currentUser?.role === 'admin' && (
            <>
              <Button
                variant={currentView === 'userManagement' ? 'contained' : 'outlined'}
                startIcon={<PersonIcon />}
                onClick={() => setCurrentView('userManagement')}
              >
                Gerenciamento de Usuários
              </Button>
              <Button
                variant={currentView === 'sectorManagement' ? 'contained' : 'outlined'}
                startIcon={<Business />}
                onClick={() => setCurrentView('sectorManagement')}
              >
                Gerenciamento de Setores
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Mensagem de Sucesso do Disparo */}
      <Slide direction="down" in={showSuccessMessage} mountOnEnter unmountOnExit>
        <Box sx={{ mb: 3 }}>
          <Paper
            elevation={8}
            sx={{
              p: 3,
              background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
              color: 'white',
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Efeito de brilho */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                animation: showSuccessMessage ? 'shine 2s ease-in-out' : 'none',
                '@keyframes shine': {
                  '0%': { left: '-100%' },
                  '100%': { left: '100%' }
                }
              }}
            />
            
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box display="flex" flexDirection="column" gap={2} flex={1}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 'bold',
                      textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                    }}
                  >
                    🎉 Disparo concluído com sucesso!
                  </Typography>
                </Box>
                
                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                  <Chip
                    label={`✅ ${successData?.successful || 0} enviados`}
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontWeight: 'bold'
                    }}
                    size="medium"
                  />
                  {successData?.failed > 0 && (
                    <Chip
                      label={`❌ ${successData.failed} falharam`}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        fontWeight: 'bold'
                      }}
                      size="medium"
                    />
                  )}
                  <Chip
                    label={`📊 Total: ${successData?.total || 0}`}
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontWeight: 'bold'
                    }}
                    size="medium"
                  />
                </Box>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    opacity: 0.9,
                    fontStyle: 'italic'
                  }}
                >
                  Concluído em {successData?.timestamp ? new Date(successData.timestamp).toLocaleString('pt-BR') : ''}
                </Typography>
                
                {/* Botão para gerar relatório */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={generateReport}
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.3)'
                      }
                    }}
                  >
                    📊 Baixar Relatório Excel
                  </Button>
                </Box>
              </Box>
              
              <Box display="flex" flexDirection="column" gap={1}>
                <IconButton
                  onClick={() => {
                    setShowSuccessMessage(false);
                    setSuccessData(null);
                  }}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Slide>

      {/* Interface de Atendimento */}
      {currentView === 'attendance' && (
        <Box height="100vh" display="flex">
          {/* Coluna da esquerda - Dashboard sempre visível */}
          <Box width="400px" borderRight="1px solid" borderColor="divider">
            <AttendanceDashboard 
              onSelectConversation={handleSelectConversation}
              selectedConversation={selectedConversation}
            />
          </Box>

          {/* Coluna da direita - Chat ou área vazia */}
          <Box flex={1} display="flex" flexDirection="column">
            {selectedConversation ? (
              <AttendanceChat 
                conversation={selectedConversation}
                onBack={handleBackToDashboard}
              />
            ) : (
              <Box p={3} display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography variant="h6" color="text.secondary" textAlign="center">
                  Selecione uma conversa na lista à esquerda para começar o atendimento
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Interface de Gerenciamento de Usuários */}
      {currentView === 'userManagement' && currentUser?.role === 'admin' && (
        <UserManagement />
      )}

      {/* Interface de Gerenciamento de Setores */}
      {currentView === 'sectorManagement' && currentUser?.role === 'admin' && (
        <SectorManagement />
      )}

      {/* Interface de Chat Interno */}
      {currentView === 'internalChat' && (
        <InternalChat />
      )}

      {/* Interface de Observações de Clientes */}
      {currentView === 'customerNotes' && (
        <Box>
          <Typography variant="h4" component="h2" gutterBottom align="center" color="primary">
            <NoteIcon sx={{ mr: 2, fontSize: 'inherit' }} />
            Observações de Clientes
          </Typography>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Gerenciamento de Observações de Clientes
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Esta funcionalidade permite adicionar, editar e visualizar observações sobre clientes que ficam visíveis apenas para funcionários.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Como usar:</strong> Vá para a tela de Atendimento ao Cliente, selecione uma conversa e clique no ícone de observações para gerenciar as observações do cliente.
            </Typography>
          </Paper>
          
          {selectedCustomer ? (
            <CustomerNotes 
              customerId={selectedCustomer.id}
              customerName={selectedCustomer.name || selectedCustomer.phone}
            />
          ) : (
            <Box p={4} display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
              <NoteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" textAlign="center" gutterBottom>
                Nenhum cliente selecionado
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" paragraph>
                Para gerenciar observações de um cliente:
              </Typography>
              <Box component="ol" sx={{ textAlign: 'left', color: 'text.secondary' }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Vá para a tela de <strong>Atendimento ao Cliente</strong>
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Selecione uma conversa na lista à esquerda
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Clique no ícone de observações (📝) durante a conversa
                </Typography>
                <Typography component="li" variant="body2">
                  Adicione, edite ou visualize as observações do cliente
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Interface de Envio em Massa */}
      {currentView === 'bulk' && (
        <Box>
          <Typography variant="h4" component="h2" gutterBottom align="center" color="primary">
            <WhatsAppIcon sx={{ mr: 2, fontSize: 'inherit' }} />
            Disparador de WhatsApp
          </Typography>

      {/* Gerenciamento de Sessões */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            Sessões WhatsApp
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowSessionModal(true)}
          >
            Nova Sessão
          </Button>
        </Box>

        {sessions.length === 0 ? (
          <Alert severity="info" onClose={() => {}}>
            Nenhuma sessão encontrada. Clique em "Nova Sessão" para criar uma.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {sessions.map((session) => (
              <Grid item xs={12} sm={6} md={4} key={session.id}>
                <Card 
                  variant={session.isCurrent ? "elevation" : "outlined"}
                  sx={{ 
                    border: session.isCurrent ? '2px solid #1976d2' : '1px solid #ddd',
                    cursor: 'pointer'
                  }}
                  onClick={() => changeCurrentSession(session.id)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6" noWrap>
                        {session.name}
                      </Typography>
                      <Box display="flex" gap={0.5}>
                        {!session.isConnected && session.isLoaded && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              reconnectSession(session.id);
                            }}
                            title="Reconectar"
                          >
                            <RefreshIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSession(session.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      ID: {session.id}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Chip
                        label={session.isConnected ? 'Conectado' : 'Desconectado'}
                        color={session.isConnected ? 'success' : 'error'}
                        size="small"
                      />
                      {session.isCurrent && (
                        <Chip
                          label="Atual"
                          color="primary"
                          size="small"
                        />
                      )}
                      {!session.isLoaded && (
                        <Chip
                          label="Salva"
                          color="warning"
                          size="small"
                        />
                      )}
                    </Box>
                    
                    {session.isInitializing && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={16} />
                        <Typography variant="caption">
                          Inicializando...
                        </Typography>
                      </Box>
                    )}
                    
                    {session.lastConnection && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Última conexão: {new Date(session.lastConnection).toLocaleString('pt-BR')}
                      </Typography>
                    )}
                    

                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Status de Conexão */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Chip
              label={isConnected ? 'Conectado' : 'Desconectado'}
              color={isConnected ? 'success' : 'error'}
              icon={<WhatsAppIcon />}
            />
          </Grid>
          {!isConnected && sessions.length > 0 && (
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<QrCodeIcon />}
                onClick={() => setOpenModal(true)}
              >
                Ver QR Code
              </Button>
            </Grid>
          )}
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchQRCode}
              size="small"
            >
              Atualizar
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setShowChatwood(!showChatwood)}
              startIcon={<span style={{ fontSize: '1.2em' }}>🪵</span>}
            >
              {showChatwood ? 'Ocultar' : 'Mostrar'} Chatwood
            </Button>
          </Grid>
       
        </Grid>
      </Paper>

      {/* Mensagens de Erro/Sucesso */}
      {error && (
        <Alert 
          severity={error.includes('concluído') ? 'success' : 'error'} 
          sx={{ mb: 3 }} 
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* Resultados de Validação */}
      {validationResults && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Resultados da Validação
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => {
                // Gerar relatório de validação
                try {
                  const reportData = [];
                  
                  // Cabeçalho
                  reportData.push([
                    'Nome',
                    'Telefone',
                    'Status de Validação',
                    'Observações',
                    'Data/Hora da Validação'
                  ]);

                  // Dados dos contatos
                  phoneNumbers.forEach(contact => {
                    const validation = validationResults.validationResults.find(
                      v => v.original.phone === contact.phone
                    );
                    
                    const isValid = validation?.validated.shouldSend;
                    const statusText = isValid ? '✅ Válido' : '❌ Inválido';
                    const observacoes = isValid ? 'Pronto para envio' : validation?.validated.reason || 'Número inválido';
                    
                    reportData.push([
                      contact.name || 'Sem nome',
                      contact.phone,
                      statusText,
                      observacoes,
                      new Date().toLocaleString('pt-BR')
                    ]);
                  });

                  // Criar workbook
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.aoa_to_sheet(reportData);
                  
                  // Configurar largura das colunas
                  ws['!cols'] = [
                    { wch: 20 }, // Nome
                    { wch: 15 }, // Telefone
                    { wch: 20 }, // Status
                    { wch: 40 }, // Observações
                    { wch: 20 }  // Data/Hora
                  ];

                  XLSX.utils.book_append_sheet(wb, ws, 'Validação de Contatos');

                  // Adicionar resumo
                  const summaryData = [
                    ['RESUMO DA VALIDAÇÃO'],
                    [''],
                    ['Data/Hora:', new Date().toLocaleString('pt-BR')],
                    ['Total de Contatos:', validationResults.summary.total],
                    ['Válidos:', validationResults.summary.valid],
                    ['Inválidos:', validationResults.summary.invalid],
                    ['Taxa de Validade:', `${((validationResults.summary.valid / validationResults.summary.total) * 100).toFixed(1)}%`]
                  ];

                  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
                  summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
                  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo');

                  // Download
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                  const fileName = `relatorio-validacao-${timestamp}.xlsx`;
                  XLSX.writeFile(wb, fileName);

                  setError(`Relatório de validação gerado: ${fileName}`);
                  setTimeout(() => setError(''), 5000);

                } catch (error) {
                  console.error('Erro ao gerar relatório de validação:', error);
                  setError('Erro ao gerar relatório de validação: ' + error.message);
                }
              }}
            >
              📊 Relatório de Validação
            </Button>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Chip
                label={`Total: ${validationResults.summary.total}`}
                color="default"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Chip
                label={`Válidos: ${validationResults.summary.valid}`}
                color="success"
                icon={<CheckCircleIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Chip
                label={`Inválidos: ${validationResults.summary.invalid}`}
                color="error"
                icon={<WarningIcon />}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Números Inválidos */}
      {invalidNumbers.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" color="error">
                <WarningIcon sx={{ mr: 1 }} />
                Números Inválidos ({invalidNumbers.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {invalidNumbers.map((invalid, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${invalid.name || 'Sem nome'} - ${invalid.number}`}
                      secondary={invalid.reason}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* Formulário Principal */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Configurar Mensagem
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Mensagem"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem aqui... Use {nome_cliente} para personalizar"
          helperText="Use {nome_cliente} para incluir o nome da pessoa na mensagem"
          sx={{ mb: 3 }}
        />

        {/* Upload de Imagem */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Imagem (Opcional)
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
              >
                {selectedImage ? 'Trocar Imagem' : 'Selecionar Imagem'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
            </Grid>
            {selectedImage && (
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={removeImage}
                  startIcon={<DeleteIcon />}
                  fullWidth
                >
                  Remover Imagem
                </Button>
              </Grid>
            )}
          </Grid>
          
          {/* Preview da imagem */}
          {imagePreview && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  maxWidth: '200px', 
                  maxHeight: '200px', 
                  objectFit: 'contain',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }} 
              />
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {selectedImage?.name} ({(selectedImage?.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Método de Importação */}
        <Typography variant="h6" gutterBottom>
          Importar Contatos
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <UploadIcon sx={{ mr: 1 }} />
                  Importar CSV
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Formato: Nome, Telefone
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadIcon />}
                  fullWidth
                >
                  Escolher Arquivo CSV
                  <input
                    type="file"
                    accept=".csv"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <AddIcon sx={{ mr: 1 }} />
                  Adicionar Manualmente
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Adicione números um por vez
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={8}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Número de Telefone"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Ex: 5511999999999"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={addPhoneNumber}
                      disabled={!newPhone.trim()}
                      fullWidth
                    >
                      Adicionar
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Lista de Contatos */}
        {phoneNumbers.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Contatos ({phoneNumbers.length})
            </Typography>
            <List dense>
              {phoneNumbers.slice(0, 5).map((contact, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={contact.name || 'Sem nome'}
                    secondary={contact.phone}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => removePhoneNumber(contact.phone)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {phoneNumbers.length > 5 && (
                <ListItem>
                  <ListItemText
                    primary={`... e mais ${phoneNumbers.length - 5} contato(s)`}
                    color="text.secondary"
                  />
                </ListItem>
              )}
            </List>
          </Box>
        )}

        {/* Botões de Ação */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={validateNumbers}
              disabled={phoneNumbers.length === 0 || isValidating}
              startIcon={isValidating ? <CircularProgress size={20} /> : null}
            >
              {isValidating ? 'Validando...' : 'Validar Números'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              startIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={sendMessage}
              disabled={!isConnected || isLoading || phoneNumbers.length === 0 || !message.trim()}
            >
              {isLoading ? 'Enviando...' : `Enviar para ${phoneNumbers.length} contato(s)`}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de Contatos */}
      {phoneNumbers.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Lista de Contatos
          </Typography>
          <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5, 10, 25]}
              disableSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Chatwood - Logs em Tempo Real */}
      {showChatwood && (
        <Paper sx={{ p: 3, mb: 3, maxHeight: 400, overflow: 'hidden' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" display="flex" alignItems="center" gap={1}>
              🪵 Chatwood - Logs em Tempo Real
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={clearChatwoodLogs}
            >
              Limpar Logs
            </Button>
          </Box>
          
          <Box 
            sx={{ 
              height: 300, 
              overflowY: 'auto', 
              backgroundColor: '#f5f5f5',
              borderRadius: 1,
              p: 2,
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {chatwoodLogs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Aguardando logs...
              </Typography>
            ) : (
              chatwoodLogs.map((log) => (
                <Box 
                  key={log.id} 
                  sx={{ 
                    mb: 1, 
                    p: 1, 
                    borderRadius: 1,
                    backgroundColor: 'white',
                    borderLeft: `4px solid ${getLogColor(log.type)}`
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: getLogColor(log.type),
                        fontWeight: 'bold',
                        minWidth: 60
                      }}
                    >
                      [{log.timestamp}]
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: getLogColor(log.type),
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        minWidth: 80
                      }}
                    >
                      {log.type}
                    </Typography>
                    <Typography variant="body2">
                      {log.message}
                    </Typography>
                  </Box>
                  {log.data && Object.keys(log.data).length > 0 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary',
                        ml: 7,
                        display: 'block'
                      }}
                    >
                      {JSON.stringify(log.data, null, 2)}
                    </Typography>
                  )}
                </Box>
              ))
            )}
          </Box>
        </Paper>
      )}

      {/* Modal Nova Sessão */}
      <Dialog open={showSessionModal} onClose={() => setShowSessionModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Nova Sessão WhatsApp</Typography>
            <IconButton onClick={() => setShowSessionModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="ID da Sessão"
              value={newSessionId}
              onChange={(e) => setNewSessionId(e.target.value)}
              placeholder="Ex: whatsapp1, empresa, pessoal"
              helperText="Identificador único para a sessão"
            />
            <TextField
              fullWidth
              label="Nome da Sessão"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="Ex: WhatsApp Pessoal, WhatsApp Empresa"
              helperText="Nome descritivo para identificar a sessão"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSessionModal(false)}>Cancelar</Button>
          <Button 
            onClick={createSession}
            variant="contained"
            disabled={!newSessionId.trim() || !newSessionName.trim()}
          >
            Criar Sessão
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal QR Code */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Conectar WhatsApp</Typography>
            <IconButton onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <Typography variant="body1" textAlign="center">
              Escaneie o QR Code com seu WhatsApp para conectar
            </Typography>
            {qrCode ? (
              <img src={qrCode} alt="QR Code" style={{ maxWidth: '100%', height: 'auto' }} />
            ) : (
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Gerando QR Code...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
        </Box>
      )}
    </Container>
      </NotificationProviderWrapper>
    </ConversationProvider>
  );
}

export default App;
