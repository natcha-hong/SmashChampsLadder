// src/services/announcementService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get current announcement (public)
export const getCurrentAnnouncement = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/announcements/current`, {
      method: 'GET',
      headers: {
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