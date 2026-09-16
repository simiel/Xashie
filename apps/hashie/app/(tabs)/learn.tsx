import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FeatureNotice, ScreenScroll, SectionHeading } from '@/components/hashie-ui';
import libraryJson from '@/data/learning-library.json';
import type { LearningEntry, LearningLibrary, LearningTopic } from '@/data/learning-library.types';
import { colors, controls, radii, spacing, textStyles } from '@/constants/design-system';

const library = libraryJson as LearningLibrary;
const resultLimit = 80;
type Page = { kind: 'topics' } | { kind: 'subtopics'; topic: LearningTopic } | { kind: 'questions'; topic: LearningTopic; subtopicId: string } | { kind: 'answer'; entry: LearningEntry; fromSearch: boolean };

function formatCount(value: number) { return new Intl.NumberFormat('en').format(value); }
function containsQuery(entry: LearningEntry, query: string) { return `${entry.topic} ${entry.subtopic} ${entry.question} ${entry.answer}`.toLocaleLowerCase().includes(query); }

export default function LearnScreen() {
  const [page, setPage] = useState<Page>({ kind: 'topics' });
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = useMemo(() => normalizedQuery ? library.entries.filter((entry) => containsQuery(entry, normalizedQuery)).slice(0, resultLimit) : [], [normalizedQuery]);
  const pageTitle = page.kind === 'topics' ? 'Learn' : page.kind === 'subtopics' ? page.topic.title : page.kind === 'questions' ? page.topic.subtopics.find((item) => item.id === page.subtopicId)?.title ?? 'Questions' : 'Learning answer';
  const showSearch = page.kind !== 'answer' && normalizedQuery.length > 0;
  const goBack = () => {
    if (page.kind === 'answer') {
      if (page.fromSearch) return setPage({ kind: 'topics' });
      const topic = library.topics.find((item) => item.id === page.entry.topicId);
      if (topic) return setPage({ kind: 'questions', topic, subtopicId: page.entry.subtopicId });
    }
    if (page.kind === 'questions') return setPage({ kind: 'subtopics', topic: page.topic });
    if (page.kind === 'subtopics') return setPage({ kind: 'topics' });
  };
  return <><Stack.Screen options={{ title: pageTitle }} /><ScreenScroll contentContainerStyle={styles.content}>
    {page.kind !== 'topics' ? <BackButton onPress={goBack} /> : null}
    {page.kind !== 'answer' ? <View style={styles.searchGroup}><Text style={textStyles.bodyStrong} selectable>Search the library</Text><TextInput accessibilityHint="Searches questions, answers, topics, and subtopics stored on this device." accessibilityLabel="Search the learning library" autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder="Try “growth spurt”" placeholderTextColor={colors.textMuted} returnKeyType="search" style={styles.searchInput} testID="learn-search" value={query} />{normalizedQuery ? <Text style={textStyles.caption} selectable>{results.length === resultLimit ? `Showing the first ${resultLimit} matches` : `${formatCount(results.length)} matches`}</Text> : null}</View> : null}
    {showSearch ? <SearchResults entries={results} onOpen={(entry) => setPage({ kind: 'answer', entry, fromSearch: true })} /> : null}
    {!showSearch && page.kind === 'topics' ? <Topics onOpen={(topic) => setPage({ kind: 'subtopics', topic })} /> : null}
    {!showSearch && page.kind === 'subtopics' ? <Subtopics topic={page.topic} onOpen={(subtopicId) => setPage({ kind: 'questions', topic: page.topic, subtopicId })} /> : null}
    {!showSearch && page.kind === 'questions' ? <Questions topic={page.topic} subtopicId={page.subtopicId} onOpen={(entry) => setPage({ kind: 'answer', entry, fromSearch: false })} /> : null}
    {page.kind === 'answer' ? <Answer entry={page.entry} /> : null}
  </ScreenScroll></>;
}

function Topics({ onOpen }: { onOpen: (topic: LearningTopic) => void }) { return <><SectionHeading eyebrow="Your offline library" title="Health learning, at your pace" body="Browse clear information by topic. This library stays on your device, even when you are offline." /><FeatureNotice tone="blue"><Text style={textStyles.bodyStrong} selectable>Information, not medical care</Text><Text style={textStyles.body} selectable>Hashie shares education. If something feels urgent or unsafe, contact a trusted adult, qualified health professional, or local emergency support.</Text></FeatureNotice><Text style={textStyles.caption} selectable>{formatCount(library.counts.usableEntries)} questions and answers across {library.topics.length} topics</Text><View style={styles.list}>{library.topics.map((topic) => <LibraryCard key={topic.id} title={topic.title} detail={`${formatCount(topic.count)} questions · ${topic.subtopics.length} sections`} onPress={() => onOpen(topic)} />)}</View></>; }
function Subtopics({ topic, onOpen }: { topic: LearningTopic; onOpen: (id: string) => void }) { return <><SectionHeading eyebrow="Topic" title={topic.title} body="Choose one small section to explore." /><View style={styles.list}>{topic.subtopics.map((subtopic) => <LibraryCard key={subtopic.id} title={subtopic.title} detail={`${formatCount(subtopic.count)} questions`} onPress={() => onOpen(subtopic.id)} />)}</View></>; }
function Questions({ topic, subtopicId, onOpen }: { topic: LearningTopic; subtopicId: string; onOpen: (entry: LearningEntry) => void }) { const subtopic = topic.subtopics.find((item) => item.id === subtopicId); const entries = library.entries.filter((entry) => entry.subtopicId === subtopicId); return <><SectionHeading eyebrow={topic.title} title={subtopic?.title ?? 'Questions'} body="Choose a question to read the full answer." /><View style={styles.list}>{entries.map((entry) => <LibraryCard key={entry.id} title={entry.question} detail="Read answer" onPress={() => onOpen(entry)} />)}</View></>; }
function SearchResults({ entries, onOpen }: { entries: LearningEntry[]; onOpen: (entry: LearningEntry) => void }) { return entries.length === 0 ? <FeatureNotice tone="blue"><Text style={textStyles.bodyStrong} selectable>No matches yet</Text><Text style={textStyles.body} selectable>Try a different word, topic, or phrase.</Text></FeatureNotice> : <View style={styles.list}>{entries.map((entry) => <LibraryCard key={entry.id} title={entry.question} detail={`${entry.topic} · ${entry.subtopic}`} onPress={() => onOpen(entry)} />)}</View>; }
function Answer({ entry }: { entry: LearningEntry }) { return <><Text style={textStyles.utility} selectable>{entry.topic} · {entry.subtopic}</Text><SectionHeading title={entry.question} /><View style={styles.answerCard}><Text style={textStyles.body} selectable>{entry.answer}</Text></View><FeatureNotice tone="blue"><Text style={textStyles.bodyStrong} selectable>Take care of yourself</Text><Text style={textStyles.body} selectable>It is okay to ask a trusted adult or qualified health professional for support with questions about your body or health.</Text></FeatureNotice></>; }
function BackButton({ onPress }: { onPress: () => void }) { return <Pressable accessibilityHint="Returns to the previous learning list" accessibilityLabel="Back" accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Text style={styles.backText} selectable>‹ Back</Text></Pressable>; }
function LibraryCard({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) { return <Pressable accessibilityHint={`Opens ${title}`} accessibilityLabel={`${title}. ${detail}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.libraryCard, pressed && styles.pressed]}><View style={styles.cardCopy}><Text style={textStyles.bodyStrong} selectable>{title}</Text><Text style={textStyles.caption} selectable>{detail}</Text></View><Text accessibilityElementsHidden style={styles.arrow}>›</Text></Pressable>; }

const styles = StyleSheet.create({ content: { gap: spacing.md }, searchGroup: { gap: spacing.xs }, searchInput: { backgroundColor: colors.surface, borderColor: colors.border, borderCurve: 'continuous', borderRadius: radii.sm, borderWidth: 1, color: colors.textPrimary, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 16, minHeight: controls.inputHeight, paddingHorizontal: spacing.md }, list: { gap: spacing.sm }, libraryCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderCurve: 'continuous', borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 76, padding: spacing.md }, cardCopy: { flex: 1, gap: spacing.xxs, minWidth: 0 }, arrow: { color: colors.focus, fontSize: 30, lineHeight: 34 }, answerCard: { backgroundColor: colors.surface, borderColor: colors.border, borderCurve: 'continuous', borderRadius: radii.md, borderWidth: 1, padding: spacing.lg }, backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: controls.minTouchTarget, paddingHorizontal: spacing.xs }, backText: { color: colors.focus, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, textDecorationLine: 'underline' }, pressed: { opacity: 0.72 } });
