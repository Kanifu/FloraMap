import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>😕</Text>
          <Text style={styles.title}>Er ging iets fout</Text>
          <Text style={styles.message}>{this.state.error?.message ?? 'Onbekende fout'}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => this.setState({ hasError: false })}
            accessibilityLabel="Opnieuw proberen" accessibilityRole="button">
            <Text style={styles.btnText}>Opnieuw proberen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8f9fa' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1b4332', marginBottom: 8 },
  message: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn: { backgroundColor: '#2d6a4f', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
