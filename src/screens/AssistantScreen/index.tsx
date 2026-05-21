import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useGardenStore } from '@/store/gardenStore';
import { gardenAssistantService, ChatTurn, IdentifiedPlant, AssistantTask, createInitialTasksForPlant } from '@/services/GardenAssistantService';
import { Plant, Garden, GardenTask } from '@/models';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  identifiedPlants?: IdentifiedPlant[];
  detectedTasks?: AssistantTask[];
  loading?: boolean;
}

const DEFAULT_GARDEN_ID = 'main-garden';

const makeDefaultGarden = (): Garden => ({
  id: DEFAULT_GARDEN_ID,
  userId: 'local',
  name: 'Mijn tuin',
  polygons: [],
  plants: [],
  zones: [],
  tasks: [],
  lastScannedAt: new Date().toISOString(),
});

const makePlant = (plant: IdentifiedPlant, gardenId: string, position: number): Plant => {
  const id = `plant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tasks = createInitialTasksForPlant(id, plant);
  if (tasks.length === 0) {
    tasks.push({
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      plantId: id,
      type: 'water',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  return {
    id,
    gardenId,
    species: plant.species,
    commonName: plant.commonName,
    x: 1 + (position % 5),
    y: 1 + Math.floor(position / 5),
    z: 0,
    plantedDate: new Date().toISOString(),
    maintenanceTasks: tasks,
    identificationConfidence: plant.confidence,
    careTips: plant.careTips ?? [],
    harvestMonths: plant.harvestMonths,
  };
};

const urgencyDays: Record<string, number> = { high: 0, medium: 3, low: 7 };

const makeGardenTask = (task: AssistantTask): GardenTask => ({
  id: `gtask-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  description: task.description,
  urgency: task.urgency,
  plantName: task.plantName,
  dueDate: new Date(
    Date.now() + (urgencyDays[task.urgency] ?? 3) * 24 * 60 * 60 * 1000,
  ).toISOString(),
});

const AssistantScreen = (): React.JSX.Element => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addedPlantKeys, setAddedPlantKeys] = useState<Set<string>>(new Set());
  const [addedTaskKeys, setAddedTaskKeys] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList>(null);

  const garden = useGardenStore((s) => s.garden);
  const setGarden = useGardenStore((s) => s.setGarden);
  const addPlant = useGardenStore((s) => s.addPlant);
  const addGardenTask = useGardenStore((s) => s.addGardenTask);

  // Include positions for companion planting / placement advice
  const gardenPlants = garden?.plants.map(
    (p) => `${p.commonName} (${p.species}) op ${p.x},${p.y}`,
  ) ?? [];

  const buildHistory = useCallback((): ChatTurn[] => {
    return messages
      .filter((m) => !m.loading)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
        imageUri: m.imageUri,
      })) as ChatTurn[];
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string, imageUri: string | null) => {
      if (!text.trim() && !imageUri) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: text.trim(),
        imageUri: imageUri ?? undefined,
      };

      const loadingMsg: Message = {
        id: `loading-${Date.now()}`,
        role: 'assistant',
        text: '',
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInputText('');
      setPendingImage(null);
      setIsLoading(true);

      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

      try {
        const history = buildHistory();
        const response = await gardenAssistantService.chat(
          text.trim(),
          imageUri,
          history,
          gardenPlants,
        );

        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.text,
          identifiedPlants: response.identifiedPlants,
          detectedTasks: response.detectedTasks,
        };

        setMessages((prev) => [...prev.filter((m) => !m.loading), assistantMsg]);
      } catch (e) {
        const errorMsg: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: e instanceof Error ? e.message : 'Er ging iets mis.',
        };
        setMessages((prev) => [...prev.filter((m) => !m.loading), errorMsg]);
      } finally {
        setIsLoading(false);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [buildHistory, gardenPlants],
  );

  const handlePickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setPendingImage(result.assets[0].uri);
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) setPendingImage(result.assets[0].uri);
  };

  const handleSend = () => sendMessage(inputText, pendingImage);

  const handleAddToGarden = useCallback(
    (plant: IdentifiedPlant, messageId: string) => {
      const key = `${messageId}-${plant.species}`;
      if (addedPlantKeys.has(key)) return;
      const activeGarden = garden ?? makeDefaultGarden();
      if (!garden) setGarden(activeGarden);
      addPlant(makePlant(plant, activeGarden.id, activeGarden.plants.length));
      setAddedPlantKeys((prev) => new Set([...prev, key]));
    },
    [garden, setGarden, addPlant, addedPlantKeys],
  );

  const handleAddAll = useCallback(
    (plants: IdentifiedPlant[], messageId: string) => {
      const activeGarden = garden ?? makeDefaultGarden();
      if (!garden) setGarden(activeGarden);
      plants.forEach((plant, idx) => {
        const key = `${messageId}-${plant.species}`;
        if (addedPlantKeys.has(key)) return;
        addPlant(makePlant(plant, activeGarden.id, activeGarden.plants.length + idx));
        setAddedPlantKeys((prev) => new Set([...prev, key]));
      });
    },
    [garden, setGarden, addPlant, addedPlantKeys],
  );

  const handleAddTask = useCallback(
    (task: AssistantTask, messageId: string, taskIdx: number) => {
      const key = `${messageId}-task-${taskIdx}`;
      if (addedTaskKeys.has(key)) return;
      const activeGarden = garden ?? makeDefaultGarden();
      if (!garden) setGarden(activeGarden);
      addGardenTask(makeGardenTask(task));
      setAddedTaskKeys((prev) => new Set([...prev, key]));
    },
    [garden, setGarden, addGardenTask, addedTaskKeys],
  );

  const handleAddAllTasks = useCallback(
    (tasks: AssistantTask[], messageId: string) => {
      const activeGarden = garden ?? makeDefaultGarden();
      if (!garden) setGarden(activeGarden);
      tasks.forEach((task, idx) => {
        const key = `${messageId}-task-${idx}`;
        if (addedTaskKeys.has(key)) return;
        addGardenTask(makeGardenTask(task));
        setAddedTaskKeys((prev) => new Set([...prev, key]));
      });
    },
    [garden, setGarden, addGardenTask, addedTaskKeys],
  );

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.loading) {
      return (
        <View style={[styles.bubble, styles.assistantBubble]}>
          <ActivityIndicator size="small" color="#2d6a4f" />
        </View>
      );
    }

    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {item.imageUri && (
          <Image source={{ uri: item.imageUri }} style={styles.messageImage} />
        )}
        {item.text ? (
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
              {item.text}
            </Text>
          </View>
        ) : null}

        {/* Identified plants card */}
        {item.identifiedPlants && item.identifiedPlants.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.identifiedPlants.length === 1 ? '🌿 Plant herkend' : `🌿 ${item.identifiedPlants.length} planten herkend`}
            </Text>
            {item.identifiedPlants.map((plant) => {
              const key = `${item.id}-${plant.species}`;
              const added = addedPlantKeys.has(key);
              return (
                <View key={plant.species} style={styles.plantRow}>
                  <View style={styles.plantInfo}>
                    <Text style={styles.plantCommonName}>{plant.commonName}</Text>
                    <Text style={styles.plantSpecies}>{plant.species}</Text>
                    <Text style={styles.plantConfidence}>{Math.round(plant.confidence * 100)}% zekerheid</Text>
                    {plant.careTips && plant.careTips.length > 0 && (
                      <View style={styles.tipsRow}>
                        {plant.careTips.map((tip, i) => (
                          <Text key={i} style={styles.tipText}>• {tip}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.addButton, added && styles.addButtonDone]}
                    onPress={() => handleAddToGarden(plant, item.id)}
                    disabled={added}>
                    <Text style={[styles.addButtonText, added && styles.addButtonTextDone]}>
                      {added ? '✓' : '+'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {item.identifiedPlants.length > 1 && (
              <TouchableOpacity style={styles.addAllButton} onPress={() => handleAddAll(item.identifiedPlants!, item.id)}>
                <Text style={styles.addAllButtonText}>Alle {item.identifiedPlants.length} toevoegen aan tuin</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Detected maintenance tasks card */}
        {item.detectedTasks && item.detectedTasks.length > 0 && (
          <View style={[styles.card, styles.taskCard]}>
            <Text style={styles.cardTitle}>🔔 Onderhoud nodig</Text>
            {item.detectedTasks.map((task, idx) => {
              const key = `${item.id}-task-${idx}`;
              const added = addedTaskKeys.has(key);
              const urgencyColor = task.urgency === 'high' ? '#e63946' : task.urgency === 'medium' ? '#ffb703' : '#2d6a4f';
              return (
                <View key={idx} style={styles.taskRow}>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskDescription}>{task.description}</Text>
                    {task.plantName ? <Text style={styles.taskPlantName}>{task.plantName}</Text> : null}
                    <Text style={[styles.urgencyText, { color: urgencyColor }]}>
                      {task.urgency === 'high' ? '⚡ Vandaag' : task.urgency === 'medium' ? '📅 Binnen 3 dagen' : '🗓️ Binnen een week'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addButton, added && styles.addButtonDone]}
                    onPress={() => handleAddTask(task, item.id, idx)}
                    disabled={added}>
                    <Text style={[styles.addButtonText, added && styles.addButtonTextDone]}>
                      {added ? '✓' : '+'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            {item.detectedTasks.length > 1 && (
              <TouchableOpacity style={[styles.addAllButton, styles.addAllTaskButton]} onPress={() => handleAddAllTasks(item.detectedTasks!, item.id)}>
                <Text style={styles.addAllButtonText}>Alle taken toevoegen aan Onderhoud</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌿 Tuin Assistent</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>Stel een vraag of scan een plant</Text>
            <Text style={styles.emptySubtitle}>
              Maak een foto om planten te herkennen en onderhoudstaken op te sporen, of vraag advies over je tuin.
            </Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity style={styles.emptyButton} onPress={handlePickImage}>
                <Text style={styles.emptyButtonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.emptyButton} onPress={handlePickFromGallery}>
                <Text style={styles.emptyButtonText}>🖼️ Galerij</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {pendingImage && (
        <View style={styles.pendingImageRow}>
          <Image source={{ uri: pendingImage }} style={styles.pendingImageThumb} />
          <Text style={styles.pendingImageLabel}>Foto klaar om te sturen</Text>
          <TouchableOpacity onPress={() => setPendingImage(null)}>
            <Text style={styles.removePending}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImage}>
            <Text style={styles.iconButtonText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickFromGallery}>
            <Text style={styles.iconButtonText}>🖼️</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Stel een vraag..."
            placeholderTextColor="#aaa"
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() && !pendingImage) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isLoading || (!inputText.trim() && !pendingImage)}>
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1b4332' },
  messageList: { padding: 16, gap: 12, flexGrow: 1 },
  messageRow: { gap: 6 },
  userRow: { alignItems: 'flex-end' },
  assistantRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  userBubble: { backgroundColor: '#2d6a4f', borderBottomRightRadius: 4 },
  assistantBubble: {
    backgroundColor: '#f1f8f3',
    borderBottomLeftRadius: 4,
    minWidth: 48,
    minHeight: 40,
    justifyContent: 'center',
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  assistantText: { color: '#1b4332' },
  messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },
  card: {
    backgroundColor: '#f1f8f3',
    borderWidth: 1,
    borderColor: '#2d6a4f',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    alignSelf: 'stretch',
  },
  taskCard: {
    backgroundColor: '#fff9f0',
    borderColor: '#ffb703',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#2d6a4f', marginBottom: 2 },
  plantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  plantInfo: { flex: 1, gap: 2 },
  plantCommonName: { fontSize: 14, fontWeight: '700', color: '#1b4332' },
  plantSpecies: { fontSize: 12, color: '#6b705c', fontStyle: 'italic' },
  plantConfidence: { fontSize: 11, color: '#aaa' },
  tipsRow: { marginTop: 4, gap: 2 },
  tipText: { fontSize: 12, color: '#2d6a4f', lineHeight: 17 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  taskInfo: { flex: 1, gap: 2 },
  taskDescription: { fontSize: 14, fontWeight: '600', color: '#1b4332' },
  taskPlantName: { fontSize: 12, color: '#6b705c', fontStyle: 'italic' },
  urgencyText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2d6a4f',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addButtonDone: { backgroundColor: '#b7e4c7' },
  addButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  addButtonTextDone: { color: '#2d6a4f' },
  addAllButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  addAllTaskButton: { backgroundColor: '#e09600' },
  addAllButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1b4332', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#6b705c', textAlign: 'center', lineHeight: 20 },
  emptyButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  emptyButton: {
    backgroundColor: '#f1f8f3',
    borderWidth: 1,
    borderColor: '#2d6a4f',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: { color: '#1b4332', fontWeight: '600', fontSize: 15 },
  pendingImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f8f3',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 10,
  },
  pendingImageThumb: { width: 40, height: 40, borderRadius: 8 },
  pendingImageLabel: { flex: 1, fontSize: 13, color: '#2d6a4f', fontWeight: '600' },
  removePending: { fontSize: 18, color: '#aaa', paddingHorizontal: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 8,
    backgroundColor: '#fff',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f8f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { fontSize: 20 },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1b4332',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d6a4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});

export default AssistantScreen;
