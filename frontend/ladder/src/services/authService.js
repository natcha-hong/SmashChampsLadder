// src/services/authService.js - Debug version
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const loginUser = async (credentials) => {
  try {
    console.log('Attempting login with:', credentials.email); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    console.log('Login response:', data); // Debug log

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    console.log('Token stored:', data.token ? 'Yes' : 'No'); // Debug log
    console.log('User stored:', data.user); // Debug log

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    console.error('Login error:', error); // Debug log
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

export const registerUser = async (userData) => {
  try {
    console.log('Attempting registration with:', userData.email); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log('Registration response:', data); // Debug log

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    console.log('Token stored after registration:', data.token ? 'Yes' : 'No'); // Debug log

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    console.error('Registration error:', error); // Debug log
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

export const logoutUser = () => {
  console.log('Logging out user'); // Debug log
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('Getting current user - Token exists:', !!token); // Debug log
  console.log('Getting current user - User exists:', !!user); // Debug log
  
  if (token && user) {
    try {
      const parsedUser = JSON.parse(user);
      console.log('Current user:', parsedUser); // Debug log
      return {
        token,
        user: parsedUser,
      };
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      // Clear corrupted data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  }
  
  return null;
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const isAuth = !!token;
  console.log('Is authenticated:', isAuth); // Debug log
  return isAuth;
};

// Helper function to check if current user is admin
export const isCurrentUserAdmin = () => {
  const userData = getCurrentUser();
  const isAdmin = userData?.user?.email === 'admin@smashchamps.com';
  console.log('Is current user admin:', isAdmin, 'for email:', userData?.user?.email); // Debug log
  return isAdmin;
};