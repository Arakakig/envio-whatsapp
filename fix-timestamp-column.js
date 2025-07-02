import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixTimestampColumn() {
  let db = null;
  
  try {
    console.log('🔧 Iniciando correção da coluna timestamp...');
    
    db = await open({
      filename: path.join(__dirname, 'attendance.db'),
      driver: sqlite3.Database
    });

    // Verificar se a coluna timestamp existe
    const tableInfo = await db.all("PRAGMA table_info(messages)");
    const hasTimestamp = tableInfo.some(col => col.name === 'timestamp');
    
    if (!hasTimestamp) {
      console.log('📝 Adicionando coluna timestamp à tabela messages...');
      
      // Adicionar a coluna timestamp
      await db.run(`
        ALTER TABLE messages 
        ADD COLUMN timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
      
      console.log('✅ Coluna timestamp adicionada com sucesso!');
    } else {
      console.log('ℹ️ Coluna timestamp já existe na tabela messages');
    }

    // Configurar fuso horário
    await db.run("PRAGMA timezone = '-04:00'");
    console.log('🌍 Fuso horário configurado para GMT-4 (Campo Grande)');

    // Verificar estrutura atual da tabela
    const currentTableInfo = await db.all("PRAGMA table_info(messages)");
    console.log('📊 Estrutura atual da tabela messages:');
    currentTableInfo.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    console.log('✅ Correção concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir coluna timestamp:', error);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

fixTimestampColumn(); 