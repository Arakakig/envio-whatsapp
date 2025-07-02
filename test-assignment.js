import { initDatabase, createUser, assignConversationToAgent, getConversationsByAgent, getUnassignedConversations, getAvailableAgents } from './database.js';

async function testAssignment() {
  try {
    // Inicializar banco de dados
    await initDatabase();
    
    console.log('🧪 Testando sistema de atribuição de conversas...\n');

    // 1. Criar alguns agentes de teste
    console.log('1. Criando agentes de teste...');
    const agent1 = await createUser('agente1', 'agente1@test.com', 'password123', 'Agente João', 'agent');
    const agent2 = await createUser('agente2', 'agente2@test.com', 'password123', 'Agente Maria', 'agent');
    console.log('✅ Agentes criados:', agent1.full_name, 'e', agent2.full_name);

    // 2. Buscar agentes disponíveis
    console.log('\n2. Buscando agentes disponíveis...');
    const availableAgents = await getAvailableAgents();
    console.log('✅ Agentes disponíveis:', availableAgents.length);
    availableAgents.forEach(agent => {
      console.log(`   - ${agent.full_name} (${agent.role})`);
    });

    // 3. Simular atribuição de conversa (precisamos de uma conversa existente)
    console.log('\n3. Testando atribuição de conversa...');
    
    // Buscar conversas não atribuídas
    const unassigned = await getUnassignedConversations();
    console.log('✅ Conversas não atribuídas:', unassigned.length);
    
    if (unassigned.length > 0) {
      const conversation = unassigned[0];
      console.log(`   Atribuindo conversa ${conversation.id} ao agente ${agent1.full_name}...`);
      
      const success = await assignConversationToAgent(conversation.id, agent1.id);
      if (success) {
        console.log('✅ Conversa atribuída com sucesso!');
        
        // 4. Verificar conversas do agente
        console.log('\n4. Verificando conversas do agente...');
        const agentConversations = await getConversationsByAgent(agent1.id);
        console.log(`✅ Agente ${agent1.full_name} tem ${agentConversations.length} conversas`);
        
        // 5. Verificar conversas não atribuídas novamente
        console.log('\n5. Verificando conversas não atribuídas após atribuição...');
        const unassignedAfter = await getUnassignedConversations();
        console.log('✅ Conversas não atribuídas restantes:', unassignedAfter.length);
        
      } else {
        console.log('❌ Falha ao atribuir conversa');
      }
    } else {
      console.log('⚠️  Nenhuma conversa não atribuída encontrada para teste');
    }

    console.log('\n🎉 Teste de atribuição concluído!');

  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
}

testAssignment(); 