// src/components/RankingModal/RankingModal.jsx
import React, { useState } from 'react';

const RankingModal = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  currentUserPlayer, 
  currentUserGroup, 
  currentUserGroupIndex, 
  onSubmitRanking 
}) => {
  const [userRanking, setUserRanking] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setUserRanking('');
    onClose();
  };

  const handleSubmit = async () => {
    if (userRanking) {
      setIsSubmitting(true);
      try {
        await onSubmitRanking(userRanking, currentUserGroup.length);
        setUserRanking('');
      } catch (error) {
        console.error('Error submitting ranking:', error);
        alert('Failed to submit ranking. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      alert('Please select your ranking position.');
    }
  };

  if (!isOpen) return null;

  const groupSize = currentUserGroup ? currentUserGroup.length : 0;

  // Calculate points for each position to show user
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
        width: '500px',
        maxWidth: '90vw'
      }}>
        <div className="modal-header">
          <h2 className="modal-title">Enter Your Ranking</h2>
          <button className="modal-close-btn" onClick={handleClose} disabled={isSubmitting}>×</button>
        </div>
        
        <div className="modal-content" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          maxHeight: 'calc(90vh - 140px)',
          padding: '24px'
        }}>
          {currentUserPlayer && currentUserGroup ? (
            <>
              <div className="ranking-info">
                <h3>Group {currentUserGroupIndex + 1}</h3>
                <p>Players in your group:</p>
                <div className="group-players-list">
                  {currentUserGroup.map((player) => (
                    <div key={player.id} className="group-player-item">
                      <span className={player.userId === currentUser.id ? 'current-user-highlight' : ''}>
                        {player.name} {player.userId === currentUser.id ? '(You)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="modal-field" style={{ marginBottom: '16px' }}>
                <label className="modal-label">Select your finishing position:</label>
                <select 
                  className="modal-select"
                  value={userRanking}
                  onChange={(e) => setUserRanking(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Choose your position...</option>
                  {Array.from({ length: groupSize }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} - {i === 0 ? '1st Place (Winner)' : 
                                i === 1 ? '2nd Place' : 
                                i === 2 ? '3rd Place' : 
                                i === 3 ? '4th Place' : 
                                '5th Place (Last)'} ({getPointsForPosition(i + 1)} points)
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="ranking-instructions">
                <p><strong>Lifetime Ranking Points System:</strong></p>
                <ul>
                  <li>1st place = +2 points</li>
                  <li>2nd place = +1 point</li>
                  <li>3rd place = 0 points</li>
                  <li>4th place = {groupSize === 4 ? '-1 point (last)' : '0 points'}</li>
                  {groupSize === 5 && <li>5th place = -1 point (last)</li>}
                  <li style={{marginTop: '8px', fontWeight: 'bold'}}>
                    Weekly penalties: No-show (-2), No result (-1), Not playing (-1)
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="no-player-message">
              <p>You are not currently signed up to play.</p>
              <p>Go to Doubles Sign Ups to add yourself first!</p>
            </div>
          )}
        </div>
        
        <div className="modal-actions" style={{ 
          borderTop: '1px solid #e5e7eb',
          padding: '16px 24px',
          flexShrink: 0
        }}>
          <button className="modal-cancel-btn" onClick={handleClose} disabled={isSubmitting}>
            CANCEL
          </button>
          {currentUserPlayer && currentUserGroup && (
            <button 
              className="modal-add-btn" 
              onClick={handleSubmit}
              disabled={!userRanking || isSubmitting}
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT RANKING'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RankingModal;