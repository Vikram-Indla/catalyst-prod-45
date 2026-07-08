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
    expect: ['ticket|reminder', 'thursday', 'file'],
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
];

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
      const ms = Date.now() - t0;
      const body = await resp.json().catch(() => ({}));
      const text = (body.englishText ?? '').toLowerCase();
      const problems = [];
      if (resp.status !== 200) problems.push(`status ${resp.status} (${body.error ?? ''} ${body.message ?? ''})`);
      if (c.provider && body.provider !== c.provider) {
        problems.push(`provider ${body.provider} (wanted ${c.provider}${body.groqError ? `; groqError: ${body.groqError}` : ''})`);
      }
      for (const kw of c.expect) {
        const ok = kw.split('|').some((alt) => text.includes(alt.toLowerCase()));
        if (!ok) problems.push(`missing "${kw}"`);
      }
      if (ms > 8000) problems.push(`slow: ${ms}ms`);
      if (problems.length) {
        failures++;
        console.error(`✗ ${c.name} [${ms}ms ${body.provider ?? '-'}] — ${problems.join('; ')}`);
        console.error(`  output: ${body.englishText ?? '(none)'}`);
      } else {
        console.log(`✓ ${c.name} [${ms}ms ${body.provider}] ${body.englishText}`);
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
