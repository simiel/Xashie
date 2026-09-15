import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: 'Hashie' }} />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>PRIVATE HEALTH EDUCATION</Text>
        <Text style={styles.title} selectable>
          Welcome to Hashie
        </Text>
        <Text style={styles.description} selectable>
          Clear, respectful support for sexual and reproductive health questions,
          created with Ghanaian teens and young adults in mind.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle} selectable>
          A safe place to start
        </Text>
        <Text style={styles.cardBody} selectable>
          Hashie is an educational prototype, not a doctor or emergency service.
          For urgent concerns, contact local emergency services or a qualified
          health professional.
        </Text>
      </View>

      <Text style={styles.footer} selectable>
        English and Akan/Twi support are part of Hashie’s vision.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 24 },
  hero: { gap: 12, paddingTop: 24 },
  eyebrow: { color: '#6B4EFF', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: {
    color: '#17202A',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  description: { color: '#44505C', fontSize: 18, lineHeight: 27 },
  card: {
    backgroundColor: '#F1EEFF',
    borderCurve: 'continuous',
    borderRadius: 20,
    gap: 10,
    padding: 20,
  },
  cardTitle: { color: '#241A55', fontSize: 20, fontWeight: '700' },
  cardBody: { color: '#3E3563', fontSize: 16, lineHeight: 24 },
  footer: { color: '#68737D', fontSize: 14, lineHeight: 21, paddingBottom: 24 },
});
