const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function addAssignmentColumn() {
  const db = await open({
    filename: path.join(__dirname, 'attendance.db'),
    driver: sqlite3.Database
  });

  try {
    // Verificar se a coluna já existe
    const columns = await db.all("PRAGMA table_info(conversations);");
    const hasColumn = columns.some(col => col.name === 'assigned_agent_id');
    
    if (hasColumn) {
      console.log('Coluna assigned_agent_id já existe na tabela conversations');
      return;
    }

    // Adicionar a coluna
    await db.run('ALTER TABLE conversations ADD COLUMN assigned_agent_id INTEGER REFERENCES users(id)');
    console.log('Coluna assigned_agent_id adicionada com sucesso à tabela conversations');
    
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
  } finally {
    await db.close();
  }
}

addAssignmentColumn(); 