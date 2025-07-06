
import React, { useState, useEffect } from 'react';
import {
  Box, AppBar, Toolbar, Typography, Button, Container, Paper, Tabs, Tab, TextField, IconButton, List, ListItem, ListItemText, CircularProgress, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddLinkIcon from '@mui/icons-material/AddLink';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function AdminPanel() {
  const [tab, setTab] = useState(0);
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [sources, setSources] = useState({ documents: [], urls: [] });
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({ rejectionMessage: '', model: 'openai' });
  const [snack, setSnack] = useState('');
  const [configDialog, setConfigDialog] = useState(false);

  useEffect(() => {
    if (token) {
      fetchSources();
      fetchLogs();
      fetchConfig();
    }
    // eslint-disable-next-line
  }, [token]);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/knowledge/list`, { headers: { Authorization: `Bearer ${token}` } });
      setSources(res.data);
    } catch {
      setSnack('Failed to fetch sources');
    }
    setLoading(false);
  };
  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/chatlogs`, { headers: { Authorization: `Bearer ${token}` } });
      setLogs(res.data);
    } catch {
      setSnack('Failed to fetch chat logs');
    }
  };
  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/config`, { headers: { Authorization: `Bearer ${token}` } });
      setConfig(res.data);
    } catch {
      setSnack('Failed to fetch config');
    }
  };
  const handleLogin = async () => {
    setLoading(true);
    setLoginError('');
    try {
      const res = await axios.post(`${API_URL}/auth/login`, login);
      setToken(res.data.token);
      localStorage.setItem('admin_token', res.data.token);
    } catch {
      setLoginError('Invalid credentials');
    }
    setLoading(false);
  };
  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('admin_token');
  };
  const handleFileUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/knowledge/upload`, formData, { headers: { Authorization: `Bearer ${token}` } });
      setSnack('Document uploaded');
      setFile(null);
      fetchSources();
    } catch {
      setSnack('Upload failed');
    }
    setLoading(false);
  };
  const handleAddUrl = async () => {
    if (!url) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/knowledge/url`, { url, title, description: desc }, { headers: { Authorization: `Bearer ${token}` } });
      setSnack('URL added');
      setUrl(''); setTitle(''); setDesc('');
      fetchSources();
    } catch {
      setSnack('Add URL failed');
    }
    setLoading(false);
  };
  const handleDeleteSource = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/knowledge/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSnack('Source deleted');
      fetchSources();
    } catch {
      setSnack('Delete failed');
    }
    setLoading(false);
  };
  const handleConfigSave = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/admin/config`, config, { headers: { Authorization: `Bearer ${token}` } });
      setSnack('Config updated');
      setConfigDialog(false);
    } catch {
      setSnack('Config update failed');
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <Container maxWidth="xs" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>Admin Login</Typography>
          <TextField label="Email" fullWidth margin="normal" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} />
          <TextField label="Password" type="password" fullWidth margin="normal" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} />
          {loginError && <Typography color="error">{loginError}</Typography>}
          <Button variant="contained" color="primary" fullWidth onClick={handleLogin} disabled={loading} sx={{ mt: 2 }}>Login</Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>AI Helpdesk Admin</Typography>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Knowledge Base" />
            <Tab label="Chat Logs" />
            <Tab label="Bot Config" />
          </Tabs>
          {tab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Upload Document</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                  Choose File
                  <input type="file" hidden onChange={e => setFile(e.target.files[0])} />
                </Button>
                {file && <Typography>{file.name}</Typography>}
                <Button variant="contained" onClick={handleFileUpload} disabled={!file || loading}>Upload</Button>
              </Box>
              <Typography variant="h6" sx={{ mt: 4 }}>Add URL Source</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField label="URL" value={url} onChange={e => setUrl(e.target.value)} fullWidth />
                <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth />
                <TextField label="Description" value={desc} onChange={e => setDesc(e.target.value)} fullWidth />
                <Button variant="contained" startIcon={<AddLinkIcon />} onClick={handleAddUrl} disabled={loading}>Add</Button>
              </Box>
              <Typography variant="h6" sx={{ mt: 4 }}>Sources</Typography>
              {loading ? <CircularProgress /> : (
                <List>
                  {sources.documents.map(doc => (
                    <ListItem key={doc.id} secondaryAction={<IconButton edge="end" onClick={() => handleDeleteSource(doc.id)}><DeleteIcon /></IconButton>}>
                      <ListItemText primary={doc.originalname} secondary={`Uploaded by: ${doc.uploaderId}`} />
                    </ListItem>
                  ))}
                  {sources.urls.map(url => (
                    <ListItem key={url.id} secondaryAction={<IconButton edge="end" onClick={() => handleDeleteSource(url.id)}><DeleteIcon /></IconButton>}>
                      <ListItemText primary={url.title || url.url} secondary={url.url} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Chat Logs</Typography>
              {loading ? <CircularProgress /> : (
                <List>
                  {logs.map(log => (
                    <ListItem key={log.id}>
                      <ListItemText primary={log.message} secondary={`User: ${log.userId || 'anon'} | Model: ${log.modelUsed} | ${new Date(log.createdAt).toLocaleString()}`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
          {tab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Bot Config</Typography>
              <Button variant="outlined" onClick={() => setConfigDialog(true)} sx={{ mb: 2 }}>Edit Config</Button>
              <Typography>Rejection Message: {config.rejectionMessage}</Typography>
              <Typography>Model: {config.model}</Typography>
            </Box>
          )}
        </Paper>
      </Container>
      <Dialog open={configDialog} onClose={() => setConfigDialog(false)}>
        <DialogTitle>Edit Bot Config</DialogTitle>
        <DialogContent>
          <TextField label="Rejection Message" fullWidth margin="normal" value={config.rejectionMessage} onChange={e => setConfig({ ...config, rejectionMessage: e.target.value })} />
          <TextField label="Model" fullWidth margin="normal" value={config.model} onChange={e => setConfig({ ...config, model: e.target.value })} helperText="openai, openrouter, gemini, deepseek" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog(false)}>Cancel</Button>
          <Button onClick={handleConfigSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}

export default AdminPanel;


