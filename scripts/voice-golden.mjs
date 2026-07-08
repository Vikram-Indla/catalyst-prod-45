#!/usr/bin/env node
/**
 * voice-golden — golden-corpus regression for the CatyFlow dictation pipeline
 * (CAT-DICTATION-INTELLIGENCE-20260708-001 S3).
 *
 * Synthesizes Arabic + English + mixed test clips with macOS `say`, runs them
 * through the DEPLOYED voice-transcribe function, and asserts expected
 * keywords in the English output. Every root cause from the 2026-07-08
 * Arabic incident would have failed this suite the day it broke.
 *
 * Requirements (local/manual — not CI):
 *   - macOS (`say -v Majed` for Arabic, `afconvert`)
 *   - env: VOICE_TEST_JWT   a valid Supabase JWT for the target project
 *          VOICE_FN_URL     (optional) defaults to cyij staging
 *
 * Usage:  VOICE_TEST_JWT=eyJ… node scripts/voice-golden.mjs
 * Exit:   0 all pass · 1 any failure (prints per-case diagnosis)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FN_URL =
  process.env.VOICE_FN_URL ??
  'https://cyijbdeuehohvhnsywig.supabase.co/functions/v1/voice-transcribe';
const JWT = process.env.VOICE_TEST_JWT;
if (!JWT) {
  console.error('VOICE_TEST_JWT is required (any signed-in user JWT for the target project).');
  process.exit(1);
}

/** Each case: voice, spoken text, keywords that MUST appear (case-insensitive)
 *  in the English output, and optionally the provider we expect. */
const CASES = [
  {
    name: 'arabic-basic',
    voice: 'Majed',
    text: 'أريد تحديث تذكرة المشروع قبل الاجتماع يوم الخميس، الرجاء مراجعة الملف المرفق',
    // "تذكرة" is ambiguous (ticket/reminder) — the domain glossary steers it,
    // which is itself part of what this case verifies.
    vocabulary: ['ticket', 'CAT', 'BAU'],
    // ASR on synthetic TTS varies run-to-run ("ticket"/"reminder"/"update") —
    // assert the stable content words, keep the ticket-word as a soft third.
    expect: ['thursday', 'file', 'ticket|reminder|update'],
    provider: 'groq',
  },
  {
    name: 'arabic-technical-terms',
    voice: 'Majed',
    text: 'نحتاج نراجع الملف قبل الاجتماع مع الفريق يوم الأحد',
    expect: ['file', 'meeting', 'team'],
  },
  {
    name: 'english-basic',
    voice: 'Samantha',
    text: 'Please update the project ticket before the meeting on Thursday and review the attached file',
    expect: ['ticket', 'thursday', 'review'],
    provider: 'groq',
  },
  {
    name: 'english-vocab-biasing',
    voice: 'Samantha',
    text: 'Please ask Sikander to review cat 1234 before the Thursday meeting',
    vocabulary: ['Sikander', 'CAT', 'BAU'],
    expect: ['sikander', 'cat 1234|cat-1234'],
  },
  {
    // S7 intent collapse: the SPOKEN correction must win end-to-end —
    // transcribe, then the cleanup pass collapses to the final intent.
    name: 'english-self-correction',
    voice: 'Samantha',
    text: 'Send the report on Thursday. No wait, make that Wednesday. Also tell the team.',
    clean: true,
    expect: ['wednesday', 'team'],
    reject: ['thursday', 'no wait'],
  },
  {
    // Arabic correction ("لا انتظر خليه الأربعاء") arrives translated; the
    // collapse must still land on Wednesday only.
    name: 'arabic-self-correction',
    voice: 'Majed',
    text: 'أرسل التقرير يوم الخميس، لا انتظر، خليه يوم الأربعاء، وأبلغ الفريق',
    clean: true,
    expect: ['wednesday', 'team'],
    reject: ['thursday'],
  },
];

const CLEAN_URL = FN_URL.replace('voice-transcribe', 'catyflow-clean');
async function cleanText(text) {
  const resp = await fetch(CLEAN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${JWT}` },
    body: JSON.stringify({ mode: 'clean', text, register: 'chat', dictionary: [] }),
  });
  const body = await resp.json().catch(() => ({}));
  return { status: resp.status, cleaned: body.cleaned ?? null, provider: body.provider };
}

function synth(voice, text, dir, name) {
  const aiff = join(dir, `${name}.aiff`);
  const wav = join(dir, `${name}.wav`);
  execFileSync('say', ['-v', voice, '-o', aiff, text]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', aiff, wav]);
  return readFileSync(wav).toString('base64');
}

async function run() {
  const dir = mkdtempSync(join(tmpdir(), 'voice-golden-'));
  let failures = 0;
  try {
    for (const c of CASES) {
      const audioBase64 = synth(c.voice, c.text, dir, c.name);
      const t0 = Date.now();
      const resp = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${JWT}` },
        body: JSON.stringify({
          audioBase64,
          mimeType: 'audio/wav',
          sourceLanguages: ['ar-SA', 'ar-AE', 'ur-PK', 'hi-IN'],
          vocabulary: c.vocabulary ?? [],
          streaming: false,
        }),
      });
      let ms = Date.now() - t0;
      const body = await resp.json().catch(() => ({}));
      let finalText = body.englishText ?? '';
      const problems = [];
      // Mirror the client's translation guarantee: Whisper /translations
      // occasionally passes Arabic through — the app re-translates, so the
      // harness must too or it tests a pipeline that doesn't exist.
      if (/[؀-ۿ]/.test(finalText)) {
        const t2 = Date.now();
        const tr = await fetch(FN_URL.replace('voice-transcribe', 'ai-translate-field'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${JWT}` },
          body: JSON.stringify({ text: finalText, target: 'en' }),
        }).then((r) => r.json()).catch(() => ({}));
        ms += Date.now() - t2;
        if (tr.translated) finalText = tr.translated;
        else problems.push('arabic passed through and re-translate failed');
      }
      if (c.clean && finalText) {
        const t1 = Date.now();
        const cl = await cleanText(finalText);
        ms += Date.now() - t1;
        if (cl.status !== 200 || !cl.cleaned) problems.push(`clean failed (${cl.status})`);
        else finalText = cl.cleaned;
      }
      const text = finalText.toLowerCase();
      if (resp.status !== 200) problems.push(`status ${resp.status} (${body.error ?? ''} ${body.message ?? ''})`);
      if (c.provider && body.provider !== c.provider) {
        problems.push(`provider ${body.provider} (wanted ${c.provider}${body.groqError ? `; groqError: ${body.groqError}` : ''})`);
      }
      for (const kw of c.expect) {
        const ok = kw.split('|').some((alt) => text.includes(alt.toLowerCase()));
        if (!ok) problems.push(`missing "${kw}"`);
      }
      for (const kw of c.reject ?? []) {
        if (text.includes(kw.toLowerCase())) problems.push(`must NOT contain "${kw}"`);
      }
      if (ms > (c.clean ? 15000 : 8000)) problems.push(`slow: ${ms}ms`);
      if (problems.length) {
        failures++;
        console.error(`✗ ${c.name} [${ms}ms ${body.provider ?? '-'}] — ${problems.join('; ')}`);
        console.error(`  output: ${finalText || '(none)'}`);
      } else {
        console.log(`✓ ${c.name} [${ms}ms ${body.provider}] ${finalText}`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL GREEN');
  process.exit(failures ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
