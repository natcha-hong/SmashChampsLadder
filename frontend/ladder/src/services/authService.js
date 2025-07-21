// src/services/authService.js 
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const loginUser = async (credentials) => {
  try {
    console.log('Attempting login with:', credentials.email);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    console.log('Login response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    console.log('Token stored:', data.token ? 'Yes' : 'No');
    console.log('User stored:', data.user);
    console.log('Is admin user:', data.user?.email === 'admin@smashchamps.com');

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

export const registerUser = async (userData) => {
  try {
    console.log('Attempting registration with:', userData.email);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    console.log('Registration response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    console.log('Token stored after registration:', data.token ? 'Yes' : 'No');
    console.log('Is admin user:', data.user?.email === 'admin@smashchamps.com');

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: error.message || 'Network error',
    };
  }
};

export const logoutUser = () => {
  console.log('Logging out user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('Getting current user - Token exists:', !!token);
  console.log('Getting current user - User exists:', !!user);
  
  if (token && user) {
    try {
      const parsedUser = JSON.parse(user);
      console.log('Current user:', parsedUser);
      console.log('Is current user admin:', parsedUser?.email === 'admin@smashchamps.com');
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
  console.log('Is authenticated:', isAuth);
  return isAuth;
};

// Helper function to check if current user is admin
export const isCurrentUserAdmin = () => {
  const userData = getCurrentUser();
  const isAdmin = userData?.user?.email === 'admin@smashchamps.com';
  console.log('Is current user admin:', isAdmin, 'for email:', userData?.user?.email);
  return isAdmin;
};

// Helper function to get auth headers for API calls
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Verify admin access (can be used before admin-only operations)
export const verifyAdminAccess = async () => {
  try {
    if (!isCurrentUserAdmin()) {
      throw new Error('Admin access required');
    }

    const response = await fetch(`${API_BASE_URL}/admin/announcement`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (response.status === 403) {
      throw new Error('Admin access denied');
    }

    return {
      success: true,
      hasAdminAccess: true
    };
  } catch (error) {
    console.error('Admin verification failed:', error);
    return {
      success: false,
      hasAdminAccess: false,
      message: error.message
    };
  }
};