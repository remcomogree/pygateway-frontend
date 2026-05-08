import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppState';
import ConsumerModal from './modals/ConsumerModal';
import ConsumerPoliciesModal from './modals/ConsumerPoliciesModal';
import Pagination from './Pagination';
import { IconPlus, IconEdit, IconTrash, IconKey, IconShieldLock } from '@tabler/icons-react';

const ConsumersView = () => {
  const { state, api } = useAppState();
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConsumer, setEditingConsumer] = useState(null);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [selectedConsumer, setSelectedConsumer] = useState(null);

  const loadData = async (offset = 0, limit = 15) => {
    setLoading(true);
    try { await api.loadConsumers(offset, limit); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const consumers = state.consumers || [];
  const pagination = state.pagination?.consumers;

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete consumer "${c.username}"?`)) return;
    try { await api.deleteConsumer(c.id); loadData(); } catch {}
  };

  if (loading && !consumers.length) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2">Loading consumers...</p></div>;
  }

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col">
            <h2 className="page-title">Consumers</h2>
            <div className="text-muted">{pagination?.total || consumers.length} total consumers</div>
          </div>
          <div className="col-auto">
            <button className="btn btn-primary" onClick={() => { setEditingConsumer(null); setShowCreateModal(true); }}>
              <IconPlus size={16} className="me-1" /> Create Consumer
            </button>
          </div>
        </div>
      </div>

      <div className="row row-cards mt-3">
        {consumers.length === 0 ? (
          <div className="col-12"><div className="card"><div className="card-body text-center text-muted py-4">No consumers found</div></div></div>
        ) : consumers.map((c) => (
          <div className="col-sm-6 col-lg-4" key={c.id}>
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <span className="avatar bg-primary-lt me-3">{(c.username || '?')[0].toUpperCase()}</span>
                  <div>
                    <div className="fw-bold">{c.username || 'Unnamed'}</div>
                    <div className="text-muted small">{c.custom_id || c.id?.substring(0, 12)}</div>
                  </div>
                </div>
                {c.tags && c.tags.length > 0 && (
                  <div className="mb-2">{c.tags.map((t) => <span key={t} className="badge bg-azure-lt me-1">{t}</span>)}</div>
                )}
                <div className="text-muted small mb-3">Created: {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</div>
              </div>
              <div className="card-footer">
                <div className="btn-list">
                  <button className="btn btn-sm" onClick={() => { setSelectedConsumer(c); setShowPoliciesModal(true); }}><IconShieldLock size={14} className="me-1" />Policies</button>
                  <button className="btn btn-sm" onClick={() => { setEditingConsumer(c); setShowCreateModal(true); }}><IconEdit size={14} className="me-1" />Edit</button>
                  <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(c)}><IconTrash size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination && (
        <div className="mt-3">
          <Pagination pagination={pagination} onPageChange={(o,l)=>loadData(o,l)} onPageSizeChange={(o,l)=>loadData(o,l)} />
        </div>
      )}

      {showCreateModal && (
        <ConsumerModal
          isOpen={showCreateModal}
          consumer={editingConsumer}
          onClose={() => { setShowCreateModal(false); setEditingConsumer(null); }}
          onConsumerCreated={() => { setShowCreateModal(false); setEditingConsumer(null); loadData(); }}
          onConsumerUpdated={() => { setShowCreateModal(false); setEditingConsumer(null); loadData(); }}
        />
      )}
      {showPoliciesModal && selectedConsumer && (
        <ConsumerPoliciesModal
          isOpen={showPoliciesModal}
          consumerId={selectedConsumer.id}
          consumerName={selectedConsumer.username}
          onClose={() => { setShowPoliciesModal(false); setSelectedConsumer(null); }}
        />
      )}
    </>
  );
};

export default ConsumersView;
