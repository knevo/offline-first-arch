import { Colors } from '@/constants/theme';
import type { Action } from '@/database/schema';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionLogItem } from './action-log-item';

interface ActionLogProps {
  actions: Action[];
  colorScheme: 'light' | 'dark';
}

export function ActionLog({ actions, colorScheme }: ActionLogProps) {
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Action Log</Text>
      <ScrollView style={styles.scrollView}>
        {actions.map((action) => (
          <ActionLogItem
            key={action.id}
            action={action}
            colorScheme={colorScheme}
          />
        ))}
        {actions.length === 0 && (
          <Text style={[styles.emptyLog, { color: colors.text }]}>
            No actions yet. Create one above!
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
