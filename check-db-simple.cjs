const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando estrutura do banco de dados...\n');

// Verificar tabela conversations
db.all("PRAGMA table_info(conversations)", (err, rows) => {
  if (err) {
    console.error('❌ Erro ao verificar tabela conversations:', err);
    return;
  }
  
  console.log('📋 Tabela CONVERSATIONS:');
  console.log('Colunas:', rows.map(col => `${col.name} (${col.type})`));
  
  // Verificar se sector_id existe
  const hasSectorId = rows.some(col => col.name === 'sector_id');
  console.log('Tem sector_id:', hasSectorId);
  console.log('');
  
  // Testar query simples
  const testQuery = `
    SELECT c.id, c.customer_id, c.sector_id, cu.name as customer_name
    FROM conversations c
    LEFT JOIN customers cu ON c.customer_id = cu.id
    LIMIT 1
  `;
  
  db.all(testQuery, (err, rows) => {
    if (err) {
      console.error('❌ Erro na query de teste:', err.message);
    } else {
      console.log('✅ Query de teste executada com sucesso!');
      console.log('Resultado:', rows.length, 'registros');
      if (rows.length > 0) {
        console.log('Primeiro registro:', rows[0]);
      }
    }
    
    db.close();
  });
}); 