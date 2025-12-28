import { ThemedView } from '@/components/themed-view';
import { useSync } from '@/contexts/SyncContext';
import type { Action } from '@/database/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { actionService } from '@/services/ActionService';
import * as ImagePicker from 'expo-image-picker';
import { useNetworkState } from 'expo-network';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { isInternetReachable } = useNetworkState();
  const { isSyncing, lastSyncTime, pendingMutations, pendingImages } =
    useSync();
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionsList, setActionsList] = useState<Action[]>([]);

  // Load actions from database
  const loadActions = useCallback(async () => {
    try {
      const actions = await actionService.getAllActions();
      // Sort by created_at descending (newest first)
      const sorted = actions.sort((a, b) => {
        const dateA =
          a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB =
          b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      setActionsList(sorted);
    } catch (error) {
      console.error('Error loading actions:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Refresh actions list periodically (simulating reactivity)
  useEffect(() => {
    const interval = setInterval(() => {
      loadActions();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [loadActions]);

  const handleSmallRequest = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await actionService.createSmallAction();
      // Refresh the list immediately
      await loadActions();
    } catch (error) {
      console.error('Error creating small action:', error);
      Alert.alert('Error', 'Failed to create small action');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLargeRequest = async () => {
    if (isProcessing) return;

    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take photos',
      );
      return;
    }

    setIsProcessing(true);
    try {
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await actionService.createLargeActionWithImage(result.assets[0].uri);
        // Refresh the list immediately
        await loadActions();
      }
    } catch (error) {
      console.error('Error creating large action:', error);
      Alert.alert('Error', 'Failed to create large action');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimestamp = (date: Date | number): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString();
  };

  const isSynced = (action: Action): boolean => {
    return !!action.syncedAt;
  };

  const getStatusColor = (action: Action): string => {
    if (isSynced(action)) {
      return colorScheme === 'dark' ? '#4CAF50' : '#2E7D32'; // Green
    }
    return colorScheme === 'dark' ? '#FFA726' : '#F57C00'; // Orange
  };

  const getStatusText = (action: Action): string => {
    return isSynced(action) ? 'Synced' : 'Pending';
  };

  return (
    <ThemedView style={styles.container}>
      {/* Network Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: isInternetReachable
              ? colorScheme === 'dark'
                ? '#1B5E20'
                : '#C8E6C9'
              : colorScheme === 'dark'
              ? '#B71C1C'
              : '#FFCDD2',
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: isInternetReachable ? '#4CAF50' : '#F44336' },
          ]}
        >
          {isInternetReachable ? '🟢 Online' : '🔴 Offline'}
        </Text>
        {isSyncing && (
          <ActivityIndicator
            size='small'
            color='#4CAF50'
            style={styles.syncIndicator}
          />
        )}
        {lastSyncTime && (
          <Text style={styles.lastSyncText}>
            Last sync: {formatTimestamp(lastSyncTime)}
          </Text>
        )}
      </View>

      {/* Queue Status Card */}
      <View
        style={[
          styles.queueCard,
          {
            backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F5F5F5',
          },
        ]}
      >
        <Text style={styles.queueTitle}>Queue Status</Text>
        <View style={styles.queueRow}>
          <Text style={styles.queueLabel}>Pending Mutations:</Text>
          <Text style={styles.queueValue}>{pendingMutations}</Text>
        </View>
        <View style={styles.queueRow}>
          <Text style={styles.queueLabel}>Pending Images:</Text>
          <Text style={styles.queueValue}>{pendingImages}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.smallButton]}
          onPress={handleSmallRequest}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Small Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.largeButton]}
          onPress={handleLargeRequest}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Large Request with Image</Text>
        </TouchableOpacity>
      </View>

      {/* Action Log */}
      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Action Log</Text>
        <ScrollView style={styles.logScrollView}>
          {actionsList.map((action) => (
            <View
              key={action.id}
              style={[
                styles.logItem,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#2C2C2C' : '#FFFFFF',
                  borderLeftColor: getStatusColor(action),
                },
              ]}
            >
              <View style={styles.logItemHeader}>
                <Text style={styles.logItemType}>
                  {action.actionType.toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(action) },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {getStatusText(action)}
                  </Text>
                </View>
              </View>
              <Text style={styles.logItemTime}>
                {formatTimestamp(action.createdAt)}
              </Text>
              {action.syncedAt && (
                <Text style={styles.logItemSynced}>
                  Synced: {formatTimestamp(action.syncedAt)}
                </Text>
              )}
            </View>
          ))}
          {actionsList.length === 0 && (
            <Text style={styles.emptyLog}>
              No actions yet. Create one above!
            </Text>
          )}
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statusBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  syncIndicator: {
    marginLeft: 8,
  },
  lastSyncText: {
    fontSize: 12,
    opacity: 0.7,
  },
  queueCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  queueTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  queueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  queueLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  queueValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButton: {
    backgroundColor: '#2196F3',
  },
  largeButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  logScrollView: {
    flex: 1,
  },
  logItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logItemType: {
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
  logItemTime: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  logItemSynced: {
    fontSize: 12,
    opacity: 0.5,
  },
  emptyLog: {
    textAlign: 'center',
    padding: 32,
    opacity: 0.5,
  },
});
