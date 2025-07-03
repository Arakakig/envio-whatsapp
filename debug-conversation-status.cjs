const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar ao banco de dados
const dbPath = path.join(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Debug: Verificando status de conversas lidas...\n');

// Função para executar queries
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function debugConversationStatus() {
  try {
    console.log('📊 1. Verificando estrutura da tabela conversations...');
    const tableInfo = await runQuery("PRAGMA table_info(conversations)");
    console.log('Colunas da tabela conversations:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });
    console.log('');

    console.log('📋 2. Verificando conversas com seus timestamps...');
    const conversations = await runQuery(`
      SELECT 
        c.id,
        c.customer_id,
        c.status,
        c.last_seen,
        c.created_at,
        c.updated_at,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_message_time,
        MIN(m.timestamp) as first_message_time
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      GROUP BY c.id
      ORDER BY c.id DESC
      LIMIT 10
    `);

    console.log('Conversas encontradas:');
    conversations.forEach(conv => {
      console.log(`\nConversa ID: ${conv.id}`);
      console.log(`  - Status: ${conv.status}`);
      console.log(`  - Last seen: ${conv.last_seen || 'NULL'}`);
      console.log(`  - Created: ${conv.created_at}`);
      console.log(`  - Updated: ${conv.updated_at}`);
      console.log(`  - Messages: ${conv.message_count}`);
      console.log(`  - First message: ${conv.first_message_time || 'N/A'}`);
      console.log(`  - Last message: ${conv.last_message_time || 'N/A'}`);
      
      // Calcular se deveria estar marcada como lida
      if (conv.last_message_time && conv.last_seen) {
        const lastMessage = new Date(conv.last_message_time);
        const lastSeen = new Date(conv.last_seen);
        const shouldBeRead = lastSeen >= lastMessage;
        console.log(`  - Should be read: ${shouldBeRead} (last_seen: ${lastSeen.toISOString()}, last_message: ${lastMessage.toISOString()})`);
      } else {
        console.log(`  - Should be read: ${conv.last_seen ? 'YES' : 'NO'} (no last_seen or no messages)`);
      }
    });

    console.log('\n🔍 3. Verificando cálculo de has_unread_messages...');
    const unreadCheck = await runQuery(`
      SELECT 
        c.id,
        c.last_seen,
        MAX(m.timestamp) as last_message_time,
        CASE 
          WHEN c.last_seen IS NULL OR c.last_seen < MAX(m.timestamp) THEN 1 
          ELSE 0 
        END as has_unread_messages,
        CASE 
          WHEN c.last_seen IS NULL THEN 'NULL last_seen'
          WHEN c.last_seen < MAX(m.timestamp) THEN 'last_seen < last_message'
          ELSE 'last_seen >= last_message'
        END as reason
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      GROUP BY c.id
      HAVING has_unread_messages = 1
      ORDER BY c.id DESC
      LIMIT 5
    `);

    console.log('Conversas marcadas como não lidas:');
    unreadCheck.forEach(conv => {
      console.log(`\nConversa ID: ${conv.id}`);
      console.log(`  - Last seen: ${conv.last_seen || 'NULL'}`);
      console.log(`  - Last message: ${conv.last_message_time || 'N/A'}`);
      console.log(`  - Reason: ${conv.reason}`);
    });

    console.log('\n🔧 4. Testando marcação de conversa como lida...');
    
    // Pegar uma conversa para testar
    const testConversation = conversations[0];
    if (testConversation) {
      console.log(`Testando com conversa ID: ${testConversation.id}`);
      
      // Marcar como lida
      await runQuery(
        'UPDATE conversations SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
        [testConversation.id]
      );
      
      // Verificar se foi atualizada
      const updated = await runQuery(
        'SELECT id, last_seen FROM conversations WHERE id = ?',
        [testConversation.id]
      );
      
      console.log(`Conversa atualizada:`, updated[0]);
      
      // Verificar se agora está marcada como lida
      const readCheck = await runQuery(`
        SELECT 
          c.id,
          c.last_seen,
          MAX(m.timestamp) as last_message_time,
          CASE 
            WHEN c.last_seen IS NULL OR c.last_seen < MAX(m.timestamp) THEN 1 
            ELSE 0 
          END as has_unread_messages
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [testConversation.id]);
      
      console.log(`Status após marcação:`, readCheck[0]);
    }

    console.log('\n✅ Debug concluído!');

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  } finally {
    db.close();
  }
}

// Executar o debug
debugConversationStatus(); 