import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repositoryRoot, 'artifacts/data/healthQAdata.json');
const outputPath = resolve(repositoryRoot, 'apps/hashie/data/learning-library.json');
const reportPath = resolve(repositoryRoot, 'artifacts/data/healthQAdata.import-report.json');
const requiredFields = ['TOPIC', 'SUBTOPIC', 'questions_text', 'Answers'];

function contentHash(value) { return createHash('sha256').update(value).digest('hex'); }

function classifyRecord(value, index) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Row ${index + 1} must be an object.`);
  const record = value;
  const values = requiredFields.map((field) => record[field]);
  if (values.every((value) => typeof value === 'string' && value.trim().length === 0)) return { kind: 'blank' };
  if (Object.keys(record).length !== requiredFields.length || requiredFields.some((field) => typeof record[field] !== 'string' || record[field].trim().length === 0)) return { kind: 'incomplete', row: index + 1 };
  return { kind: 'valid', content: { topic: record.TOPIC, subtopic: record.SUBTOPIC, question: record.questions_text, answer: record.Answers } };
}

export async function generateLearningLibrary() {
  const source = await readFile(sourcePath, 'utf8');
  const rows = JSON.parse(source);
  if (!Array.isArray(rows)) throw new Error('healthQAdata.json must contain an array.');
  const topicMap = new Map();
  const entries = [];
  let blankRows = 0;
  const incompleteRows = [];
  for (const [index, row] of rows.entries()) {
    const classified = classifyRecord(row, index);
    if (classified.kind === 'blank') { blankRows += 1; continue; }
    if (classified.kind === 'incomplete') { incompleteRows.push(classified.row); continue; }
    const { content } = classified;
    const id = contentHash(`${content.topic}\u0000${content.subtopic}\u0000${content.question}\u0000${content.answer}`);
    if (entries.some((entry) => entry.id === id)) throw new Error(`Duplicate health QA content at row ${index + 1}.`);
    const topicId = contentHash(content.topic).slice(0, 16);
    const subtopicId = contentHash(`${content.topic}\u0000${content.subtopic}`).slice(0, 16);
    if (!topicMap.has(content.topic)) topicMap.set(content.topic, new Map());
    const subtopics = topicMap.get(content.topic);
    if (!subtopics.has(content.subtopic)) subtopics.set(content.subtopic, { id: subtopicId, title: content.subtopic, count: 0 });
    subtopics.get(content.subtopic).count += 1;
    entries.push({ id, topicId, subtopicId, ...content });
  }
  const topics = [...topicMap].map(([title, subtopics]) => ({ id: contentHash(title).slice(0, 16), title, count: [...subtopics.values()].reduce((total, subtopic) => total + subtopic.count, 0), subtopics: [...subtopics.values()] }));
  const library = { version: 1, sourceSha256: contentHash(source), counts: { sourceRows: rows.length, usableEntries: entries.length, skippedBlankRows: blankRows, skippedIncompleteRows: incompleteRows.length }, topics, entries };
  const report = { source: 'artifacts/data/healthQAdata.json', sourceSha256: library.sourceSha256, sourceRows: rows.length, usableEntries: entries.length, skippedBlankRows: blankRows, skippedIncompleteRows: incompleteRows, note: 'Blank or incomplete source rows are preserved in the canonical file and excluded only because they contain no complete question-and-answer content to display or embed.' };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(library)}\n`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { outputPath, reportPath, ...report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) generateLearningLibrary().then((result) => console.log(`Generated ${result.usableEntries} usable learning entries; skipped ${result.skippedBlankRows} blank and ${result.skippedIncompleteRows.length} incomplete source rows.`)).catch((error) => { console.error(error instanceof Error ? error.message : 'Unable to generate learning library.'); process.exitCode = 1; });
