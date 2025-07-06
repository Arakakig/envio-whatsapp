import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
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
  Download as DownloadIcon,
  Business
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// URL da API backend
const API_BASE_URL = 'http://localhost:3001/api';

const BulkMessage = () => {
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

  // Estado para notificação de sucesso
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successData, setSuccessData] = useState(null);

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
    setIsValidating(true);
    setError('');
    setValidationResults(null);
    setInvalidNumbers([]);

    try {
      const numbersToValidate = phoneNumbers.map(contact => contact.phone);
      console.log('Números para validar:', numbersToValidate);

      const response = await fetch(`${API_BASE_URL}/validate-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numbers: numbersToValidate }),
      });

      const data = await response.json();
      console.log('Resposta da validação:', data);

      if (data.success) {
        setValidationResults(data.results);
        
        // Separar números válidos e inválidos
        const validNumbers = data.results.filter(result => result.isValid);
        const invalidNumbers = data.results.filter(result => !result.isValid);
        
        setInvalidNumbers(invalidNumbers);
        
        // Atualizar lista de números com informações de validação
        setPhoneNumbers(prev => prev.map(contact => {
          const validationResult = data.results.find(result => result.phone === contact.phone);
          return {
            ...contact,
            isValid: validationResult?.isValid || false,
            validationMessage: validationResult?.message || 'Não validado'
          };
        }));

        console.log('Validação concluída:', {
          total: data.results.length,
          valid: validNumbers.length,
          invalid: invalidNumbers.length
        });
      } else {
        setError('Erro ao validar números: ' + data.error);
      }
    } catch (err) {
      console.error('Erro na validação:', err);
      setError('Erro ao conectar com o servidor para validação');
    } finally {
      setIsValidating(false);
    }
  };

  const addPhoneNumber = () => {
    if (newPhone.trim() && !phoneNumbers.find(p => p.phone === newPhone.trim())) {
      setPhoneNumbers([...phoneNumbers, { phone: newPhone.trim(), name: '' }]);
      setNewPhone('');
    }
  };

  const removePhoneNumber = (phone) => {
    setPhoneNumbers(phoneNumbers.filter(p => p.phone !== phone));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      
      if (file.name.endsWith('.csv')) {
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            const contacts = results.data
              .filter(row => row.phone || row.Phone || row.telefone || row.Telefone)
              .map(row => ({
                phone: row.phone || row.Phone || row.telefone || row.Telefone,
                name: row.name || row.Name || row.nome || row.Nome || ''
              }));
            setPhoneNumbers(contacts);
            setCsvData(results.data);
          }
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const contacts = jsonData
          .filter(row => row.phone || row.Phone || row.telefone || row.Telefone)
          .map(row => ({
            phone: row.phone || row.Phone || row.telefone || row.Telefone,
            name: row.name || row.Name || row.nome || row.Nome || ''
          }));
        setPhoneNumbers(contacts);
        setCsvData(jsonData);
      }
    };
    
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  const getPersonalizedMessage = (contactName) => {
    if (!contactName) return message;
    return message.replace(/\{nome\}/gi, contactName);
  };

  const generateRandomId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const createSession = async () => {
    if (!newSessionName.trim() || !newSessionId.trim()) {
      setError('Nome e ID da sessão são obrigatórios');
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
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowSessionModal(false);
        setNewSessionName('');
        setNewSessionId('');
        loadSessions();
      } else {
        setError(data.error || 'Erro ao criar sessão');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  const changeCurrentSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/set-current`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setCurrentSessionId(sessionId);
        loadSessions();
      }
    } catch (err) {
      console.error('Erro ao mudar sessão:', err);
    }
  };

  const removeSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadSessions();
      }
    } catch (err) {
      console.error('Erro ao remover sessão:', err);
    }
  };

  const reconnectSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/reconnect`, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log('Sessão reconectada:', sessionId);
      }
    } catch (err) {
      console.error('Erro ao reconectar sessão:', err);
    }
  };

  const clearChatwoodLogs = () => {
    setChatwoodLogs([]);
  };

  const testNotification = () => {
    if (socket) {
      socket.emit('test-notification', {
        message: 'Teste de notificação',
        timestamp: new Date().toISOString()
      });
    }
  };

  const generateReport = () => {
    if (phoneNumbers.length === 0) {
      setError('Nenhum número para gerar relatório');
      return;
    }

    const report = {
      totalNumbers: phoneNumbers.length,
      validNumbers: phoneNumbers.filter(p => p.isValid).length,
      invalidNumbers: phoneNumbers.filter(p => !p.isValid).length,
      sentMessages: Object.values(sendingStatus).filter(status => status === 'sent').length,
      failedMessages: Object.values(sendingStatus).filter(status => status === 'failed').length,
      pendingMessages: Object.values(sendingStatus).filter(status => status === 'pending').length,
      timestamp: new Date().toISOString()
    };

    const csvContent = [
      ['Telefone', 'Nome', 'Válido', 'Status', 'Mensagem de Erro'],
      ...phoneNumbers.map(contact => [
        contact.phone,
        contact.name || '',
        contact.isValid ? 'Sim' : 'Não',
        sendingStatus[contact.phone] || 'Não enviado',
        contact.errorMessage || ''
      ])
    ];

    const csv = Papa.unparse(csvContent);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_whatsapp_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      setError('Digite uma mensagem');
      return;
    }

    if (phoneNumbers.length === 0) {
      setError('Adicione pelo menos um número');
      return;
    }

    if (!isConnected) {
      setError('WhatsApp não está conectado');
      return;
    }

    setIsLoading(true);
    setError('');
    setSendingStatus({});

    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('contacts', JSON.stringify(phoneNumbers));
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch(`${API_BASE_URL}/send-bulk`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSuccessData({
          total: phoneNumbers.length,
          sent: data.sent || 0,
          failed: data.failed || 0
        });
        setShowSuccessMessage(true);
        
        // Atualizar status de envio
        const newStatus = {};
        phoneNumbers.forEach(contact => {
          newStatus[contact.phone] = 'sent';
        });
        setSendingStatus(newStatus);
      } else {
        setError(data.error || 'Erro ao enviar mensagens');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagens:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const sendIndividualMessage = async (contact) => {
    if (!message.trim()) {
      setError('Digite uma mensagem');
      return;
    }

    if (!isConnected) {
      setError('WhatsApp não está conectado');
      return;
    }

    setSendingStatus(prev => ({ ...prev, [contact.phone]: 'sending' }));

    try {
      const formData = new FormData();
      formData.append('message', getPersonalizedMessage(contact.name));
      formData.append('phone', contact.phone);
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch(`${API_BASE_URL}/send-message`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSendingStatus(prev => ({ ...prev, [contact.phone]: 'sent' }));
      } else {
        setSendingStatus(prev => ({ ...prev, [contact.phone]: 'failed' }));
        setError(`Erro ao enviar para ${contact.phone}: ${data.error}`);
      }
    } catch (err) {
      setSendingStatus(prev => ({ ...prev, [contact.phone]: 'failed' }));
      setError(`Erro ao enviar para ${contact.phone}`);
    }
  };

  const isClientReady = (client) => {
    return client && client.isReady;
  };

  return (
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
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Status da Conexão */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Status da Conexão
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Chip
            icon={isConnected ? <CheckCircleIcon /> : <WarningIcon />}
            label={isConnected ? 'Conectado' : 'Desconectado'}
            color={isConnected ? 'success' : 'error'}
          />
          
          {!isConnected && qrCode && (
            <Button
              variant="outlined"
              startIcon={<QrCodeIcon />}
              onClick={() => setOpenModal(true)}
            >
              Ver QR Code
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {showSuccessMessage && successData && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }} 
            onClose={() => setShowSuccessMessage(false)}
          >
            Mensagens enviadas com sucesso! Total: {successData.total}, Enviadas: {successData.sent}, Falharam: {successData.failed}
          </Alert>
        )}
      </Paper>

      {/* Configuração da Mensagem */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Configuração da Mensagem
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Mensagem"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem aqui... Use {nome} para personalizar com o nome do contato"
          sx={{ mb: 2 }}
        />

        <Box display="flex" gap={2} alignItems="center" mb={2}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
          >
            Adicionar Imagem
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageUpload}
            />
          </Button>
          
          {selectedImage && (
            <Box display="flex" alignItems="center" gap={1}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ width: 50, height: 50, objectFit: 'cover' }}
              />
              <IconButton size="small" onClick={removeImage}>
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Lista de Números */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            Lista de Números
          </Typography>
          
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Importar CSV/Excel
              <input
                type="file"
                hidden
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
              />
            </Button>
            
            <Button
              variant="outlined"
              onClick={validateNumbers}
              disabled={isValidating || phoneNumbers.length === 0}
              startIcon={isValidating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            >
              {isValidating ? 'Validando...' : 'Validar Números'}
            </Button>
          </Box>
        </Box>

        {/* Adicionar número manualmente */}
        <Box display="flex" gap={1} mb={2}>
          <TextField
            label="Número de telefone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Ex: 5511999999999"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addPhoneNumber();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={addPhoneNumber}
            disabled={!newPhone.trim()}
          >
            Adicionar
          </Button>
        </Box>

        {/* Lista de números */}
        {phoneNumbers.length > 0 ? (
          <List>
            {phoneNumbers.map((contact, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={contact.phone}
                  secondary={contact.name || 'Sem nome'}
                />
                <ListItemSecondaryAction>
                  <Box display="flex" alignItems="center" gap={1}>
                    {contact.isValid !== undefined && (
                      <Chip
                        label={contact.isValid ? 'Válido' : 'Inválido'}
                        color={contact.isValid ? 'success' : 'error'}
                        size="small"
                      />
                    )}
                    
                    {sendingStatus[contact.phone] && (
                      <Chip
                        label={sendingStatus[contact.phone]}
                        color={
                          sendingStatus[contact.phone] === 'sent' ? 'success' :
                          sendingStatus[contact.phone] === 'failed' ? 'error' : 'warning'
                        }
                        size="small"
                      />
                    )}
                    
                    <IconButton
                      edge="end"
                      onClick={() => removePhoneNumber(contact.phone)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity="info">
            Nenhum número adicionado. Adicione números manualmente ou importe um arquivo CSV/Excel.
          </Alert>
        )}

        {/* Números inválidos */}
        {invalidNumbers.length > 0 && (
          <Box mt={2}>
            <Typography variant="h6" color="error" gutterBottom>
              Números Inválidos ({invalidNumbers.length})
            </Typography>
            <List dense>
              {invalidNumbers.map((number, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={number.phone}
                    secondary={number.message}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      {/* Botões de Ação */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            size="large"
            startIcon={<SendIcon />}
            onClick={sendMessage}
            disabled={isLoading || !isConnected || phoneNumbers.length === 0 || !message.trim()}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Enviar Mensagens'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={generateReport}
            disabled={phoneNumbers.length === 0}
          >
            Gerar Relatório
          </Button>
          
          <Button
            variant="outlined"
            onClick={testNotification}
          >
            Testar Notificação
          </Button>
        </Box>
      </Paper>

      {/* Logs do Chatwood */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            Logs do Sistema
          </Typography>
          <Button
            variant="outlined"
            onClick={clearChatwoodLogs}
            disabled={chatwoodLogs.length === 0}
          >
            Limpar Logs
          </Button>
        </Box>
        
        <Box
          sx={{
            maxHeight: '300px',
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
            p: 2,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          }}
        >
          {chatwoodLogs.length === 0 ? (
            <Typography color="text.secondary">
              Nenhum log disponível
            </Typography>
          ) : (
            chatwoodLogs.map((log, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography
                  component="span"
                  sx={{
                    color: log.type === 'error' ? 'error.main' :
                           log.type === 'success' ? 'success.main' :
                           log.type === 'warning' ? 'warning.main' : 'text.secondary'
                  }}
                >
                  [{log.timestamp}] {log.message}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Paper>

      {/* Modal do QR Code */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              QR Code para Conectar WhatsApp
            </Typography>
            <IconButton onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={2}>
            {qrCode ? (
              <img src={qrCode} alt="QR Code" style={{ maxWidth: '100%' }} />
            ) : (
              <CircularProgress />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Escaneie este QR Code com o WhatsApp para conectar
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Sessão */}
      <Dialog open={showSessionModal} onClose={() => setShowSessionModal(false)}>
        <DialogTitle>Nova Sessão WhatsApp</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nome da Sessão"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="ID da Sessão"
            value={newSessionId}
            onChange={(e) => setNewSessionId(e.target.value)}
            placeholder="Ex: session1"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSessionModal(false)}>
            Cancelar
          </Button>
          <Button onClick={createSession} variant="contained">
            Criar Sessão
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkMessage; 