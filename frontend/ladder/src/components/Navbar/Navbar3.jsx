// src/components/Navbar/Navbar3.jsx
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SmashLogo from '../../assets/SmashLogo.png'

const Navbar3 = () => {
  const navigate = useNavigate()
  
  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken')
    localStorage.removeItem('token')
    // Redirect to login page
    navigate('/')
  }

  return (
    <div className='fixed top-0 left-0 right-0 text-white bg-[#083370] flex items-center justify-between px-6 py-2 drop-shadow z-10'>
      <div className='flex items-center space-x-8'>
        <div className='flex items-center space-x-3'>
          <img src={SmashLogo} alt="Smash Champs Logo" className='w-01 h-8' />
          <h2 className='text-xl font-medium py-2'>ADMIN LADDER SYSTEM</h2>
        </div>
        {/* Navigation Links */}
        <div className='flex items-center space-x-6'>
          <Link to="/admin/announcement" className='hover:text-gray-300 transition-colors'>
            Edit Announcement
          </Link>
          <Link to="/admin/doublesladder" className='hover:text-gray-300 transition-colors'>
            Edit Doubles Ladder
          </Link>
          <Link to="/admin/doublesgroup" className='hover:text-gray-300 transition-colors'>
            Edit Doubles Group
          </Link>
        </div>
      </div>
      <div className='flex items-center space-x-4'>
        <span className='text-sm bg-red-600 px-3 py-1 rounded-full'>ADMIN</span>
        <button
          onClick={handleLogout}
          className='hover:bg-red-500 hover:text-white transition-colors cursor-pointer px-3 py-1 rounded'
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default Navbar3