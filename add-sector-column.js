import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addSectorColumn() {
  const db = await open({
    filename: path.join(__dirname, 'attendance.db'),
    driver: sqlite3.Database
  });

  try {
    // Verificar se a coluna já existe
    const columns = await db.all("PRAGMA table_info(users);");
    const hasColumn = columns.some(col => col.name === 'sector');
    
    if (hasColumn) {
      console.log('Coluna sector já existe na tabela users');
      return;
    }

    // Adicionar a coluna
    await db.run('ALTER TABLE users ADD COLUMN sector TEXT');
    console.log('Coluna sector adicionada com sucesso à tabela users');
    
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
  } finally {
    await db.close();
  }
}

addSectorColumn(); 