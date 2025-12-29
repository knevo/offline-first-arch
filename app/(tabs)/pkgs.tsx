import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { usePkgContext } from '@/contexts/PkgContext';
import { type Pkg } from '@/database/schema';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatTimestamp(date);
}

interface PackageItemProps {
  pkg: Pkg;
  colorScheme: 'light' | 'dark';
}

function PackageItem({ pkg, colorScheme }: PackageItemProps) {
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.packageItem,
        {
          backgroundColor: colorScheme === 'dark' ? '#2C2C2C' : '#FFFFFF',
          borderColor: colorScheme === 'dark' ? '#3C3C3C' : '#E0E0E0',
        },
      ]}
    >
      {pkg.imageUrl ? (
        <Image
          source={{ uri: pkg.imageUrl }}
          style={styles.packageImage}
          resizeMode='cover'
        />
      ) : (
        <View
          style={[
            styles.placeholderImage,
            {
              backgroundColor: colorScheme === 'dark' ? '#3C3C3C' : '#F0F0F0',
            },
          ]}
        >
          <Text
            style={[
              styles.placeholderText,
              { color: colorScheme === 'dark' ? '#9BA1A6' : '#687076' },
            ]}
          >
            No Image
          </Text>
        </View>
      )}

      <View style={styles.packageInfo}>
        <Text style={[styles.packageId, { color: colors.text }]}>
          Package #{pkg.id.slice(-8)}
        </Text>
        <Text style={[styles.packageTime, { color: colors.icon }]}>
          {formatRelativeTime(pkg.createdAt)}
        </Text>
        <Text style={[styles.packageTimeFull, { color: colors.icon }]}>
          {formatTimestamp(pkg.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function PackagesScreen() {
  const colorScheme = useColorScheme();
  const { pkgs, refreshPackages, isLoading } = usePkgContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshPackages();
    setIsRefreshing(false);
  }, [refreshPackages]);

  const colors = Colors[colorScheme ?? 'light'];

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading packages...
          </Text>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ThemedView style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Packages</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          {pkgs.length} {pkgs.length === 1 ? 'package' : 'packages'}
        </Text>

        {pkgs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No packages yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.icon }]}>
              Create a package from the Home tab to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={pkgs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PackageItem pkg={item} colorScheme={colorScheme ?? 'light'} />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 16,
  },
  packageItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  packageImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  packageInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  packageId: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  packageTime: {
    fontSize: 14,
    marginBottom: 2,
  },
  packageTimeFull: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
