import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes, FaSave, FaUndo, FaPalette, FaFont, FaListOl } from 'react-icons/fa';
import type { PoemSettings, ThemeOption, PoemFontOption } from '@/types/settings';

interface SettingsPanelProps {
    isOpen: boolean;
    settings: PoemSettings;
    onChange: (changes: Partial<PoemSettings>) => void;
    onSave: () => void;
    onDiscard: () => void;
    onClose: () => void;
    isModern: boolean;
}

const themeOptions: { value: ThemeOption; label: string }[] = [
    {
        value: 'light',
        label: 'پوسته روشن',
    },
    {
        value: 'dark',
        label: 'پوسته تاریک',
    },
    {
        value: 'paper',
        label: 'پوسته کاغذی',
    },
];

const fontOptions: { value: PoemFontOption; label: string }[] = [
    {
        value: 'vazirmatn',
        label: 'وزیرمتن',
    },
    {
        value: 'noto',
        label: 'نوتو نسخ',
    },
    {
        value: 'scheherazade',
        label: 'شهرزاد',
    },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen,
    settings,
    onChange,
    onSave,
    onDiscard,
    onClose,
    isModern,
}) => {
    const disableCoupletNumbers = isModern;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="settings-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="settings-dialog"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.35, bounce: 0.2 }}
                        onClick={event => event.stopPropagation()}
                    >
                        <button className="settings-close" onClick={onClose} aria-label="بستن تنظیمات">
                            <FaTimes />
                        </button>
                        <div className="settings-controls">
                            <div className="settings-group">
                                <div className="settings-group-header">
                                    <FaPalette />
                                    <h3>پوسته</h3>
                                </div>
                                <div className="settings-options">
                                    {themeOptions.map(option => (
                                        <label
                                            key={option.value}
                                            className={`settings-option ${settings.theme === option.value ? 'active' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="theme"
                                                value={option.value}
                                                checked={settings.theme === option.value}
                                                onChange={() => onChange({ theme: option.value })}
                                            />
                                            <span className="option-label">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-group">
                                <div className="settings-group-header">
                                    <FaFont />
                                    <h3>فونت شعر</h3>
                                </div>
                                <div className="settings-options">
                                    {fontOptions.map(option => (
                                        <label
                                            key={option.value}
                                            className={`settings-option ${settings.font === option.value ? 'active' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="font"
                                                value={option.value}
                                                checked={settings.font === option.value}
                                                onChange={() => onChange({ font: option.value })}
                                            />
                                            <span className="option-label">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-group">
                                <div className="settings-group-header">
                                    <FaListOl />
                                    <h3>نمایش شماره ابیات</h3>
                                </div>
                                <label className={`settings-toggle ${disableCoupletNumbers ? 'disabled' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={settings.showCoupletNumbers}
                                        disabled={disableCoupletNumbers}
                                        onChange={event =>
                                            onChange({ showCoupletNumbers: event.target.checked })
                                        }
                                    />
                                    <span className="toggle-slider" />
                                    <span className="toggle-label">نمایش شماره مصرع‌ها در شعرهای کلاسیک</span>
                                </label>
                            </div>

                            <div className="settings-actions">
                                <button className="settings-action save" onClick={onSave}>
                                    <FaSave />
                                    <span>ذخیره</span>
                                </button>
                                <button className="settings-action discard" onClick={onDiscard}>
                                    <FaUndo />
                                    <span>صرف‌نظر</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsPanel;
