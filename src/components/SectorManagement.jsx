import React, { useState, useEffect } from 'react';
import './SectorManagement.css';

// URL da API backend
const API_BASE_URL = 'http://localhost:3001/api';

const SectorManagement = () => {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSector, setEditingSector] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#007bff'
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fazendo requisição para buscar setores...');
      console.log('Token:', token ? 'Presente' : 'Ausente');
      
      const response = await fetch(`${API_BASE_URL}/sectors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Resposta de erro:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        } catch (parseError) {
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);
      setSectors(data.sectors || []);
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      setError(`Erro ao buscar setores: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingSector 
        ? `${API_BASE_URL}/sectors/${editingSector.id}`
        : `${API_BASE_URL}/sectors`;
      
      const method = editingSector ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar setor');
      }

      await fetchSectors();
      resetForm();
      setShowForm(false);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEdit = (sector) => {
    setEditingSector(sector);
    setFormData({
      name: sector.name,
      description: sector.description || '',
      color: sector.color
    });
    setShowForm(true);
  };

  const handleDelete = async (sectorId) => {
    if (!window.confirm('Tem certeza que deseja excluir este setor?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sectors/${sectorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir setor');
      }

      await fetchSectors();
    } catch (error) {
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#007bff'
    });
    setEditingSector(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  if (loading) {
    return <div className="sector-management loading">Carregando setores...</div>;
  }

  return (
    <div className="sector-management">
      <div className="sector-header">
        <h2>Gerenciamento de Setores</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Novo Setor
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showForm && (
        <div className="sector-form-overlay">
          <div className="sector-form">
            <h3>{editingSector ? 'Editar Setor' : 'Novo Setor'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Nome do Setor *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="Ex: Vendas, Suporte, TI"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Descrição</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição do setor (opcional)"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="color">Cor</label>
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSector ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="sectors-list">
        {sectors.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum setor cadastrado</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              Criar primeiro setor
            </button>
          </div>
        ) : (
          <div className="sectors-grid">
            {sectors.map((sector) => (
              <div key={sector.id} className="sector-card">
                <div className="sector-header">
                  <div 
                    className="sector-color"
                    style={{ backgroundColor: sector.color }}
                  ></div>
                  <h4>{sector.name}</h4>
                </div>
                
                {sector.description && (
                  <p className="sector-description">{sector.description}</p>
                )}
                
                <div className="sector-meta">
                  <span className="sector-status">
                    {sector.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="sector-date">
                    Criado em: {new Date(sector.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="sector-actions">
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleEdit(sector)}
                  >
                    Editar
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(sector.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SectorManagement; 