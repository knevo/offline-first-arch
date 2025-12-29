import { Colors } from '@/constants/theme';
import type { Mutation } from '@/database/schema';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MutationLogPreview } from './mutation-log-preview';

interface MutationLogListProps {
  mutations: Mutation[];
  colorScheme: 'light' | 'dark';
}

export function MutationLogList({
  mutations,
  colorScheme,
}: MutationLogListProps) {
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Mutation Log</Text>
      <ScrollView style={styles.scrollView}>
        {mutations.map((mutation) => (
          <MutationLogPreview
            key={mutation.id}
            mutation={mutation}
            colorScheme={colorScheme}
          />
        ))}
        {mutations.length === 0 && (
          <Text style={[styles.emptyLog, { color: colors.text }]}>
            No mutations yet. Create a package above!
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  emptyLog: {
    textAlign: 'center',
    padding: 32,
    opacity: 0.5,
  },
});
