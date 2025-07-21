// frontend/ladder/src/services/playerService.js 

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  
  return data;
};

// Get all players (existing function)
export const getAllPlayers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/players`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Get all players error:', error);
    return {
      success: false,
      message: error.message || 'Failed to get players',
      players: []
    };
  }
};

// Get current week groups
export const getCurrentGroups = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/current-groups`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Get current groups error:', error);
    return {
      success: false,
      message: error.message || 'Failed to get current groups',
      groups: []
    };
  }
};

// Get last week groups
export const getLastGroups = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/last-groups`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Get last groups error:', error);
    return {
      success: false,
      message: error.message || 'Failed to get last groups',
      groups: []
    };
  }
};

// Admin function to manually form groups
export const formGroups = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/form-groups`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Form groups error:', error);
    return {
      success: false,
      message: error.message || 'Failed to form groups'
    };
  }
};

// Submit ranking - REMOVED TIME CONSTRAINTS
export const submitRanking = async (position, groupSize, playerId = null) => {
  try {
    const requestBody = {
      position: parseInt(position),
      groupSize: parseInt(groupSize),
      adminOverride: true, // Always allow admin submissions
      bypassTimeCheck: true // Bypass any time restrictions
    };

    // If playerId is provided (admin functionality), include it
    if (playerId) {
      requestBody.playerId = playerId;
      console.log('Admin submission for player:', playerId, 'with data:', requestBody);
    } else {
      console.log('Regular submission with data:', requestBody);
    }

    const response = await fetch(`${API_BASE_URL}/players/submit-ranking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    console.log('Submit ranking response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Submit ranking error response:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Submit ranking success response:', data);
    return data;
  } catch (error) {
    console.error('Submit ranking error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit ranking'
    };
  }
};

// Admin function to submit ranking for specific player - REMOVED TIME CONSTRAINTS
export const submitRankingForPlayer = async (playerId, position, groupSize) => {
  try {
    console.log('Admin submission via alternative endpoint for player:', playerId);
    
    const response = await fetch(`${API_BASE_URL}/admin/submit-ranking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        playerId,
        position: parseInt(position),
        groupSize: parseInt(groupSize),
        adminOverride: true,
        bypassTimeCheck: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Admin submit ranking error response:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Admin submit ranking success response:', data);
    return data;
  } catch (error) {
    console.error('Submit ranking for player error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit ranking for player'
    };
  }
};

// Admin function to submit rankings for entire group - REMOVED TIME CONSTRAINTS
export const submitGroupRankings = async (groupRankings) => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/submit-group-rankings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        rankings: groupRankings,
        adminOverride: true,
        bypassTimeCheck: true
      }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Submit group rankings error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit group rankings'
    };
  }
};

// Add self as player
export const addSelfAsPlayer = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/add-self`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Add self as player error:', error);
    return {
      success: false,
      message: error.message || 'Failed to add player'
    };
  }
};

// Update my playing status (for current user)
export const updateMyPlayingStatus = async (isPlaying) => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/my-status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPlaying }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Update my playing status error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update playing status'
    };
  }
};

// Admin: Add any player
export const addPlayer = async (playerData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/add`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(playerData),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Add player error:', error);
    return {
      success: false,
      message: error.message || 'Failed to add player'
    };
  }
};

// Admin: Add player to ladder (alias for addPlayer - for backwards compatibility)
export const addPlayerToLadder = async (playerData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/add`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(playerData),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Add player to ladder error:', error);
    return {
      success: false,
      message: error.message || 'Failed to add player to ladder'
    };
  }
};

// Admin: Update player status
export const updatePlayerStatus = async (playerId, isPlaying) => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPlaying }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Update player status error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update player status'
    };
  }
};

// Admin: Mark player as no-show
export const markPlayerNoShow = async (playerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}/no-show`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Mark no-show error:', error);
    return {
      success: false,
      message: error.message || 'Failed to mark player as no-show'
    };
  }
};

// Admin: Remove player
export const removePlayer = async (playerId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Remove player error:', error);
    return {
      success: false,
      message: error.message || 'Failed to remove player'
    };
  }
};

// REMOVED TIME CONSTRAINTS - Always return true for admin usage
export const isRankingSubmissionTime = () => {
  return true; // Always allow submissions for admin
};

// REMOVED TIME CONSTRAINTS - Return current time for reference
export const getNextSubmissionWindow = () => {
  const now = new Date();
  
  return {
    date: now,
    formatted: now.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  };
};