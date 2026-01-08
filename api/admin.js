import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(request, response) {
  const { action, secret, ...data } = JSON.parse(request.body || '{}');

  if (secret !== process.env.ADMIN_SECRET) {
    return response.status(401).json({ error: 'Invalid Secret' });
  }

  try {
    if (action === 'list') {
      const page = data.page || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      // Select all fields
      const entries = await client.execute({
        sql: 'SELECT * FROM guestbook ORDER BY created_at DESC LIMIT ? OFFSET ?',
        args: [limit, offset],
      });

      const countResult = await client.execute('SELECT COUNT(*) as total FROM guestbook');
      
      return response.status(200).json({
        rows: entries.rows,
        total: countResult.rows[0].total,
        page: page
      });
    }

    if (action === 'create') {
      const { name, message, website, created_at } = data;
      const time = created_at ? created_at : new Date().toISOString();
      
      await client.execute({
        sql: 'INSERT INTO guestbook (name, message, website, created_at) VALUES (?, ?, ?, ?)',
        args: [name, message, website || null, time],
      });
      return response.status(200).json({ success: true });
    }

    // --- UPDATED SECTION ---
    if (action === 'update') {
      // NOW receiving created_at
      const { id, name, message, website, created_at } = data;
      
      await client.execute({
        // Added created_at = ? to SQL
        sql: 'UPDATE guestbook SET name = ?, message = ?, website = ?, created_at = ? WHERE id = ?',
        args: [name, message, website || null, created_at, id],
      });
      return response.status(200).json({ success: true });
    }
    // -----------------------

    if (action === 'delete') {
      const { id } = data;
      await client.execute({
        sql: 'DELETE FROM guestbook WHERE id = ?',
        args: [id],
      });
      return response.status(200).json({ success: true });
    }

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }

  return response.status(400).json({ error: 'Unknown action' });
}