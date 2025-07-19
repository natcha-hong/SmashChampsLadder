// src/pages/Ladder/DoublesLadder.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar2 from '../../components/Navbar/Navbar2'; 
import '../../App.css'; 
import { getCurrentUser, isAuthenticated } from '../../services/authService'; 
import { getAllPlayers, addSelfAsPlayer, updateMyPlayingStatus } from '../../services/playerService'; // Fixed import - removed getLastWeekPlayers

const DoublesLadder = ({ currentUser: propCurrentUser }) => {
  const [players, setPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [currentPlayerProfile, setCurrentPlayerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

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
          userEmail: player.userId?.email || '',
        }));
        
        // Sort by lifetime points
        const sortedPlayers = transformedPlayers.sort((a, b) => 
          (b.lifetimePoints || 0) - (a.lifetimePoints || 0)
        );
        
        setPlayers(sortedPlayers);
        
        // Find current user's player profile
        const currentUserData = getCurrentUser();
        if (currentUserData?.user) {
          const userPlayerProfile = sortedPlayers.find(player => 
            player.userId === currentUserData.user.id || 
            player.userEmail === currentUserData.user.email
          );
          setCurrentPlayerProfile(userPlayerProfile);
        }
        
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

  const handleJoinLadder = async () => {
    setIsJoining(true);
    try {
      const response = await addSelfAsPlayer();
      if (response?.success) {
        alert('Welcome to the ladder! You can now sign up for tournaments.');
        setShowJoinModal(false);
        await loadPlayers(); // Reload to show the new player
      } else {
        const errorMsg = response?.message || 'Failed to join ladder';
        alert(`Failed to join ladder: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Join ladder error:', error);
      alert('Failed to join ladder');
    } finally {
      setIsJoining(false);
    }
  };

  const handleTogglePlayingStatus = async () => {
    try {
      if (!currentPlayerProfile) return;

      const newStatus = !currentPlayerProfile.isPlaying;
      const response = await updateMyPlayingStatus(newStatus);
      
      if (response?.success) {
        // Update the local state for all players
        setPlayers(prev => prev.map(p => 
          p.id === currentPlayerProfile.id ? { ...p, isPlaying: newStatus } : p
        ));
        
        // Update current player profile
        setCurrentPlayerProfile(prev => ({ ...prev, isPlaying: newStatus }));
        
        // Show success message
        alert(`Your status has been updated to: ${newStatus ? 'Playing' : 'Not Playing'}`);
      } else {
        const errorMsg = response?.message || 'Failed to update status';
        alert(`Failed to update status: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const filteredPlayers = players.filter(player =>
    player?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="doubles-ladder-container">
        <Navbar2 />
        <div className="doubles-ladder-header">
          <h1 className="doubles-ladder-title">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="doubles-ladder-container">
        <Navbar2 />
        <div className="doubles-ladder-header">
          <h1 className="doubles-ladder-title">Please log in</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="doubles-ladder-container">
      <Navbar2 />
      <div className="doubles-ladder-header">
        <h1 className="doubles-ladder-title">Doubles Ladder</h1>
        <div className="doubles-ladder-header-info">
          <span className="doubles-ladder-last-modified">
            Welcome, {currentUser?.name || 'User'}
          </span>
          {currentPlayerProfile && (
            <div className="current-ranking-header-box">
              <span className="current-ranking-header-title">Your Current Ranking:</span>
              <span className="current-ranking-header-number">#{filteredPlayers.findIndex(p => p.id === currentPlayerProfile.id) + 1}</span>
              <span className="current-ranking-header-points">({currentPlayerProfile.lifetimePoints} points)</span>
            </div>
          )}
          {error && (
            <div className="doubles-error-message">
              {typeof error === 'string' ? error : 'An error occurred'}
            </div>
          )}
        </div>
      </div>

      <div className="doubles-ladder-content">
        {/* Show join button if user is not in the ladder */}
        {!currentPlayerProfile && (
          <div className="join-ladder-section">
            <h3 className="join-ladder-title">
              Join the Doubles Ladder!
            </h3>
            <p className="join-ladder-description">
              You're not currently registered for tournaments. Join now to participate!
            </p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="join-ladder-button"
            >
              Join Ladder
            </button>
          </div>
        )}

        <div className="doubles-ladder-search-container">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value || '')}
            className="doubles-ladder-search-box"
          />
        </div>

        <div className="doubles-ladder-search-info">
          Showing {filteredPlayers.length} of {players.length} players
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="doubles-empty-state">
            <p>No players found.</p>
          </div>
        ) : (
          <div className="doubles-ladder-players-grid">
            {filteredPlayers.map((player, index) => {
              if (!player?.id) return null;
              
              const isCurrentUser = player.id === currentPlayerProfile?.id;
              
              return (
                <div 
                  key={player.id} 
                  className={`doubles-ladder-player-card ${isCurrentUser ? 'current-user' : ''}`}
                >
                  <div className="doubles-ladder-player-info-left">
                    <div className="doubles-ladder-player-number">
                      {index + 1}
                    </div>
                    <div className="doubles-ladder-player-details">
                      <div className="doubles-ladder-player-name">
                        {player.name || 'Unknown'}
                        {isCurrentUser && (
                          <span className="current-user-indicator">
                            (You)
                          </span>
                        )}
                      </div>
                      <div className="doubles-ladder-player-rating">
                        <span>{player.lifetimePoints || 0} pts</span>
                        {player.lastWeekPoints && player.lastWeekPoints !== 0 && (
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
                  <div className="doubles-ladder-player-status">
                    {isCurrentUser ? (
                      <button
                        onClick={handleTogglePlayingStatus}
                        className={`doubles-ladder-status-btn ${player.isPlaying ? 'playing' : 'not-playing'}`}
                      >
                        {player.isPlaying ? 'Playing' : 'Not Playing'}
                      </button>
                    ) : (
                      <span className={`status-indicator ${player.isPlaying ? 'playing' : 'not-playing'}`}>
                        {player.isPlaying ? 'Playing' : 'Not Playing'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Ladder Modal */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                Join the Doubles Ladder
              </h2>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="modal-close-button"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                You're about to join the doubles tournament ladder as:
              </p>
              <div className="modal-user-info">
                <div className="modal-user-name">{currentUser.name}</div>
                <div className="modal-user-email">{currentUser.email}</div>
              </div>
              <p className="modal-terms">
                You'll start with 0 points and can begin participating in weekly tournaments.
              </p>
              
              <div className="modal-buttons">
                <button 
                  onClick={() => setShowJoinModal(false)}
                  disabled={isJoining}
                  className="modal-cancel-button"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleJoinLadder}
                  disabled={isJoining}
                  className={`modal-confirm-button ${isJoining ? 'loading' : ''}`}
                >
                  {isJoining ? 'JOINING...' : 'JOIN LADDER'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoublesLadder;