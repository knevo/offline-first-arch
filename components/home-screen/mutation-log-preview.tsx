import { Colors } from '@/constants/theme';
import type { Mutation, Pkg } from '@/database/schema';
import { StatusEnum } from '@/database/schema';
import { getPkgById } from '@/services/pkgService';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface MutationLogPreviewProps {
  mutation: Mutation;
  colorScheme: 'light' | 'dark';
}

function formatTimestamp(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString();
}

function getStatusColor(status: string, colorScheme: 'light' | 'dark'): string {
  const isCompleted = status === StatusEnum.Completed;
  if (isCompleted) {
    return colorScheme === 'dark' ? '#4CAF50' : '#2E7D32'; // Green
  }
  return colorScheme === 'dark' ? '#FFA726' : '#F57C00'; // Orange
}

function getStatusText(status: string): string {
  return status.toUpperCase()[0] + status.slice(1).toLowerCase();
}

function getMutationTypeLabel(type: string): string {
  switch (type) {
    case 'create_pkg':
      return 'CREATE PACKAGE';
    case 'upload_image':
      return 'UPLOAD IMAGE';
    default:
      return type.toUpperCase();
  }
}

export function MutationLogPreview({
  mutation,
  colorScheme,
}: MutationLogPreviewProps) {
  const colors = Colors[colorScheme];
  const statusColor = getStatusColor(mutation.status, colorScheme);
  const [pkg, setPkg] = useState<Pkg | null>(null);

  useEffect(() => {
    if (mutation.pkgId) {
      getPkgById(mutation.pkgId).then((result) => {
        if (result) setPkg(result);
      });
    }
  }, [mutation.pkgId]);

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
          {getMutationTypeLabel(mutation.type)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBadgeText}>
            {getStatusText(mutation.status)}
          </Text>
        </View>
      </View>

      <Text style={[styles.time, { color: colors.text }]}>
        {formatTimestamp(mutation.createdAt)}
      </Text>

      {mutation.pkgId && pkg && (
        <View style={styles.packageInfo}>
          <Text style={[styles.packageLabel, { color: colors.text }]}>
            Package: #{pkg.id.slice(-8)}
          </Text>
          {pkg.imageUrl && mutation.type === 'upload_image' && (
            <Image
              source={{ uri: pkg.imageUrl }}
              style={styles.thumbnail}
              resizeMode='cover'
            />
          )}
        </View>
      )}

      {mutation.retryCount > 0 && (
        <Text style={[styles.retryCount, { color: colors.text }]}>
          Retry count: {mutation.retryCount}
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
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  packageInfo: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  retryCount: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 4,
  },
});
