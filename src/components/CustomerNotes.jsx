import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Divider,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { Add, Delete, Edit, Person, Refresh, Warning } from '@mui/icons-material';

const CustomerNotes = ({ customerId, customerName }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editText, setEditText] = useState('');

  // Buscar observações do cliente
  const fetchNotes = async () => {
    if (!customerId) {
      setError('ID do cliente não fornecido');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }

      console.log('[CUSTOMER NOTES] Buscando observações para cliente:', customerId);
      const response = await fetch(`http://localhost:3001/api/customers/${customerId}/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[CUSTOMER NOTES] Resposta da API:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[CUSTOMER NOTES] Dados recebidos:', data);
      
      if (data.success) {
        setNotes(data.notes || []);
      } else {
        setError(data.error || 'Erro ao carregar observações');
      }
    } catch (error) {
      console.error('Erro ao buscar observações:', error);
      setError(`Erro ao carregar observações: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar nova observação
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    if (!customerId) {
      setError('ID do cliente não fornecido');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: newNote.trim() })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setNewNote('');
        await fetchNotes(); // Recarregar observações
      } else {
        setError(data.error || 'Erro ao adicionar observação');
      }
    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
      setError(`Erro ao adicionar observação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Editar observação
  const handleEditNote = async () => {
    if (!editingNote || !editText.trim()) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/customers/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: editText.trim() })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setEditingNote(null);
        setEditText('');
        await fetchNotes(); // Recarregar observações
      } else {
        setError(data.error || 'Erro ao editar observação');
      }
    } catch (error) {
      console.error('Erro ao editar observação:', error);
      setError(`Erro ao editar observação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Deletar observação
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Token de autenticação não encontrado');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/customers/notes/${noteToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        await fetchNotes(); // Recarregar observações
        setDeleteDialogOpen(false);
        setNoteToDelete(null);
      } else {
        setError(data.error || 'Erro ao deletar observação');
      }
    } catch (error) {
      console.error('Erro ao deletar observação:', error);
      setError(`Erro ao deletar observação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar edição
  const startEditing = (note) => {
    setEditingNote(note);
    setEditText(note.note);
  };

  // Cancelar edição
  const cancelEditing = () => {
    setEditingNote(null);
    setEditText('');
  };

  // Formatar data
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchNotes();
    }
  }, [customerId]);

  if (!customerId) {
    return (
      <Box p={3} textAlign="center">
        <Warning color="warning" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          ID do cliente não fornecido
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Selecione um cliente para ver suas observações
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center">
          <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
          Observações - {customerName || 'Cliente'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchNotes}
          disabled={loading}
          size="small"
        >
          Atualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Adicionar nova observação */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Adicionar Nova Observação
          </Typography>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Digite sua observação sobre este cliente..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={loading}
              variant="outlined"
              size="small"
            />
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <Add />}
              onClick={handleAddNote}
              disabled={!newNote.trim() || loading}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Lista de observações */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Observações ({notes.length})
          </Typography>
          
          {loading && notes.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Carregando observações...</Typography>
            </Box>
          ) : notes.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                Nenhuma observação encontrada
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Adicione observações sobre este cliente
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notes.map((note, index) => (
                <React.Fragment key={note.id}>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    {editingNote?.id === note.id ? (
                      <Box width="100%">
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          disabled={loading}
                          variant="outlined"
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        <Box display="flex" gap={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            onClick={cancelEditing}
                            disabled={loading}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={handleEditNote}
                            disabled={!editText.trim() || loading}
                          >
                            {loading ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body1" sx={{ flex: 1 }}>
                              {note.note}
                            </Typography>
                            <Chip
                              label={note.user_name || note.username || 'Usuário'}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          </Box>
                        }
                        secondary={
                          <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(note.created_at)}
                            </Typography>
                            {note.updated_at && note.updated_at !== note.created_at && (
                              <Typography variant="caption" color="text.secondary">
                                (editado em {formatDate(note.updated_at)})
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    )}
                    {editingNote?.id !== note.id && (
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={0.5}>
                          <IconButton
                            edge="end"
                            onClick={() => startEditing(note)}
                            disabled={loading}
                            size="small"
                            title="Editar observação"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => {
                              setNoteToDelete(note);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={loading}
                            size="small"
                            title="Excluir observação"
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                  {index < notes.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação para deletar */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta observação?
          </Typography>
          {noteToDelete && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              "{noteToDelete.note}"
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteNote} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerNotes; 