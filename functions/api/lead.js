// Cloudflare Pages Function: POST /api/lead
// Creates/updates the contact in Ontraport (with one retry), then tags it.
// Returns { ok: true } only when Ontraport confirms the save.
// Secrets (Cloudflare → Pages → Settings → Variables and Secrets): ONTRAPORT_APP_ID, ONTRAPORT_API_KEY
// Never hard-code the API key here.

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

export async function onRequestPost({ request, env, waitUntil }) {
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
    company: d.company || '',
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

  let res = await saveContact(headers, contact);
  if (!res.ok) { await sleep(800); res = await saveContact(headers, contact); }
  if (!res.ok) {
    console.error('Ontraport save failed', res.status, await safeText(res), d.email);
    return json({ ok: false, error: 'CRM save failed' }, 502);
  }

  const saved = await res.json().catch(() => ({}));
  const id = saved?.data?.id ?? saved?.data?.attrs?.id;
  // Tag in the background so the visitor isn't kept waiting (tags trigger the Ontraport automations)
  if (id) {
    const tagIt = async () => {
      for (let i = 0; i < 2; i++) {
        const t = await fetch(`${API}/objects/tagByName`, {
          method: 'PUT', headers,
          body: JSON.stringify({ objectID: 0, ids: [id], add_names: [`Quiz Taken - Stage: ${d.stage}`] })
        }).catch(() => null);
        if (t && t.ok) return;
        await sleep(800);
      }
      console.error('Ontraport tag failed', d.email);
    };
    waitUntil(tagIt());
  }
  return json({ ok: true });
}

const saveContact = (headers, contact) =>
  fetch(`${API}/Contacts/saveorupdate`, { method: 'POST', headers, body: JSON.stringify(contact) })
    .catch(() => new Response(null, { status: 599 }));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const safeText = r => r.text().catch(() => '');
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
