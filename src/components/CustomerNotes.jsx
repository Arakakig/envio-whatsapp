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
  DialogActions
} from '@mui/material';
import { Add, Delete, Edit, Person } from '@mui/icons-material';

const CustomerNotes = ({ customerId, customerName }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Buscar observações do cliente
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('[CUSTOMER NOTES] Buscando observações para cliente:', customerId);
      const response = await fetch(`http://localhost:3001/api/customers/${customerId}/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[CUSTOMER NOTES] Resposta da API:', response.status);
      const data = await response.json();
      console.log('[CUSTOMER NOTES] Dados recebidos:', data);
      
      if (data.success) {
        setNotes(data.notes);
      } else {
        setError('Erro ao carregar observações');
      }
    } catch (error) {
      console.error('Erro ao buscar observações:', error);
      setError('Erro ao carregar observações');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar nova observação
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: newNote.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setNewNote('');
        fetchNotes(); // Recarregar observações
      } else {
        setError(data.error || 'Erro ao adicionar observação');
      }
    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
      setError('Erro ao adicionar observação');
    } finally {
      setLoading(false);
    }
  };

  // Deletar observação
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/customers/notes/${noteToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchNotes(); // Recarregar observações
        setDeleteDialogOpen(false);
        setNoteToDelete(null);
      } else {
        setError(data.error || 'Erro ao deletar observação');
      }
    } catch (error) {
      console.error('Erro ao deletar observação:', error);
      setError('Erro ao deletar observação');
    } finally {
      setLoading(false);
    }
  };

  // Formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (customerId) {
      fetchNotes();
    }
  }, [customerId]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
        Observações - {customerName}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Adicionar nova observação */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Adicionar observação sobre o cliente..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            disabled={loading}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNote}
            disabled={!newNote.trim() || loading}
            sx={{ minWidth: 'auto' }}
          >
            Adicionar
          </Button>
        </Box>
      </Paper>

      {/* Lista de observações */}
      <Paper>
        <List>
          {notes.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Nenhuma observação encontrada"
                secondary="Adicione observações sobre este cliente"
              />
            </ListItem>
          ) : (
            notes.map((note, index) => (
              <React.Fragment key={note.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">
                          {note.note}
                        </Typography>
                        <Chip
                          label={note.user_name || note.username}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={formatDate(note.created_at)}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => {
                        setNoteToDelete(note);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={loading}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notes.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

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
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteNote} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerNotes; 