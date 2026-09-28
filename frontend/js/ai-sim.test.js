/**
 * Self-test for the simulated AI engine (Step 3 checkpoint: same input → same output).
 *
 * Run it from the browser console on any page served over http:
 *   const t = await import('./js/ai-sim.test.js'); t.runAiSimTests();
 * or from Settings → Developer → "Run self-test".
 */
import * as ai from './ai-sim.js';
import { SAMPLE_JOBS, SAMPLE_CV_TEXT, DEMO_SKILLS } from './data.js';

/**
 * @param {{log?:boolean}} [options]
 * @returns {{passed:number, failed:number, total:number, results:{name:string, pass:boolean, detail:string}[]}}
 */
export function runAiSimTests({ log = true } = {}) {
  const results = [];
  const test = (name, fn) => {
    try {
      const r = fn();
      results.push({ name, pass: r === true, detail: r === true ? '' : String(r) });
    } catch (e) {
      results.push({ name, pass: false, detail: e.message });
    }
  };
  const same = (fn) => JSON.stringify(fn()) === JSON.stringify(fn()) || 'two runs produced different output';
  const eq = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected) || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
  const names = (list) => list.map((s) => s.name).sort();

  const skills = DEMO_SKILLS.map((s) => ({ ...s, category: ai.categoryOf(s.name) }));
  const job = ai.analyzeJob(SAMPLE_JOBS[0]);

  test('extractSkills: C++, C#, Node.js, CI/CD', () => eq(names(ai.extractSkills('Worked with C++, C#, Node.js and CI/CD.')), ['C#', 'C++', 'CI/CD', 'Node.js']));
  test('extractSkills: longest match wins', () => eq(names(ai.extractSkills('React Native and Tailwind CSS')), ['React Native', 'Tailwind CSS']));
  test('extractSkills: no false positives', () => eq(names(ai.extractSkills('A JavaScript developer who can excel at teamwork.')), ['JavaScript', 'Teamwork']));
  test('extractSkills: deterministic', () => same(() => ai.extractSkills(SAMPLE_CV_TEXT)));

  test('analyzeCV: file only → sample CV profile', () => {
    const r = ai.analyzeCV({ fileMeta: { name: 'cv.pdf', size: 1024 } });
    return (r.usedSample && r.source === 'file' && r.skills.length >= 10) || 'sample CV not used';
  });
  test('analyzeCV: deterministic', () => same(() => ai.analyzeCV({ text: SAMPLE_CV_TEXT, targetRole: 'Machine Learning Engineer' })));

  test('analyzeJob: required vs preferred', () => {
    const req = job.requiredSkills.map((s) => s.name);
    const pref = job.preferredSkills.map((s) => s.name);
    const ok = ['Python', 'Docker', 'SQL'].every((n) => req.includes(n)) && ['Kubernetes', 'MLflow', 'AWS'].every((n) => pref.includes(n));
    return ok || `required=${req.join(',')} preferred=${pref.join(',')}`;
  });
  test('analyzeJob: experience years', () => eq(job.experience?.min, 2));
  test('analyzeJob: deterministic', () => same(() => ai.analyzeJob(SAMPLE_JOBS[1])));

  test('skillStatus thresholds (70 / 30)', () => eq([70, 69, 30, 29, null].map(ai.skillStatus), ['strong', 'partial', 'partial', 'missing', 'missing']));
  test('computeSkillGap: 0.7 × required + 0.3 × preferred', () => {
    const g = ai.computeSkillGap(
      [{ name: 'Python', level: 80 }, { name: 'SQL', level: 50 }, { name: 'Git', level: 75 }],
      { requiredSkills: ['Python', 'SQL', 'Docker'], preferredSkills: ['AWS', 'Git'] },
    );
    return eq([g.compatibility, g.counts], [50, { strong: 2, partial: 1, missing: 2 }]);
  });
  test('computeSkillGap: required only', () => eq(ai.computeSkillGap([{ name: 'Python', level: 90 }], { requiredSkills: ['Python'] }).compatibility, 100));
  test('computeSkillGap: deterministic', () => same(() => ai.computeSkillGap(skills, job)));

  test('buildRoadmap: covers weeks 1–12', () => {
    const r = ai.buildRoadmap(ai.computeSkillGap(skills, job).items, 12);
    return eq([...new Set(r.map((i) => i.week))], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  test('buildRoadmap: nothing to learn → empty', () => eq(ai.buildRoadmap([{ skill: 'Python', status: 'strong', type: 'required' }]), []));
  test('buildRoadmap: deterministic', () => same(() => ai.buildRoadmap(ai.computeSkillGap(skills, job).items, 12)));

  test('recommendProjects: deterministic', () => same(() => ai.recommendProjects('Machine Learning Engineer', ai.computeSkillGap(skills, job).items)));
  test('recommendProjects: filters apply', () => {
    const r = ai.recommendProjects('', [], { category: 'Web', difficulty: 'Beginner' });
    return (r.length > 0 && r.every((p) => p.category === 'Web' && p.difficulty === 'Beginner')) || 'filter mismatch';
  });

  test('assistantReply: intents', () => eq(
    ['What skills am I missing?', 'Show my roadmap progress', 'How can I improve my CV?', 'Give me interview tips', 'How are my applications going?', 'Suggest a portfolio project']
      .map((m) => ai.assistantReply(m, {}).intent),
    ['skills', 'roadmap', 'cv', 'interview', 'applications', 'projects'],
  ));
  test('assistantReply: deterministic', () => same(() => ai.assistantReply('Give me interview tips', { skills, profile: { targetRole: 'Data Analyst' } })));

  const passed = results.filter((r) => r.pass).length;
  const summary = { passed, failed: results.length - passed, total: results.length, results };
  if (log) {
    console.table(results);
    console.log(`[ai-sim] ${passed}/${results.length} tests passed`);
  }
  return summary;
}
