import React from 'react';
import DashboardPage from './pages/DashboardPage';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function App() {
    return (
        <ErrorBoundary>
            <DashboardPage />
        </ErrorBoundary>
    );
}

export default App;
