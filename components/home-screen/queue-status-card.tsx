import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface QueueStatusCardProps {
  pendingMutations: number;
  pendingImages: number;
  colorScheme: 'light' | 'dark';
}

export function QueueStatusCard({
  pendingMutations,
  pendingImages,
  colorScheme,
}: QueueStatusCardProps) {
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F5F5F5',
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Queue Status</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>
          Pending Mutations:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {pendingMutations}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>
          Pending Images:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {pendingImages}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    opacity: 0.7,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});
