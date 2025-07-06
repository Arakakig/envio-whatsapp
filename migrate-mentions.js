import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateMentions() {
  let db = null;
  
  try {
    console.log('Iniciando migração para adicionar suporte a menções...');
    
    db = await open({
      filename: path.join(__dirname, 'attendance.db'),
      driver: sqlite3.Database
    });

    // Verificar se a tabela já existe
    const tableExists = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='message_mentions'
    `);

    if (tableExists) {
      console.log('Tabela message_mentions já existe. Pulando migração.');
      return;
    }

    console.log('Criando tabela message_mentions...');
    
    // Criar tabela de menções
    await db.exec(`
      CREATE TABLE message_mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        conversation_id INTEGER NOT NULL,
        mentioned_user_id INTEGER NOT NULL,
        mentioned_by_user_id INTEGER NOT NULL,
        mention_text TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        FOREIGN KEY (mentioned_user_id) REFERENCES users(id),
        FOREIGN KEY (mentioned_by_user_id) REFERENCES users(id)
      );

      CREATE INDEX idx_message_mentions_message ON message_mentions(message_id);
      CREATE INDEX idx_message_mentions_conversation ON message_mentions(conversation_id);
      CREATE INDEX idx_message_mentions_user ON message_mentions(mentioned_user_id);
    `);

    console.log('✅ Migração concluída com sucesso!');
    console.log('Tabela message_mentions criada e índices adicionados.');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    if (db) {
      await db.close();
    }
  }
}

// Executar migração
migrateMentions().catch(console.error); 