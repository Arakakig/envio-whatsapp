import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para adicionar as novas colunas à tabela customers
const updateDatabaseSchema = async () => {
  let db = null;
  
  try {
    db = await open({
      filename: path.join(__dirname, 'attendance.db'),
      driver: sqlite3.Database
    });

    console.log('Atualizando estrutura do banco de dados...');

    // Adicionar novas colunas se não existirem
    const columns = [
      'profile_picture TEXT',
      'contact_name TEXT', 
      'last_contact_update DATETIME'
    ];

    for (const column of columns) {
      const columnName = column.split(' ')[0];
      try {
        await db.run(`ALTER TABLE customers ADD COLUMN ${column}`);
        console.log(`Coluna ${columnName} adicionada com sucesso`);
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log(`Coluna ${columnName} já existe`);
        } else {
          console.error(`Erro ao adicionar coluna ${columnName}:`, error.message);
        }
      }
    }

    console.log('Estrutura do banco atualizada com sucesso!');
    
    // Mostrar estatísticas dos dados
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(contact_name) as customers_with_name,
        COUNT(profile_picture) as customers_with_picture,
        COUNT(last_contact_update) as customers_with_update
      FROM customers
    `);
    
    console.log('\nEstatísticas dos dados:');
    console.log(`Total de clientes: ${stats.total_customers}`);
    console.log(`Clientes com nome de contato: ${stats.customers_with_name}`);
    console.log(`Clientes com foto de perfil: ${stats.customers_with_picture}`);
    console.log(`Clientes com última atualização: ${stats.customers_with_update}`);

  } catch (error) {
    console.error('Erro ao atualizar banco de dados:', error);
  } finally {
    if (db) {
      await db.close();
    }
  }
};

// Executar a atualização
updateDatabaseSchema().then(() => {
  console.log('\nScript concluído!');
  process.exit(0);
}).catch(error => {
  console.error('Erro no script:', error);
  process.exit(1);
}); 