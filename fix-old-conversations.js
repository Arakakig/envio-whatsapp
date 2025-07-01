import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixOldConversations() {
  const db = await open({
    filename: path.join(__dirname, 'attendance.db'),
    driver: sqlite3.Database
  });

  const conversations = await db.all('SELECT id, customer_id, chat_id, chat_type, chat_name FROM conversations');
  let updated = 0;

  for (const conv of conversations) {
    if (!conv.chat_id || conv.chat_id === 'N/A' || conv.chat_id === 'undefined' || conv.chat_id === '') {
      // Buscar número do cliente
      const customer = await db.get('SELECT phone FROM customers WHERE id = ?', [conv.customer_id]);
      if (customer && customer.phone) {
        await db.run(
          'UPDATE conversations SET chat_id = ?, chat_type = ?, chat_name = ? WHERE id = ?',
          [customer.phone, 'private', customer.phone, conv.id]
        );
        console.log(`Conversa ID ${conv.id} atualizada: chat_id=${customer.phone}, chat_type=private, chat_name=${customer.phone}`);
        updated++;
      }
    }
  }

  if (updated === 0) {
    console.log('Nenhuma conversa antiga precisou ser atualizada.');
  } else {
    console.log(`Conversas antigas atualizadas: ${updated}`);
  }
  await db.close();
}

fixOldConversations(); 