import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDatabaseStructure() {
  const db = await open({
    filename: path.join(__dirname, 'attendance.db'),
    driver: sqlite3.Database
  });

  try {
    console.log('🔍 Verificando estrutura do banco de dados...\n');

    // Verificar tabela sectors
    console.log('📋 Tabela SECTORS:');
    const sectorsColumns = await db.all("PRAGMA table_info(sectors)");
    console.log('Colunas:', sectorsColumns.map(col => `${col.name} (${col.type})`));
    
    const sectorsCount = await db.get('SELECT COUNT(*) as count FROM sectors');
    console.log('Registros:', sectorsCount.count);
    console.log('');

    // Verificar tabela users
    console.log('📋 Tabela USERS:');
    const usersColumns = await db.all("PRAGMA table_info(users)");
    console.log('Colunas:', usersColumns.map(col => `${col.name} (${col.type})`));
    
    const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
    console.log('Registros:', usersCount.count);
    console.log('');

    // Verificar tabela conversations
    console.log('📋 Tabela CONVERSATIONS:');
    const conversationsColumns = await db.all("PRAGMA table_info(conversations)");
    console.log('Colunas:', conversationsColumns.map(col => `${col.name} (${col.type})`));
    
    const conversationsCount = await db.get('SELECT COUNT(*) as count FROM conversations');
    console.log('Registros:', conversationsCount.count);
    console.log('');

    // Testar query de conversas
    console.log('🧪 Testando query de conversas...');
    try {
      const testQuery = `
        SELECT 
          c.*,
          cu.name as customer_name,
          cu.phone as customer_phone,
          u.full_name as agent_name,
          u.username as agent_username,
          s.name as sector_name,
          s.color as sector_color,
          COUNT(m.id) as message_count,
          MAX(m.timestamp) as last_message_time
        FROM conversations c
        LEFT JOIN customers cu ON c.customer_id = cu.id
        LEFT JOIN users u ON c.assigned_agent_id = u.id
        LEFT JOIN sectors s ON c.sector_id = s.id
        LEFT JOIN messages m ON c.id = m.conversation_id
        GROUP BY c.id
        LIMIT 1
      `;
      
      const result = await db.all(testQuery);
      console.log('✅ Query executada com sucesso!');
      console.log('Resultado:', result.length, 'registros');
      if (result.length > 0) {
        console.log('Primeiro registro:', Object.keys(result[0]));
      }
    } catch (error) {
      console.error('❌ Erro na query:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  } finally {
    await db.close();
  }
}

checkDatabaseStructure(); 