import React from 'react'
import SmashLogo from '../../assets/SmashLogo.png'

const Navbar = () => {

    return (
        <div className='fixed top-0 left-0 right-0 text-white bg-[#083370] flex items-center justify-between px-6 py-2 drop-shadow z-10'>
            <div className='flex items-center space-x-3'>
                <img src={SmashLogo} alt="Smash Champs Logo" className='w-01 h-8' /> 
                <h2 className='text-xl font-medium py-2'>ONLINE LADDER SYSTEM</h2>
            </div>
        </div>
    )
}

export default Navbar


