import React, { useState, useEffect } from 'react';
import { View, FlatList, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button, TextInput, Chip, Dialog, Portal, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { createGroup, joinGroup } from '../services/groupService';
import * as ImagePicker from 'expo-image-picker';

const categories = ['All', 'Programming', 'Mathematics', 'Science', 'Languages', 'Business', 'Arts', 'Other'];

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [visible, setVisible] = useState(false);

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    topics: '',
    image: null,
  });

  useEffect(() => {
    const groupsQuery = query(collection(db, 'groups'), orderBy('lastActive', 'desc'));
    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(data);
      setLoading(false);
    }, () => {
      setError('Failed to load groups');
      setShowError(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = [...groups];
    const q = searchQuery.toLowerCase();
    if (searchQuery) {
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(q) ||
        group.description.toLowerCase().includes(q) ||
        (group.topics || []).some(topic => topic.toLowerCase().includes(q))
      );
    }
    if (filterCategory !== 'All') {
      filtered = filtered.filter(group => (group.topics || []).includes(filterCategory));
    }
    setFilteredGroups(filtered);
  }, [groups, searchQuery, filterCategory]);

  const handleGroupAction = async (group) => {
    const isMember = group.members?.includes(currentUser?.uid);
    if (isMember) {
      navigation.navigate('GroupDetails', { groupId: group.id });
    } else {
      try {
        setLoading(true);
        await joinGroup(group.id, currentUser.uid);
        navigation.navigate('GroupDetails', { groupId: group.id });
      } catch (err) {
        setError(err.message);
        setShowError(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setNewGroup(prev => ({ ...prev, image: result.assets[0].uri }));
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.description) {
      setError('Please fill in all required fields');
      setShowError(true);
      return;
    }

    try {
      setLoading(true);
      await createGroup({
        name: newGroup.name,
        description: newGroup.description,
        topics: newGroup.topics.split(',').map(topic => topic.trim()).filter(Boolean),
        image: newGroup.image,
        creatorId: currentUser?.uid,
        members: [currentUser?.uid]
      });

      setVisible(false);
      setNewGroup({
        name: '',
        description: '',
        topics: '',
        image: null,
      });
    } catch (err) {
      setError(err.message || 'Failed to create group');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Welcome back, {currentUser?.name || 'User'}!</Text>

      <TextInput
        label="Search groups"
        value={searchQuery}
        onChangeText={setSearchQuery}
        mode="outlined"
        style={styles.input}
      />
      <View style={{ height: 48, marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}
        >
          {categories.map(category => (
            <Chip
              key={category}
              selected={filterCategory === category}
              onPress={() => setFilterCategory(category)}
              style={styles.chip}
            >
              {category}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator animating size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleGroupAction(item)} style={styles.card}>
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.cardImage} />
              )}
              <View style={styles.cardBody}>
                <Text variant="titleMedium">{item.name}</Text>
                <Text variant="bodySmall" numberOfLines={2}>{item.description}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }}>
                  {(item.topics || []).slice(0, 3).map((topic, idx) => (
                    <Chip key={idx} style={styles.topicChip}>{topic}</Chip>
                  ))}
                </View>
                <Text variant="labelSmall" style={{ marginTop: 5 }}>
                  {item.members?.length || 0} members
                </Text>

                <Button
                  mode="contained"
                  onPress={() => handleGroupAction(item)}
                  style={{ marginTop: 10 }}
                >
                  {item.members?.includes(currentUser?.uid) ? 'View Group' : 'Join Group'}
                </Button>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Group Button */}
      <Button
        icon="plus"
        mode="contained"
        onPress={() => setVisible(true)}
        style={styles.createGroupButton}
      >
        Create Group
      </Button>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>New Study Group</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Group Name"
              value={newGroup.name}
              onChangeText={(text) => setNewGroup(prev => ({ ...prev, name: text }))}
              style={styles.input}
            />
            <TextInput
              label="Description"
              value={newGroup.description}
              onChangeText={(text) => setNewGroup(prev => ({ ...prev, description: text }))}
              multiline
              style={styles.input}
            />
            <TextInput
              label="Topics (comma-separated)"
              value={newGroup.topics}
              onChangeText={(text) => setNewGroup(prev => ({ ...prev, topics: text }))}
              style={styles.input}
            />
            <Button
              icon="image"
              mode="outlined"
              onPress={pickImage}
              style={{ marginTop: 10 }}
            >
              {newGroup.image ? 'Change Image' : 'Pick Image'}
            </Button>
            {newGroup.image && (
              <Image
                source={{ uri: newGroup.image }}
                style={styles.previewImage}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateGroup} loading={loading}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={showError} onDismiss={() => setShowError(false)} duration={4000}>
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 16 },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  categoryScroll: { marginBottom: 12 },
  chip: { marginRight: 8 },
  createGroupButton: {
    alignSelf: 'center',
    marginVertical: 20,
    width: '60%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  cardImage: { width: '100%', height: 150 },
  cardBody: { padding: 12 },
  topicChip: { marginRight: 5, marginTop: 5 },
  previewImage: {
    marginTop: 10,
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
});
