import React, { useState, useEffect } from 'react';
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
  AccordionDetails
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
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import Papa from 'papaparse';

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

  // Verificar status da conexão periodicamente
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();
        setIsConnected(data.isConnected);
        
        if (data.hasQRCode && !qrCode) {
          fetchQRCode();
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    };

    // Verificar status imediatamente
    checkStatus();

    // Verificar a cada 2 segundos
    const interval = setInterval(checkStatus, 2000);

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
        setError(`Validação concluída! ${data.summary.valid} válidos, ${data.summary.invalid} inválidos.`);
        setTimeout(() => setError(''), 5000);
      } else {
        console.error('Erro na resposta:', data);
        setError(data.error || 'Erro ao validar números');
      }
    } catch (err) {
      console.error('Erro ao validar números:', err);
      setError('Erro ao validar números: ' + err.message);
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
        
        // Mostrar resumo
        const successMessage = `Envio concluído! ${data.successful} enviados, ${data.failed} falharam.`;
        setError(successMessage);
        setTimeout(() => setError(''), 5000);
      } else {
        setError(data.error || 'Erro ao enviar mensagens');
      }
    } catch (err) {
      setError('Erro ao enviar mensagens: ' + err.message);
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
        <WhatsAppIcon sx={{ mr: 2, fontSize: 'inherit' }} />
        Disparador de WhatsApp
      </Typography>

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
          {!isConnected && (
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
          <Typography variant="h6" gutterBottom>
            Resultados da Validação
          </Typography>
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
    </Container>
  );
}

export default App;
