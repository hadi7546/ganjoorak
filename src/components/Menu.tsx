import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaBars, FaTimes, FaHome, FaQuestionCircle, FaBell, FaUsers, FaSun, FaMoon } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuProps {
    isOpen: boolean;
    onClose: () => void;
}

const menuItems = [
    { href: '/', icon: <FaHome />, label: 'صفحه اصلی' },
    { href: '/poets', icon: <FaUsers />, label: 'شاعران' },
    { href: '/faq', icon: <FaQuestionCircle />, label: 'پرسش‌های متداول' },
    { href: '/updates', icon: <FaBell />, label: 'بروزرسانی‌ها' },
];

const Menu: React.FC<MenuProps> = ({ isOpen, onClose }) => {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="menu-backdrop fixed inset-0 bg-black bg-opacity-30 z-40"
                    />

                    {/* Menu popup */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
                        className="menu-drawer fixed top-16 right-4 w-50 rounded-2xl p-3 shadow-2xl"
                    >
                        <nav>
                            <ul className="space-y-1">
                                {menuItems.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-3 text-foreground transition-colors py-2 px-3 rounded-xl"
                                            onClick={onClose}
                                        >
                                            <span className="text-base opacity-80">{item.icon}</span>
                                            <span className="menu-item-text">{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        <div className="border-t border-border mt-2 pt-2">
                            <button onClick={toggleTheme} className="flex items-center gap-3 text-foreground transition-colors py-2 px-3 rounded-xl w-full">
                                {theme === 'light' ? <FaMoon /> : <FaSun />}
                                <span className="menu-item-text">تغییر پوسته</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export function MenuButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="menu-button fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-foreground transition-all"
            aria-label="Open menu"
        >
            <FaBars size={16} />
        </button>
    );
}

export default Menu; 