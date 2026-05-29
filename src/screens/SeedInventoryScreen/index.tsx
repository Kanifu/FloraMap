import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useGardenStore } from '@/store/gardenStore';
import { SeedPacket } from '@/models';

const newId = () => `seed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const CURRENT_YEAR = new Date().getFullYear();

const SeedInventoryScreen = (): React.JSX.Element => {
  const seedPackets = useGardenStore((s) => s.seedPackets);
  const addSeedPacket = useGardenStore((s) => s.addSeedPacket);
  const removeSeedPacket = useGardenStore((s) => s.removeSeedPacket);
  const updateSeedPacket = useGardenStore((s) => s.updateSeedPacket);

  const [showModal, setShowModal] = useState(false);
  const [modalCommonName, setModalCommonName] = useState('');
  const [modalSpecies, setModalSpecies] = useState('');
  const [modalEmoji, setModalEmoji] = useState('');
  const [modalExpiryYear, setModalExpiryYear] = useState('');
  const [modalAmountGrams, setModalAmountGrams] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  const sortedPackets = useMemo(() => {
    return [...seedPackets].sort((a, b) => {
      // non-usedUp first
      if (!a.isUsedUp && b.isUsedUp) return -1;
      if (a.isUsedUp && !b.isUsedUp) return 1;
      // then by expiry year ascending (undefined goes last)
      const aYear = a.expiryYear ?? 9999;
      const bYear = b.expiryYear ?? 9999;
      return aYear - bYear;
    });
  }, [seedPackets]);

  const resetModal = () => {
    setModalCommonName('');
    setModalSpecies('');
    setModalEmoji('');
    setModalExpiryYear('');
    setModalAmountGrams('');
    setModalNotes('');
  };

  const handleAdd = () => {
    if (!modalCommonName.trim()) return;
    const packet: SeedPacket = {
      id: newId(),
      commonName: modalCommonName.trim(),
      species: modalSpecies.trim() || undefined,
      emoji: modalEmoji.trim() || undefined,
      expiryYear: modalExpiryYear ? parseInt(modalExpiryYear, 10) : undefined,
      amountGrams: modalAmountGrams ? parseFloat(modalAmountGrams) : undefined,
      notes: modalNotes.trim() || undefined,
    };
    addSeedPacket(packet);
    setShowModal(false);
    resetModal();
  };

  const handleDelete = (packet: SeedPacket) => {
    Alert.alert(
      'Zaadpakket verwijderen',
      `"${packet.commonName}" verwijderen uit je zaadkast?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Verwijderen', style: 'destructive', onPress: () => removeSeedPacket(packet.id) },
      ],
    );
  };

  const toggleUsedUp = (packet: SeedPacket) => {
    updateSeedPacket({ ...packet, isUsedUp: !packet.isUsedUp });
  };

  const renderItem = ({ item }: { item: SeedPacket }) => {
    const isExpired = item.expiryYear !== undefined && item.expiryYear < CURRENT_YEAR;
    const isExpiringSoon = item.expiryYear !== undefined && item.expiryYear === CURRENT_YEAR;

    return (
      <TouchableOpacity
        style={[styles.card, item.isUsedUp && styles.cardUsedUp]}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.8}>
        <View style={styles.cardMain}>
          <Text style={styles.cardEmoji}>{item.emoji || '🌱'}</Text>
          <View style={styles.cardInfo}>
            <View style={styles.cardNameRow}>
              <Text style={[styles.cardName, item.isUsedUp && styles.textMuted]}>{item.commonName}</Text>
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>⚠️ Verlopen</Text>
                </View>
              )}
            </View>
            {item.species ? (
              <Text style={[styles.cardSpecies, item.isUsedUp && styles.textMuted]}>{item.species}</Text>
            ) : null}
            <View style={styles.chipsRow}>
              {item.expiryYear !== undefined && (
                <View style={[styles.chip, (isExpired || isExpiringSoon) && styles.chipAmber]}>
                  <Text style={[styles.chipText, (isExpired || isExpiringSoon) && styles.chipTextAmber]}>
                    📅 houdbaar t/m {item.expiryYear}
                  </Text>
                </View>
              )}
              {item.amountGrams !== undefined && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{item.amountGrams}g</Text>
                </View>
              )}
              {item.isUsedUp && (
                <View style={styles.chipUsedUp}>
                  <Text style={styles.chipUsedUpText}>✓ Op</Text>
                </View>
              )}
            </View>
            {item.notes ? (
              <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.usedUpBtn, item.isUsedUp && styles.usedUpBtnActive]}
          onPress={() => toggleUsedUp(item)}>
          <Text style={styles.usedUpBtnText}>{item.isUsedUp ? '↩️' : '✓ Op'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌱 Zaadvoorraad</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>＋ Toevoegen</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedPackets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              🌱 Nog geen zaden — voeg je eerste zaadpakketje toe!
            </Text>
          </View>
        }
      />

      {/* Add modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => { setShowModal(false); resetModal(); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>🌱 Zaadpakket toevoegen</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.input}
                placeholder="Naam (verplicht)…"
                placeholderTextColor="#aaa"
                value={modalCommonName}
                onChangeText={setModalCommonName}
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                placeholder="Soort / wetenschappelijke naam (optioneel)…"
                placeholderTextColor="#aaa"
                value={modalSpecies}
                onChangeText={setModalSpecies}
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                placeholder="Emoji (bijv. 🥕, optioneel)…"
                placeholderTextColor="#aaa"
                value={modalEmoji}
                onChangeText={setModalEmoji}
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                placeholder="Houdbaar tot jaar (bijv. 2027, optioneel)…"
                placeholderTextColor="#aaa"
                value={modalExpiryYear}
                onChangeText={setModalExpiryYear}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                placeholder="Hoeveelheid in gram (optioneel)…"
                placeholderTextColor="#aaa"
                value={modalAmountGrams}
                onChangeText={setModalAmountGrams}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Notities (optioneel)…"
                placeholderTextColor="#aaa"
                value={modalNotes}
                onChangeText={setModalNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowModal(false); resetModal(); }}>
                <Text style={styles.cancelBtnText}>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !modalCommonName.trim() && styles.saveBtnDisabled]}
                onPress={handleAdd}
                disabled={!modalCommonName.trim()}>
                <Text style={styles.saveBtnText}>Opslaan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  addBtn: {
    backgroundColor: '#2d6a4f', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: 12, gap: 8, paddingBottom: 32 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: '#aaa', textAlign: 'center', lineHeight: 24 },
  card: {
    backgroundColor: '#f8f9fa', borderRadius: 14, borderWidth: 1, borderColor: '#e9ecef',
    padding: 14, gap: 10,
  },
  cardUsedUp: { opacity: 0.6 },
  cardMain: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardEmoji: { fontSize: 32, marginTop: 2 },
  cardInfo: { flex: 1, gap: 4 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1b4332' },
  cardSpecies: { fontSize: 12, color: '#6b705c', fontStyle: 'italic' },
  textMuted: { color: '#aaa' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: {
    backgroundColor: '#e9ecef', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  chipAmber: { backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#f4a261' },
  chipText: { fontSize: 11, color: '#6b705c', fontWeight: '600' },
  chipTextAmber: { color: '#7c3d00' },
  chipUsedUp: {
    backgroundColor: '#d8f3dc', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  chipUsedUpText: { fontSize: 11, color: '#2d6a4f', fontWeight: '700' },
  expiredBadge: {
    backgroundColor: '#fff5f5', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, borderColor: '#f4bfc0',
  },
  expiredBadgeText: { fontSize: 11, color: '#e63946', fontWeight: '700' },
  cardNotes: { fontSize: 12, color: '#6b705c', fontStyle: 'italic', marginTop: 2 },
  usedUpBtn: {
    alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: '#b7e4c7',
    backgroundColor: '#f1f8f3',
  },
  usedUpBtnActive: { backgroundColor: '#d8f3dc', borderColor: '#2d6a4f' },
  usedUpBtnText: { fontSize: 12, fontWeight: '700', color: '#2d6a4f' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 24, gap: 12, paddingBottom: 36,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  input: {
    backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1b4332',
    marginBottom: 8,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#e9ecef', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#6b705c', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 2, backgroundColor: '#2d6a4f', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default SeedInventoryScreen;
