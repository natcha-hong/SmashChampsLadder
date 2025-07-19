// src/services/adminService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
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

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch announcement');
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
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

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update announcement');
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

// Update player lifetime points
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

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update lifetime points');
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
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

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to remove player');
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
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

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to reset player status');
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};