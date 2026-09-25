export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fullName, email, phone, selectedDiscipline, currentCity, experience, portfolioLink, coverNote } = req.body || {};

    if (!fullName || !email || !coverNote) {
      return res.status(400).json({ error: 'Full name, email, and cover note are required' });
    }

    const cleanName = String(fullName).trim();
    const cleanEmail = String(email).trim();
    const cleanPhone = String(phone || '').replace('+91', '').replace(/\s+/g, '').trim();
    const cleanDiscipline = String(selectedDiscipline || 'Creative Superpower').trim();

    const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.EXPO_PUBLIC_RESEND_API_KEY || '';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #FFFDF9; border: 1px solid #FED7AA; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);">
        <div style="background: linear-gradient(135deg, #FF6B35 0%, #EA580C 100%); padding: 32px 28px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">Book A Shoot</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; color: #FFEDD5;">Talent & Creative Pitch Dossier</p>
        </div>
        <div style="padding: 28px 24px;">
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #FFF7ED; padding-bottom: 8px;">
              Candidate & Talent Overview
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #64748B; font-weight: 600; width: 140px;">Candidate Name</td>
                <td style="padding: 10px 0; font-size: 15px; color: #0F172A; font-weight: 700;">${cleanName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #64748B; font-weight: 600;">Discipline</td>
                <td style="padding: 10px 0; font-size: 15px; color: #EA580C; font-weight: 700;">${cleanDiscipline}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #64748B; font-weight: 600;">Phone / WhatsApp</td>
                <td style="padding: 10px 0; font-size: 15px; color: #0F172A; font-weight: 600;">
                  <a href="tel:+91${cleanPhone}" style="color: #0F172A; text-decoration: none;">+91 ${cleanPhone}</a>
                  <a href="https://wa.me/91${cleanPhone}" style="margin-left: 12px; display: inline-block; background: #25D366; color: #FFF; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none;">WhatsApp Candidate</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #64748B; font-weight: 600;">Email Address</td>
                <td style="padding: 10px 0; font-size: 15px; color: #0F172A;">
                  <a href="mailto:${cleanEmail}" style="color: #EA580C; text-decoration: none; font-weight: 600;">${cleanEmail}</a>
                </td>
              </tr>
              ${currentCity ? `<tr><td style="padding: 10px 0; font-size: 14px; color: #64748B; font-weight: 600;">Current City</td><td style="padding: 10px 0; font-size: 15px; color: #0F172A; font-weight: 600;">${currentCity}</td></tr>` : ''}
              ${experience ? `<tr><td style="padding: 10px 0; font-size: 14px; color: #64748B; font-weight: 600;">Experience</td><td style="padding: 10px 0; font-size: 15px; color: #0F172A; font-weight: 600;">${experience}</td></tr>` : ''}
              ${portfolioLink ? `<tr><td style="padding: 10px 0; font-size: 14px; color: #64748B; font-weight: 600;">Portfolio / Profile</td><td style="padding: 10px 0; font-size: 15px; color: #0F172A;"><a href="${portfolioLink}" target="_blank" style="color: #EA580C; font-weight: 600; text-decoration: underline;">${portfolioLink}</a></td></tr>` : ''}
            </table>
          </div>
          <div style="background: #FFF7ED; border-left: 4px solid #EA580C; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #9A3412; text-transform: uppercase; letter-spacing: 0.5px;">Candidate Pitch & Cover Note</h3>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${String(coverNote).trim()}</p>
          </div>
        </div>
        <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 14px 24px; text-align: center; font-size: 12px; color: #94A3B8;">
          <p style="margin: 0;">Pitch submitted via Book A Shoot Careers Portal • Confidential Talent Pipeline</p>
        </div>
      </div>
    `;

    const recipients = ['careers@camartes.com', 'camartes01@gmail.com'];
    const dispatchResults = [];

    for (const r of recipients) {
      const payload = {
        from: 'Book A Shoot Careers <hello@camartes.com>',
        to: [r],
        reply_to: cleanEmail,
        subject: `💼 [Future Talent Pitch] ${cleanName} — ${cleanDiscipline}`,
        html: htmlBody,
      };

      let resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        payload.from = 'Book A Shoot Careers <onboarding@resend.dev>';
        resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      const resData = await resp.json().catch(() => ({}));
      dispatchResults.push({ recipient: r, status: resp.ok ? 'delivered' : 'failed', data: resData });
    }

    return res.status(200).json({ success: true, message: 'Pitch submitted successfully', results: dispatchResults });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
