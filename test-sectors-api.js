import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3001/api';

async function testSectorsAPI() {
  console.log('Testando API de setores...');
  
  try {
    // Teste 1: Verificar se a API está respondendo
    console.log('\n1. Testando se a API está respondendo...');
    const response = await fetch(`${API_BASE_URL}/sectors`);
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Resposta:', responseText);
    
    // Teste 2: Tentar com token inválido
    console.log('\n2. Testando com token inválido...');
    const response2 = await fetch(`${API_BASE_URL}/sectors`, {
      headers: {
        'Authorization': 'Bearer token-invalido'
      }
    });
    console.log('Status:', response2.status);
    
    const responseText2 = await response2.text();
    console.log('Resposta:', responseText2);
    
    // Teste 3: Verificar rota de login
    console.log('\n3. Testando rota de login...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    console.log('Status do login:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login bem-sucedido, token recebido:', !!loginData.token);
      
      // Teste 4: Usar token válido
      console.log('\n4. Testando com token válido...');
      const response3 = await fetch(`${API_BASE_URL}/sectors`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      console.log('Status:', response3.status);
      
      if (response3.ok) {
        const sectorsData = await response3.json();
        console.log('Setores recebidos:', sectorsData);
      } else {
        const errorText = await response3.text();
        console.log('Erro:', errorText);
      }
    } else {
      const errorText = await loginResponse.text();
      console.log('Erro no login:', errorText);
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

testSectorsAPI(); 