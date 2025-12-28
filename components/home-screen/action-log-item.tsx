import { Colors } from '@/constants/theme';
import { StatusEnum, type Action } from '@/database/schema';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ActionLogItemProps {
  action: Action;
  colorScheme: 'light' | 'dark';
}

function formatTimestamp(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString();
}

function getStatusColor(action: Action, colorScheme: 'light' | 'dark'): string {
  const isCompleted = action.status === StatusEnum.Completed;
  if (isCompleted) {
    return colorScheme === 'dark' ? '#4CAF50' : '#2E7D32'; // Green
  }
  return colorScheme === 'dark' ? '#FFA726' : '#F57C00'; // Orange
}

function getStatusText(action: Action): string {
  return action.status.toUpperCase()[0] + action.status.slice(1).toLowerCase();
}

export function ActionLogItem({ action, colorScheme }: ActionLogItemProps) {
  const colors = Colors[colorScheme];
  const statusColor = getStatusColor(action, colorScheme);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#FFFFFF',
          borderLeftColor: statusColor,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.type, { color: colors.text }]}>
          {action.actionType.toUpperCase()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>{getStatusText(action)}</Text>
        </View>
      </View>
      <Text style={[styles.time, { color: colors.text }]}>
        {formatTimestamp(action.createdAt)}
      </Text>
      {action.syncedAt && (
        <Text style={[styles.synced, { color: colors.text }]}>
          Synced: {formatTimestamp(action.syncedAt)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  synced: {
    fontSize: 12,
    opacity: 0.5,
  },
});
