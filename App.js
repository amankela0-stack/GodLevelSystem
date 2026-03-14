import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Animated, Alert, Dimensions,
  Modal, SafeAreaView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const RANKS = [
  { name: 'E', min: 0, color: '#888888' },
  { name: 'D', min: 500, color: '#4ade80' },
  { name: 'C', min: 1500, color: '#60a5fa' },
  { name: 'B', min: 3000, color: '#a78bfa' },
  { name: 'A', min: 6000, color: '#f59e0b' },
  { name: 'S', min: 10000, color: '#f97316' },
  { name: 'SS', min: 20000, color: '#ef4444' },
  { name: 'SSS', min: 50000, color: '#ffffff' },
];

const DAILY_TASKS = [
  { id: 'pushups', name: 'Push-ups', desc: 'Complete 10 push-ups', xp: 100, icon: '💪', target: 10 },
  { id: 'situps', name: 'Sit-ups', desc: 'Complete 15 sit-ups', xp: 120, icon: '🏋️', target: 15 },
  { id: 'water', name: 'Drink Water', desc: '8 glasses of water', xp: 50, icon: '💧', target: 8 },
  { id: 'meditation', name: 'Meditate', desc: '5 minutes meditation', xp: 80, icon: '🧘', target: 300 },
  { id: 'reading', name: 'Read', desc: 'Read for 20 minutes', xp: 90, icon: '📖', target: 1200 },
  { id: 'run', name: 'Run / Walk', desc: 'Walk or run 10 minutes', xp: 150, icon: '🏃', target: 600 },
  { id: 'sleep', name: 'Sleep Early', desc: 'Log your sleep (8 hrs)', xp: 70, icon: '😴', target: 1 },
];

const SYSTEM_VOICE = {
  login: ['Welcome back, Hunter. Your daily quest awaits.', 'The System has been waiting. Begin your training.'],
  taskComplete: ['Quest complete! You grow stronger!', 'Excellent Hunter! Power increases!', 'The System is pleased!'],
  rankUp: ['You have ascended! New rank granted!', 'Rise Hunter! You have earned your rank!'],
  taskStart: ['Mission started. The System is watching.', 'Begin now. Weakness is not tolerated.'],
};

const ADMIN_CREDS = { username: 'admin', password: '#Godpro555' };

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
const getRank = (xp) => [...RANKS].reverse().find(r => xp >= r.min) || RANKS[0];
const getNextRank = (xp) => RANKS.find(r => r.min > xp);
const getXpProgress = (xp) => {
  const cur = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return 100;
  return Math.round(((xp - cur.min) / (next.min - cur.min)) * 100);
};
const getTodayKey = () => new Date().toISOString().split('T')[0];
const randomMsg = (arr) => arr[Math.floor(Math.random() * arr.length)];

const storage = {
  get: async (key) => { try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: async (key, val) => { try { await AsyncStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove: async (key) => { try { await AsyncStorage.removeItem(key); } catch {} },
};

// ═══════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', email: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleLogin = async () => {
    setError(''); setLoading(true);
    if (form.username === ADMIN_CREDS.username && form.password === ADMIN_CREDS.password) {
      setLoading(false);
      onLogin({ id: 'admin', username: 'admin', isAdmin: true });
      return;
    }
    const users = await storage.get('gls_users') || [];
    const user = users.find(u => u.username === form.username && u.password === form.password);
    setLoading(false);
    if (!user) { setError('Invalid username or password.'); return; }
    if (user.banned && user.banUntil && Date.now() < user.banUntil) {
      const mins = Math.ceil((user.banUntil - Date.now()) / 60000);
      setError(`Account banned for ${mins} more minute(s).`); return;
    }
    onLogin(user);
  };

  const handleRegister = async () => {
    setError('');
    if (!form.username || !form.password || !form.email) { setError('All fields required.'); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    if (form.username === 'admin') { setError('Reserved username.'); return; }
    const users = await storage.get('gls_users') || [];
    if (users.find(u => u.username === form.username)) { setError('Username already taken.'); return; }
    setLoading(true);
    const newUser = {
      id: Date.now().toString(), username: form.username, password: form.password, email: form.email,
      xp: 0, rank: 'E', banned: false, banUntil: null, canMessage: false,
      taskProgress: {}, messages: [], joinDate: Date.now(),
    };
    await storage.set('gls_users', [...users, newUser]);
    setLoading(false);
    onLogin(newUser);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />
      <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.authIcon}>⚔️</Text>
          <Text style={[styles.glowText, { fontSize: 26, color: '#00d4ff', marginBottom: 4 }]}>GOD LEVEL SYSTEM</Text>
          <Text style={styles.authSubtitle}>HUNTER REGISTRATION PORTAL</Text>
        </Animated.View>

        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabRow}>
            {['login', 'register'].map(t => (
              <TouchableOpacity key={t} onPress={() => { setTab(t); setError(''); }} style={[styles.tab, tab === t && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'login' ? 'LOGIN' : 'REGISTER'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fields */}
          {['username', ...(tab === 'register' ? ['email'] : []), 'password', ...(tab === 'register' ? ['confirm'] : [])].map(field => (
            <View key={field} style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>{field === 'confirm' ? 'CONFIRM PASSWORD' : field.toUpperCase()}</Text>
              <TextInput
                value={form[field]}
                onChangeText={v => setForm(p => ({ ...p, [field]: v }))}
                secureTextEntry={field.includes('pass') || field === 'confirm'}
                placeholder={`Enter ${field === 'confirm' ? 'confirm password' : field}`}
                placeholderTextColor="#444"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          ))}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity onPress={tab === 'login' ? handleLogin : handleRegister} disabled={loading} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{loading ? 'VERIFYING...' : tab === 'login' ? '⚔️ ENTER SYSTEM' : '🌟 CREATE HUNTER'}</Text>
          </TouchableOpacity>

          {tab === 'login' && <Text style={styles.hint}>Admin: admin / godlevel123</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════
// TIMER MODAL
// ═══════════════════════════════════════════════
function TimerModal({ task, onComplete, onClose }) {
  const [timeLeft, setTimeLeft] = useState(task.target);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const start = () => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    Animated.timing(progressAnim, { toValue: 1, duration: task.target * 1000, useNativeDriver: false }).start();
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const pct = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Modal transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={[styles.glowText, { fontSize: 20, color: '#00d4ff', marginBottom: 20 }]}>{task.icon} {task.name.toUpperCase()}</Text>
          <View style={styles.timerCircle}>
            <Text style={[styles.glowText, { fontSize: 36, color: done ? '#4ade80' : '#00d4ff' }]}>{done ? '✓' : fmt(timeLeft)}</Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: pct, backgroundColor: '#00d4ff' }]} />
          </View>
          {done ? (
            <>
              <Text style={[styles.glowText, { color: '#4ade80', fontSize: 18, marginTop: 16 }]}>QUEST COMPLETE!</Text>
              <Text style={{ color: '#4ade80', marginTop: 4, marginBottom: 16 }}>+{task.xp} XP Gained</Text>
              <TouchableOpacity onPress={onComplete} style={[styles.primaryBtn, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: '#4ade80' }]}>
                <Text style={[styles.primaryBtnText, { color: '#4ade80' }]}>CLAIM REWARD ✓</Text>
              </TouchableOpacity>
            </>
          ) : !running ? (
            <TouchableOpacity onPress={start} style={[styles.primaryBtn, { marginTop: 20 }]}>
              <Text style={styles.primaryBtnText}>▶ START TIMER</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: '#888', marginTop: 20, textAlign: 'center' }}>Stay focused... The System is watching.</Text>
          )}
          <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
            <Text style={{ color: '#444', fontSize: 13 }}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// MANUAL COUNT MODAL
// ═══════════════════════════════════════════════
function ManualModal({ task, onComplete, onClose }) {
  const [count, setCount] = useState('');
  const [done, setDone] = useState(false);
  const [counting, setCounting] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const startLive = () => {
    setCounting(true);
    Alert.alert('System Activated', `${task.name} mission started!\n\nThe System is watching.\nTap DONE when each ${task.name.toLowerCase().includes('push') ? 'push-up' : 'rep'} is complete.`);
  };

  const tap = () => {
    const n = liveCount + 1;
    setLiveCount(n);
    if (n >= task.target) {
      setCounting(false);
      setDone(true);
      clearInterval(intervalRef.current);
    }
  };

  return (
    <Modal transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={[styles.glowText, { fontSize: 20, color: '#00d4ff', marginBottom: 8 }]}>{task.icon} {task.name.toUpperCase()}</Text>
          <Text style={{ color: '#666', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>Target: {task.target} {task.name}</Text>

          {counting ? (
            <>
              <TouchableOpacity onPress={tap} style={styles.tapBtn}>
                <Text style={[styles.glowText, { fontSize: 40, color: liveCount >= task.target ? '#4ade80' : '#00d4ff' }]}>{liveCount}</Text>
                <Text style={{ color: '#888', marginTop: 4 }}>TAP TO COUNT</Text>
              </TouchableOpacity>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min((liveCount / task.target) * 100, 100)}%`, backgroundColor: '#00d4ff' }]} />
              </View>
            </>
          ) : done ? (
            <>
              <Text style={[styles.glowText, { color: '#4ade80', fontSize: 22, marginBottom: 8 }]}>✓ QUEST COMPLETE!</Text>
              <Text style={{ color: '#4ade80', marginBottom: 20 }}>+{task.xp} XP Gained</Text>
              <TouchableOpacity onPress={onComplete} style={[styles.primaryBtn, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: '#4ade80' }]}>
                <Text style={[styles.primaryBtnText, { color: '#4ade80' }]}>CLAIM REWARD ✓</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput value={count} onChangeText={setCount} keyboardType="numeric" placeholder={`Enter count (need ${task.target})`} placeholderTextColor="#444" style={[styles.input, { marginBottom: 12 }]} />
              <TouchableOpacity onPress={() => {
                if (parseInt(count) >= task.target) { setDone(true); }
                else Alert.alert('Not Enough', `You need at least ${task.target} to complete this task!`);
              }} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>SUBMIT</Text>
              </TouchableOpacity>
              <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>OR</Text><View style={styles.orLine} /></View>
              <TouchableOpacity onPress={startLive} style={[styles.primaryBtn, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b' }]}>
                <Text style={[styles.primaryBtnText, { color: '#f59e0b' }]}>👆 LIVE COUNT (TAP)</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
            <Text style={{ color: '#444', fontSize: 13 }}>✕ Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// USER DASHBOARD
// ═══════════════════════════════════════════════
function UserDashboard({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [tab, setTab] = useState('missions');
  const [activeTask, setActiveTask] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [toast, setToast] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  const todayKey = getTodayKey();
  const todayProgress = user.taskProgress?.[todayKey] || {};

  useEffect(() => { loadUser(); loadLeaderboard(); }, []);

  const showToast = (msg, color = '#00d4ff') => {
    setToast({ msg, color });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const loadUser = async () => {
    const users = await storage.get('gls_users') || [];
    const fresh = users.find(u => u.id === user.id);
    if (fresh) setUser(fresh);
  };

  const loadLeaderboard = async () => {
    const users = await storage.get('gls_users') || [];
    setAllUsers(users.filter(u => !u.banned).sort((a, b) => (b.xp || 0) - (a.xp || 0)));
  };

  const updateUser = async (updates) => {
    const users = await storage.get('gls_users') || [];
    const updated = users.map(u => u.id === user.id ? { ...u, ...updates } : u);
    await storage.set('gls_users', updated);
    setUser(prev => ({ ...prev, ...updates }));
  };

  const completeTask = async (task) => {
    const prev = user.taskProgress || {};
    const today = prev[todayKey] || {};
    if (today[task.id]) return;
    const newXP = (user.xp || 0) + task.xp;
    const oldRank = getRank(user.xp || 0);
    const newRank = getRank(newXP);
    await updateUser({ xp: newXP, rank: newRank.name, taskProgress: { ...prev, [todayKey]: { ...today, [task.id]: true } } });
    showToast(`+${task.xp} XP — ${task.name} complete! 🎉`, '#4ade80');
    if (newRank.name !== oldRank.name) {
      setTimeout(() => showToast(`🏆 RANK UP! ${oldRank.name} → ${newRank.name}`, '#f59e0b'), 1000);
    }
    setActiveTask(null);
    loadLeaderboard();
  };

  const rank = getRank(user.xp || 0);
  const completedToday = Object.keys(todayProgress).length;
  const unreadMsgs = (user.messages || []).filter(m => !m.read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* Toast */}
      <Animated.View style={[styles.toast, { opacity: toastAnim, borderColor: toast.color, backgroundColor: `${toast.color}22` }]}>
        <Text style={[styles.toastText, { color: toast.color }]}>{toast.msg}</Text>
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.glowText, { fontSize: 16, color: '#00d4ff' }]}>⚔️ GOD LEVEL SYSTEM</Text>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* Hunter Card */}
      <View style={styles.hunterCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View style={[styles.rankBadgeLg, { borderColor: rank.color, backgroundColor: `${rank.color}22`, shadowColor: rank.color }]}>
            <Text style={[styles.rankText, { color: rank.color, fontSize: 18 }]}>{rank.name}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.glowText, { fontSize: 20, color: rank.color }]}>{user.username}</Text>
            <Text style={{ color: '#888', fontSize: 12 }}>Hunter Rank {rank.name} • Level {Math.floor((user.xp || 0) / 100) + 1}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.glowText, { fontSize: 18, color: '#f59e0b' }]}>{completedToday}/{DAILY_TASKS.length}</Text>
            <Text style={{ color: '#888', fontSize: 11 }}>Today</Text>
          </View>
        </View>
        {/* XP Bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: '#888', fontSize: 11 }}>XP: {(user.xp || 0).toLocaleString()}</Text>
          <Text style={{ color: '#888', fontSize: 11 }}>{getNextRank(user.xp || 0) ? `Next: ${getNextRank(user.xp || 0).min.toLocaleString()}` : 'MAX RANK'}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${getXpProgress(user.xp || 0)}%`, backgroundColor: rank.color, shadowColor: rank.color }]} />
        </View>
      </View>

      {/* Nav */}
      <View style={styles.tabRow}>
        {[['missions', '⚔️ Missions'], ['leaderboard', '🏆 Ranks'], ['messages', `💬${unreadMsgs > 0 ? ` (${unreadMsgs})` : ''}`]].map(([t, label]) => (
          <TouchableOpacity key={t} onPress={() => {
            setTab(t);
            if (t === 'messages') updateUser({ messages: (user.messages || []).map(m => ({ ...m, read: true })) });
            if (t === 'leaderboard') loadLeaderboard();
          }} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* MISSIONS */}
        {tab === 'missions' && DAILY_TASKS.map(task => {
          const done = todayProgress[task.id];
          return (
            <View key={task.id} style={[styles.taskCard, done && styles.taskCardDone]}>
              <Text style={{ fontSize: 28 }}>{task.icon}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: done ? '#4ade80' : '#e0e0e0', fontWeight: '700', fontSize: 15 }}>{task.name}</Text>
                <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{task.desc}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 13 }}>+{task.xp} XP</Text>
                {done ? (
                  <Text style={{ color: '#4ade80', fontSize: 12, marginTop: 4 }}>✓ Done</Text>
                ) : (
                  <TouchableOpacity onPress={() => setActiveTask(task)} style={styles.startBtn}>
                    <Text style={{ color: '#00d4ff', fontSize: 12, fontWeight: '700' }}>START</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && allUsers.map((u, i) => {
          const r = getRank(u.xp || 0);
          const isMe = u.id === user.id;
          return (
            <View key={u.id} style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
              <Text style={{ width: 28, fontSize: i < 3 ? 20 : 13, color: i === 0 ? '#f59e0b' : i === 1 ? '#888' : i === 2 ? '#cd7f32' : '#555', textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</Text>
              <View style={[styles.rankBadgeSm, { borderColor: r.color, backgroundColor: `${r.color}22` }]}>
                <Text style={{ color: r.color, fontWeight: '900', fontSize: 11 }}>{r.name}</Text>
              </View>
              <Text style={{ flex: 1, color: isMe ? '#00d4ff' : '#e0e0e0', fontWeight: '700', marginLeft: 8 }}>{u.username}{isMe ? ' (You)' : ''}</Text>
              <Text style={{ color: r.color, fontWeight: '700', fontSize: 13 }}>{(u.xp || 0).toLocaleString()}</Text>
            </View>
          );
        })}

        {/* MESSAGES */}
        {tab === 'messages' && (
          (user.messages || []).length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
              <Text style={{ color: '#555', textAlign: 'center' }}>No messages from Admin.</Text>
            </View>
          ) : [...(user.messages || [])].reverse().map((msg, i) => (
            <View key={i} style={[styles.msgCard, !msg.read && styles.msgCardUnread]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#00d4ff', fontWeight: '700', fontSize: 13 }}>⚙️ Admin</Text>
                <Text style={{ color: '#555', fontSize: 11 }}>{new Date(msg.time).toLocaleDateString()}</Text>
              </View>
              <Text style={{ color: '#ccc', fontSize: 14, lineHeight: 22 }}>{msg.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Task Modal */}
      {activeTask && (activeTask.type === 'timer'
        ? <TimerModal task={activeTask} onComplete={() => completeTask(activeTask)} onClose={() => setActiveTask(null)} />
        : <ManualModal task={activeTask} onComplete={() => completeTask(activeTask)} onClose={() => setActiveTask(null)} />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════
function AdminPanel({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('users');
  const [msgText, setMsgText] = useState('');
  const [banMins, setBanMins] = useState('60');
  const [toast, setToast] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const u = await storage.get('gls_users') || [];
    setUsers(u);
    if (selected) setSelected(u.find(x => x.id === selected.id) || null);
  };

  const showToast = (msg) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const banUser = async (uid, mins) => {
    const until = mins === 0 ? null : Date.now() + mins * 60000;
    const updated = users.map(u => u.id === uid ? { ...u, banned: mins !== 0, banUntil: until } : u);
    await storage.set('gls_users', updated);
    await loadUsers();
    showToast(mins === 0 ? '✓ User unbanned' : `✓ Banned for ${mins} min`);
  };

  const sendMsg = async (uid) => {
    if (!msgText.trim()) return;
    const updated = users.map(u => u.id === uid ? { ...u, messages: [...(u.messages || []), { text: msgText.trim(), time: Date.now(), read: false }] } : u);
    await storage.set('gls_users', updated);
    await loadUsers();
    setMsgText('');
    showToast('✓ Message sent');
  };

  const broadcastAll = async () => {
    if (!msgText.trim()) return;
    const updated = users.map(u => ({ ...u, messages: [...(u.messages || []), { text: msgText.trim(), time: Date.now(), read: false, broadcast: true }] }));
    await storage.set('gls_users', updated);
    await loadUsers();
    setMsgText('');
    showToast(`✓ Broadcast sent to ${users.length} users`);
  };

  const togglePerm = async (uid) => {
    const u = users.find(x => x.id === uid);
    const updated = users.map(x => x.id === uid ? { ...x, canMessage: !u.canMessage } : x);
    await storage.set('gls_users', updated);
    await loadUsers();
    showToast('✓ Permission updated');
  };

  const filtered = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const totalXP = users.reduce((s, u) => s + (u.xp || 0), 0);
  const activeToday = users.filter(u => u.taskProgress?.[getTodayKey()]).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      <Animated.View style={[styles.toast, { opacity: toastAnim, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.15)' }]}>
        <Text style={[styles.toastText, { color: '#4ade80' }]}>{toast}</Text>
      </Animated.View>

      <View style={[styles.header, { borderBottomColor: 'rgba(239,68,68,0.2)' }]}>
        <Text style={[styles.glowText, { fontSize: 15, color: '#ef4444' }]}>🛡️ ADMIN PANEL</Text>
        <TouchableOpacity onPress={onLogout} style={[styles.logoutBtn, { borderColor: 'rgba(239,68,68,0.3)' }]}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[['👥', users.length, 'Users', '#00d4ff'], ['⚡', activeToday, 'Active', '#4ade80'], ['🏆', totalXP.toLocaleString(), 'Total XP', '#f59e0b']].map(([icon, val, label, color]) => (
          <View key={label} style={[styles.statCard, { borderColor: `${color}22` }]}>
            <Text style={[styles.glowText, { fontSize: 18, color }]}>{icon} {val}</Text>
            <Text style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['users', '👥 Users'], ['broadcast', '📢 Broadcast']].map(([t, l]) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
            <Text style={[styles.tabText, tab === t && { color: '#ef4444' }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {tab === 'users' && (
          <>
            <View style={styles.searchRow}>
              <Text style={{ color: '#555', marginRight: 8 }}>🔍</Text>
              <TextInput value={search} onChangeText={setSearch} placeholder="Search username or email..." placeholderTextColor="#444" style={{ flex: 1, color: '#e0e0e0', fontSize: 14 }} autoCapitalize="none" />
            </View>

            {filtered.length === 0 && <Text style={{ color: '#555', textAlign: 'center', padding: 30 }}>No users found</Text>}

            {filtered.map(u => {
              const r = getRank(u.xp || 0);
              const isBanned = u.banned && u.banUntil && Date.now() < u.banUntil;
              const todayDone = Object.keys(u.taskProgress?.[getTodayKey()] || {}).length;
              const isOpen = selected?.id === u.id;

              return (
                <View key={u.id} style={{ marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setSelected(isOpen ? null : u)} style={[styles.userRow, isBanned && { borderColor: 'rgba(239,68,68,0.3)' }]}>
                    <View style={[styles.rankBadgeSm, { borderColor: r.color, backgroundColor: `${r.color}22` }]}>
                      <Text style={{ color: r.color, fontWeight: '900', fontSize: 11 }}>{r.name}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#e0e0e0', fontWeight: '700', fontSize: 14 }}>{u.username}</Text>
                        {isBanned && <Text style={styles.bannedBadge}>BANNED</Text>}
                      </View>
                      <Text style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{(u.xp || 0).toLocaleString()} XP • Today: {todayDone}/{DAILY_TASKS.length}</Text>
                    </View>
                    <Text style={{ color: '#555' }}>{isOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.expandedPanel}>
                      {/* Today tasks */}
                      <Text style={styles.sectionLabel}>TODAY'S PROGRESS</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {DAILY_TASKS.map(t => {
                          const done = u.taskProgress?.[getTodayKey()]?.[t.id];
                          return <Text key={t.id} style={[styles.taskChip, done && styles.taskChipDone]}>{t.icon} {t.name}</Text>;
                        })}
                      </View>

                      {/* XP */}
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${getXpProgress(u.xp || 0)}%`, backgroundColor: r.color }]} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: 4 }}>
                        <Text style={{ color: '#555', fontSize: 11 }}>XP: {(u.xp || 0).toLocaleString()}</Text>
                        <Text style={{ color: '#555', fontSize: 11 }}>Rank: {r.name}</Text>
                      </View>

                      {/* Ban */}
                      <Text style={[styles.sectionLabel, { color: '#ef4444' }]}>BAN CONTROL</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {[30, 60, 360, 1440].map(m => (
                          <TouchableOpacity key={m} onPress={() => banUser(u.id, m)} style={styles.banBtn}>
                            <Text style={{ color: '#ef4444', fontSize: 12 }}>{m < 60 ? `${m}m` : m < 1440 ? `${m / 60}h` : '1d'}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => banUser(u.id, parseInt(banMins) || 60)} style={styles.banBtn}>
                          <Text style={{ color: '#ef4444', fontSize: 12 }}>Custom</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => banUser(u.id, 0)} style={[styles.banBtn, { borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.08)' }]}>
                          <Text style={{ color: '#4ade80', fontSize: 12 }}>UNBAN</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                        <TextInput value={banMins} onChangeText={setBanMins} keyboardType="numeric" placeholder="Custom mins" placeholderTextColor="#444" style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                      </View>

                      {/* Permission */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <Text style={{ color: '#888', fontSize: 13 }}>Can Message Admin</Text>
                        <TouchableOpacity onPress={() => togglePerm(u.id)} style={[styles.permBtn, u.canMessage && styles.permBtnOn]}>
                          <Text style={{ color: u.canMessage ? '#4ade80' : '#555', fontWeight: '700', fontSize: 12 }}>{u.canMessage ? 'ON' : 'OFF'}</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Message */}
                      <Text style={styles.sectionLabel}>SEND MESSAGE</Text>
                      <TextInput value={msgText} onChangeText={setMsgText} placeholder="Type message..." placeholderTextColor="#444" multiline style={[styles.input, { height: 80, textAlignVertical: 'top' }]} />
                      <TouchableOpacity onPress={() => sendMsg(u.id)} style={styles.primaryBtn}>
                        <Text style={styles.primaryBtnText}>SEND MESSAGE ➤</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {tab === 'broadcast' && (
          <View style={styles.card}>
            <Text style={[styles.glowText, { color: '#ef4444', fontSize: 16, marginBottom: 16 }]}>📢 Broadcast to All Hunters</Text>
            <TextInput value={msgText} onChangeText={setMsgText} placeholder="Broadcast message..." placeholderTextColor="#444" multiline style={[styles.input, { height: 120, textAlignVertical: 'top', marginBottom: 14 }]} />
            <TouchableOpacity onPress={broadcastAll} style={[styles.primaryBtn, { borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Text style={[styles.primaryBtnText, { color: '#ef4444' }]}>BROADCAST TO ALL ({users.length}) ➤</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    storage.get('gls_session').then(s => { setSession(s); setLoaded(true); });
  }, []);

  const handleLogin = async (user) => { await storage.set('gls_session', user); setSession(user); };
  const handleLogout = async () => { await storage.remove('gls_session'); setSession(null); };

  if (!loaded) return <View style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}><Text style={[styles.glowText, { color: '#00d4ff', fontSize: 20 }]}>⚔️ Loading...</Text></View>;
  if (!session) return <AuthScreen onLogin={handleLogin} />;
  if (session.isAdmin) return <AdminPanel onLogout={handleLogout} />;
  return <UserDashboard user={session} onLogout={handleLogout} />;
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#050508' },
  glowText: { fontWeight: '700', letterSpacing: 0.5 },
  authContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#050508' },
  authIcon: { fontSize: 56, marginBottom: 12 },
  authSubtitle: { color: '#444', fontSize: 11, letterSpacing: 3, marginTop: 4, marginBottom: 32 },
  card: { width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', borderRadius: 16, padding: 20 },
  tabRow: { flexDirection: 'row', gap: 4, marginHorizontal: 16, marginVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(0,212,255,0.12)' },
  tabText: { color: '#555', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabTextActive: { color: '#00d4ff' },
  fieldLabel: { color: '#555', fontSize: 11, letterSpacing: 1, marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', borderRadius: 10, padding: 12, color: '#e0e0e0', fontSize: 14, marginBottom: 4 },
  primaryBtn: { backgroundColor: 'rgba(0,212,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.35)', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { color: '#00d4ff', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  errorText: { color: '#ef4444', fontSize: 12, marginVertical: 10, backgroundColor: 'rgba(239,68,68,0.08)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  hint: { color: '#444', fontSize: 12, textAlign: 'center', marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)', backgroundColor: 'rgba(0,0,0,0.4)' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 8 },
  logoutText: { color: '#ef4444', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  hunterCard: { margin: 16, backgroundColor: 'rgba(0,212,255,0.04)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)', borderRadius: 16, padding: 16 },
  rankBadgeLg: { width: 48, height: 48, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  rankBadgeSm: { width: 28, height: 28, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontWeight: '900' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, marginBottom: 10 },
  taskCardDone: { backgroundColor: 'rgba(74,222,128,0.03)', borderColor: 'rgba(74,222,128,0.2)' },
  startBtn: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', borderRadius: 8 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, marginBottom: 8 },
  leaderRowMe: { backgroundColor: 'rgba(0,212,255,0.05)', borderColor: 'rgba(0,212,255,0.2)' },
  msgCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 8 },
  msgCardUnread: { backgroundColor: 'rgba(0,212,255,0.04)', borderColor: 'rgba(0,212,255,0.2)' },
  toast: { position: 'absolute', top: 60, left: 20, right: 20, zIndex: 999, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  toastText: { fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 340, backgroundColor: '#0d0d1a', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', borderRadius: 20, padding: 24, alignItems: 'center' },
  timerCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: 'rgba(0,212,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: 'rgba(0,212,255,0.03)' },
  tapBtn: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: 'rgba(0,212,255,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: 'rgba(0,212,255,0.06)' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, width: '100%' },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  orText: { color: '#444', marginHorizontal: 10, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginVertical: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, marginBottom: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 12 },
  bannedBadge: { fontSize: 9, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  expandedPanel: { backgroundColor: 'rgba(255,255,255,0.01)', borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(255,255,255,0.07)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 14 },
  sectionLabel: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  taskChip: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', color: '#555', fontSize: 11 },
  taskChipDone: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)', color: '#4ade80' },
  banBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 8 },
  permBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  permBtnOn: { backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)' },
});
