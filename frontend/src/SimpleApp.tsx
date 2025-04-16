import React from 'react';

const SimpleApp: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginTop: '50px'
    }}>
      <h1 style={{ color: '#39908b' }}>Simple React App</h1>
      <p>This is a very simple React application to test if rendering works.</p>
      <div style={{
        display: 'flex',
        gap: '10px',
        marginTop: '20px'
      }}>
        <button 
          onClick={() => alert('Button 1 clicked!')}
          style={{
            backgroundColor: '#39908b',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Button 1
        </button>
        <button 
          onClick={() => alert('Button 2 clicked!')}
          style={{
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Button 2
        </button>
      </div>
    </div>
  );
};

export default SimpleApp;
