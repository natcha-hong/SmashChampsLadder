import React from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Annoucement from './pages/Annoucement/Annoucement';
import Login from './pages/Login/Login';
import DoublesLadder from './pages/Ladder/DoublesLadder';
import DoublesGroup from './pages/Ladder/DoublesGroup';
import AdminDoublesLadder from './pages/Admin/AdminDoublesLadder';
import AdminDoublesGroup from './pages/Admin/AdminDoublesGroup';
import AdminAnnouncement from './pages/Admin/AdminAnnouncement';

const App = () => {
  return (
    <div>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/annoucement" element={<Annoucement />} />
          
          {/* User routes */}
          <Route path="/doublesladder" element={<DoublesLadder />} />
          <Route path="/doublesgroup" element={<DoublesGroup />} />
          
          {/* Admin routes */}
          <Route path="/admin/doublesladder" element={<AdminDoublesLadder />} />
          <Route path="/admin/doublesgroup" element={<AdminDoublesGroup />} />
          <Route path="/admin/announcement" element={<AdminAnnouncement />} />
          
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App