import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import AttendanceDashboard from './AttendanceDashboard';
import AttendanceChat from './AttendanceChat';

const AttendanceLayout = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Escutar evento de abertura de conversa
  useEffect(() => {
    const handleOpenConversation = (event) => {
      const { conversationId: eventConversationId, messageId } = event.detail;
      console.log('[ATTENDANCE] Evento de abertura de conversa recebido:', { 
        conversationId: eventConversationId, 
        messageId 
      });
      
      // Navegar para a rota da conversa
      if (eventConversationId) {
        navigate(`/attendance/${eventConversationId}`);
      }
    };

    window.addEventListener('openConversation', handleOpenConversation);
    
    return () => {
      window.removeEventListener('openConversation', handleOpenConversation);
    };
  }, [navigate]);

  const handleSelectConversation = (conversation) => {
    console.log('[ATTENDANCE] Conversa selecionada:', conversation);
    setSelectedConversation(conversation);
    
    // Navegar para a rota da conversa
    if (conversation && conversation.id) {
      navigate(`/attendance/${conversation.id}`);
    }
  };

  // Carregar conversa baseada no parâmetro da URL
  useEffect(() => {
    if (conversationId) {
      console.log('[ATTENDANCE] Carregando conversa da URL:', conversationId);
      // Aqui você pode buscar a conversa pelo ID se necessário
      // Por enquanto, vamos deixar o dashboard carregar a conversa
    }
  }, [conversationId]);

  const handleBackToDashboard = () => {
    console.log('[ATTENDANCE] Voltando para dashboard');
    setSelectedConversation(null);
    navigate('/attendance');
  };

  return (
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
  );
};

export default AttendanceLayout; 