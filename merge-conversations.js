import {
  initDatabase,
  mergeDuplicateConversations
} from './database.js';

async function mergeConversations() {
  try {
    console.log('🔧 Iniciando unificação de conversas duplicadas...');
    
    // Inicializar banco de dados
    await initDatabase();
    console.log('✅ Banco de dados inicializado');
    
    // Executar unificação
    const mergedCount = await mergeDuplicateConversations();
    
    if (mergedCount > 0) {
      console.log(`✅ Unificação concluída! ${mergedCount} grupos de conversas duplicadas foram unificados.`);
    } else {
      console.log('ℹ️ Nenhuma conversa duplicada encontrada.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a unificação:', error);
  } finally {
    process.exit(0);
  }
}

mergeConversations(); 