import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Users, Calendar, Shield, Zap, Globe, ArrowRight, ChevronDown, Play, X } from 'lucide-react';
// Build trigger: 2026-02-21 17:18

const LandingPage = ({ onEnter }) => {
    const { t } = useLanguage();

    return (
        <div className="landing-container" style={{
            minHeight: '100vh',
            background: 'var(--bg-dark)',
            color: 'var(--text-main)',
            overflowX: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {/* Navigation */}
            <nav style={{
                padding: '1.5rem 5%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'fixed',
                width: '100%',
                top: 0,
                zIndex: 100,
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                        padding: '0.5rem',
                        borderRadius: '10px'
                    }}>
                        <BookOpen size={20} color="white" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                        EcclesiaSync
                    </span>
                </div>
                <button
                    onClick={onEnter}
                    className="btn btn-primary"
                    style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem' }}
                >
                    {t('login')}
                </button>
            </nav>

            {/* Hero Section */}
            <header style={{
                padding: '160px 5% 80px',
                textAlign: 'center',
                background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)'
            }}>
                <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '100px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid var(--primary-glow)',
                        color: 'var(--primary)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        marginBottom: '2rem'
                    }}>
                        <Zap size={14} fill="currentColor" />
                        <span>{t('appName')} v2.1.0 Cloud Ready</span>
                    </div>
                    <h1 style={{ lineHeight: 1.1, marginBottom: '1.5rem' }}>
                        {t('heroTitle')}<br />
                        <span style={{
                            background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            {t('heroTitleAccent')}
                        </span>
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                        marginBottom: '3rem',
                        maxWidth: '600px',
                        margin: '0 auto 3rem'
                    }}>
                        {t('heroSubtitle')}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={onEnter}
                            className="btn btn-primary"
                            style={{ padding: '1rem 2.5rem', fontSize: '1rem', minWidth: '200px' }}
                        >
                            {t('getStarted')}
                            <ArrowRight size={20} />
                        </button>
                        <button
                            onClick={onEnter}
                            className="btn"
                            style={{
                                padding: '1rem 2.5rem',
                                fontSize: '1rem',
                                minWidth: '200px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border)',
                                color: 'white'
                            }}
                        >
                            {t('login')}
                        </button>
                    </div>
                </div>
            </header>



            {/* Features (Bento Grid) */}
            <section style={{ padding: '80px 5%', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '2.5rem' }}>{t('allYouNeed')}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>{t('featuresSubtitle')}</p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem'
                }}>
                    <FeatureCard
                        icon={<Users size={24} />}
                        title={t('featureMembersTitle')}
                        description={t('featureMembersDesc')}
                    />
                    <FeatureCard
                        icon={<Calendar size={24} />}
                        title={t('featureServicesTitle')}
                        description={t('featureServicesDesc')}
                    />
                    <FeatureCard
                        icon={<Globe size={24} />}
                        title={t('featureCloudTitle')}
                        description={t('featureCloudDesc')}
                    />
                    <FeatureCard
                        icon={<BookOpen size={24} />}
                        title={t('featureTemplatesTitle')}
                        description={t('featureTemplatesDesc')}
                    />
                    <FeatureCard
                        icon={<Zap size={24} />}
                        title={t('featureAutoTitle')}
                        description={t('featureAutoDesc')}
                    />
                    <FeatureCard
                        icon={<Shield size={24} />}
                        title={t('featureGlobalTitle')}
                        description={t('featureGlobalDesc')}
                    />
                </div>
            </section>

            {/* About Section */}
            <section style={{ padding: '80px 5%', background: 'rgba(15, 23, 42, 0.3)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>{t('aboutTitle')}</h2>
                    <p style={{
                        fontSize: '1.1rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.8,
                        maxWidth: '700px',
                        margin: '0 auto'
                    }}>
                        {t('aboutBio')}
                    </p>
                </div>
            </section>

            {/* Download Section */}
            <section style={{ padding: '100px 5%', textAlign: 'center' }}>
                <div className="glass-panel" style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    padding: '4rem 2rem',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t('installApp')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
                        Accede rápidamente desde tu escritorio o dispositivo móvil instalando la aplicación directamente.
                    </p>
                    <button
                        className="btn btn-primary"
                        style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
                    >
                        <Zap size={20} fill="white" />
                        {t('installButton')}
                    </button>

                    {/* Decorative Elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-50px',
                        right: '-50px',
                        width: '200px',
                        height: '200px',
                        background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
                        opacity: 0.2,
                        pointerEvents: 'none'
                    }} />
                </div>
            </section>

            {/* CTA Section */}
            <section style={{
                padding: '100px 5%',
                textAlign: 'center',
                background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)'
            }}>
                <h2 style={{ fontSize: '3rem', maxWidth: '800px', margin: '0 auto 2rem', lineHeight: 1.2 }}>
                    {t('ctaTitle')}
                </h2>
                <button
                    onClick={onEnter}
                    className="btn btn-primary"
                    style={{ padding: '1.25rem 4rem', fontSize: '1.25rem', borderRadius: '100px' }}
                >
                    {t('ctaButton')}
                    <ArrowRight size={24} />
                </button>
            </section>



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
        textAlign: 'left',
        background: 'rgba(30, 41, 59, 0.7)'
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
