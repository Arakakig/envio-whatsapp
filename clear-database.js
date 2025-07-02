import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function clearDatabase() {
  const db = await open({
    filename: path.join(__dirname, 'attendance.db'),
    driver: sqlite3.Database
  });

  try {
    console.log('🗑️ Limpando banco de dados...');
    
    // Desabilitar foreign keys temporariamente
    await db.run('PRAGMA foreign_keys = OFF');
    
    // Limpar todas as tabelas
    const tables = [
      'messages',
      'conversations', 
      'customers',
      'whatsapp_sessions',
    ];
    
    for (const table of tables) {
      console.log(`📋 Limpando tabela: ${table}`);
      await db.run(`DELETE FROM ${table}`);
      
      // Resetar auto-increment
      await db.run(`DELETE FROM sqlite_sequence WHERE name = '${table}'`);
    }
    
    // Reabilitar foreign keys
    await db.run('PRAGMA foreign_keys = ON');
    
    // Verificar se foi limpo
    const messageCount = await db.get('SELECT COUNT(*) as count FROM messages');
    const conversationCount = await db.get('SELECT COUNT(*) as count FROM conversations');
    const customerCount = await db.get('SELECT COUNT(*) as count FROM customers');
    const sessionCount = await db.get('SELECT COUNT(*) as count FROM whatsapp_sessions');
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    
    console.log('\n✅ Banco de dados limpo com sucesso!');
    console.log(`📊 Estatísticas após limpeza:`);
    console.log(`   - Mensagens: ${messageCount.count}`);
    console.log(`   - Conversas: ${conversationCount.count}`);
    console.log(`   - Clientes: ${customerCount.count}`);
    console.log(`   - Sessões WhatsApp: ${sessionCount.count}`);
    console.log(`   - Usuários: ${userCount.count}`);
    
  } catch (error) {
    console.error('❌ Erro ao limpar banco de dados:', error);
  } finally {
    await db.close();
  }
}

// Executar limpeza
clearDatabase(); 