import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { ColorSchemeProvider } from '@/contexts/ColorSchemeContext';
import { DatabaseProvider } from '@/contexts/DatabaseContext';
import { MutationProvider } from '@/contexts/MutationContext';
import { PkgProvider } from '@/contexts/PkgContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <ColorSchemeProvider>
        <ThemeProviderWrapper>
          <MutationProvider>
            <PkgProvider>
              <SafeAreaProvider>
                <Stack>
                  <Stack.Screen
                    name='(tabs)'
                    options={{ headerShown: false }}
                  />
                </Stack>
                <StatusBar style='auto' />
              </SafeAreaProvider>
            </PkgProvider>
          </MutationProvider>
        </ThemeProviderWrapper>
      </ColorSchemeProvider>
    </DatabaseProvider>
  );
}

function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  );
}
