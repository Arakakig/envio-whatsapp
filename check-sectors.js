import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkSectors() {
  const db = await open({
    filename: path.join(__dirname, 'attendance.db'),
    driver: sqlite3.Database
  });

  try {
    console.log('Verificando setores no banco de dados...');
    
    // Verificar se a tabela existe
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='sectors'");
    console.log('Tabela sectors existe:', tables.length > 0);
    
    if (tables.length > 0) {
      // Verificar estrutura da tabela
      const columns = await db.all("PRAGMA table_info(sectors)");
      console.log('Colunas da tabela sectors:');
      columns.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
      
      // Verificar dados
      const sectors = await db.all("SELECT * FROM sectors");
      console.log(`\nTotal de setores: ${sectors.length}`);
      
      if (sectors.length > 0) {
        console.log('Setores encontrados:');
        sectors.forEach(sector => {
          console.log(`- ID: ${sector.id}, Nome: ${sector.name}, Ativo: ${sector.is_active}`);
        });
      } else {
        console.log('Nenhum setor encontrado na tabela');
      }
    }
    
  } catch (error) {
    console.error('Erro ao verificar setores:', error);
  } finally {
    await db.close();
  }
}

checkSectors(); 