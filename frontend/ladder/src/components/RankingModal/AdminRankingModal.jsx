// src/components/AdminRankingModal/AdminRankingModal.jsx
import React, { useState, useEffect } from 'react';

const AdminRankingModal = ({ 
  isOpen, 
  onClose, 
  group, 
  groupIndex, 
  onSubmitResults 
}) => {
  const [rankings, setRankings] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (group && isOpen && Array.isArray(group)) {
      const initialRankings = {};
      group.forEach((player, index) => {
        if (player?.id) {
          initialRankings[player.id] = index + 1;
        }
      });
      setRankings(initialRankings);
    }
  }, [group, isOpen]);

  const handleClose = () => {
    setRankings({});
    onClose();
  };

  const handleRankingChange = (playerId, position) => {
    if (!playerId) return;
    setRankings(prev => ({
      ...prev,
      [playerId]: parseInt(position) || 1
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!group || !Array.isArray(group)) return;
    
    const positions = Object.values(rankings);
    const uniquePositions = new Set(positions);
    
    if (uniquePositions.size !== positions.length) {
      alert('Each player must have a unique ranking position');
      return;
    }

    if (Math.min(...positions) !== 1 || Math.max(...positions) !== group.length) {
      alert(`Rankings must be from 1 to ${group.length}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const results = Object.entries(rankings).map(([playerId, position]) => ({
        playerId,
        position: parseInt(position) || 1,
        groupSize: group.length
      }));

      await onSubmitResults((groupIndex || 0) + 1, results);
      handleClose();
    } catch (error) {
      console.error('Error submitting rankings:', error);
      alert('Failed to submit rankings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !group || !Array.isArray(group)) return null;

  const groupSize = group.length;

  // Calculate points for each position
  const getPointsForPosition = (position) => {
    switch (position) {
      case 1: return '+2';
      case 2: return '+1';
      case 3: return '0';
      case 4: return groupSize === 4 ? '-1' : '0';
      case 5: return '-1';
      default: return '0';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ 
        maxHeight: '90vh', 
        display: 'flex', 
        flexDirection: 'column',
        width: '600px',
        maxWidth: '90vw'
      }}>
        <div className="modal-header">
          <h2 className="modal-title">Submit Group {(groupIndex || 0) + 1} Results</h2>
          <button className="modal-close-btn" onClick={handleClose} disabled={isSubmitting}>×</button>
        </div>
        
        <div className="modal-content" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          maxHeight: 'calc(90vh - 140px)',
          padding: '24px'
        }}>
          <div className="ranking-info">
            <h3>Group {(groupIndex || 0) + 1} Players</h3>
            <p>Assign rankings for each player (1st = winner, {groupSize}th = last):</p>
          </div>

          <div className="ranking-assignments" style={{ marginTop: '20px' }}>
            {group.map((player) => {
              if (!player?.id) return null;
              return (
                <div key={player.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                      {player.name || 'Unknown Player'}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>
                      {player.rating || 0} rating
                    </div>
                  </div>
                  
                  <div style={{ minWidth: '200px' }}>
                    <select
                      value={rankings[player.id] || 1}
                      onChange={(e) => handleRankingChange(player.id, e.target.value)}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      {Array.from({ length: groupSize }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} - {i === 0 ? '1st Place (Winner)' : 
                                    i === 1 ? '2nd Place' : 
                                    i === 2 ? '3rd Place' : 
                                    i === 3 ? '4th Place' : 
                                    '5th Place'}{i === groupSize - 1 && groupSize > 1 ? ' (Last)' : ''} ({getPointsForPosition(i + 1)} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Points System:</div>
            <div>1st: +2 pts | 2nd: +1 pt | 3rd: 0 pts | {groupSize === 4 ? '4th: -1 pt' : '4th: 0 pts | 5th: -1 pt'}</div>
          </div>
        </div>
        
        <div className="modal-actions" style={{ 
          borderTop: '1px solid #e5e7eb',
          padding: '16px 24px',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <button 
            type="button" 
            className="modal-cancel-btn" 
            onClick={handleClose} 
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              border: '1px solid #ccc',
              background: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            CANCEL
          </button>
          <button 
            type="submit" 
            className="modal-add-btn" 
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              background: '#4A90E2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting ? 'SUBMITTING...' : 'SUBMIT RESULTS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRankingModal;