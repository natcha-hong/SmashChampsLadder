// src/pages/Annoucement/Annoucement.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar/Navbar'
import { getCurrentAnnouncement } from '../../services/announcementService'

const Annoucement = () => {
  const [announcement, setAnnouncement] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAnnouncement()
  }, [])

  const fetchAnnouncement = async () => {
    try {
      setIsLoading(true)
      const result = await getCurrentAnnouncement()
      
      if (result.success) {
        setAnnouncement(result.data)
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

  // Format content to preserve line breaks and structure
  const formatContent = (content) => {
    if (!content) return ''
    
    return content.split('\n').map((paragraph, index) => {
      if (paragraph.trim() === '') return <br key={index} />
      
      // Check if paragraph starts with specific formatting
      if (paragraph.startsWith('REMINDER:') || paragraph.startsWith('DOUBLES LADDER')) {
        const [title, ...rest] = paragraph.split('\n')
        return (
          <div key={index} className="mb-4">
            <h3 className="font-semibold mb-2">{title}</h3>
            {rest.length > 0 && <p>{rest.join(' ')}</p>}
          </div>
        )
      }
      
      return <p key={index} className="mb-4">{paragraph}</p>
    })
  }

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <div className='min-h-screen pt-28 px-6'>
          <div className='max-w-4xl mx-auto text-center'>
            <div className='text-white text-xl'>Loading announcement...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className='min-h-screen pt-28 px-6'>
          <div className='max-w-4xl mx-auto text-center'>
            <div className='text-red-500 text-xl'>Error: {error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />
      <div className='min-h-screen pt-28 px-6'>
        <div className='max-w-4xl mx-auto'>
          <h1 className="text-4xl font-bold text-white mb-8 text-center">Announcements</h1>
          
          {/* Announcement Card */}
          <div className='bg-white rounded-lg shadow-md p-8 mb-6'>
            <h2 className="text-2xl font-medium text-gray-800 mb-4 text-center">
              {announcement?.title || 'Online Ladder System, OLS: Doubles Ladder'}
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              {announcement?.date || 'August 2025'}
            </p>
            <div className="space-y-6 text-gray-700 leading-relaxed">
              {announcement?.content ? (
                formatContent(announcement.content)
              ) : (
                <>
                  <p>
                    Doubles Ladder at Smash Champs continue to be some of the most competitive in Surrey, Canada. Matches are highlighted by fair play, sportsmanship and a high level of skill.
                  </p>
                  <p>
                    <strong>REMINDER:</strong> All players are reminded to arrive 10-15 minutes before the start of ladder play. On-court warm-ups should be limited to 5 minutes before starting matches. This will ensure that matches are all completed within a reasonable time frame. Also, please ensure to bring at least 2 shuttles and are of tournament quality.
                  </p>
                  <div>
                    <h3 className="font-semibold mb-2">DOUBLES LADDER</h3>
                    <p>
                      The Doubles Ladder is very popular as you do not need a partner to participate. Simply sign up prior to the Thursday 6:00 pm deadline. There is no drop-in permitted. Players play in groups according to their ladder rankings, playing with each partner.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Compact Login Button */}
          <div className="text-center mb-8">
            <Link to="/doublesladder" className='inline-block font-medium px-4 py-2 rounded-md bg-green-500 hover:bg-green-600 text-white transition-colors duration-200'>
              GOT IT!
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Annoucement