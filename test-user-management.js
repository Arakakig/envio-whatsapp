const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Conectar ao banco
const db = new sqlite3.Database('./attendance.db');

async function testUserManagement() {
  console.log('=== Teste de Gerenciamento de Usuários ===\n');

  try {
    // 1. Verificar se existem usuários
    console.log('1. Verificando usuários existentes...');
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, email, full_name, role, sector, is_active FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`   Encontrados ${users.length} usuários:`);
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.full_name}) - ${user.role} - ${user.is_active ? 'Ativo' : 'Inativo'}`);
    });

    // 2. Testar criação de usuário
    console.log('\n2. Testando criação de usuário...');
    const testUser = {
      username: 'teste_user',
      email: 'teste@exemplo.com',
      full_name: 'Usuário de Teste',
      sector: 'TI',
      role: 'agent',
      password: '123456'
    };

    // Verificar se já existe
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ? OR email = ?', 
        [testUser.username, testUser.email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      console.log('   Usuário de teste já existe, pulando criação...');
    } else {
      const passwordHash = await bcrypt.hash(testUser.password, 10);
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO users (username, email, password_hash, full_name, role, sector, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [testUser.username, testUser.email, passwordHash, testUser.full_name, testUser.role, testUser.sector], function(err) {
          if (err) reject(err);
          else {
            console.log(`   Usuário criado com ID: ${this.lastID}`);
            resolve();
          }
        });
      });
    }

    // 3. Testar atualização de usuário
    console.log('\n3. Testando atualização de usuário...');
    const userToUpdate = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ?', [testUser.username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (userToUpdate) {
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE users 
          SET full_name = ?, sector = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, ['Usuário de Teste Atualizado', 'Suporte', userToUpdate.id], function(err) {
          if (err) reject(err);
          else {
            console.log(`   Usuário atualizado: ${this.changes} linha(s) afetada(s)`);
            resolve();
          }
        });
      });
    }

    // 4. Testar alteração de senha
    console.log('\n4. Testando alteração de senha...');
    if (userToUpdate) {
      const newPasswordHash = await bcrypt.hash('nova123456', 10);
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE users 
          SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newPasswordHash, userToUpdate.id], function(err) {
          if (err) reject(err);
          else {
            console.log(`   Senha alterada: ${this.changes} linha(s) afetada(s)`);
            resolve();
          }
        });
      });
    }

    // 5. Verificar estrutura da tabela
    console.log('\n5. Verificando estrutura da tabela users...');
    const tableInfo = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(users)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('   Colunas da tabela users:');
    tableInfo.forEach(col => {
      console.log(`   - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\n=== Teste concluído com sucesso! ===');

  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    db.close();
  }
}

testUserManagement(); 