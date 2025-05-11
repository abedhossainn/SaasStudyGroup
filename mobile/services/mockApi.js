// Mock user data
export const mockUsers = [
  {
    id: '1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    avatar: '/avatars/jane.jpg'
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'john@example.com',
    password: 'password123',
    avatar: '/avatars/john.jpg'
  },
  {
    id: '3',
    name: 'George Alan',
    email: 'george@example.com',
    password: 'password123',
    avatar: '/avatars/george.jpg'
  }
];

// Mock study groups
const mockGroups = [
  {
    id: '1',
    name: 'Study Group A',
    description: 'A study group for advanced mathematics and physics',
    image: '/test_wallpaper.png',
    topics: ['Mathematics', 'Physics', 'Engineering'],
    members: ['1', '2', '3'],
    lastActive: '2 days ago',
    documents: [
      { id: '1', name: 'Math Notes.pdf', url: '/documents/math-notes.pdf' },
      { id: '2', name: 'Physics Formula.pdf', url: '/documents/physics-formula.pdf' },
      { id: '3', name: 'Engineering Basics.pdf', url: '/documents/engineering-basics.pdf' }
    ],
    meetings: [
      {
        id: '1',
        title: 'Project Update',
        date: '2025-04-01T20:00:00',
        description: 'Weekly project progress discussion'
      },
      {
        id: '2',
        title: 'Weekly Team Meeting',
        date: '2025-04-05T13:00:00',
        description: 'Regular team sync-up'
      },
      {
        id: '3',
        title: 'Exam Material Review',
        date: '2025-04-09T18:00:00',
        description: 'Review session for upcoming exam'
      }
    ],
    chat: [
      {
        id: '1',
        userId: '3',
        message: "Yes, it's available.",
        timestamp: '4:55 pm'
      },
      {
        id: '2',
        userId: '1',
        message: 'Awesome! Can I see a couple of pictures?',
        timestamp: '4:56 pm'
      },
      {
        id: '3',
        userId: '3',
        message: 'Sure! Sending them over now.',
        timestamp: '4:56 pm'
      }
    ]
  },
  {
    id: '2',
    name: 'Study Group B',
    description: 'Web development and programming concepts',
    image: '/test_wallpaper.png',
    topics: ['Programming', 'Web Development', 'JavaScript'],
    members: ['1', '3'],
    lastActive: '5 days ago',
    documents: [
      { id: '4', name: 'JavaScript Basics.pdf', url: '/documents/js-basics.pdf' },
      { id: '5', name: 'React Tutorial.pdf', url: '/documents/react-tutorial.pdf' }
    ],
    meetings: [
      {
        id: '4',
        title: 'Code Review',
        date: '2025-04-02T15:00:00',
        description: 'Review new features implementation'
      }
    ],
    chat: []
  },
  {
    id: '3',
    name: 'Data Science Group',
    description: 'Exploring data science and machine learning',
    image: '/test_wallpaper.png',
    topics: ['Python', 'Machine Learning', 'Statistics'],
    members: ['2', '3'],
    lastActive: '1 day ago',
    documents: [],
    meetings: [],
    chat: []
  },
  {
    id: '4',
    name: 'Mobile App Development',
    description: 'Learning mobile app development with React Native',
    image: '/test_wallpaper.png',
    topics: ['React Native', 'Mobile Development', 'JavaScript'],
    members: ['1', '2'],
    lastActive: '3 days ago',
    documents: [],
    meetings: [],
    chat: []
  },
  {
    id: '5',
    name: 'UI/UX Design Group',
    description: 'Discussing modern UI/UX design principles',
    image: '/test_wallpaper.png',
    topics: ['UI Design', 'UX Research', 'Figma'],
    members: ['1', '3'],
    lastActive: '4 days ago',
    documents: [],
    meetings: [],
    chat: []
  }
];

// Mock notifications data
const notifications = [
  {
    id: 1,
    type: 'message',
    content: 'New message in Math Study Group',
    from: 'John Doe',
    groupId: 1,
    timestamp: new Date(2025, 2, 20, 10, 30),
    read: false
  },
  {
    id: 2,
    type: 'meeting',
    content: 'Physics Group Meeting in 30 minutes',
    groupId: 2,
    timestamp: new Date(2025, 2, 20, 13, 30),
    read: false
  },
  {
    id: 3,
    type: 'document',
    content: 'New study material uploaded in Web Dev Group',
    from: 'Alice Smith',
    groupId: 3,
    timestamp: new Date(2025, 2, 20, 15, 0),
    read: false
  },
  {
    id: 4,
    type: 'group',
    content: 'You were added to Mobile App Development Group',
    groupId: 4,
    timestamp: new Date(2025, 2, 20, 16, 30),
    read: false
  },
  {
    id: 5,
    type: 'reminder',
    content: 'UI/UX Design Group meeting tomorrow',
    groupId: 5,
    timestamp: new Date(2025, 2, 20, 17, 0),
    read: false
  }
];

// Mock messages
const mockMessages = [
  {
    id: '1',
    senderId: '3',
    receiverId: '1',
    content: "I'll take it. Can you ship it?",
    timestamp: new Date().toISOString(),
    read: false
  },
  {
    id: '2',
    senderId: '2',
    receiverId: '1',
    content: 'Thanks for the update. Let me know if there\'s anything else.',
    timestamp: new Date().toISOString(),
    read: true
  }
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API service
export const mockApi = {
  // Auth methods
  login: async (email, password) => {
    await delay(500);
    const user = mockUsers.find(u => u.email === email);
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password');
    }
    return { ...user, password: undefined };
  },

  // Group methods
  getGroups: async () => {
    await delay(300);
    return mockGroups;
  },

  getGroupById: async (id) => {
    await delay(300);
    const group = mockGroups.find(g => g.id === id);
    if (!group) throw new Error('Group not found');
    return group;
  },

  createGroup: async (groupData) => {
    await delay(500);
    const newGroup = {
      id: String(mockGroups.length + 1),
      ...groupData,
      members: [groupData.creatorId],
      lastActive: 'Just now',
      documents: [],
      meetings: [],
      chat: []
    };
    mockGroups.push(newGroup);
    return newGroup;
  },

  // Message methods
  getMessages: async (userId) => {
    await delay(300);
    return mockMessages.filter(m => 
      m.senderId === userId || m.receiverId === userId
    );
  },

  // Notification methods
  getNotifications: async () => {
    await delay(500);
    return notifications;
  },

  markNotificationAsRead: async (notificationId) => {
    await delay(200);
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
    return notification;
  },

  markAllNotificationsAsRead: async () => {
    await delay(200);
    notifications.forEach(n => n.read = true);
    return notifications;
  },

  // Document methods
  uploadDocument: async (groupId, document) => {
    await delay(500);
    const group = mockGroups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    
    const newDocument = {
      id: String(group.documents.length + 1),
      ...document,
      uploadedAt: new Date().toISOString()
    };
    
    group.documents.push(newDocument);
    return newDocument;
  },

  // Chat methods
  sendMessage: async (groupId, message) => {
    await delay(300);
    const group = mockGroups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    
    const newMessage = {
      id: String(group.chat.length + 1),
      ...message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    group.chat.push(newMessage);
    return newMessage;
  }
};
