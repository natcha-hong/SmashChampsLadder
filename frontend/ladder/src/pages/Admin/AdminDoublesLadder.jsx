// src/pages/Admin/AdminDoublesLadder.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar3 from '../../components/Navbar/Navbar3';
import '../../App.css';
import { getCurrentUser, isAuthenticated } from '../../services/authService';
import { getAllPlayers, updatePlayerStatus, markPlayerNoShow, addPlayer, removePlayer } from '../../services/playerService';

const AdminDoublesLadder = ({ currentUser: propCurrentUser }) => {
  const [players, setPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerData, setNewPlayerData] = useState({ name: '', email: '', rating: 0 });
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [submittedResults, setSubmittedResults] = useState({});
  const navigate = useNavigate();

  const getThursdayKey = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    
    let thisThursday;
    
    if (currentDay === 4 && (currentHour < 23 || (currentHour === 23 && currentMinute < 59))) {
      thisThursday = new Date(today);
    }
    else if (currentDay === 4 && currentHour === 23 && currentMinute >= 59) {
      thisThursday = new Date(today);
      thisThursday.setDate(today.getDate() + 7);
    }
    else if (currentDay > 4) {
      const daysUntilNextThursday = 7 - currentDay + 4;
      thisThursday = new Date(today);
      thisThursday.setDate(today.getDate() + daysUntilNextThursday);
    }
    else {
      const daysUntilThursday = 4 - currentDay;
      thisThursday = new Date(today);
      thisThursday.setDate(today.getDate() + daysUntilThursday);
    }
    
    return thisThursday.toISOString().split('T')[0];
  };

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        if (!isAuthenticated()) {
          navigate('/login');
          return;
        }

        if (propCurrentUser) {
          setCurrentUser(propCurrentUser);
          await loadPlayers();
        } else {
          const userData = getCurrentUser();
          if (userData?.user) {
            setCurrentUser(userData.user);
            
            // Check if user is admin
            const adminEmail = 'admin@smashchamps.com';
            if (userData.user.email !== adminEmail) {
              navigate('/doublesladder');
              return;
            }
            
            await loadPlayers();
          } else {
            navigate('/login');
            return;
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login');
      }
      
      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [navigate, propCurrentUser]);

  // Load submitted results from localStorage
  useEffect(() => {
    const thursdayKey = getThursdayKey();
    const savedResults = localStorage.getItem(`admin-results-${thursdayKey}`);
    if (savedResults) {
      try {
        setSubmittedResults(JSON.parse(savedResults));
      } catch (error) {
        console.error('Error loading submitted results:', error);
      }
    }

    // Set up interval to check for updates every 5 seconds
    const interval = setInterval(() => {
      const updatedResults = localStorage.getItem(`admin-results-${thursdayKey}`);
      if (updatedResults) {
        try {
          setSubmittedResults(JSON.parse(updatedResults));
        } catch (error) {
          console.error('Error loading updated results:', error);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadPlayers = async () => {
    try {
      const response = await getAllPlayers();
      if (response?.success && Array.isArray(response.players)) {
        const transformedPlayers = response.players.map((player, index) => ({
          id: player._id || `player-${index}`,
          name: player.name || 'Unknown Player',
          lifetimePoints: player.lifetimePoints || 0,
          lastWeekPoints: player.lastWeekPoints || 0,
          isPlaying: Boolean(player.isPlaying),
          userId: player.userId?._id || player.userId || '',
        }));
        
        // Sort by lifetime points
        const sortedPlayers = transformedPlayers.sort((a, b) => 
          (b.lifetimePoints || 0) - (a.lifetimePoints || 0)
        );
        
        setPlayers(sortedPlayers);
        setError('');
      } else {
        const errorMsg = typeof response?.message === 'string' ? response.message : 'Failed to load players';
        setError(errorMsg);
        setPlayers([]);
      }
    } catch (error) {
      console.error('Load players error:', error);
      setError('Failed to load players');
      setPlayers([]);
    }
  };

  const getPlayerCurrentResult = (playerId) => {
    // Check all groups for this player's result
    for (const groupNumber in submittedResults) {
      const groupResults = submittedResults[groupNumber];
      if (groupResults[playerId]) {
        return {
          groupNumber: parseInt(groupNumber),
          position: groupResults[playerId]
        };
      }
    }
    return null;
  };

  const calculatePointsFromPosition = (position, groupSize = 4) => {
    switch (position) {
      case 1: return 2;  // 1st place = +2 points
      case 2: return 1;  // 2nd place = +1 point
      case 3: return 0;  // 3rd place = 0 points
      case 4: return groupSize === 4 ? -1 : 0;  // 4th place = -1 if 4-player group, 0 if 5-player
      case 5: return -1; // 5th place = -1 point
      default: return 0;
    }
  };

  const getPlayerUpdatedPoints = (player) => {
    const currentResult = getPlayerCurrentResult(player.id);
    if (currentResult) {
      const earnedPoints = calculatePointsFromPosition(currentResult.position);
      return {
        originalPoints: player.lifetimePoints || 0,
        earnedPoints: earnedPoints,
        newTotal: (player.lifetimePoints || 0) + earnedPoints
      };
    }
    return {
      originalPoints: player.lifetimePoints || 0,
      earnedPoints: 0,
      newTotal: player.lifetimePoints || 0
    };
  };

  const handleTogglePlayerStatus = async (playerId, currentStatus, playerName) => {
    if (!playerId || !playerName) return;
    
    const newStatus = !currentStatus;
    const statusText = newStatus ? 'playing' : 'not playing';
    
    if (window.confirm(`Set ${playerName} to ${statusText}?`)) {
      try {
        const response = await updatePlayerStatus(playerId, newStatus);
        if (response?.success) {
          await loadPlayers();
        } else {
          const errorMsg = typeof response?.message === 'string' ? response.message : 'Failed to update status';
          alert(`Failed to update status: ${errorMsg}`);
        }
      } catch (error) {
        console.error('Update status error:', error);
        alert('Failed to update player status');
      }
    }
  };

  const handleMarkNoShow = async (playerId, playerName) => {
    if (!playerId || !playerName) return;
    
    if (window.confirm(`Mark ${playerName} as NO SHOW? This will apply a -2 point penalty.`)) {
      try {
        const response = await markPlayerNoShow(playerId);
        if (response?.success) {
          alert(`${playerName} marked as no-show. -2 points applied.`);
          await loadPlayers();
        } else {
          const errorMsg = typeof response?.message === 'string' ? response.message : 'Failed to mark no-show';
          alert(`Failed to mark no-show: ${errorMsg}`);
        }
      } catch (error) {
        console.error('Mark no-show error:', error);
        alert('Failed to mark player as no-show');
      }
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerData.name.trim() || !newPlayerData.email.trim()) {
      alert('Name and email are required');
      return;
    }

    setIsAddingPlayer(true);
    try {
      const response = await addPlayer(newPlayerData);
      if (response?.success) {
        alert(`Player "${newPlayerData.name}" added successfully!`);
        setNewPlayerData({ name: '', email: '', rating: 0 });
        setShowAddPlayerModal(false);
        await loadPlayers(); // Reload the players list
      } else {
        const errorMsg = response?.message || 'Failed to add player';
        alert(`Failed to add player: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Add player error:', error);
      alert('Failed to add player');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (playerId, playerName) => {
    if (!playerId || !playerName) return;
    
    if (window.confirm(`Are you sure you want to remove "${playerName}" from the ladder? This action cannot be undone.`)) {
      try {
        const response = await removePlayer(playerId);
        if (response?.success) {
          alert(`Player "${playerName}" removed successfully.`);
          await loadPlayers(); // Reload the players list
        } else {
          const errorMsg = response?.message || 'Failed to remove player';
          alert(`Failed to remove player: ${errorMsg}`);
        }
      } catch (error) {
        console.error('Remove player error:', error);
        alert('Failed to remove player');
      }
    }
  };

  const filteredPlayers = players.filter(player =>
    player?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="doubles-ladder-container">
        <Navbar3 />
        <div className="doubles-ladder-header">
          <h1 className="doubles-ladder-title">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="doubles-ladder-container">
        <Navbar3 />
        <div className="doubles-ladder-header">
          <h1 className="doubles-ladder-title">Please log in</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="doubles-ladder-container">
      <Navbar3 />
      <div className="doubles-ladder-header">
        <h1 className="doubles-ladder-title">Doubles Ladder - Admin View</h1>
        <div className="doubles-ladder-header-info">
          <span className="doubles-ladder-last-modified">
            Admin: {currentUser?.name || 'User'}
          </span>
          {error && (
            <div className="doubles-error-message">
              {typeof error === 'string' ? error : 'An error occurred'}
            </div>
          )}
        </div>
      </div>

      <div className="doubles-ladder-content">
        <div className="doubles-ladder-search-container">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value || '')}
            className="doubles-ladder-search-box"
          />
          <button
            onClick={() => setShowAddPlayerModal(true)}
            style={{
              marginLeft: '10px',
              padding: '10px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            + Add Player
          </button>
        </div>

        <div className="doubles-ladder-search-info">
          Showing {filteredPlayers.length} of {players.length} players
          {Object.keys(submittedResults).length > 0 && (
            <span style={{ marginLeft: '20px', color: '#10b981', fontWeight: 'bold' }}>
              • {Object.keys(submittedResults).length} group(s) with results submitted
            </span>
          )}
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="doubles-empty-state">
            <p>No players found.</p>
          </div>
        ) : (
          <div className="doubles-ladder-players-grid">
            {filteredPlayers.map((player, index) => {
              if (!player?.id) return null;
              
              const currentResult = getPlayerCurrentResult(player.id);
              const pointsInfo = getPlayerUpdatedPoints(player);
              
              return (
                <div key={player.id} className="doubles-ladder-player-card">
                  <div className="doubles-ladder-player-info-left">
                    <div className="doubles-ladder-player-number">
                      {index + 1}
                    </div>
                    <div className="doubles-ladder-player-details">
                      <div className="doubles-ladder-player-name">
                        {player.name || 'Unknown'}
                      </div>
                      <div className="doubles-ladder-player-rating">
                        {currentResult ? (
                          <>
                            <span>{pointsInfo.newTotal} pts</span>
                            <div className={`doubles-ladder-rating-arrow ${pointsInfo.earnedPoints >= 0 ? 'up' : 'down'}`}></div>
                            <span className={pointsInfo.earnedPoints >= 0 ? 'doubles-ladder-rating-positive' : 'doubles-ladder-rating-negative'}>
                              {pointsInfo.earnedPoints >= 0 ? '+' : ''}{pointsInfo.earnedPoints}
                            </span>
                          </>
                        ) : (
                          <span>{player.lifetimePoints || 0} pts</span>
                        )}
                        {player.lastWeekPoints && player.lastWeekPoints !== 0 && !currentResult && (
                          <>
                            <div className={`doubles-ladder-rating-arrow ${player.lastWeekPoints > 0 ? 'up' : 'down'}`}></div>
                            <span className={player.lastWeekPoints > 0 ? 'doubles-ladder-rating-positive' : 'doubles-ladder-rating-negative'}>
                              {player.lastWeekPoints > 0 ? '+' : ''}{player.lastWeekPoints}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="admin-ladder-controls">
                    <button
                      className={`doubles-ladder-status-btn ${player.isPlaying ? 'playing' : 'not-playing'}`}
                      onClick={() => handleTogglePlayerStatus(player.id, player.isPlaying, player.name)}
                    >
                      {player.isPlaying ? 'Playing' : 'Not Playing'}
                    </button>
                    <button
                      className="admin-no-show-btn"
                      onClick={() => handleMarkNoShow(player.id, player.name)}
                      disabled={!player.isPlaying}
                    >
                      No Show
                    </button>
                    <button
                      className="admin-remove-btn"
                      onClick={() => handleRemovePlayer(player.id, player.name)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '4px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '500px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Add New Player (Admin)
              </h2>
              <button 
                onClick={() => {
                  setShowAddPlayerModal(false);
                  setNewPlayerData({ name: '', email: '', rating: 0 });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px'
                }}>
                  Player Name *
                </label>
                <input
                  type="text"
                  value={newPlayerData.name}
                  onChange={(e) => setNewPlayerData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isAddingPlayer}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter player name"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={newPlayerData.email}
                  onChange={(e) => setNewPlayerData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isAddingPlayer}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter email address"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px'
                }}>
                  Initial Rating
                </label>
                <input
                  type="number"
                  value={newPlayerData.rating}
                  onChange={(e) => setNewPlayerData(prev => ({ ...prev, rating: parseInt(e.target.value) || 0 }))}
                  disabled={isAddingPlayer}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="0"
                />
              </div>

              <div style={{
                backgroundColor: '#f9fafb',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                <strong>Note:</strong> If this email doesn't have an account, a temporary account will be created. 
                The player will need to reset their password on first login.
              </div>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button 
                  onClick={() => {
                    setShowAddPlayerModal(false);
                    setNewPlayerData({ name: '', email: '', rating: 0 });
                  }}
                  disabled={isAddingPlayer}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#374151',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isAddingPlayer ? 'not-allowed' : 'pointer',
                    opacity: isAddingPlayer ? 0.6 : 1
                  }}
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleAddPlayer}
                  disabled={isAddingPlayer}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    backgroundColor: isAddingPlayer ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isAddingPlayer ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAddingPlayer ? 'ADDING...' : 'ADD PLAYER'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoublesLadder;