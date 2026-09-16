export type LearningEntry = { id: string; topicId: string; subtopicId: string; topic: string; subtopic: string; question: string; answer: string };
export type LearningSubtopic = { id: string; title: string; count: number };
export type LearningTopic = { id: string; title: string; count: number; subtopics: LearningSubtopic[] };
export type LearningLibrary = { version: number; sourceSha256: string; counts: { sourceRows: number; usableEntries: number; skippedBlankRows: number; skippedIncompleteRows: number }; topics: LearningTopic[]; entries: LearningEntry[] };
