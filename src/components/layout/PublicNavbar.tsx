import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, House, LayoutGrid, LogIn, MoreHorizontal, Settings } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button, RoundIconButton } from '@/components/ui/DesignSystem';
import { DropdownMenu, DropdownItem } from '@/components/ui/DropdownMenu';
import { TranslationFunction } from '@/types';
import { LocaleKey } from '@/data/locales';

interface PublicNavbarProps {
    user: any;
    currentLang: LocaleKey;
    onSignIn: () => void;
    onStartApp?: () => void;
    onOpenSettings?: () => void;
    onSignOut?: () => void;
    t: TranslationFunction;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ user, currentLang, onSignIn, onStartApp, onOpenSettings, onSignOut, t }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isGerman = currentLang === 'de';
    const isContactPage = location.pathname === '/contact';
    const appButtonLabel = 'App';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const menuItems: DropdownItem[] = [
        {
            label: user ? (t('menu_photos') || 'Photos') : (t('footer_about') || 'About'),
            icon: user ? <LayoutGrid className="w-4 h-4" /> : <House className="w-4 h-4" />,
            onClick: () => {
                setIsMenuOpen(false);
                navigate(user ? '/' : '/about');
            }
        },
    ];

    if (user) {
        menuItems.push(
            {
                label: t('tab_settings') || 'Settings',
                icon: <Settings className="w-4 h-4" />,
                onClick: () => {
                    setIsMenuOpen(false);
                    navigate('/');
                    onOpenSettings?.();
                }
            },
            {
                label: t('sign_out') || 'Sign Out',
                onClick: () => {
                    setIsMenuOpen(false);
                    onSignOut?.();
                }
            }
        );
    } else {
        menuItems.push(
            {
                label: t('auth_sign_in_btn') || 'Sign In',
                icon: <LogIn className="w-4 h-4" />,
                onClick: () => {
                    setIsMenuOpen(false);
                    onSignIn();
                }
            }
        );
    }

    if (!isContactPage) {
        menuItems.splice(1, 0, {
            label: t('footer_contact') || 'Contact',
            onClick: () => {
                setIsMenuOpen(false);
                navigate('/contact');
            }
        });
    }

    return (
        <header className="fixed top-0 left-0 right-0 h-14 z-50 pointer-events-none">
            <div className="flex items-center justify-between px-4 h-full pointer-events-auto bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center w-1/3">
                </div>

                <div className="flex items-center justify-center w-1/3">
                    <Link
                        to="/"
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        aria-label="Expose Home"
                    >
                        <Logo className="w-7 h-7" />
                    </Link>
                </div>

                <div className="flex items-center justify-end w-1/3">
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => {
                                if (user) {
                                    navigate('/');
                                    return;
                                }
                                onStartApp?.();
                            }}
                            variant="primary-mono"
                            size="s"
                            icon={<ChevronRight />}
                            iconPosition="right"
                            className="min-w-[88px]"
                        >
                            {appButtonLabel}
                        </Button>
                        <div className="relative" ref={menuRef}>
                            <RoundIconButton
                                icon={<MoreHorizontal />}
                                onClick={() => setIsMenuOpen((open) => !open)}
                                variant="ghost"
                                active={isMenuOpen}
                                aria-label={isGerman ? 'Menü öffnen' : 'Open menu'}
                            />
                            {isMenuOpen && (
                                <div className="absolute top-full mt-2 right-0 z-50">
                                    <DropdownMenu items={menuItems} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
