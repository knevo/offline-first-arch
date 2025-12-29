import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface NetworkStatusBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null | undefined;
  colorScheme: 'light' | 'dark';
}

function formatTimestamp(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString();
}

export function NetworkStatusBanner({
  isOnline,
  isSyncing,
  lastSyncTime,
  colorScheme,
}: NetworkStatusBannerProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isOnline
            ? colorScheme === 'dark'
              ? '#4CAF50'
              : '#66BB6A'
            : colorScheme === 'dark'
            ? '#F44336'
            : '#FFCDD2',
        },
      ]}
    >
      <View style={styles.leftSection}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        {isSyncing && (
          <ActivityIndicator
            size='small'
            color='#FFFFFF'
            style={styles.syncIndicator}
          />
        )}
      </View>
      {lastSyncTime && (
        <Text style={styles.lastSyncText}>
          Last sync: {formatTimestamp(lastSyncTime)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  syncIndicator: {
    marginLeft: 4,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});
