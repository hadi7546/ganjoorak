import React from 'react'; // useState was not used
import Link from 'next/link';
import { FaBars, FaHome, FaQuestionCircle, FaBell, FaUsers } from 'react-icons/fa'; // FaTimes was not used
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggleButton from './ThemeToggleButton'; // Import the toggle button

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
                        className="menu-drawer fixed top-16 right-4 w-50 rounded-2xl p-3 shadow-2xl bg-gray-900 bg-opacity-80"
                    >
                        <nav>
                            <ul className="space-y-1">
                                {menuItems.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-3 text-white hover:text-gray-300 transition-colors py-2 px-3 rounded-xl hover:bg-gray-550"
                                            onClick={onClose}
                                        >
                                            <span className="text-base opacity-80">{item.icon}</span>
                                            <span className="menu-item-text">{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                                {/* Theme Toggle Button Item */}
                                <li className="pt-2 mt-2 border-t border-gray-700">
                                    <div className="flex items-center justify-center py-2 px-3">
                                        <ThemeToggleButton />
                                    </div>
                                </li>
                            </ul>
                        </nav>
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
            className="menu-button fixed top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-900 bg-opacity-80 rounded-full text-white hover:bg-gray-550 transition-all"
            aria-label="Open menu"
        >
            <FaBars size={16} />
        </button>
    );
}

export default Menu; 