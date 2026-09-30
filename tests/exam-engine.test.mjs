import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../oefenen/js/exam-engine.js', import.meta.url), 'utf8');
const sandbox = { window: {}, module: { exports: {} } };
vm.createContext(sandbox);
new vm.Script(code, { filename: 'js/exam-engine.js' }).runInContext(sandbox);
const engine = sandbox.window.CafaExamEngine;
assert.equal(engine, sandbox.module.exports, 'Browser and CommonJS exports must share the same API.');
assert.ok(Object.isFrozen(engine));
const plain = value => JSON.parse(JSON.stringify(value));
const now = Date.parse('2026-09-17T10:00:00Z');
const fixture = () => ({
  id: 'cafa2-fixture',
  title: 'CAFA2 testfixture, geen echt tentamen',
  date: '2026-09-17',
  durationMinutes: 120,
  introduction: 'Dit voorbeeld wordt alleen gebruikt door geautomatiseerde tests.',
  instructions: ['Beantwoord beide vragen.'],
  questions: [
    { id: 'q1', title: 'Open vraag', prompt: 'Licht je antwoord toe.', type: 'open', points: 5, solution: 'Een modelantwoord.' },
    { id: 'q2', prompt: 'Kies een antwoord.', type: 'mc', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'b', points: 1 }
  ]
});

assert.deepEqual(plain(engine.validateExam(fixture())), { valid: true, errors: [] });
for (const invalid of [null, [], {}, { ...fixture(), date: '2026-02-29' }, { ...fixture(), date: '17-09-2026' },
  { ...fixture(), durationMinutes: 0 }, { ...fixture(), durationMinutes: 1.5 }, { ...fixture(), durationMinutes: Infinity },
  { ...fixture(), questions: [] }, { ...fixture(), id: '__proto__' }, { ...fixture(), instructions: [''] },
  { ...fixture(), availableFrom: '2026-09-17T10:00' }, { ...fixture(), deadline: '2026-02-30T10:00:00Z' },
  { ...fixture(), availableFrom: '2026-09-17T12:00:00+02:00', deadline: '2026-09-17T10:00:00Z' }]) {
  assert.equal(engine.validateExam(invalid).valid, false, `Must reject ${JSON.stringify(invalid)}`);
  assert.throws(() => engine.createAttempt(invalid, { now }));
}
const malformedQuestions = [
  null,
  { id: 'q1', prompt: '', type: 'open' },
  { id: 'q1', prompt: 'Vraag', type: 'unknown' },
  { id: 'q1', prompt: 'Vraag', type: 'mc', options: [{ id: 'a', text: 'A' }] },
  { id: 'q1', prompt: 'Vraag', type: 'mc', options: [{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }] },
  { id: 'q1', prompt: 'Vraag', type: 'mc', options: [null, { id: 'a', text: 'A' }] },
  { id: 'q1', prompt: 'Vraag', type: 'mc', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'c' },
  { id: 'q1', prompt: 'Vraag', type: 'open', points: -1 }
];
for (const question of malformedQuestions) assert.equal(engine.validateExam({ ...fixture(), questions: [question] }).valid, false);
const duplicateQuestions = fixture();
duplicateQuestions.questions[1].id = 'q1';
assert.equal(engine.validateExam(duplicateQuestions).valid, false);
assert.equal(engine.validateExam({ ...fixture(), date: '2024-02-29' }).valid, true);

const withSections = () => ({
  ...fixture(),
  durationMinutes: 180,
  introductionHtml: '<p>Informatie vooraf met <strong>opmaak</strong>.</p>',
  maxScore: 100,
  passPoints: 55,
  sections: [
    { id: 'case-a', title: 'Opgave 1', contentHtml: '<p>Casus A</p><table><tr><td>100</td></tr></table>' },
    { id: 'case-b', title: 'Opgave 2', contentHtml: '<p>Casus B</p>' }
  ],
  questions: [
    { ...fixture().questions[0], sectionId: 'case-a', promptHtml: '<p>Licht je <strong>antwoord</strong> toe.</p>', solutionHtml: '<p>Modelantwoord met tabel.</p>' },
    { ...fixture().questions[1], sectionId: 'case-b' }
  ]
});
assert.equal(engine.validateExam(withSections()).valid, true);
assert.equal(engine.validateExam({ ...fixture(), sections: [] }).valid, true, 'Sections remain optional.');
for (const change of [
  { introductionHtml: [] }, { maxScore: 0 }, { maxScore: -1 }, { maxScore: '100' },
  { passPoints: -1 }, { passPoints: NaN }, { passPoints: 101 },
  { sections: {} }, { sections: [null] },
  { sections: [{ id: 'case-a', title: 'Casus', contentHtml: 42 }] },
  { sections: [{ id: 'case-a', title: '', contentHtml: '' }] },
  { sections: [{ id: '__proto__', title: 'Casus', contentHtml: '<p>Info</p>' }] },
  { sections: [withSections().sections[0], withSections().sections[0]] },
  { questions: [{ ...fixture().questions[0], sectionId: 'missing-case' }] },
  { questions: [{ ...fixture().questions[0], sectionId: null }] },
  { questions: [{ ...fixture().questions[0], promptHtml: {} }] },
  { questions: [{ ...fixture().questions[0], prompt: '', promptHtml: '<p>Wel HTML, geen fallback.</p>' }] },
  { questions: [{ ...fixture().questions[0], solutionHtml: [] }] }
]) {
  assert.equal(engine.validateExam({ ...withSections(), ...change }).valid, false, `Must reject invalid section metadata: ${JSON.stringify(change)}`);
}
assert.equal(engine.validateExam({ ...fixture(), questions: [{ ...fixture().questions[0], sectionId: 'case-a' }] }).valid, false,
  'A section reference without a section catalog must be rejected.');
const sectionExam = withSections();
const sectionAttempt = engine.createAttempt(sectionExam, { now });
assert.equal(sectionAttempt.deadlineAt, now + 180 * 60_000);
assert.equal(sectionAttempt.exam.sections[0].contentHtml, sectionExam.sections[0].contentHtml);
assert.equal(sectionAttempt.exam.questions[0].sectionId, 'case-a');
sectionExam.sections[0].contentHtml = '<p>Later vervangen</p>';
assert.notEqual(sectionAttempt.exam.sections[0].contentHtml, sectionExam.sections[0].contentHtml,
  'The attempt snapshots section information and formatted exam metadata.');
assert.equal(engine.createAttempt(withSections(), { now, extraTime: true }).deadlineAt, now + 210 * 60_000);

const exam = fixture();
const attempt = engine.createAttempt(exam, { now, id: 'fixture-attempt' });
assert.equal(attempt.status, 'active');
assert.equal(attempt.startedAt, now);
assert.equal(attempt.deadlineAt, now + 120 * 60_000);
assert.equal(attempt.extraMinutes, 0);
assert.equal(attempt.id, 'fixture-attempt');
assert.deepEqual(plain(attempt.exam), exam);
exam.questions[0].prompt = 'Gewijzigd na het starten';
assert.notEqual(attempt.exam.questions[0].prompt, exam.questions[0].prompt, 'Attempt keeps its original exam snapshot.');
assert.equal(engine.createAttempt(fixture(), { now, extraTime: true }).deadlineAt, now + 150 * 60_000);
assert.equal(engine.createAttempt(fixture(), { now, extraTime: true }).extraMinutes, 30);
assert.throws(() => engine.createAttempt(fixture(), { now, extraTime: 'true' }));
assert.throws(() => engine.createAttempt(fixture(), { now: NaN }));

for (const [seconds, formatted] of [[7200, '120 min'], [660, '11 min'], [601, '11 min'], [600, '10:00'],
  [599, '09:59'], [60, '01:00'], [1, '00:01'], [0, '00:00'], [-1, '00:00']]) {
  assert.equal(engine.formatTime(seconds), formatted);
  assert.equal(engine.remainingSeconds(attempt, attempt.deadlineAt - Math.max(0, seconds) * 1000), Math.max(0, seconds));
}
assert.equal(engine.remainingSeconds(attempt, attempt.deadlineAt - 1), 1, 'The last partial second remains visible.');
assert.equal(engine.remainingSeconds(attempt, attempt.deadlineAt + 60_000), 0);
assert.equal(engine.formatTime(0.1), '00:01');
assert.equal(engine.formatTime(Infinity), 'Zonder tijdslimiet');
const untimed=engine.createAttempt(fixture(),{now,untimed:true});
assert.equal(engine.remainingSeconds(untimed,now+999999999),Infinity);
assert.throws(()=>engine.finishAttempt(untimed,{now:now+999999999,reason:'timeout'}));
const paused=engine.createAttempt(fixture(),{now});
engine.pauseAttempt(paused,now+60000);
assert.equal(engine.remainingSeconds(paused,now+999999999),7140);
const reloadPaused=plain(paused);
engine.resumeAttempt(reloadPaused,now+999999999);
assert.equal(engine.remainingSeconds(reloadPaused,now+999999999),7140);
assert.equal(engine.remainingSeconds(reloadPaused,now+999999999+7140000),0);
assert.throws(() => engine.remainingSeconds({}, now));

const restored = plain(attempt);
assert.equal(engine.remainingSeconds(restored, now + 600_000), 6600, 'Reloading retains the original absolute deadline.');
assert.equal(restored.deadlineAt, attempt.deadlineAt);
assert.equal(engine.answeredCount(attempt), 0);
for (const html of ['', '<p><br></p>', '<p>&nbsp; \u200b</p>', '<table><tr><td><br></td></tr></table>', '<script>alert(1)</script>']) {
  attempt.answers.q1 = { html };
  assert.equal(engine.answeredCount(attempt), 0);
}
attempt.answers.q1 = { html: '<p><strong>Uitwerking</strong></p><table><tr><td>42</td></tr></table>' };
assert.equal(engine.answeredCount(attempt), 1);
attempt.answers.q2 = { optionId: 'missing-option' };
assert.equal(engine.answeredCount(attempt), 1);
attempt.answers.q2 = { optionId: 'b' };
assert.equal(engine.answeredCount(attempt), 2);
attempt.marked.q1 = true;
attempt.currentIndex = 1;

const finished = engine.finishAttempt(attempt, { now: now + 60_000, reason: 'submitted' });
assert.equal(attempt.status, 'active', 'Finishing must not mutate its input.');
assert.equal(finished.status, 'completed');
assert.equal(finished.submittedAt, now + 60_000);
assert.equal(finished.finishReason, 'submitted');
assert.deepEqual(plain(finished.answers), plain(attempt.answers));
assert.deepEqual(plain(finished.marked), { q1: true });
assert.equal(finished.currentIndex, 1);
assert.equal(finished.score, undefined, 'Open answers must not receive an invented grade.');
assert.equal(finished.grade, undefined);
assert.deepEqual(plain(engine.finishAttempt(finished, { now: now + 3600_000, reason: 'timeout' })), plain(finished),
  'Repeated finish events are idempotent and preserve the first submission.');
attempt.answers.q1.html = 'Later gewijzigd';
assert.notEqual(finished.answers.q1.html, attempt.answers.q1.html, 'Submitted answers are an independent snapshot.');

const timedOut = engine.finishAttempt(restored, { now: restored.deadlineAt + 60_000, reason: 'timeout' });
assert.equal(timedOut.submittedAt, restored.deadlineAt);
assert.equal(timedOut.finishReason, 'timeout');
assert.equal(engine.finishAttempt(restored, { now: restored.deadlineAt, reason: 'submitted' }).finishReason, 'timeout');
assert.throws(() => engine.finishAttempt(restored, { now, reason: 'timeout' }));
assert.throws(() => engine.finishAttempt(restored, { now, reason: 'other' }));

const scheduled = { ...fixture(), availableFrom: '2026-09-17T10:00:00Z', deadline: '2026-09-17T11:00:00Z' };
assert.throws(() => engine.createAttempt(scheduled, { now: now - 1 }));
assert.throws(() => engine.createAttempt(scheduled, { now: now + 3600_000 }));
assert.equal(engine.createAttempt(scheduled, { now }).deadlineAt, now + 120 * 60_000,
  'The availability window limits starting, not the allotted exam duration.');

console.log('Exam engine: validation, timer boundaries, extra time, snapshots, expiry and completion passed.');
