// Cloudflare Pages Function: POST /api/lead
// Receives the quiz payload and creates/updates the contact in Ontraport.
// Secrets (set in Cloudflare → Pages → Settings → Variables and Secrets):
//   ONTRAPORT_APP_ID, ONTRAPORT_API_KEY
// Ontraport custom field IDs (configured 20 Oct 2026). Never hard-code the API key here.

const FIELD = {
  overallScore: 'f2375',
  stage: 'f2376',
  ambitionScore: 'f2377',
  capacityScore: 'f2378',
  opportunitiesScore: 'f2379',
  biggestConstraint: 'f2380',
  teamSize: 'f2381',
  turnover: 'f2382',
  answers: 'f2383', // long text field
  reportLink: 'f2384'
};

const API = 'https://api.ontraport.com/1';

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'Bad JSON' }, 400); }
  if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json({ ok: false, error: 'Invalid email' }, 400);

  const headers = {
    'Api-Appid': env.ONTRAPORT_APP_ID,
    'Api-Key': env.ONTRAPORT_API_KEY,
    'Content-Type': 'application/json'
  };

  const contact = {
    firstname: d.firstName || '',
    lastname: d.lastName || '',
    email: d.email,
    sms_number: d.phone || '',
    [FIELD.overallScore]: d.overallScore,
    [FIELD.stage]: d.stage,
    [FIELD.ambitionScore]: d.ambitionScore,
    [FIELD.capacityScore]: d.capacityScore,
    [FIELD.opportunitiesScore]: d.opportunitiesScore,
    [FIELD.biggestConstraint]: d.biggestConstraint,
    [FIELD.teamSize]: d.teamSize,
    [FIELD.turnover]: d.turnover,
    [FIELD.reportLink]: d.reportLink || '',
    [FIELD.answers]: (d.answers || []).map((x, i) => `${i + 1}. ${x.q} — ${x.a}`).join('\n')
  };

  const res = await fetch(`${API}/Contacts/saveorupdate`, { method: 'POST', headers, body: JSON.stringify(contact) });
  if (!res.ok) return json({ ok: false, error: 'Ontraport save failed', status: res.status }, 502);
  const saved = await res.json();
  const id = saved?.data?.id ?? saved?.data?.attrs?.id;

  // Tags drive Ontraport automations (follow-up emails per stage, report delivery etc.)
  if (id) {
    await fetch(`${API}/objects/tagByName`, {
      method: 'PUT', headers,
      body: JSON.stringify({ objectID: 0, ids: [id], add_names: [`Quiz Taken - Stage: ${d.stage}`] })
    });
  }
  return json({ ok: true });
}

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
