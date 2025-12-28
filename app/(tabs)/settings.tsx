import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useDatabase } from '@/contexts/DatabaseContext';
import {
  actions,
  imageUploads,
  mutations,
  syncMetadata,
} from '@/database/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const database = useDatabase();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearDatabase = async () => {
    Alert.alert(
      'Clear Database',
      'Are you sure you want to clear all data? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              // Clear all tables
              await database.delete(actions);
              await database.delete(mutations);
              await database.delete(imageUploads);
              await database.delete(syncMetadata);

              Alert.alert('Success', 'Database cleared successfully');
            } catch (error) {
              console.error('Error clearing database:', error);
              Alert.alert(
                'Error',
                'Failed to clear database. Please try again.',
              );
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  };

  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ThemedView style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

          <TouchableOpacity
            style={[
              styles.button,
              styles.dangerButton,
              { borderColor: '#ff3b30' },
            ]}
            onPress={handleClearDatabase}
            disabled={isClearing}
          >
            {isClearing ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.buttonText}>Clear Database</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.description, { color: colors.icon }]}>
            This will permanently delete all actions, mutations, image uploads,
            and sync metadata.
          </Text>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 50,
  },
  dangerButton: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
});
