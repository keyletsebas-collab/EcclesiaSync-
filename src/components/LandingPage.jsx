import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Users, Calendar, Shield, Zap, Globe, ArrowRight, ChevronDown, Play, X } from 'lucide-react';

const LandingPage = ({ onEnter }) => {
    const { t } = useLanguage();
    const [isTrailerOpen, setIsTrailerOpen] = React.useState(false);

    return (
        <div className="landing-container" style={{
            minHeight: '100vh',
            background: 'var(--bg-dark)',
            color: 'var(--text-main)',
            overflowX: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Navigation */}
            {/* ... navigation remains same ... */}

            {/* Hero Section */}
            {/* ... hero remains same ... */}

            {/* Trailer / Showcase Section */}
            <section style={{
                padding: '40px 5%',
                maxWidth: '1000px',
                margin: '-60px auto 40px',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{
                    position: 'relative',
                    padding: '2rem',
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: '1px solid var(--primary-glow)',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        background: 'linear-gradient(45deg, #0f172a, #1e1b4b)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }} onClick={() => setIsTrailerOpen(true)}>
                        {/* Fake Thumbnail Info */}
                        <div style={{
                            position: 'absolute',
                            zIndex: 2,
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'var(--primary)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem',
                                boxShadow: '0 0 30px var(--primary-glow)',
                                color: 'white',
                                margin: '0 auto 1.5rem'
                            }}>
                                <Play size={32} fill="white" />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                {t('watchTrailer')}
                            </h3>
                        </div>

                        {/* Animated background circles for the player */}
                        <div style={{
                            position: 'absolute',
                            width: '400px',
                            height: '400px',
                            background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
                            opacity: 0.2,
                            top: '-10%',
                            right: '-10%',
                            pointerEvents: 'none'
                        }} />
                        <div style={{
                            position: 'absolute',
                            width: '300px',
                            height: '300px',
                            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
                            opacity: 0.1,
                            bottom: '-5%',
                            left: '5%',
                            pointerEvents: 'none'
                        }} />
                    </div>
                </div>
            </section>

            {/* Video Modal */}
            {isTrailerOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    background: 'rgba(2, 6, 23, 0.95)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <button
                        onClick={() => setIsTrailerOpen(false)}
                        style={{
                            position: 'absolute',
                            top: '2rem',
                            right: '2rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            padding: '0.75rem',
                            borderRadius: '50%',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={24} />
                    </button>

                    <div style={{
                        width: '100%',
                        maxWidth: '1200px',
                        aspectRatio: '16/9',
                        background: 'black',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 0 100px rgba(0,0,0,1)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        {/* Placeholder for the video recording - I will embed the actual recording here later */}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: '1rem',
                            color: 'var(--text-muted)'
                        }}>
                            <div className="animate-pulse" style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #020617, #0f172a)' }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <h2 style={{ color: 'white', opacity: 0.5 }}>EcclesiaSync Cinematic Trailer</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Features (Bento Grid) remains same ... */}
            {/* Footer remains same ... */}

            {/* Footer */}
            <footer style={{
                padding: '40px 5%',
                borderTop: '1px solid var(--border)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.875rem'
            }}>
                <p>&copy; 2024 EcclesiaSync. {t('footerNote')}</p>
            </footer>

            <style>{`
                .landing-container .btn {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }
                .landing-container .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px -5px var(--primary-glow);
                }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <div className="glass-panel" style={{
        padding: '2rem',
        transition: 'all 0.3s',
        border: '1px solid var(--border)',
        textAlign: 'left'
    }}>
        <div style={{
            color: 'var(--primary)',
            background: 'rgba(99, 102, 241, 0.1)',
            padding: '0.75rem',
            borderRadius: '12px',
            display: 'inline-block',
            marginBottom: '1.5rem'
        }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</p>
    </div>
);

export default LandingPage;
