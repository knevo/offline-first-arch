import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActionButtonsProps {
  onSmallRequest: () => void;
  onLargeRequest: () => void;
  isProcessing: boolean;
}

export function ActionButtons({
  onSmallRequest,
  onLargeRequest,
  isProcessing,
}: ActionButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.smallButton]}
        onPress={onSmallRequest}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>Small Request</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.largeButton]}
        onPress={onLargeRequest}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>Large Request with Image</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
