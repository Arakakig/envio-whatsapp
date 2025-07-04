import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import io from 'socket.io-client';

const ConversationContext = createContext();

export const useConversations = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
};

export const ConversationProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Função para buscar conversas do servidor
  const fetchConversations = useCallback(async (forceRefresh = false) => {
    // Se não for refresh forçado e já temos conversas carregadas, não buscar novamente
    if (!forceRefresh && conversations.length > 0 && lastUpdate) {
      const timeSinceLastUpdate = Date.now() - lastUpdate;
      // Se a última atualização foi há menos de 30 segundos, não buscar novamente
      if (timeSinceLastUpdate < 30000) {
        console.log('[CONVERSATIONS] Usando cache - última atualização há', Math.round(timeSinceLastUpdate / 1000), 'segundos');
        return;
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('[CONVERSATIONS] Buscando conversas...', 'Chamada #', Date.now());
      const response = await fetch('http://localhost:3001/api/attendance/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversations(data.recentConversations);
          setLastUpdate(Date.now());
          console.log('[CONVERSATIONS] Conversas atualizadas do servidor:', data.recentConversations.length);
        }
      }
    } catch (error) {
      console.error('[CONVERSATIONS] Erro ao buscar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, [conversations.length, lastUpdate]);

  // Configurar WebSocket para receber mensagens em tempo real
  useEffect(() => {
    if (isInitialized) {
      console.log('[CONVERSATIONS] WebSocket já inicializado, pulando');
      return;
    }
    
    console.log('[CONVERSATIONS] Inicializando WebSocket...');
    setIsInitialized(true);
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Listener para mensagens recebidas
    newSocket.on('chatwood', (data) => {
      if (data.type === 'message') {
        console.log('[SOCKET] Nova mensagem recebida para conversa:', data.conversationId);
        
        // Atualizar apenas a conversa específica
        setConversations(prev => {
          const conversationIndex = prev.findIndex(conv => conv.id === data.conversationId);
          
          if (conversationIndex === -1) {
            console.log('[SOCKET] Conversa não encontrada, fazendo refresh completo');
            // Se a conversa não existe, fazer refresh completo
            fetchConversations(true);
            return prev;
          }
          
          // Criar nova lista com a conversa atualizada
          const updatedConversations = [...prev];
          const updatedConversation = {
            ...updatedConversations[conversationIndex],
            last_message: data.message || data.mediaType || 'Mídia',
            last_message_time: data.timestamp || new Date().toISOString(),
            message_count: (updatedConversations[conversationIndex].message_count || 0) + 1,
            // Marcar como não lida apenas se for mensagem recebida (inbound)
            has_unread_messages: data.direction === 'inbound' ? true : updatedConversations[conversationIndex].has_unread_messages,
            unread_count: data.direction === 'inbound' 
              ? (updatedConversations[conversationIndex].unread_count || 0) + 1 
              : updatedConversations[conversationIndex].unread_count || 0
          };
          
          // Remover a conversa da posição atual
          updatedConversations.splice(conversationIndex, 1);
          
          // Adicionar no topo da lista (mais recente)
          updatedConversations.unshift(updatedConversation);
          
          console.log('[SOCKET] Conversa atualizada em tempo real:', data.conversationId, '- Direção:', data.direction);
          return updatedConversations;
        });
      }
    });

    return () => {
      newSocket.close();
    };
  }, [fetchConversations, isInitialized]);

  // Função para atualizar uma conversa específica
  const updateConversation = useCallback((conversationId, updates) => {
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, ...updates }
          : conv
      );
      
      console.log('[CONVERSATIONS] Conversa atualizada:', conversationId);
      return updated;
    });
  }, []);

  // Função para adicionar uma nova conversa
  const addConversation = useCallback((newConversation) => {
    setConversations(prev => {
      // Verificar se a conversa já existe
      const exists = prev.find(conv => conv.id === newConversation.id);
      if (exists) {
        console.log('[CONVERSATIONS] Conversa já existe, atualizando:', newConversation.id);
        return prev.map(conv => 
          conv.id === newConversation.id 
            ? { ...conv, ...newConversation }
            : conv
        );
      }
      
      // Adicionar nova conversa no topo
      const updated = [newConversation, ...prev];
      console.log('[CONVERSATIONS] Nova conversa adicionada:', newConversation.id);
      return updated;
    });
  }, []);

  // Função para atualizar mensagem em uma conversa
  const updateConversationMessage = useCallback((conversationId, messageData) => {
    setConversations(prev => {
      // Encontrar a conversa atual
      const conversationIndex = prev.findIndex(conv => conv.id === conversationId);
      if (conversationIndex === -1) return prev;
      
      // Criar nova lista com a conversa atualizada
      const updatedConversations = [...prev];
      const updatedConversation = {
        ...updatedConversations[conversationIndex],
        last_message: messageData.content || messageData.message || '',
        last_message_time: messageData.timestamp || new Date().toISOString(),
        message_count: (updatedConversations[conversationIndex].message_count || 0) + 1,
        // Se for mensagem recebida, marcar como não lida
        has_unread_messages: messageData.direction === 'inbound' ? true : updatedConversations[conversationIndex].has_unread_messages,
        unread_count: messageData.direction === 'inbound' 
          ? (updatedConversations[conversationIndex].unread_count || 0) + 1 
          : updatedConversations[conversationIndex].unread_count || 0
      };
      
      // Remover a conversa da posição atual
      updatedConversations.splice(conversationIndex, 1);
      
      // Adicionar no topo da lista (mais recente)
      updatedConversations.unshift(updatedConversation);
      
      console.log('[CONVERSATIONS] Mensagem atualizada na conversa:', conversationId, '- Movida para o topo');
      return updatedConversations;
    });
  }, []);

  // Função para emitir mensagem enviada via WebSocket
  const emitSentMessage = useCallback((conversationId, messageData) => {
    if (socket) {
      socket.emit('message_sent', {
        conversationId,
        message: messageData.content || messageData.message || '',
        mediaType: messageData.mediaType,
        mediaUrl: messageData.mediaUrl,
        timestamp: messageData.timestamp || new Date().toISOString(),
        direction: 'outbound'
      });
      console.log('[SOCKET] Mensagem enviada emitida:', conversationId);
    }
  }, [socket]);

  // Função para marcar conversa como lida
  const markConversationAsRead = useCallback(async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/attendance/conversations/${conversationId}/seen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Atualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, has_unread_messages: false, unread_count: 0 }
            : conv
        )
      );
      
      console.log('[CONVERSATIONS] Conversa marcada como lida:', conversationId);
    } catch (error) {
      console.error('[CONVERSATIONS] Erro ao marcar conversa como lida:', error);
    }
  }, []);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    setConversations([]);
    setLastUpdate(null);
    console.log('[CONVERSATIONS] Cache limpo');
  }, []);

  // Memoizar o valor do contexto para evitar re-renders desnecessários
  const contextValue = useMemo(() => ({
    conversations,
    loading,
    lastUpdate,
    socket,
    fetchConversations,
    updateConversation,
    addConversation,
    updateConversationMessage,
    emitSentMessage,
    markConversationAsRead,
    clearCache
  }), [
    conversations,
    loading,
    lastUpdate,
    socket,
    fetchConversations,
    updateConversation,
    addConversation,
    updateConversationMessage,
    emitSentMessage,
    markConversationAsRead,
    clearCache
  ]);

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
}; 