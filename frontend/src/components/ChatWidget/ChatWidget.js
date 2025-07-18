import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Paper, Typography, IconButton, TextField, Button, List, ListItem, ListItemText, CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import './Widget.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/chat';
const AUTH_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/auth/login';
const REGISTER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/auth/register';
const ADMIN_EMAIL = 'admin@ai.com';
const ADMIN_PASSWORD = 'admin1234';
const SESSION_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/chat';

const ChatWidget = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState(() => {
    if (!login.email) return [];
    const sessionId = localStorage.getItem(`currentSession_${login.email}`) || (sessions[0]?.id || null);
    if (!sessionId) return [];
    const saved = localStorage.getItem(`chat_history_${login.email}_${sessionId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [signup, setSignup] = useState({ name: '', email: '', password: '', confirm: '' });
  const [signupError, setSignupError] = useState('');
  const recognitionRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchSessionHistory = async (token, sessionId) => {
    if (!token || !sessionId) return [];
    try {
      const res = await axios.get(`${API_URL}/history?sessionId=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Map each log to two messages: user and bot, in order
      const logs = res.data;
      const chat = [];
      logs.forEach(log => {
        chat.push({ sender: 'user', text: log.message });
        chat.push({ sender: 'bot', text: log.response });
      });
      return chat;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const loadHistory = async () => {
      if (!token || !currentSessionId) return;
      const backendHistory = await fetchSessionHistory(token, currentSessionId);
      setMessages(backendHistory);
    };
    loadHistory();
    // eslint-disable-next-line
  }, [token, currentSessionId]);

  // Fetch sessions from backend on login or reload
  useEffect(() => {
    const fetchSessions = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${SESSION_API_URL}/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessions(res.data);
        if (res.data.length > 0 && !currentSessionId) {
          setCurrentSessionId(res.data[0].id);
        }
      } catch {
        setSessions([]);
      }
    };
    fetchSessions();
    // eslint-disable-next-line
  }, [token]);

  // When sessions change, ensure currentSessionId is valid
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
    if (sessions.length === 0) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    // eslint-disable-next-line
  }, [sessions]);

  useEffect(() => {
    if (!login.email) return;
    localStorage.setItem(`sessions_${login.email}`, JSON.stringify(sessions));
  }, [sessions, login.email]);

  useEffect(() => {
    if (!login.email) return;
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
      localStorage.setItem(`currentSession_${login.email}`, sessions[0].id);
    }
  }, [sessions, login.email, currentSessionId]);

  useEffect(() => {
    // If already logged in as admin, redirect
    if (token && login.email === ADMIN_EMAIL) {
      navigate('/admin');
    }
  }, [token, login.email, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setLoginError('');
    try {
      const res = await axios.post(AUTH_URL, login);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      if (login.email === ADMIN_EMAIL && login.password === ADMIN_PASSWORD) {
        navigate('/admin');
      }
    } catch {
      setLoginError('Invalid credentials');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setLogin({ email: '', password: '' });
  };

  const handleSignup = async () => {
    setLoading(true);
    setSignupError('');
    if (!signup.name || !signup.email || !signup.password || !signup.confirm) {
      setSignupError('All fields are required');
      setLoading(false);
      return;
    }
    if (signup.password !== signup.confirm) {
      setSignupError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const payload = {
        name: signup.name,
        email: signup.email,
        password: signup.password,
      };
      if (signup.email === ADMIN_EMAIL) payload.role = 'admin';
      await axios.post(REGISTER_URL, payload);
      // Auto-login after signup
      setLogin({ email: signup.email, password: signup.password });
      setShowSignup(false);
      setSignup({ name: '', email: '', password: '', confirm: '' });
      setSignupError('');
      // Call login
      await handleLogin();
    } catch (err) {
      setSignupError(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleNewChat = async () => {
    if (!token) return;
    try {
      const res = await axios.post(`${SESSION_API_URL}/session`, { name: `Chat ${sessions.length + 1}` }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(prev => [res.data, ...prev]);
      setCurrentSessionId(res.data.id);
      setMessages([]);
    } catch {}
  };

  const handleSwitchSession = (id) => {
    setCurrentSessionId(id);
  };

  const handleDeleteSession = async (id) => {
    if (!token) return;
    try {
      await axios.delete(`${SESSION_API_URL}/session/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filtered = sessions.filter(s => s.id !== id);
      setSessions(filtered);
      if (id === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(msgs => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(API_URL, { message: input, sessionId: currentSessionId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(msgs => [...msgs, { sender: 'bot', text: res.data.response }]);
      localStorage.setItem(`chat_history_${login.email}_${currentSessionId}`, JSON.stringify(messages));
    } catch (err) {
      if (err.response && err.response.status === 503) {
        setMessages(msgs => [...msgs, { sender: 'bot', text: 'All AI models are currently busy. Please try again in a few seconds.' }]);
      } else {
        setMessages(msgs => [...msgs, { sender: 'bot', text: 'Error: Could not get response.' }]);
      }
    }
    setLoading(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice input using Web Speech API
  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition.');
      return;
    }
    if (!listening) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setListening(false);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } else {
      recognitionRef.current && recognitionRef.current.stop();
      setListening(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    if (login.email && currentSessionId) {
      localStorage.removeItem(`chat_history_${login.email}_${currentSessionId}`);
    }
  };

  if (!token) {
    if (showSignup) {
      return (
        <Box className="chat-widget-root" sx={{ maxWidth: 400, width: '100%', position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
          <Paper elevation={6} sx={{ borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 480, justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Create Account</Typography>
            <TextField label="Name" fullWidth margin="normal" value={signup.name} onChange={e => setSignup({ ...signup, name: e.target.value })} />
            <TextField label="Email" fullWidth margin="normal" value={signup.email} onChange={e => setSignup({ ...signup, email: e.target.value })} />
            <TextField label="Password" type="password" fullWidth margin="normal" value={signup.password} onChange={e => setSignup({ ...signup, password: e.target.value })} />
            <TextField label="Confirm Password" type="password" fullWidth margin="normal" value={signup.confirm} onChange={e => setSignup({ ...signup, confirm: e.target.value })} />
            {signupError && <Typography color="error">{signupError}</Typography>}
            <Button variant="contained" color="primary" fullWidth onClick={handleSignup} disabled={loading} sx={{ mt: 2 }}>Sign Up</Button>
            <Button color="secondary" fullWidth onClick={() => setShowSignup(false)} sx={{ mt: 1 }}>Back to Login</Button>
            <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>
              
            </Typography>
          </Paper>
        </Box>
      );
    }
    return (
      <Box className="chat-widget-root" sx={{ maxWidth: 400, width: '100%', position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
        <Paper elevation={6} sx={{ borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 400, justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Educational Assistant Login</Typography>
          <TextField label="Email" fullWidth margin="normal" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} />
          <TextField label="Password" type="password" fullWidth margin="normal" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} />
          {loginError && <Typography color="error">{loginError}</Typography>}
          <Button variant="contained" color="primary" fullWidth onClick={handleLogin} disabled={loading} sx={{ mt: 2 }}>Login</Button>
          <Button color="secondary" fullWidth onClick={() => setShowSignup(true)} sx={{ mt: 1 }}>Create Account</Button>
          <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>
            
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className="chat-widget-root" sx={{ maxWidth: 400, width: '100%', position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
      <Paper elevation={6} sx={{ borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 500 }}>
        <Box className="chat-header">
          <Typography variant="h6">Educational Assistant</Typography>
          <IconButton onClick={() => setDarkMode(dm => !dm)} color="inherit" size="small" title="Toggle dark/light mode">
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <Button onClick={handleLogout} color="inherit" size="small">Logout</Button>
          <IconButton onClick={handleClear} color="inherit" size="small" title="Clear chat">
            <DeleteIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #eee', bgcolor: 'var(--color-bg-alt)' }}>
          <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
            <InputLabel id="session-select-label">Chat Session</InputLabel>
            <Select
              labelId="session-select-label"
              id="session-select"
              value={currentSessionId || ''}
              label="Chat Session"
              onChange={e => handleSwitchSession(e.target.value)}
              sx={{ bgcolor: 'var(--color-bg)', borderRadius: 1 }}
            >
              {sessions.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={handleNewChat} sx={{ ml: 1 }}>New Chat</Button>
          {currentSessionId && (
            <IconButton size="small" onClick={() => handleDeleteSession(currentSessionId)} title="Delete chat" sx={{ ml: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'var(--color-bg)' }}>
          <List>
            {messages.map((msg, idx) => (
              <ListItem key={idx} className={`message-row ${msg.sender}`} sx={{ justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', background: 'none' }} disableGutters>
                <ListItemText
                  primary={msg.text}
                  className="message-bubble"
                  sx={{
                    bgcolor: msg.sender === 'user' ? 'var(--color-user-bubble)' : 'var(--color-bot-bubble)',
                    color: msg.sender === 'user' ? 'var(--color-user-text)' : 'var(--color-bot-text)',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    maxWidth: '80%',
                    textAlign: msg.sender === 'user' ? 'right' : 'left',
                  }}
                />
              </ListItem>
            ))}
            {loading && (
              <ListItem className="message-row bot" disableGutters>
                <ListItemText
                  primary={<CircularProgress size={20} />}
                  className="message-bubble"
                  sx={{ bgcolor: 'var(--color-bot-bubble)', color: 'var(--color-bot-text)', borderRadius: 2, px: 2, py: 1, maxWidth: '80%' }}
                />
              </ListItem>
            )}
          </List>
        </Box>
        <Box className="chat-input-bar">
          <TextField
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type your message..."
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <IconButton onClick={handleMicClick} color={listening ? 'primary' : 'default'}>
                  <MicIcon />
                </IconButton>
              )
            }}
            autoFocus
          />
          <Button variant="contained" color="primary" onClick={handleSend} disabled={loading || !input.trim()} endIcon={<SendIcon />}>
            Send
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatWidget;
