// src/services/adminService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  
  return data;
};

// Get current announcement
export const getCurrentAnnouncement = async () => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/announcement`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Get announcement error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

// Update announcement
export const updateAnnouncement = async (announcementData) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/announcement`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(announcementData),
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Update announcement error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

// ==================== GROUP MANAGEMENT FUNCTIONS ====================

// Get current week groups (admin version)
export const getCurrentGroups = async () => {
  try {
    const token = getAuthToken();
    console.log('Admin fetching current groups...');
    
    const response = await fetch(`${API_BASE_URL}/admin/groups/current`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await handleResponse(response);
    console.log('Admin current groups response:', data);
    
    return {
      success: true,
      groups: data.groups || data,
    };
  } catch (error) {
    console.error('Admin get current groups error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch current groups',
      groups: []
    };
  }
};

// Get last week groups (admin version)
export const getLastGroups = async () => {
  try {
    const token = getAuthToken();
    console.log('Admin fetching last week groups...');
    
    const response = await fetch(`${API_BASE_URL}/admin/groups/last-week`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await handleResponse(response);
    console.log('Admin last week groups response:', data);
    
    return {
      success: true,
      groups: data.groups || data,
    };
  } catch (error) {
    console.error('Admin get last groups error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch last week groups',
      groups: []
    };
  }
};

// Form new groups (admin function)
export const formGroups = async () => {
  try {
    const token = getAuthToken();
    console.log('Admin forming new groups...');
    
    const response = await fetch(`${API_BASE_URL}/admin/groups/form`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adminOverride: true,
        forceCreate: true
      }),
    });

    const data = await handleResponse(response);
    console.log('Admin form groups response:', data);
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Admin form groups error:', error);
    return {
      success: false,
      message: error.message || 'Failed to form groups',
    };
  }
};

// ==================== RANKING SUBMISSION FUNCTIONS ====================

// Admin submit ranking for a player with lifetime points calculation
export const submitPlayerRanking = async (playerId, position, groupSize, groupNumber = null) => {
  try {
    const token = getAuthToken();
    console.log('Admin submitting ranking:', { playerId, position, groupSize, groupNumber });
    
    const requestBody = {
      playerId,
      position: parseInt(position),
      groupSize: parseInt(groupSize),
      adminOverride: true,
      bypassTimeCheck: true
    };

    // Add group number if provided
    if (groupNumber !== null) {
      requestBody.groupNumber = parseInt(groupNumber);
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/submit-ranking`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await handleResponse(response);
    console.log('Admin ranking submission success:', data);
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Admin submit ranking error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit ranking',
      error: error.message
    };
  }
};

// Submit rankings for entire group (bulk submission)
export const submitGroupRankings = async (groupNumber, rankings) => {
  try {
    const token = getAuthToken();
    console.log('Admin submitting group rankings:', { groupNumber, rankings });
    
    // Transform rankings to expected format
    const formattedRankings = rankings.map(ranking => ({
      playerId: ranking.playerId,
      position: parseInt(ranking.position),
      groupSize: parseInt(ranking.groupSize),
      playerName: ranking.playerName // Include for debugging
    }));
    
    const response = await fetch(`${API_BASE_URL}/admin/submit-group-rankings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        groupNumber: parseInt(groupNumber),
        rankings: formattedRankings,
        adminOverride: true,
        bypassTimeCheck: true
      }),
    });

    const data = await handleResponse(response);
    console.log('Admin group rankings submission success:', data);
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Admin submit group rankings error:', error);
    return {
      success: false,
      message: error.message || 'Failed to submit group rankings',
      error: error.message
    };
  }
};

// ==================== PLAYER MANAGEMENT FUNCTIONS ====================

// Update player lifetime points manually
export const updatePlayerLifetimePoints = async (playerId, lifetimePoints) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/player/${playerId}/lifetime-points`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lifetimePoints }),
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Update lifetime points error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

// Remove player from doubles ladder
export const removePlayerFromLadder = async (playerId) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/player/${playerId}/remove`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Remove player error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

// Reset player to not playing status
export const resetPlayerStatus = async (playerId) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/player/${playerId}/reset-status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Reset player status error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

// Get player details
export const getPlayerDetails = async (playerId) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/player/${playerId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Get player details error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

// Get all players (admin view)
export const getAllPlayers = async () => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/players`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Get all players error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

// Update player details
export const updatePlayerDetails = async (playerId, updates) => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/player/${playerId}/update`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const data = await handleResponse(response);
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Update player details error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};