// src/pages/Admin/AdminDoublesGroup.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar2 from '../../components/Navbar/Navbar3';
import AdminRankingModal from '../../components/RankingModal/AdminRankingModal';
import '../../App.css';
import { getCurrentUser, isAuthenticated } from '../../services/authService';
import { 
  getCurrentGroups,
  getLastGroups,
  formGroups,
  submitPlayerRanking,
  submitGroupRankings
} from '../../services/adminService';

const AdminDoublesGroup = ({ currentUser: propCurrentUser }) => {
  const [currentWeekGroups, setCurrentWeekGroups] = useState([]);
  const [lastWeekGroups, setLastWeekGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('thisWeek');
  const [showAlert, setShowAlert] = useState(true);
  const [showAdminRankingModal, setShowAdminRankingModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(-1);
  const [isFormingGroups, setIsFormingGroups] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        if (!isAuthenticated()) {
          console.log('User not authenticated, redirecting to login');
          navigate('/login');
          return;
        }

        let userData;
        
        // Try to use props first, then fallback to auth service
        if (propCurrentUser) {
          console.log('Using prop current user:', propCurrentUser);
          setCurrentUser(propCurrentUser);
          userData = { user: propCurrentUser };
        } else {
          console.log('Getting user from auth service');
          userData = getCurrentUser();
          console.log('Auth service returned:', userData);
          
          if (userData?.user) {
            setCurrentUser(userData.user);
          } else {
            console.log('No user data found, redirecting to login');
            navigate('/login');
            return;
          }
        }
        
        await loadGroupData();
        
      } catch (error) {
        console.error('Error in checkAuthAndLoadData:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [navigate, propCurrentUser]);

  const loadGroupData = async () => {
    try {
      console.log('Loading group data...');
      
      // Load both current and last week groups using admin service
      const [currentResponse, lastResponse] = await Promise.all([
        getCurrentGroups(),
        getLastGroups()
      ]);

      console.log('Current groups response:', currentResponse);
      console.log('Last groups response:', lastResponse);

      // Handle current week groups
      if (currentResponse?.success && Array.isArray(currentResponse.groups)) {
        setCurrentWeekGroups(currentResponse.groups);
      } else {
        console.log('No current week groups or invalid response');
        setCurrentWeekGroups([]);
      }

      // Handle last week groups
      if (lastResponse?.success && Array.isArray(lastResponse.groups)) {
        setLastWeekGroups(lastResponse.groups);
      } else {
        console.log('No last week groups or invalid response');
        setLastWeekGroups([]);
      }

      setError('');
    } catch (error) {
      console.error('Load group data error:', error);
      setError(`Failed to load group data: ${error.message}`);
      setCurrentWeekGroups([]);
      setLastWeekGroups([]);
    }
  };

  const handleFormGroups = async () => {
    if (!window.confirm('Are you sure you want to create groups for this week? This will create groups based on current active players.')) {
      return;
    }

    setIsFormingGroups(true);
    try {
      const response = await formGroups();
      if (response?.success) {
        alert('Groups have been formed successfully!');
        await loadGroupData(); // Reload to show new groups
      } else {
        throw new Error(response?.message || 'Failed to create groups');
      }
    } catch (error) {
      console.error('Error forming groups:', error);
      alert(`Failed to create groups: ${error.message}`);
    } finally {
      setIsFormingGroups(false);
    }
  };

  const handleEnterGroupResult = (group, groupIndex) => {
    console.log('Original group data:', group);
    
    // Transform group data to match AdminRankingModal expectations
    const transformedGroup = group.map((player, index) => {
      // Enhanced player ID extraction - try multiple possible paths
      let playerId = null;
      let playerName = 'Unknown Player';
      let playerRating = 0;
      let playerEmail = '';
      let lifetimePoints = 0;

      // Try to extract player data from various possible structures
      if (player.userId) {
        // Case 1: player has userId object
        playerId = player.userId._id || player.userId.id;
        playerName = player.userId.name || player.name;
        playerRating = player.userId.rating || player.rating || 0;
        playerEmail = player.userId.email || player.email;
        lifetimePoints = player.userId.lifetimePoints || player.lifetimePoints || 0;
      } else if (player._id || player.id) {
        // Case 2: player object is the user data itself
        playerId = player._id || player.id;
        playerName = player.name;
        playerRating = player.rating || 0;
        playerEmail = player.email;
        lifetimePoints = player.lifetimePoints || 0;
      }
      
      console.log(`Player ${index}:`, {
        original: player,
        playerId,
        playerName,
        playerRating,
        playerEmail,
        lifetimePoints
      });
      
      if (!playerId) {
        console.warn(`Warning: Player at index ${index} has no valid ID:`, player);
      }
      
      return {
        id: playerId,
        name: playerName,
        rating: playerRating,
        email: playerEmail,
        lifetimePoints: lifetimePoints
      };
    });

    console.log('Transformed group:', transformedGroup);
    
    // Check if all players have valid IDs
    const invalidPlayers = transformedGroup.filter(player => !player.id);
    if (invalidPlayers.length > 0) {
      console.error('Players with invalid IDs:', invalidPlayers);
      alert(`Error: ${invalidPlayers.length} players don't have valid IDs. Please check the console for details.\n\nThis usually means the group data structure is different than expected.`);
      return;
    }

    setSelectedGroup(transformedGroup);
    setSelectedGroupIndex(groupIndex);
    setShowAdminRankingModal(true);
  };

  const handleCloseAdminRankingModal = () => {
    setShowAdminRankingModal(false);
    setSelectedGroup(null);
    setSelectedGroupIndex(-1);
  };

  // Enhanced admin results submission with better error handling
  const handleSubmitAdminResults = async (groupNumber, results) => {
    try {
      console.log('Submitting admin results:', { groupNumber, results });
      
      // Validate that we have valid player IDs
      const invalidResults = results.filter(result => !result.playerId);
      if (invalidResults.length > 0) {
        throw new Error(`${invalidResults.length} players are missing valid IDs. Cannot submit rankings.`);
      }

      // Option 1: Try bulk submission first (if available)
      try {
        console.log('Attempting bulk group ranking submission...');
        const bulkResponse = await submitGroupRankings(groupNumber + 1, results);
        
        if (bulkResponse?.success) {
          console.log('Bulk submission successful:', bulkResponse);
          alert(`✅ All rankings for Group ${groupNumber + 1} submitted successfully!\n\nLifetime points have been updated for all players.`);
          setShowAdminRankingModal(false);
          await loadGroupData();
          return;
        } else {
          console.log('Bulk submission failed, trying individual submissions:', bulkResponse);
        }
      } catch (bulkError) {
        console.log('Bulk submission not available or failed:', bulkError.message);
      }

      // Option 2: Individual submissions as fallback
      console.log('Proceeding with individual player submissions...');
      let successCount = 0;
      let failedSubmissions = [];

      for (const result of results) {
        console.log(`Processing player ${result.playerId} (${result.playerName}):`, result);
        
        try {
          const response = await submitPlayerRanking(
            result.playerId, 
            result.position, 
            result.groupSize,
            groupNumber + 1 // Pass group number for context
          );
          
          if (response?.success) {
            console.log(`Individual ranking submission success for player ${result.playerId}:`, response);
            successCount++;
          } else {
            throw new Error(response?.message || response?.error || 'Submission failed - no error message');
          }
        } catch (error) {
          console.error(`Individual ranking submission failed for player ${result.playerId}:`, error);
          failedSubmissions.push({
            playerId: result.playerId,
            playerName: result.playerName || selectedGroup?.find(p => p.id === result.playerId)?.name || 'Unknown',
            error: error.message || 'Unknown error'
          });
        }
      }

      // Show results
      if (failedSubmissions.length === 0) {
        alert(`✅ All ${successCount} player results submitted successfully for Group ${groupNumber + 1}!\n\nLifetime points have been updated for all players.`);
        setShowAdminRankingModal(false);
      } else if (successCount > 0) {
        const failedList = failedSubmissions.map(f => `• ${f.playerName} (ID: ${f.playerId}): ${f.error}`).join('\n');
        alert(`⚠️ Partial Success: ${successCount} players submitted successfully, but ${failedSubmissions.length} failed:\n\n${failedList}\n\nPlease check the backend logs and try submitting the failed players again.`);
      } else {
        const failedList = failedSubmissions.map(f => `• ${f.playerName} (ID: ${f.playerId}): ${f.error}`).join('\n');
        alert(`❌ All submissions failed for Group ${groupNumber + 1}:\n\n${failedList}\n\nThis might indicate:\n1. Backend admin API endpoints don't exist or are down\n2. Admin permissions not properly configured\n3. Player IDs are incorrect or players don't exist in database\n4. Network connectivity issues\n\nCheck browser console and backend logs for more details.`);
        // Don't close modal if everything failed
        return;
      }
      
      // Always reload data to show any changes
      await loadGroupData();
      
    } catch (error) {
      console.error('Error submitting results:', error);
      alert(`❌ Failed to submit results: ${error.message}\n\nPlease check:\n1. Network connection\n2. Backend server status\n3. Admin API endpoints are implemented\n4. Player data is valid\n\nSee console for technical details.`);
    }
  };

  const handleThisWeekClick = () => {
    setActiveTab('thisWeek');
    setShowAlert(true);
  };

  const handleLastWeekClick = () => {
    setActiveTab('lastWeek');
    setShowAlert(false);
  };

  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    
    let thisWeek, lastWeek;
    if (currentDay <= 4) {
      const daysUntilThursday = 4 - currentDay;
      thisWeek = new Date(today);
      thisWeek.setDate(today.getDate() + daysUntilThursday);
    } else {
      const daysUntilNextThursday = 7 - currentDay + 4;
      thisWeek = new Date(today);
      thisWeek.setDate(today.getDate() + daysUntilNextThursday);
    }
    
    lastWeek = new Date(thisWeek);
    lastWeek.setDate(thisWeek.getDate() - 7);
    
    return {
      lastWeek: lastWeek.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      thisWeek: thisWeek.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    };
  };

  const { lastWeek, thisWeek } = getWeekDates();

  const renderGroups = (groups, isLastWeek = false) => {
    if (!Array.isArray(groups) || groups.length === 0) {
      return (
        <div className="doubles-empty-state">
          <p>No groups available for {isLastWeek ? 'last week' : 'this week'}.</p>
          {!isLastWeek && <p>Click "Create Groups" to create groups for this week.</p>}
        </div>
      );
    }

    return (
      <div className="doubles-groups-container">
        {groups.map((group, groupIndex) => {
          if (!Array.isArray(group)) return null;
          
          // Sort players by their ranking for last week groups
          let sortedGroup = [...group];
          if (isLastWeek) {
            sortedGroup.sort((a, b) => {
              const aRanking = a.lastWeekGroup?.finalRanking || a.lastWeekGroup?.groupPosition || 999;
              const bRanking = b.lastWeekGroup?.finalRanking || b.lastWeekGroup?.groupPosition || 999;
              return aRanking - bRanking;
            });
          } else {
            // For current week, sort by group position
            sortedGroup.sort((a, b) => {
              const aPos = a.currentWeekGroup?.groupPosition || 999;
              const bPos = b.currentWeekGroup?.groupPosition || 999;
              return aPos - bPos;
            });
          }
          
          return (
            <div key={groupIndex} className="doubles-group-card">
              <div className="doubles-group-header">
                Group {groupIndex + 1}
                {isLastWeek && (
                  <span className="doubles-group-subtitle"> - Final Results</span>
                )}
                {/* Admin controls for current week groups */}
                {!isLastWeek && (
                  <button
                    className="doubles-enter-result-btn"
                    onClick={() => handleEnterGroupResult(group, groupIndex)}
                    style={{
                      marginLeft: 'auto',
                      padding: '8px 16px',
                      backgroundColor: '#4A90E2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    Enter Results
                  </button>
                )}
                {/* Admin controls for last week - allow editing results */}
                {isLastWeek && (
                  <button
                    className="doubles-enter-result-btn"
                    onClick={() => handleEnterGroupResult(group, groupIndex)}
                    style={{
                      marginLeft: 'auto',
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    Edit Results
                  </button>
                )}
              </div>
              <div className="doubles-group-content">
                {sortedGroup.map((player, playerIndex) => {
                  // Handle different player data structures
                  const playerData = player.userId || player;
                  if (!playerData) return null;
                  
                  const isCurrentUser = playerData._id === currentUser?.id || 
                                      playerData.id === currentUser?.id ||
                                      playerData.email === currentUser?.email;
                  
                  // Determine position and points to display
                  let displayPosition;
                  let positionLabel = '';
                  let pointsEarned = 0;
                  
                  if (isLastWeek) {
                    // For last week, show final ranking if available, otherwise group position
                    if (player.lastWeekGroup?.finalRanking) {
                      displayPosition = player.lastWeekGroup.finalRanking;
                      positionLabel = '#';
                    } else if (player.lastWeekGroup?.groupPosition) {
                      displayPosition = player.lastWeekGroup.groupPosition;
                      positionLabel = '#';
                    } else {
                      displayPosition = playerIndex + 1;
                      positionLabel = '#';
                    }
                    pointsEarned = player.lastWeekGroup?.pointsEarned || 0;
                  } else {
                    // For current week, show group position
                    displayPosition = player.currentWeekGroup?.groupPosition || playerIndex + 1;
                    positionLabel = '#';
                  }
                  
                  return (
                    <div
                      key={playerData._id || playerData.id || playerIndex}
                      className={`doubles-player-row ${isCurrentUser ? 'current-user' : ''}`}
                    >
                      <div className="doubles-player-number">
                        {positionLabel}{displayPosition}
                      </div>
                      <div className="doubles-player-name">
                        {playerData.name || player.name || 'Unknown Player'}
                        {isCurrentUser && (
                          <span className="current-user-indicator"> (You)</span>
                        )}
                        
                        {/* Show lifetime points for admin */}
                        <span className="doubles-lifetime-points">
                          [{playerData.lifetimePoints || player.lifetimePoints || 0} pts total]
                        </span>
                        
                        {isLastWeek && (
                          <span className={`doubles-points-earned ${pointsEarned >= 0 ? 'positive' : 'negative'}`}>
                            ({pointsEarned >= 0 ? '+' : ''}{pointsEarned} pts this week)
                          </span>
                        )}
                        
                        {!isLastWeek && player.currentWeekGroup?.hasSubmittedRanking && (
                          <span className="doubles-submitted">
                            ✓ Submitted
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="doubles-container">
        <Navbar2 />
        <div className="doubles-header">
          <h1 className="doubles-title">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="doubles-container">
        <Navbar2 />
        <div className="doubles-header">
          <h1 className="doubles-title">Please log in</h1>
          <p>User data not found. Please try logging in again.</p>
          <button onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="doubles-container">
      <Navbar2 />
      <div className="doubles-header">
        <h1 className="doubles-title">Doubles Groups - Admin View</h1>
        <div className="doubles-header-info">
          <span className="doubles-welcome">
            Admin: {currentUser?.name || 'User'}
          </span>
          {error && (
            <div className="doubles-error-message">
              {typeof error === 'string' ? error : 'An error occurred'}
            </div>
          )}
          <button
            className="doubles-add-player-btn"
            onClick={handleFormGroups}
            disabled={isFormingGroups}
            style={{
              padding: '12px 24px',
              backgroundColor: isFormingGroups ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isFormingGroups ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              marginLeft: '12px'
            }}
          >
            {isFormingGroups ? 'Forming Groups...' : 'Create Groups'}
          </button>
        </div>
      </div>
      
      <div className="doubles-content">
        <div className="doubles-blue-header">
          <span 
            className={`doubles-tab-left ${activeTab === 'lastWeek' ? 'doubles-tab-active' : ''}`}
            onClick={handleLastWeekClick}
          >
            RESULTS: Last Week {lastWeek}
          </span>
          
          <span 
            className={`doubles-tab-right ${activeTab === 'thisWeek' ? 'doubles-tab-active' : ''}`}
            onClick={handleThisWeekClick}
          >
            This Week {thisWeek}
          </span>
        </div>
        
        {showAlert && activeTab === 'thisWeek' && (
          <div className="doubles-alert-banner">
            ADMIN: Click "Create Groups" to create groups for this week, or "Enter Results" on each group to submit rankings and update lifetime points.
          </div>
        )}
        
        {showAlert && activeTab === 'lastWeek' && (
          <div className="doubles-alert-banner" style={{ backgroundColor: '#d4691b' }}>
            ADMIN: Click "Edit Results" to modify last week's rankings and adjust lifetime points. 
          </div>
        )}
        
        {activeTab === 'thisWeek' && renderGroups(currentWeekGroups, false)}
        {activeTab === 'lastWeek' && renderGroups(lastWeekGroups, true)}
      </div>

      {/* Admin ranking modal for both individual and group submissions */}
      <AdminRankingModal
        isOpen={showAdminRankingModal}
        onClose={handleCloseAdminRankingModal}
        group={selectedGroup}
        groupIndex={selectedGroupIndex}
        onSubmitResults={handleSubmitAdminResults}
      />
    </div>
  );
};

export default AdminDoublesGroup;