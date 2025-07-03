import fetch from 'node-fetch';

async function testServer() {
  console.log('Testando servidor...');
  
  try {
    // Teste 1: Verificar se o servidor está rodando
    console.log('1. Testando se o servidor está rodando...');
    const statusResponse = await fetch('http://localhost:3001/api/status');
    console.log('Status do servidor:', statusResponse.status);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Servidor está rodando:', statusData);
    } else {
      console.log('❌ Servidor não está respondendo corretamente');
      return;
    }
    
    // Teste 2: Verificar se a rota de usuários internos existe (sem autenticação)
    console.log('\n2. Testando rota de usuários internos (sem auth)...');
    const usersResponse = await fetch('http://localhost:3001/api/internal/users');
    console.log('Status da rota de usuários:', usersResponse.status);
    
    if (usersResponse.status === 401) {
      console.log('✅ Rota existe, mas requer autenticação (esperado)');
    } else if (usersResponse.status === 404) {
      console.log('❌ Rota não encontrada');
      const text = await usersResponse.text();
      console.log('Resposta:', text.substring(0, 200));
    } else {
      console.log('❌ Status inesperado:', usersResponse.status);
      const text = await usersResponse.text();
      console.log('Resposta:', text.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar servidor:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 O servidor não está rodando. Execute: npm run dev');
    }
  }
}

testServer(); 