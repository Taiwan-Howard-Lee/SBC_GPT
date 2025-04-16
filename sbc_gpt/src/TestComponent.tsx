import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      margin: '20px', 
      backgroundColor: '#39908b', 
      color: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      <h2>Test Component</h2>
      <p>If you can see this, React is rendering correctly!</p>
      <button 
        onClick={() => alert('Button clicked!')}
        style={{
          backgroundColor: 'white',
          color: '#39908b',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Click Me
      </button>
    </div>
  );
};

export default TestComponent;
