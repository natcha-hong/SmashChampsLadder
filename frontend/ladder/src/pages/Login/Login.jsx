import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar'
import bg from '../../assets/bg.jpg'
import PasswordInput from '../../components/Input/PasswordInput';
import { validateEmail } from '../../utils/helper';
import { loginUser } from '../../services/authService';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    if (!password) {
      setError("Please enter the password.");
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    try {
      // Login API Call
      const response = await loginUser({ email, password });
      
      if (response.success) {
        // Store token in localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Check if user is admin and redirect accordingly
        const ADMIN_EMAIL = 'admin@smashchamps.com'; // Change this to match your admin email
        if (response.user.email === ADMIN_EMAIL) {
          // Admin goes to admin doubles ladder
          navigate('/admin/doublesladder');
        } else {
          // Regular users go to announcement page
          navigate('/annoucement');
        }
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch (error) {
      setError("Network error. Please try again.");
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <img src={bg} alt="background photo" className='w-full h-screen object-cover fixed top-0 left-0 -z-10' />
      <div className='text-black flex items-center justify-center mt-28'>
        <div className='w-96 border rounded bg-white px-7 py-20'>
          <form onSubmit={handleLogin}>
            <h4 className='text-2xl mb-7'>Login</h4>
            <input
              type='text'
              placeholder='Email'
              className='input-box'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            {error && <p className='text-red-500 text-xs pb-1'>{error}</p>}
            
            {/* Login Button */}
            <div className="text-center mb-8">
              <button 
                type='submit' 
                className={`btn-primary font-medium text-primary inline-block text-center py-3 px-6 rounded-md bg-green-500 hover:bg-green-600 text-white transition-colors duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login