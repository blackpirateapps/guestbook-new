import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(request, response) {
  // 1. GET: Fetch entries
  if (request.method === 'GET') {
    try {
      const result = await client.execute('SELECT * FROM guestbook ORDER BY created_at DESC LIMIT 50');
      return response.status(200).json(result.rows);
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  // 2. POST: Add entry
  if (request.method === 'POST') {
    try {
      const { name, message, website, _honey } = JSON.parse(request.body);

      // --- SECURITY CHECKS ---
      
      // 1. Honeypot Check
      if (_honey) {
        return response.status(200).json({ success: true });
      }

      // 2. Validation: Ensure required fields exist
      if (!name || !message) {
        return response.status(400).json({ error: 'Name and message are required' });
      }

      // 3. Length Limits
      // Message limit removed as requested.
      if (name.length > 50) return response.status(400).json({ error: 'Name too long' });
      if (website && website.length > 200) return response.status(400).json({ error: 'URL too long' });

      // --- END SECURITY CHECKS ---

      await client.execute({
        sql: 'INSERT INTO guestbook (name, message, website) VALUES (?, ?, ?)',
        args: [name, message, website || null],
      });

      return response.status(200).json({ success: true });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).json({ error: 'Method not allowed' });
}