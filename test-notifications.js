// Script para testar notificações de menção
const io = require('socket.io-client');

console.log('Conectando ao servidor...');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Conectado ao servidor!');
  
  // Simular uma menção após 2 segundos
  setTimeout(() => {
    console.log('Simulando evento de menção...');
    
    // Emitir evento de menção (isso seria feito pelo servidor normalmente)
    socket.emit('new-mention', {
      mentionId: 1,
      messageId: 123,
      conversationId: 456,
      mentionedUserId: 1, // ID do usuário mencionado
      mentionedBy: 'João Silva',
      mentionText: 'Teste de menção',
      messageContent: 'Esta é uma mensagem de teste',
      timestamp: new Date().toISOString()
    });
    
    console.log('Evento de menção enviado!');
  }, 2000);
});

socket.on('new-mention', (data) => {
  console.log('Evento de menção recebido:', data);
});

socket.on('disconnect', () => {
  console.log('Desconectado do servidor');
});

// Manter o script rodando por 10 segundos
setTimeout(() => {
  console.log('Encerrando teste...');
  socket.disconnect();
  process.exit(0);
}, 10000); 