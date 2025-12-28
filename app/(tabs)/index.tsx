import { ActionButtons } from '@/components/home-screen/action-buttons';
import { ActionLog } from '@/components/home-screen/action-log';
import { NetworkStatusBanner } from '@/components/home-screen/network-status-banner';
import { QueueStatusCard } from '@/components/home-screen/queue-status-card';
import { ThemedView } from '@/components/themed-view';
import { useSync } from '@/contexts/SyncContext';
import type { Action } from '@/database/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createLargeActionWithImage,
  createSmallAction,
  getAllActions,
} from '@/services/actionService';
import * as ImagePicker from 'expo-image-picker';
import { useNetworkState } from 'expo-network';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      const actions = await getAllActions();
      // Sort by created_at descending (newest first)
      const sorted = actions.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
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

  const handleSmallRequest = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const createdAction = await createSmallAction();
      setActionsList((prev) => [createdAction, ...prev]);
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
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await createLargeActionWithImage(result.assets[0].uri);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <NetworkStatusBanner
          isOnline={!!isInternetReachable}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime ?? null}
          colorScheme={colorScheme ?? 'light'}
        />

        <QueueStatusCard
          pendingMutations={pendingMutations}
          pendingImages={pendingImages}
          colorScheme={colorScheme ?? 'light'}
        />

        <ActionButtons
          onSmallRequest={handleSmallRequest}
          onLargeRequest={handleLargeRequest}
          isProcessing={isProcessing}
        />

        <ActionLog actions={actionsList} colorScheme={colorScheme ?? 'light'} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
});
