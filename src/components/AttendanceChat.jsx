import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Fab
} from '@mui/material';
import {
  Send,
  AttachFile,
  Person,
  WhatsApp,
  AccessTime,
  CheckCircle,
  Error,
  Mic,
  Stop,
  PlayArrow,
  Pause,
  Audiotrack,
  Close,
  PictureAsPdf,
  Download,
  Note
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import CustomerNotes from './CustomerNotes';
import { useConversations } from '../contexts/ConversationContext';

const AttendanceChat = ({ conversation, onBack }) => {
  const { markConversationAsRead } = useConversations();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [messageCache, setMessageCache] = useState(new Map()); // Cache para mensagens
  const [socket, setSocket] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [microphoneError, setMicrophoneError] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      
      // Marcar conversa como lida
      if (conversation.has_unread_messages) {
        markConversationAsRead(conversation.id);
      }
      
      // Conectar ao socket
      const newSocket = io();
      setSocket(newSocket);
      
      // Entrar na sala da conversa
      newSocket.emit('join-conversation', conversation.id);
      
      // Escutar novas mensagens
      newSocket.on('new-message', (message) => {
        if (message.conversationId === conversation.id) {
          setMessages(prev => [...prev, message]);
        }
      });
      
      // Escutar digitação
      newSocket.on('typing', (data) => {
        if (data.conversationId === conversation.id) {
          setTyping(true);
          setTimeout(() => setTyping(false), 3000);
        }
      });
      
      return () => {
        newSocket.emit('leave-conversation', conversation.id);
        newSocket.disconnect();
      };
    }
  }, [conversation, markConversationAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!conversation) return;
    
    try {
      // Verificar cache primeiro
      const cacheKey = `messages_${conversation.id}`;
      const cachedMessages = messageCache.get(cacheKey);
      
      if (cachedMessages) {
        setMessages(cachedMessages);
        setLoading(false);
        // Carregar dados atualizados em background
        fetchMessagesFromServer();
        return;
      }
      
      await fetchMessagesFromServer();
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessagesFromServer = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/attendance/conversations/${conversation.id}/messages?limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
        // Salvar no cache
        const cacheKey = `messages_${conversation.id}`;
        setMessageCache(prev => new Map(prev.set(cacheKey, data.messages)));
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens do servidor:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !imageFile && !audioFile && !pdfFile) return;
    
    const messageToSend = newMessage.trim();
    const tempId = Date.now(); // ID temporário para feedback instantâneo
    
    // Adicionar mensagem imediatamente para feedback visual
    const tempMessage = {
      id: tempId,
      content: messageToSend,
      direction: 'outbound',
      timestamp: new Date(new Date().getTime() - (4 * 60 * 60 * 1000)).toISOString(),
      status: 'sending',
      conversation_id: conversation.id
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setImageFile(null);
    setAudioFile(null);
    setPdfFile(null);
    setSending(true);
    
    // Scroll para baixo imediatamente
    setTimeout(scrollToBottom, 100);
    
    try {
      const formData = new FormData();
      formData.append('message', messageToSend);
      formData.append('conversationId', conversation.id);
      formData.append('customerPhone', conversation.customer_phone);
      formData.append('chatId', conversation.chat_id);
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      if (audioFile) {
        formData.append('audio', audioFile);
      }
      
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }
      
      const response = await fetch('http://localhost:3001/api/attendance/send-message', {
        method: 'POST',
        body: formData
      });
      
      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('API retornou HTML em vez de JSON:', text.substring(0, 200));
        throw new Error('API retornou resposta inválida. Verifique se o servidor está rodando.');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Atualizar mensagem com status de sucesso
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId 
              ? { ...msg, status: 'sent', id: data.messageId || tempId }
              : msg
          )
        );
        
        // Limpar cache para forçar atualização
        const cacheKey = `messages_${conversation.id}`;
        setMessageCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(cacheKey);
          return newCache;
        });
      } else {
        // Marcar como falha
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
        setErrorMessage('Erro ao enviar mensagem: ' + data.error);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Marcar como falha
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
      setErrorMessage('Erro ao enviar mensagem. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', {
        conversationId: conversation.id,
        isTyping: true
      });
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      setShowImageDialog(true);
    }
  };

  const handleAudioSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Se o arquivo já é OGG, usar diretamente
      if (file.type === 'audio/ogg' || file.name.endsWith('.ogg')) {
        setAudioFile(file);
        return;
      }
      
      // Para outros formatos, tentar converter ou usar como está
      // O WhatsApp Web.js geralmente aceita MP3, WAV, M4A também
      setAudioFile(file);
    }
  };

  const handlePdfSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Tentar gravar diretamente em OGG se suportado
      let mimeType = 'audio/webm;codecs=opus';
      let fileName = 'audio.webm';
      let fileType = 'audio/webm';
      
      // Verificar se o navegador suporta OGG
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
        fileName = 'audio.ogg';
        fileType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
        fileName = 'audio.webm';
        fileType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
        fileName = 'audio.m4a';
        fileType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: fileType });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        setAudioFile(new File([audioBlob], fileName, { type: fileType }));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer para mostrar duração da gravação
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      setMicrophoneError('Erro ao acessar microfone. Verifique as permissões.');
      setTimeout(() => setMicrophoneError(''), 5000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    // Ajustar para fuso horário local (GMT-4 - Campo Grande)
    const localDate = new Date(date.getTime() + (4 * 60 * 60 * 1000));
    return localDate.toLocaleString('pt-BR', {
      timeZone: 'America/Campo_Grande',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStatus = (status) => {
    switch (status) {
      case 'sending':
        return <CircularProgress size={16} color="inherit" />;
      case 'sent':
        return <CheckCircle fontSize="small" color="action" />;
      case 'delivered':
        return <CheckCircle fontSize="small" color="primary" />;
      case 'read':
        return <CheckCircle fontSize="small" color="success" />;
      case 'failed':
        return <Error fontSize="small" color="error" />;
      default:
        return null;
    }
  };

  const handleDownloadFile = (mediaUrl, fileName) => {
    // Abrir em nova guia
    const fullUrl = mediaUrl.startsWith('http') ? mediaUrl : `http://localhost:3001${mediaUrl}`;
    window.open(fullUrl, '_blank');
  };

  if (!conversation) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Selecione uma conversa para começar</Typography>
      </Box>
    );
  }
  return (
    <Box height="100%" display="flex" flexDirection="column">
      {/* Notificações de erro */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}
      
      {microphoneError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMicrophoneError('')}>
          {microphoneError}
        </Alert>
      )}
      
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar>
            {conversation.profilePicture ? (
              <img 
                src={conversation.profilePicture} 
                alt="Foto de perfil" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Person />
            )}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6">
              {conversation.chat_type === 'group' 
                ? (conversation.chat_name || 'Grupo') 
                : (conversation.contactName || conversation.customer_phone || 'Cliente')
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {conversation.customer_phone}
              {conversation.chat_type === 'group' && (
                <span> • Grupo</span>
              )}
            </Typography>
            {conversation.assigned_agent_name && (
              <Typography variant="body2" color="text.secondary">
                Atendente: {conversation.assigned_agent_name}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={() => setShowNotes(!showNotes)}
            title="Ver observações do cliente"
            color={showNotes ? 'primary' : 'default'}
          >
            <Note />
          </IconButton>
          <Chip
            icon={<WhatsApp />}
            label={conversation.status === 'open' ? 'Aberta' : 'Fechada'}
            color={conversation.status === 'open' ? 'warning' : 'default'}
          />
        </Box>
      </Paper>

      {/* Observações do Cliente */}
      {showNotes && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <CustomerNotes 
            customerId={conversation.customer_id}
            customerName={conversation.contactName || conversation.customer_phone || 'Cliente'}
          />
        </Paper>
      )}

      {/* Mensagens */}
      <Paper sx={{ flex: 1, mb: 2, overflow: 'hidden' }}>
        <Box height="100%" display="flex" flexDirection="column">
          <Box flex={1} overflow="auto" p={2}>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Carregando mensagens...</Typography>
              </Box>
            ) : messages.length === 0 ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="text.secondary">
                  Nenhuma mensagem ainda
                </Typography>
              </Box>
            ) : (
              <List>
                {messages.map((message, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      flexDirection: 'column',
                      alignItems: message.direction === 'outbound' ? 'flex-end' : 'flex-start',
                      px: 0
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '70%',
                        backgroundColor: message.direction === 'outbound' ? 'primary.main' : 'grey.100',
                        color: message.direction === 'outbound' ? 'white' : 'text.primary',
                        borderRadius: 2,
                        p: 1.5,
                        mb: 1
                      }}
                    >
                      {/* Mostrar remetente em grupos */}
                      {conversation.chat_type === 'group' && message.direction === 'inbound' && (
                        <Box mb={1}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: message.direction === 'outbound' ? 'white' : 'primary.main'
                            }}
                          >
                            {message.sender_name || message.sender_phone || 'Membro do grupo'}
                          </Typography>
                          {message.sender_phone && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block',
                                color: message.direction === 'outbound' ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                              }}
                            >
                              {message.sender_phone}
                            </Typography>
                          )}
                        </Box>
                      )}
                      
                      {/* Exibir imagem se for do tipo image */}
                      {((message.message_type === 'image' || message.mediaType === 'image') && (message.media_url || message.mediaUrl)) ? (
                        <Box mt={1} mb={message.content ? 1 : 0}>
                          <img
                            src={message.media_url || message.mediaUrl}
                            alt="Imagem recebida"
                            style={{ maxWidth: '100%', borderRadius: 8 }}
                          />
                        </Box>
                      ) : null}
                      
                      {/* Exibir PDF se for do tipo pdf */}
                      {((message.message_type === 'pdf' || message.mediaType === 'pdf') && (message.media_url || message.mediaUrl)) ? (
                        <Box 
                          mt={1} 
                          mb={message.content ? 1 : 0}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 1,
                            backgroundColor: 'background.paper'
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            <PictureAsPdf color="error" />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {message.fileName || 'Documento PDF'}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadFile(message.media_url || message.mediaUrl, message.fileName)}
                              title="Abrir PDF em nova guia"
                            >
                              <Download fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      ) : null}
                      {message.content && (
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {message.content}
                        </Typography>
                      )}
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        <AccessTime fontSize="small" />
                        <Typography variant="caption">
                          {formatDate(message.timestamp)}
                        </Typography>
                        {message.direction === 'outbound' && getMessageStatus(message.status)}
                      </Box>
                    </Box>
                  </ListItem>
                ))}
                
                {typing && (
                  <ListItem sx={{ justifyContent: 'flex-start', px: 0 }}>
                    <Box
                      sx={{
                        backgroundColor: 'grey.100',
                        borderRadius: 2,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Cliente está digitando...
                      </Typography>
                    </Box>
                  </ListItem>
                )}
              </List>
            )}
            <div ref={messagesEndRef} />
          </Box>
        </Box>
      </Paper>

      {/* Input de mensagem */}
      <Paper sx={{ p: 2 }}>
        <Box display="flex" gap={1} alignItems="flex-end">
          <IconButton
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="Anexar imagem"
          >
            <AttachFile />
          </IconButton>
          
          <IconButton
            onClick={() => audioInputRef.current?.click()}
            disabled={sending}
            title="Anexar áudio"
          >
            <Audiotrack />
          </IconButton>
          
          <IconButton
            onClick={() => pdfInputRef.current?.click()}
            disabled={sending}
            title="Anexar PDF"
          >
            <PictureAsPdf />
          </IconButton>
          
          {!isRecording ? (
            <IconButton
              onClick={startRecording}
              disabled={sending}
              color="primary"
              title="Gravar áudio"
            >
              <Mic />
            </IconButton>
          ) : (
            <IconButton
              onClick={stopRecording}
              disabled={sending}
              color="error"
              title="Parar gravação"
            >
              <Stop />
            </IconButton>
          )}
          
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              } else {
                handleTyping();
              }
            }}
            placeholder="Digite sua mensagem..."
            disabled={sending}
            variant="outlined"
            size="small"
          />
          
          <IconButton
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !imageFile && !audioFile && !pdfFile) || sending}
            color="primary"
          >
            {sending ? <CircularProgress size={24} /> : <Send />}
          </IconButton>
        </Box>
        
        {/* Preview de áudio */}
        {audioFile && (
          <Box sx={{ mt: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton onClick={playAudio} size="small">
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {audioFile.name || 'Áudio gravado'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {recordingTime > 0 ? formatTime(recordingTime) : ''}
              </Typography>
              <IconButton onClick={removeAudio} size="small" color="error">
                <Close />
              </IconButton>
            </Box>
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                style={{ display: 'none' }}
              />
            )}
          </Box>
        )}
        
        {imageFile && (
          <Alert severity="info" sx={{ mt: 1 }} onClose={() => setImageFile(null)}>
            Imagem selecionada: {imageFile.name}
          </Alert>
        )}
        
        {pdfFile && (
          <Alert severity="info" sx={{ mt: 1 }} onClose={() => setPdfFile(null)}>
            PDF selecionado: {pdfFile.name}
          </Alert>
        )}
        
        {isRecording && (
          <Alert severity="warning" sx={{ mt: 1 }} onClose={() => {}}>
            Gravando áudio... {formatTime(recordingTime)}
          </Alert>
        )}
      </Paper>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />
      
      {/* Input de áudio oculto */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioSelect}
        style={{ display: 'none' }}
      />
      
      {/* Input de PDF oculto */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handlePdfSelect}
        style={{ display: 'none' }}
      />

      {/* Dialog de confirmação de imagem */}
      <Dialog open={showImageDialog} onClose={() => setShowImageDialog(false)}>
        <DialogTitle>Enviar imagem</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja enviar a imagem "{imageFile?.name}" junto com a mensagem?
          </Typography>
          {imageFile && (
            <Box mt={2}>
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Preview"
                style={{ maxWidth: '100%', borderRadius: 8 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImageDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSendMessage} variant="contained">
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceChat; 