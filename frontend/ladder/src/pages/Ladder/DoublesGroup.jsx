import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar2 from '../../components/Navbar/Navbar2';
import RankingModal from '../../components/RankingModal/RankingModal';
import '../../App.css';
import { getCurrentUser, isAuthenticated } from '../../services/authService';
import { 
  submitRanking, 
  getCurrentGroups, 
  getLastGroups 
} from '../../services/playerService';

const DoublesGroup = ({ currentUser: propCurrentUser }) => {
  const [currentWeekGroups, setCurrentWeekGroups] = useState([]);
  const [lastWeekGroups, setLastWeekGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('thisWeek');
  const [showAlert, setShowAlert] = useState(true);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [currentUserGroup, setCurrentUserGroup] = useState(null);
  const [currentUserGroupIndex, setCurrentUserGroupIndex] = useState(-1);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }

      // Use props if available, otherwise get from auth service
      if (propCurrentUser) {
        setCurrentUser(propCurrentUser);
      } else {
        const userData = getCurrentUser();
        if (userData?.user) {
          setCurrentUser(userData.user);
        } else {
          navigate('/login');
          return;
        }
      }
      
      await loadGroupData();
      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [navigate, propCurrentUser]);

  const loadGroupData = async () => {
    try {
      // Load both current and last week groups
      const [currentResponse, lastResponse] = await Promise.all([
        getCurrentGroups(),
        getLastGroups()
      ]);

      // Handle current week groups
      if (currentResponse?.success && Array.isArray(currentResponse.groups)) {
        setCurrentWeekGroups(currentResponse.groups);
        
        // Find current user's group
        const userData = getCurrentUser();
        if (userData?.user) {
          currentResponse.groups.forEach((group, groupIndex) => {
            const userPlayer = group.find(player => 
              player.userId?._id === userData.user.id || 
              player.userId?.email === userData.user.email
            );
            if (userPlayer) {
              setCurrentUserGroup(group);
              setCurrentUserGroupIndex(groupIndex);
            }
          });
        }
      } else {
        setCurrentWeekGroups([]);
      }

      // Handle last week groups
      if (lastResponse?.success && Array.isArray(lastResponse.groups)) {
        setLastWeekGroups(lastResponse.groups);
      } else {
        setLastWeekGroups([]);
      }

      setError('');
    } catch (error) {
      console.error('Load group data error:', error);
      setError('Failed to load group data');
      setCurrentWeekGroups([]);
      setLastWeekGroups([]);
    }
  };

  // Check if it's ranking submission time
  const isSubmissionTimeValid = () => {
    const now = new Date();
    
    // Convert to PST (UTC-8) or PDT (UTC-7)
    const isDST = (date) => {
      const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
      const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      return Math.max(jan, jul) !== date.getTimezoneOffset();
    };
    
    const pstOffset = isDST(now) ? -7 : -8;
    const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000));
    
    const dayOfWeek = pstTime.getDay(); // 0 = Sunday, 4 = Thursday
    const hours = pstTime.getHours();
    const minutes = pstTime.getMinutes();
    
    // Allow submission from Thursday 6:01 PM through next Thursday 5:59 PM
    if (dayOfWeek === 4) {
      return hours > 18 || (hours === 18 && minutes >= 1);
    }
    
    // Friday through Wednesday - always allow
    return dayOfWeek >= 5 || dayOfWeek <= 3;
  };

  const getNextSubmissionTime = () => {
    const now = new Date();
    const isDST = (date) => {
      const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
      const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      return Math.max(jan, jul) !== date.getTimezoneOffset();
    };
    
    const pstOffset = isDST(now) ? -7 : -8;
    const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000));
    
    // Find next Thursday
    const daysUntilThursday = (4 - pstTime.getDay() + 7) % 7;
    const nextThursday = new Date(pstTime);
    nextThursday.setDate(pstTime.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
    nextThursday.setHours(18, 1, 0, 0); // 6:01 PM
    
    return nextThursday.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleEnterResult = () => {
    if (!isSubmissionTimeValid()) {
      alert(`Ranking submission is only available from Thursday 6:01 PM PST through next Thursday 5:59 PM PST.\n\nNext submission window: ${getNextSubmissionTime()}`);
      return;
    }
    
    if (!currentUserGroup) {
      alert('You are not in a group this week. Please make sure you signed up to play.');
      return;
    }
    
    setShowRankingModal(true);
  };

  const handleCloseRankingModal = () => {
    setShowRankingModal(false);
  };

  const handleSubmitRanking = async (position, groupSize) => {
    try {
      const numPosition = parseInt(position) || 1;
      const numGroupSize = parseInt(groupSize) || 4;
      
      const response = await submitRanking(numPosition, numGroupSize);
      if (response?.success) {
        const weeklyPoints = response.data?.weeklyPoints || 0;
        const newLifetimePoints = response.data?.newLifetimePoints || 0;
        alert(`Your ranking ${numPosition} has been submitted! You earned ${weeklyPoints} points. Your lifetime total is now ${newLifetimePoints} points.`);
        setShowRankingModal(false);
        await loadGroupData(); // Reload to show updated data
      } else {
        const errorMsg = typeof response?.message === 'string' ? response.message : 'Failed to submit ranking';
        alert(`Failed to submit ranking: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error submitting ranking:', error);
      alert('Failed to submit ranking. Please try again.');
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

  const getThursdayDates = () => {
    const today = new Date();
    
    // Convert to PST/PDT
    const isDST = (date) => {
      const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
      const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      return Math.max(jan, jul) !== date.getTimezoneOffset();
    };
    
    const pstOffset = isDST(today) ? -7 : -8;
    const pstTime = new Date(today.getTime() + (pstOffset * 60 * 60 * 1000));
    const currentDay = pstTime.getDay();
    
    let thisThursday;
    if (currentDay <= 4) {
      const daysUntilThursday = 4 - currentDay;
      thisThursday = new Date(pstTime);
      thisThursday.setDate(pstTime.getDate() + daysUntilThursday);
    } else {
      const daysUntilNextThursday = 7 - currentDay + 4;
      thisThursday = new Date(pstTime);
      thisThursday.setDate(pstTime.getDate() + daysUntilNextThursday);
    }
    
    const lastThursday = new Date(thisThursday);
    lastThursday.setDate(thisThursday.getDate() - 7);
    
    return {
      lastThursday: lastThursday.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      thisThursday: thisThursday.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    };
  };

  const { lastThursday, thisThursday } = getThursdayDates();
  const canSubmitResult = isSubmissionTimeValid();

  const renderGroups = (groups, isLastWeek = false) => {
    if (!Array.isArray(groups) || groups.length === 0) {
      return (
        <div className="doubles-empty-state">
          <p>No groups available for {isLastWeek ? 'last week' : 'this week'}.</p>
          {!isLastWeek && <p>Groups will be formed automatically every Thursday at 6:01 PM PST.</p>}
        </div>
      );
    }

    return (
      <div className="doubles-groups-container">
        {groups.map((group, groupIndex) => {
          if (!Array.isArray(group)) return null;
          
          return (
            <div key={groupIndex} className="doubles-group-card">
              <div className="doubles-group-header">
                Group {groupIndex + 1}
              </div>
              <div className="doubles-group-content">
                {group.map((player, playerIndex) => {
                  if (!player?.userId) return null;
                  
                  const isCurrentUser = player.userId._id === currentUser?.id || 
                                      player.userId.email === currentUser?.email;
                  
                  // For last week, show final ranking if available
                  const displayPosition = isLastWeek && player.lastWeekGroup?.finalRanking 
                    ? player.lastWeekGroup.finalRanking 
                    : (isLastWeek && player.lastWeekGroup?.groupPosition 
                      ? player.lastWeekGroup.groupPosition 
                      : (player.currentWeekGroup?.groupPosition || playerIndex + 1));
                  
                  // Show points earned for last week
                  const pointsEarned = isLastWeek ? player.lastWeekGroup?.pointsEarned || 0 : null;
                  
                  return (
                    <div
                      key={player._id || player.id}
                      className="doubles-player-row"
                    >
                      <div className="doubles-player-number">{displayPosition}</div>
                      <div 
                        className="doubles-player-name"
                      >
                        {player.name || 'Unknown Player'} {isCurrentUser ? '(You)' : ''}
                        {isLastWeek && pointsEarned !== null && (
                          <span>
                            ({pointsEarned > 0 ? '+' : ''}{pointsEarned} pts)
                          </span>
                        )}
                        {!isLastWeek && player.currentWeekGroup?.hasSubmittedRanking && (
                          <span>
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
        </div>
      </div>
    );
  }

  return (
    <div className="doubles-container">
      <Navbar2 />
      <div className="doubles-header">
        <h1 className="doubles-title">Doubles Groups</h1>
        <div className="doubles-header-info">
          <span className="doubles-welcome">
            Welcome, {currentUser?.name || 'User'}!
          </span>
          {error && (
            <div className="doubles-error-message">
              {typeof error === 'string' ? error : 'An error occurred'}
            </div>
          )}
          <button
            className="doubles-add-player-btn"
            onClick={handleEnterResult}
            disabled={!canSubmitResult}
            title={!canSubmitResult ? `Available from Thursday 6:01 PM PST through next Thursday 5:59 PM PST. Next: ${getNextSubmissionTime()}` : ''}
          >
            Enter Result
          </button>
        </div>
      </div>
      
      <div className="doubles-content">
        <div className="doubles-blue-header">
          <span 
            className={`doubles-tab-left ${activeTab === 'lastWeek' ? 'doubles-tab-active' : ''}`}
            onClick={handleLastWeekClick}
          >
            RESULTS: Last Week {lastThursday}
          </span>
          
          <span 
            className={`doubles-tab-right ${activeTab === 'thisWeek' ? 'doubles-tab-active' : ''}`}
            onClick={handleThisWeekClick}
          >
            This Week {thisThursday}
          </span>
        </div>
        
        {showAlert && activeTab === 'thisWeek' && (
          <div className="doubles-alert-banner">
            ALERT: After your matches, please enter rankings for your group.
          </div>
        )}
        
        {activeTab === 'thisWeek' && renderGroups(currentWeekGroups, false)}
        {activeTab === 'lastWeek' && renderGroups(lastWeekGroups, true)}
      </div>

      <RankingModal
        isOpen={showRankingModal}
        onClose={handleCloseRankingModal}
        currentUser={currentUser}
        currentUserGroup={currentUserGroup}
        currentUserGroupIndex={currentUserGroupIndex}
        onSubmitRanking={handleSubmitRanking}
      />
    </div>
  );
};

export default DoublesGroup;