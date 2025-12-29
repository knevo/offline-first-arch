import { ActionButtons } from '@/components/home-screen/action-buttons';
import { MutationLogList } from '@/components/home-screen/mutation-log-list';
import { NetworkStatusBanner } from '@/components/home-screen/network-status-banner';
import { PkgPickerModal } from '@/components/home-screen/pkg-picker-modal';
import { QueueStatusCard } from '@/components/home-screen/queue-status-card';
import { ThemedView } from '@/components/themed-view';
import { useMutationContext } from '@/contexts/MutationContext';
import { usePkgContext } from '@/contexts/PkgContext';
import { StatusEnum, type Pkg } from '@/database/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import { useNetworkState } from 'expo-network';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { isInternetReachable } = useNetworkState();
  const { isSyncing, lastSyncTime, allMutations } = useMutationContext();
  const { pkgs, createPkg, updatePkg } = usePkgContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPkgPicker, setShowPkgPicker] = useState(false);

  const handleSmallRequest = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await createPkg();
    } catch (error) {
      console.error('Error creating package:', error);
      Alert.alert('Error', 'Failed to create package');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLargeRequest = async () => {
    if (isProcessing) return;
    setShowPkgPicker(true);
  };

  const handlePkgSelected = async (pkg: Pkg) => {
    setShowPkgPicker(false);

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
        await updatePkg(pkg.id, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error adding image to package:', error);
      Alert.alert('Error', 'Failed to add image to package');
    } finally {
      setIsProcessing(false);
    }
  };
  const pendingMutations = useMemo(
    () =>
      allMutations.filter((mutation) => mutation.status === StatusEnum.Pending),
    [allMutations],
  );
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
          colorScheme={colorScheme ?? 'light'}
        />

        <ActionButtons
          onSmallRequest={handleSmallRequest}
          onLargeRequest={handleLargeRequest}
          isProcessing={isProcessing}
        />

        <MutationLogList
          mutations={allMutations}
          colorScheme={colorScheme ?? 'light'}
        />

        <PkgPickerModal
          visible={showPkgPicker}
          pkgs={pkgs}
          onSelectPkg={handlePkgSelected}
          onCancel={() => setShowPkgPicker(false)}
          colorScheme={colorScheme ?? 'light'}
        />
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
