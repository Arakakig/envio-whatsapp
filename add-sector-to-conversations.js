import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addSectorToConversations() {
  const db = await open({
    filename: path.join(__dirname, 'attendance.db'),
    driver: sqlite3.Database
  });

  try {
    // Verificar se a coluna já existe
    const columns = await db.all("PRAGMA table_info(conversations)");
    const sectorColumnExists = columns.some(col => col.name === 'sector_id');
    
    if (sectorColumnExists) {
      console.log('✅ Coluna sector_id já existe na tabela conversations');
      return;
    }

    // Adicionar coluna sector_id
    await db.run('ALTER TABLE conversations ADD COLUMN sector_id INTEGER REFERENCES sectors(id)');
    console.log('✅ Coluna sector_id adicionada à tabela conversations');
    
    // Criar índice para melhor performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_conversations_sector_id ON conversations(sector_id)');
    console.log('✅ Índice criado para sector_id na tabela conversations');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna sector_id:', error);
  } finally {
    await db.close();
  }
}

addSectorToConversations(); 