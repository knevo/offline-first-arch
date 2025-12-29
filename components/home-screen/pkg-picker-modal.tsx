import { Colors } from '@/constants/theme';
import type { Pkg } from '@/database/schema';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface PkgPickerModalProps {
  visible: boolean;
  pkgs: Pkg[];
  onSelectPkg: (pkg: Pkg) => void;
  onCancel: () => void;
  colorScheme: 'light' | 'dark';
}

function formatTimestamp(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString();
}

export function PkgPickerModal({
  visible,
  pkgs,
  onSelectPkg,
  onCancel,
  colorScheme,
}: PkgPickerModalProps) {
  const [isVisible, setIsVisible] = useState(visible);
  const [selectedPkg, setSelectedPkg] = useState<Pkg | null>(null);

  useEffect(() => {
    setIsVisible(visible);
    if (!visible) {
      setSelectedPkg(null);
    }
  }, [visible]);

  const handleSelectPkg = (pkg: Pkg) => {
    setSelectedPkg(pkg);
    setIsVisible(false);
    if (Platform.OS === 'android') {
      onSelectPkg(pkg);
      setSelectedPkg(null);
    }
  };

  // onDismiss is called when the modal is dismissed
  // we need to use this becuase on ios there is a bug that a new modal cannot be opened if the previous modal is not dismissed
  const onDismiss = () => {
    if (Platform.OS === 'android') {
      return;
    }
    console.log('onDismiss', selectedPkg);
    if (selectedPkg) {
      onSelectPkg(selectedPkg);
    } else {
      onCancel();
    }
    setSelectedPkg(null);
  };
  const colors = Colors[colorScheme];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType='slide'
      onRequestClose={onCancel}
      onDismiss={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#FFFFFF' },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Select Package
          </Text>

          <ScrollView style={styles.scrollView}>
            {pkgs.map((pkg) => (
              <Pressable
                key={pkg.id}
                style={[
                  styles.pkgItem,
                  {
                    backgroundColor:
                      colorScheme === 'dark' ? '#2C2C2C' : '#F5F5F5',
                  },
                ]}
                onPress={() => handleSelectPkg(pkg)}
              >
                <View style={styles.pkgInfo}>
                  <Text style={[styles.pkgId, { color: colors.text }]}>
                    Package #{pkg.id.slice(-8)}
                  </Text>
                  <Text style={[styles.pkgTime, { color: colors.text }]}>
                    {formatTimestamp(pkg.createdAt)}
                  </Text>
                </View>
                {pkg.imageUrl && (
                  <Image
                    source={{ uri: pkg.imageUrl }}
                    style={styles.thumbnail}
                    resizeMode='cover'
                  />
                )}
              </Pressable>
            ))}
            {pkgs.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No packages available. Create one first!
              </Text>
            )}
          </ScrollView>

          <Pressable
            style={[
              styles.cancelButton,
              {
                backgroundColor: colorScheme === 'dark' ? '#444' : '#E0E0E0',
              },
            ]}
            onPress={onCancel}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  scrollView: {
    maxHeight: 400,
  },
  pkgItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pkgInfo: {
    flex: 1,
  },
  pkgId: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pkgTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 12,
  },
  emptyText: {
    textAlign: 'center',
    padding: 32,
    opacity: 0.5,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
