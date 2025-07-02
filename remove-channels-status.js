import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function removeChannelsAndStatus() {
  const db = await open({
    filename: './attendance.db',
    driver: sqlite3.Database
  });

  console.log('Removendo conversas de canais e status...');

  // Remover conversas de canais (@newsletter, @broadcast)
  const channelResult = await db.run(`
    DELETE FROM conversations 
    WHERE chat_id LIKE '%@newsletter%' 
    OR chat_id LIKE '%@broadcast%'
  `);
  console.log(`Conversas de canais removidas: ${channelResult.changes}`);

  // Remover conversas de status
  const statusResult = await db.run(`
    DELETE FROM conversations 
    WHERE chat_id = 'status@broadcast'
  `);
  console.log(`Conversas de status removidas: ${statusResult.changes}`);

  // Remover mensagens relacionadas
  const messagesResult = await db.run(`
    DELETE FROM messages 
    WHERE conversation_id IN (
      SELECT id FROM conversations 
      WHERE chat_id LIKE '%@newsletter%' 
      OR chat_id LIKE '%@broadcast%'
      OR chat_id = 'status@broadcast'
    )
  `);
  console.log(`Mensagens de canais/status removidas: ${messagesResult.changes}`);

  // Remover clientes órfãos
  const customersResult = await db.run(`
    DELETE FROM customers 
    WHERE id NOT IN (
      SELECT DISTINCT customer_id FROM conversations
    )
  `);
  console.log(`Clientes órfãos removidos: ${customersResult.changes}`);

  console.log('Limpeza concluída!');
  await db.close();
}

removeChannelsAndStatus().catch(console.error); 