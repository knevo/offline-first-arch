import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import {
  useColorSchemeContext,
  type ColorSchemePreference,
} from '@/contexts/ColorSchemeContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useMutationContext } from '@/contexts/MutationContext';
import { usePkgContext } from '@/contexts/PkgContext';
import { mutations, pkgs, syncMetadata } from '@/database/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { eq } from 'drizzle-orm';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const database = useDatabase();
  const { preference, setPreference } = useColorSchemeContext();
  const [isClearing, setIsClearing] = useState(false);
  const { refreshMutations } = useMutationContext();
  const { refreshPackages } = usePkgContext();
  const [imageMaxRetries, setImageMaxRetries] = useState<string>('3');
  const [imageInfiniteRetries, setImageInfiniteRetries] = useState(true);
  const [jsonMaxRetries, setJsonMaxRetries] = useState<string>('3');
  const [jsonInfiniteRetries, setJsonInfiniteRetries] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingColorScheme, setIsSavingColorScheme] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load image upload retry settings
      const imageRetriesRecord = await database
        .select()
        .from(syncMetadata)
        .where(eq(syncMetadata.key, 'image_upload_max_retries'))
        .limit(1);

      if (imageRetriesRecord.length > 0) {
        const value = imageRetriesRecord[0].value;
        if (value === 'infinite') {
          setImageInfiniteRetries(true);
          setImageMaxRetries('3');
        } else {
          setImageInfiniteRetries(false);
          setImageMaxRetries(value);
        }
      }

      // Load JSON upload retry settings
      const jsonRetriesRecord = await database
        .select()
        .from(syncMetadata)
        .where(eq(syncMetadata.key, 'json_upload_max_retries'))
        .limit(1);

      if (jsonRetriesRecord.length > 0) {
        const value = jsonRetriesRecord[0].value;
        if (value === 'infinite') {
          setJsonInfiniteRetries(true);
          setJsonMaxRetries('3');
        } else {
          setJsonInfiniteRetries(false);
          setJsonMaxRetries(value);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [database]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      // Save image upload retry settings
      const imageValue = imageInfiniteRetries ? 'infinite' : imageMaxRetries;
      const imageRetriesRecord = await database
        .select()
        .from(syncMetadata)
        .where(eq(syncMetadata.key, 'image_upload_max_retries'))
        .limit(1);

      if (imageRetriesRecord.length > 0) {
        await database
          .update(syncMetadata)
          .set({
            value: imageValue,
            updatedAt: new Date(),
          })
          .where(eq(syncMetadata.key, 'image_upload_max_retries'));
      } else {
        await database.insert(syncMetadata).values({
          key: 'image_upload_max_retries',
          value: imageValue,
          updatedAt: new Date(),
        });
      }

      // Save JSON upload retry settings
      const jsonValue = jsonInfiniteRetries ? 'infinite' : jsonMaxRetries;
      const jsonRetriesRecord = await database
        .select()
        .from(syncMetadata)
        .where(eq(syncMetadata.key, 'json_upload_max_retries'))
        .limit(1);

      if (jsonRetriesRecord.length > 0) {
        await database
          .update(syncMetadata)
          .set({
            value: jsonValue,
            updatedAt: new Date(),
          })
          .where(eq(syncMetadata.key, 'json_upload_max_retries'));
      } else {
        await database.insert(syncMetadata).values({
          key: 'json_upload_max_retries',
          value: jsonValue,
          updatedAt: new Date(),
        });
      }

      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
              await database.delete(pkgs);
              await database.delete(mutations);
              await database.delete(syncMetadata);
              await refreshMutations();
              await refreshPackages();
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

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='large' color={colors.tint} />
            </View>
          ) : (
            <>
              {/* Color Scheme Settings */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Appearance
                </Text>
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Color Scheme
                  </Text>
                  <View style={styles.colorSchemeOptions}>
                    {(
                      ['dark', 'light', 'system'] as ColorSchemePreference[]
                    ).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.colorSchemeOption,
                          {
                            backgroundColor:
                              preference === option
                                ? colors.tint
                                : 'transparent',
                            borderColor:
                              preference === option ? colors.tint : colors.icon,
                          },
                        ]}
                        onPress={async () => {
                          if (preference !== option) {
                            setIsSavingColorScheme(true);
                            try {
                              await setPreference(option);
                            } catch (error) {
                              console.error(
                                'Error saving color scheme:',
                                error,
                              );
                              Alert.alert(
                                'Error',
                                'Failed to save color scheme preference.',
                              );
                            } finally {
                              setIsSavingColorScheme(false);
                            }
                          }
                        }}
                        disabled={isSavingColorScheme}
                      >
                        <Text
                          style={[
                            styles.colorSchemeOptionText,
                            {
                              color:
                                preference === option
                                  ? colors.background
                                  : colors.text,
                            },
                          ]}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Image Upload Retry Settings */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Image Upload Retries
                </Text>
                <View style={styles.settingRow}>
                  <View style={styles.switchContainer}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Infinite Retries
                    </Text>
                    <Switch
                      value={imageInfiniteRetries}
                      onValueChange={setImageInfiniteRetries}
                      trackColor={{
                        false: colors.icon,
                        true: colors.tint,
                      }}
                    />
                  </View>
                </View>
                {!imageInfiniteRetries && (
                  <View style={styles.inputContainer}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Max Retries
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.icon,
                          color: colors.text,
                        },
                      ]}
                      value={imageMaxRetries}
                      onChangeText={setImageMaxRetries}
                      keyboardType='numeric'
                      placeholder='3'
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                )}
              </View>

              {/* JSON Upload Retry Settings */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  JSON Upload Retries
                </Text>
                <View style={styles.settingRow}>
                  <View style={styles.switchContainer}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Infinite Retries
                    </Text>
                    <Switch
                      value={jsonInfiniteRetries}
                      onValueChange={setJsonInfiniteRetries}
                      trackColor={{
                        false: colors.icon,
                        true: colors.tint,
                      }}
                    />
                  </View>
                </View>
                {!jsonInfiniteRetries && (
                  <View style={styles.inputContainer}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Max Retries
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.icon,
                          color: colors.text,
                        },
                      ]}
                      value={jsonMaxRetries}
                      onChangeText={setJsonMaxRetries}
                      keyboardType='numeric'
                      placeholder='3'
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                )}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: colors.tint },
                  isSaving && styles.buttonDisabled,
                ]}
                onPress={saveSettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color='#fff' />
                ) : (
                  <Text style={styles.buttonText}>Save Settings</Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Clear Database Button */}
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
                This will permanently delete all packages, mutations, image
                uploads, and sync metadata.
              </Text>
            </>
          )}
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
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  inputContainer: {
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  saveButton: {
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  colorSchemeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  colorSchemeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSchemeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
