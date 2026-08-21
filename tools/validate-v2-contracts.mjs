import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
let failed = false;

function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message){
  failed = true;
  if(process.env.GITHUB_ACTIONS) console.error(`::error::${message}`);
  console.error('FAIL:', message);
}
function pass(message){ console.log('PASS:', message); }
function includesAll(text, needles, label){
  for(const needle of needles){ if(!text.includes(needle)) fail(`${label} missing ${needle}`); }
}

const responseSchema = read('collector-worker/schema-responses.sql').toLowerCase();
for(const forbidden of ['email_cipher','email_iv','invite_id','token_hash','token_cipher','roster']){
  if(responseSchema.includes(forbidden)) fail(`Response DB contains forbidden identity field: ${forbidden}`);
}
if(!failed) pass('Response DB contains no invitation/email identity columns');

const identitySchema = read('collector-worker/schema-identity.sql');
includesAll(identitySchema, ['email_cipher','token_hash','token_cipher','submitting'], 'Identity schema');

const wrangler = read('collector-worker/wrangler.toml');
includesAll(wrangler, ['main = "src/bootstrap.js"','PUBLIC_SURVEY_BASE = "https://olemoz1977.github.io/gla360-personal-full/survey-v2.html"','binding = "IDENTITY_DB"','binding = "RESPONSE_DB"'], 'wrangler.toml');

const bootstrap = read('collector-worker/src/bootstrap.js');
includesAll(bootstrap, ["import app from './entry.js'",'return app.fetch(request, env, ctx)','sanitizeInviteResponse','stripNotObservedAnswers'], 'Collector bootstrap');

const entry = read('collector-worker/src/entry.js');
includesAll(entry, ['exactly_one_self_required','duplicate_email_in_cycle','status = \'submitting\'','already_submitted','assessmentId'], 'Collector middleware');

const setup = read('setup-v2.html');
includesAll(setup, ['src="v2-i18n.js"','src="collector-client.js"','src="setup-v2.js"','id="privacyAck"','id="selfLang"','id="guardianEmail"'], 'setup-v2.html');
if(setup.includes('<script>\n(function(){')) fail('setup-v2.html still contains legacy inline runtime');

const survey = read('survey-v2.html');
includesAll(survey, ['bank/questions.en.json','submitInvite','leadership360-response-backup@1','assessment_id:ctx.assessmentId','privacyUrl'], 'survey-v2.html');
for(const forbidden of ['email:ctx','invite_id','inviteId:']){
  if(survey.includes(forbidden)) fail(`survey-v2 backup/runtime appears to include forbidden identity field: ${forbidden}`);
}

const guardian = read('guardian.html');
includesAll(guardian, ['cycleStatus','sendInvitations','exportCycle','createNextCycle','deleteAssessment','privacyUrl','langToggle'], 'guardian.html');

const report = read('report-v2.html');
includesAll(report, ['exportCycle','langToggle','privacyUrl','Others','roleCounts'], 'report-v2.html');

const compare = read('compare-v2.html');
includesAll(compare, ['exportCycle(auth.assessmentId,1','exportCycle(auth.assessmentId,2','gla360_delta','plan.html?lang=','langToggle'], 'compare-v2.html');

const reflect = read('reflect-v2.html');
includesAll(reflect, ['gla360_delta','gla360-reflect@1','gla360_reflect','circumstances','plan_wrong','plan_not_executed','plan.html?lang=','langToggle'], 'reflect-v2.html');
for(const forbidden of ['Leadership360Collector','fetch(','submitInvite','email']){
  if(reflect.includes(forbidden)) fail(`reflect-v2.html must stay browser-session-only; found ${forbidden}`);
}

const planRouter = read('plan.html');
includesAll(planRouter, ['leadership360_ui_lang','plan-en.html','bot-sync.js'], 'plan.html');

const planEn = read('plan-en.html');
for(const competency of [
  'Demonstrating Integrity','Encouraging Dialogue','Creating Shared Vision','Developing Technological Savvy','Ensuring Customer Satisfaction',
  'Maintaining Competitive Advantage','Developing People','Building Partnerships','Sharing Leadership','Achieving Personal Mastery',
  'Anticipating Opportunities','Leading Change','Empowering People','Thinking Globally','Appreciating Diversity'
]){
  if(!planEn.includes(`'${competency}'`)) fail(`plan-en.html missing competency: ${competency}`);
}
includesAll(planEn, ['botSyncBtn','Leadership360BotSync','Leadership 360° -','90-day development plan'], 'plan-en.html');

const privacy = read('PRIVACY-v2.html');
includesAll(privacy, ['Identity DB','Response DB','pseudon','AES-GCM','URL fragment','Automatic expiry is not yet enabled','automatinis duomenų galiojimo terminas dar neįjungtas'], 'PRIVACY-v2.html');

const client = read('collector-client.js');
includesAll(client, ['qs.set(\'key\', manageToken)','qs.set(\'lang\'','privacyUrl','authorization'], 'collector-client.js');
if(client.includes('searchParams.set(\'key\'')) fail('collector-client places management key in query parameters');

if(failed){ process.exitCode = 1; }
else pass('Leadership 360 V2 static contracts');
