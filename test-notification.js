import io from 'socket.io-client';

// Conectar ao servidor
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Conectado ao servidor');
  
  // Enviar notificação de teste
  const testNotification = {
    type: 'new-message',
    conversationId: 1,
    from: '556781566794',
    message: 'Teste de notificação via API',
    timestamp: new Date().toISOString()
  };
  
  console.log('Enviando notificação de teste:', testNotification);
  
  // Emitir evento como se fosse o servidor
  socket.emit('new-notification', testNotification);
  
  setTimeout(() => {
    console.log('Teste concluído');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.error('Erro de conexão:', error);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('Desconectado do servidor');
}); 