import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { syncMetadata } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { useDatabase } from './DatabaseContext';

export type ColorSchemePreference = 'dark' | 'light' | 'system';

interface ColorSchemeContextValue {
  colorScheme: 'light' | 'dark';
  preference: ColorSchemePreference;
  setPreference: (preference: ColorSchemePreference) => Promise<void>;
  isLoading: boolean;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | undefined>(
  undefined,
);

interface ColorSchemeProviderProps {
  children: ReactNode;
}

const COLOR_SCHEME_KEY = 'color_scheme_preference';
const DEFAULT_PREFERENCE: ColorSchemePreference = 'dark';

export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const database = useDatabase();
  const systemColorScheme = useRNColorScheme();
  const [preference, setPreferenceState] =
    useState<ColorSchemePreference>(DEFAULT_PREFERENCE);
  const [isLoading, setIsLoading] = useState(true);

  // Load preference from database
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const records = await database
          .select()
          .from(syncMetadata)
          .where(eq(syncMetadata.key, COLOR_SCHEME_KEY))
          .limit(1);

        if (records.length > 0) {
          const value = records[0].value as ColorSchemePreference;
          if (value === 'dark' || value === 'light' || value === 'system') {
            setPreferenceState(value);
          } else {
            setPreferenceState(DEFAULT_PREFERENCE);
          }
        } else {
          // No preference stored, use default (dark)
          setPreferenceState(DEFAULT_PREFERENCE);
        }
      } catch (error) {
        console.error('Error loading color scheme preference:', error);
        setPreferenceState(DEFAULT_PREFERENCE);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, [database]);

  // Save preference to database
  const setPreference = useCallback(
    async (newPreference: ColorSchemePreference) => {
      try {
        const existingRecords = await database
          .select()
          .from(syncMetadata)
          .where(eq(syncMetadata.key, COLOR_SCHEME_KEY))
          .limit(1);

        if (existingRecords.length > 0) {
          await database
            .update(syncMetadata)
            .set({
              value: newPreference,
              updatedAt: new Date(),
            })
            .where(eq(syncMetadata.key, COLOR_SCHEME_KEY));
        } else {
          await database.insert(syncMetadata).values({
            key: COLOR_SCHEME_KEY,
            value: newPreference,
            updatedAt: new Date(),
          });
        }

        setPreferenceState(newPreference);
      } catch (error) {
        console.error('Error saving color scheme preference:', error);
        throw error;
      }
    },
    [database],
  );

  // Determine actual color scheme based on preference
  const colorScheme: 'light' | 'dark' =
    preference === 'system'
      ? systemColorScheme ?? 'dark'
      : preference === 'dark'
      ? 'dark'
      : 'light';

  return (
    <ColorSchemeContext.Provider
      value={{ colorScheme, preference, setPreference, isLoading }}
    >
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorSchemeContext(): ColorSchemeContextValue {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error(
      'useColorSchemeContext must be used within a ColorSchemeProvider',
    );
  }
  return context;
}
