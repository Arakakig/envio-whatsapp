import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addUpdatedAtColumn() {
  let db = null;
  
  try {
    console.log('Conectando ao banco de dados...');
    db = await open({
      filename: path.join(__dirname, 'attendance.db'),
      driver: sqlite3.Database
    });

    // Verificar se a coluna updated_at já existe
    const tableInfo = await db.all("PRAGMA table_info(customer_notes)");
    const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
    
    if (hasUpdatedAt) {
      console.log('✅ Coluna updated_at já existe na tabela customer_notes');
      return;
    }

    console.log('Adicionando coluna updated_at à tabela customer_notes...');
    
    // Adicionar a coluna updated_at sem valor padrão
    await db.run(`
      ALTER TABLE customer_notes 
      ADD COLUMN updated_at DATETIME
    `);

    // Atualizar registros existentes para ter o mesmo valor de created_at
    await db.run(`
      UPDATE customer_notes 
      SET updated_at = created_at 
      WHERE updated_at IS NULL
    `);

    console.log('✅ Coluna updated_at adicionada com sucesso!');
    
    // Verificar a estrutura da tabela
    const newTableInfo = await db.all("PRAGMA table_info(customer_notes)");
    console.log('Estrutura atual da tabela customer_notes:');
    newTableInfo.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Erro ao adicionar coluna updated_at:', error);
  } finally {
    if (db) {
      await db.close();
      console.log('Conexão com banco de dados fechada');
    }
  }
}

// Executar o script
addUpdatedAtColumn().then(() => {
  console.log('Script concluído!');
  process.exit(0);
}).catch(error => {
  console.error('Erro no script:', error);
  process.exit(1);
}); 