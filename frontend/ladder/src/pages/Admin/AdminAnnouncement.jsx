// src/pages/Admin/AdminAnnouncement.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar3 from '../../components/Navbar/Navbar3'
import { getCurrentAnnouncement, updateAnnouncement } from '../../services/adminService'

const AdminAnnouncement = () => {
  const navigate = useNavigate()
  const [announcement, setAnnouncement] = useState({
    title: '',
    date: '',
    content: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnnouncement()
  }, [])

  const fetchAnnouncement = async () => {
    try {
      setIsLoading(true)
      const result = await getCurrentAnnouncement()
      
      if (result.success) {
        setAnnouncement({
          title: result.data.title || '',
          date: result.data.date || '',
          content: result.data.content || ''
        })
      } else {
        setError(result.message || 'Failed to fetch announcement')
      }
    } catch (error) {
      setError('Error fetching announcement')
      console.error('Fetch announcement error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setAnnouncement(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!announcement.title.trim() || !announcement.date.trim() || !announcement.content.trim()) {
      setError('All fields are required')
      return
    }

    try {
      setIsSaving(true)
      setError('')
      setMessage('')

      const result = await updateAnnouncement(announcement)
      
      if (result.success) {
        setMessage('Announcement updated successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(result.message || 'Failed to update announcement')
      }
    } catch (error) {
      setError('Error updating announcement')
      console.error('Update announcement error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = () => {
    // Navigate to regular announcement page to see preview
    navigate('/annoucement')
  }

  if (isLoading) {
    return (
      <div>
        <Navbar3 />
        <div className='min-h-screen pt-28 px-6'>
          <div className='max-w-4xl mx-auto'>
            <div className='admin-announcement-loading'>Loading announcement...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar3 />
      <div className='min-h-screen pt-28 px-6'>
        <div className='max-w-4xl mx-auto'>
          <h1 className="text-4xl font-bold text-white mb-8 text-center">Edit Announcement</h1>
          
          {/* Success Message */}
          {message && (
            <div className='admin-announcement-message success'>
              {message}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className='admin-announcement-message error'>
              {error}
            </div>
          )}

          {/* Edit Form */}
          <div className='admin-announcement-form'>
            <form onSubmit={handleSubmit}>
              {/* Title Field */}
              <div className='admin-announcement-form-field'>
                <label htmlFor="title" className='admin-announcement-label'>
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={announcement.title}
                  onChange={handleInputChange}
                  className='admin-announcement-input'
                  placeholder="Enter announcement title"
                />
              </div>

              {/* Date Field */}
              <div className='admin-announcement-form-field'>
                <label htmlFor="date" className='admin-announcement-label'>
                  Date
                </label>
                <input
                  type="text"
                  id="date"
                  name="date"
                  value={announcement.date}
                  onChange={handleInputChange}
                  className='admin-announcement-input'
                  placeholder="e.g., August 2025"
                />
              </div>

              {/* Content Field */}
              <div className='admin-announcement-form-field'>
                <label htmlFor="content" className='admin-announcement-label'>
                  Content
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={announcement.content}
                  onChange={handleInputChange}
                  rows={12}
                  className='admin-announcement-textarea'
                  placeholder="Enter announcement content..."
                />
              </div>

              {/* Action Buttons */}
              <div className='admin-announcement-actions'>
                <button
                  type="submit"
                  disabled={isSaving}
                  className='admin-announcement-btn admin-announcement-btn-save'
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                
                <button
                  type="button"
                  onClick={handlePreview}
                  className='admin-announcement-btn admin-announcement-btn-preview'
                >
                  Preview
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnnouncement