import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plane } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const result = await login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };

    return (
        <div className="login-page">
            {/* Background Image with Overlay */}
            <div className="login-bg" style={{ backgroundImage: "url('/login_bg.png')" }}>
                <div className="login-overlay" />
            </div>

            {/* Floating Airport Elements (Decorative) */}
            <div className="login-decorative-plane animate-float">
                <Plane size={120} />
            </div>

            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo-container">
                        <Plane size={40} />
                    </div>
                    <h1 className="login-title">
                        SkyGate <span className="text-accent">Terminal</span>
                    </h1>
                    <p className="login-subtitle">Operations Management System</p>
                </div>

                {error && (
                    <div className="login-error animate-shake">
                        <div className="error-indicator" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="form-input"
                            placeholder="Enter your ID"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Access Key</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="login-submit-btn"
                    >
                        <span className="submit-btn-content">
                            {isLoading ? (
                                <>
                                    <div className="spinner" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Log In to Console
                                    <Plane size={18} className="plane-icon-hover" />
                                </>
                            )}
                        </span>
                    </button>
                </form>

                <div className="login-footer">
                    <p className="footer-text">
                        Authorized Personnel Only<br />
                        Access Logs are monitored in real-time
                    </p>
                </div>
            </div>

            {/* Subtle bottom status bar */}
            <div className="login-status-bar">
                System Cloud Connectivity: <span className="status-stable">Stable</span> • Terminal Node: ID-449
            </div>
        </div>
    );
};

export default Login;
