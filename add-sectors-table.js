import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addSectorsTable() {
  const db = await open({
    filename: path.join(__dirname, 'attendance.db'),
    driver: sqlite3.Database
  });

  try {
    // Verificar se a tabela já existe
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='sectors'");
    
    if (tables.length > 0) {
      console.log('✅ Tabela sectors já existe');
      return;
    }

    // Criar tabela de setores
    await db.exec(`
      CREATE TABLE sectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#007bff',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabela sectors criada com sucesso');
    
    // Criar índice
    await db.run('CREATE INDEX IF NOT EXISTS idx_sectors_name ON sectors(name)');
    console.log('✅ Índice criado para a tabela sectors');
    
    // Inserir alguns setores padrão
    const defaultSectors = [
      { name: 'Vendas', description: 'Setor de vendas e comercial', color: '#28a745' },
      { name: 'Suporte', description: 'Setor de suporte ao cliente', color: '#17a2b8' },
      { name: 'Financeiro', description: 'Setor financeiro', color: '#ffc107' },
      { name: 'TI', description: 'Setor de tecnologia da informação', color: '#6f42c1' },
      { name: 'RH', description: 'Recursos humanos', color: '#fd7e14' }
    ];
    
    for (const sector of defaultSectors) {
      await db.run(
        'INSERT INTO sectors (name, description, color) VALUES (?, ?, ?)',
        [sector.name, sector.description, sector.color]
      );
    }
    
    console.log('✅ Setores padrão inseridos:', defaultSectors.length);
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela sectors:', error);
  } finally {
    await db.close();
  }
}

addSectorsTable(); 