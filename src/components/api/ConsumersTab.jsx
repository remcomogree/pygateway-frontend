import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';
import ConsumerModal from '../modals/ConsumerModal';
import ConsumerPoliciesModal from '../modals/ConsumerPoliciesModal';
import Pagination from '../Pagination';

/**
 * ConsumersTab Component
 * 
 * Manages consumer CRUD operations in the API section
 */
const ConsumersTab = () => {
  console.log('🔄 ConsumersTab rendering...');
  const { state, api } = useAppState();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConsumer, setEditingConsumer] = useState(null);
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);

  // Pagination state
  const consumerPagination = state.pagination?.consumers;

  // Load consumers with pagination
  useEffect(() => {
    console.log('🔄 ConsumersTab useEffect - Loading consumers...');
    api.loadConsumers(0, 20); // Initial load
  }, []);

  // Debug: Log consumers data when it changes
  useEffect(() => {
    console.log('🔄 ConsumersTab - Consumers data changed:', {
      consumers: state.consumers,
      count: state.consumers?.length || 0,
      loading: state.loading?.consumers
    });
  }, [state.consumers]);

  const handlePageChange = (offset, limit) => {
    api.loadConsumers(offset, limit);
  };

  const handlePageSizeChange = (offset, limit) => {
    api.loadConsumers(offset, limit);
  };

  const handleCreate = () => {
    setEditingConsumer(null);
    setShowCreateModal(true);
  };

  const handleEdit = (consumer) => {
    setEditingConsumer(consumer);
    setShowCreateModal(true);
  };

  const handleManageKeys = (consumer) => {
    setSelectedConsumer(consumer);
    setShowKeysModal(true);
  };

  const handleManagePolicies = (consumer) => {
    console.log('🔐 Opening policies modal for consumer:', consumer.username || consumer.id);
    setSelectedConsumer(consumer);
    setShowPoliciesModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowKeysModal(false);
    setShowPoliciesModal(false);
    setEditingConsumer(null);
    setSelectedConsumer(null);
  };

  const handleConsumerCreated = () => {
    setShowCreateModal(false);
    setEditingConsumer(null);
    // Refresh consumers list
    const currentPagination = state.pagination?.consumers;
    api.loadConsumers(currentPagination?.offset || 0, currentPagination?.limit || 20);
  };

  const handleConsumerUpdated = () => {
    setShowCreateModal(false);
    setEditingConsumer(null);
    // Refresh consumers list
    const currentPagination = state.pagination?.consumers;
    api.loadConsumers(currentPagination?.offset || 0, currentPagination?.limit || 20);
  };

  const handleDelete = async (consumerId) => {
    if (!confirm('Are you sure you want to delete this consumer? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await api.deleteConsumer(consumerId);
      // Refresh consumers list with current pagination
      const currentPagination = state.pagination?.consumers;
      api.loadConsumers(currentPagination?.offset || 0, currentPagination?.limit || 20);
    } catch (error) {
      toast.error(`Failed to delete consumer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-1">API Consumers</h3>
          <p className="text-muted mb-0 small">Manage API consumers and their authentication credentials</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
          Add Consumer
        </button>
      </div>

      {!state.consumers || state.consumers.length === 0 ? (
        <div className="card card-body text-center py-5">
          <div className="mb-3" style={{fontSize:'48px'}}>👥</div>
          <h4>No Consumers Yet</h4>
          <p className="text-muted">Create your first API consumer to start managing access to your services.</p>
          <div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              Create Consumer
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="row row-cards">
            {state.consumers.map(consumer => (
              <div key={consumer.id} className="col-md-6 col-lg-4">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h4 className="card-title mb-1">{consumer.username || 'Anonymous'}</h4>
                        <code className="small text-muted">{consumer.id}</code>
                      </div>
                    </div>

                    {consumer.custom_id && (
                      <div className="d-flex gap-2 mb-1 small">
                        <span className="text-muted fw-medium">Custom ID:</span>
                        <code>{consumer.custom_id}</code>
                      </div>
                    )}

                    {consumer.tags && consumer.tags.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mb-2">
                        {consumer.tags.map(tag => (
                          <span key={tag} className="badge bg-secondary-lt">{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="small text-muted">Created: {formatDate(consumer.created_at)}</div>
                  </div>
                  <div className="card-footer d-flex gap-1 flex-wrap">
                    <button className="btn btn-sm btn-warning" onClick={() => handleManagePolicies(consumer)}>Policies</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleManageKeys(consumer)}>Keys</button>
                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(consumer)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(consumer.id)} disabled={loading}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {consumerPagination && (
            <Pagination
              pagination={consumerPagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}

      <ConsumerModal
        isOpen={showCreateModal}
        consumer={editingConsumer}
        onClose={handleCloseModal}
        onConsumerCreated={handleConsumerCreated}
        onConsumerUpdated={handleConsumerUpdated}
      />

      {showKeysModal && (
        <ConsumerModal
          isOpen={showKeysModal}
          consumer={selectedConsumer}
          onClose={handleCloseModal}
          showKeysOnly={true}
        />
      )}

      <ConsumerPoliciesModal
        isOpen={showPoliciesModal}
        consumerId={selectedConsumer?.id}
        consumerName={selectedConsumer?.username}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default ConsumersTab;
