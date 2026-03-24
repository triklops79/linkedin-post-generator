module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Upload image to Supabase Storage
  if (req.method === 'POST' && req.body && req.body.action === 'upload_image') {
    try {
      const { image_base64, file_name, mime_type } = req.body;
      const buffer = Buffer.from(image_base64, 'base64');
      console.log('Uploading to:', `${process.env.SUPABASE_URL}/storage/v1/object/images/${fileName}`);
      console.log('Key starts with:', process.env.SUPABASE_ANON_KEY?.substring(0, 20));
      const fileName = `${Date.now()}_${file_name}`;
      const response = await fetch(
        `${process.env.SUPABASE_URL}/storage/v1/object/images/${fileName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': mime_type,
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          },
          body: buffer
        }
      );
      if (!response.ok) {
        const err = await response.text();
        return res.status(500).json({ error: err });
      }
      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${fileName}`;
      return res.status(200).json({ url: publicUrl });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Save post to Supabase
  if (req.method === 'PUT') {
    try {
      const { event_name, post_text, tone, language, user_email, user_name } = req.body;
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ event_name, post_text, tone, language, user_email, user_name })
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Get posts from Supabase
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/posts?order=created_at.desc&limit=30`, {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        }
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Delete all posts from Supabase
  if (req.method === 'DELETE') {
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/posts?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        }
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Publish to LinkedIn via Make webhook
  if (req.method === 'PATCH') {
    try {
      const { post_text, image_url, target } = req.body;
      const webhookUrl = target === 'pbt'
        ? process.env.MAKE_WEBHOOK_URL_2
        : process.env.MAKE_WEBHOOK_URL;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: post_text,
          image_url: image_url || ''
        })
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Generate post with Claude
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
