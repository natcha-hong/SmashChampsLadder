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

// NEW: Get current week groups
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

// NEW: Get last week groups
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

// NEW: Admin function to manually form groups
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

// NEW: Check if groups should be formed (for monitoring)
export const checkGroupFormation = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/should-form-groups`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Check group formation error:', error);
    return {
      success: false,
      message: error.message || 'Failed to check group formation'
    };
  }
};

// Submit ranking (updated)
export const submitRanking = async (position, groupSize) => {
  try {
    const response = await fetch(`${API_BASE_URL}/players/submit-ranking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        position: parseInt(position),
        groupSize: parseInt(groupSize)
      }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Submit ranking error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit ranking'
    };
  }
};

// Add self as player (existing)
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

// NEW: Update my playing status (for current user)
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

// Admin: Add any player (existing)
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

// Admin: Update player status (existing)
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

// Admin: Mark player as no-show (existing)
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

// Admin: Remove player (existing)
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

// NEW: Utility function to check ranking submission time on client side
export const isRankingSubmissionTime = () => {
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

// NEW: Get next submission window
export const getNextSubmissionWindow = () => {
  const now = new Date();
  const isDST = (date) => {
    const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
    const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    return Math.max(jan, jul) !== date.getTimezoneOffset();
  };
  
  const pstOffset = isDST(now) ? -7 : -8;
  const pstTime = new Date(now.getTime() + (pstOffset * 60 * 60 * 1000));
  
  // Find next Thursday 6:01 PM
  const daysUntilThursday = (4 - pstTime.getDay() + 7) % 7;
  const nextThursday = new Date(pstTime);
  nextThursday.setDate(pstTime.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
  nextThursday.setHours(18, 1, 0, 0);
  
  return {
    date: nextThursday,
    formatted: nextThursday.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  };
};