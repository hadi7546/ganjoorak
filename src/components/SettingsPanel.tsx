import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
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
        label: 'روشن',
    },
    {
        value: 'dark',
        label: 'تاریک',
    },
    {
        value: 'paper',
        label: 'کاغذی',
    },
];

const fontOptions: { value: PoemFontOption; label: string }[] = [
    {
        value: 'vazirmatn',
        label: 'فونت فارسی وزیرمتن',
    },
    {
        value: 'noto',
        label: 'فونت فارسی نسخ',
    },
    {
        value: 'scheherazade',
        label: 'فونت فارسی شهرزاد',
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

    const numberingButtonLabel = settings.showCoupletNumbers ? 'پنهان کردن شماره بیت' : 'نمایش شماره بیت';

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

                        <div className="settings-content">
                            <div className="settings-section">
                                <h3 className="settings-section-title">حالت نمایش</h3>
                                <div className="settings-button-grid settings-button-grid--theme">
                                    {themeOptions.map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`settings-choice ${settings.theme === option.value ? 'active' : ''}`}
                                            onClick={() => onChange({ theme: option.value })}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3 className="settings-section-title">نمایش شماره بیت</h3>
                                <div className="settings-button-grid settings-button-grid--single">
                                    <button
                                        type="button"
                                        className={`settings-choice ${settings.showCoupletNumbers ? 'active' : ''} ${
                                            disableCoupletNumbers ? 'disabled' : ''
                                        }`}
                                        onClick={() =>
                                            onChange({ showCoupletNumbers: !settings.showCoupletNumbers })
                                        }
                                        disabled={disableCoupletNumbers}
                                        title={
                                            disableCoupletNumbers
                                                ? 'این گزینه فقط برای شعرهای کلاسیک فعال است'
                                                : undefined
                                        }
                                    >
                                        {numberingButtonLabel}
                                    </button>
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3 className="settings-section-title">فونت شعر</h3>
                                <div className="settings-button-grid settings-button-grid--fonts">
                                    {fontOptions.map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`settings-choice ${settings.font === option.value ? 'active' : ''}`}
                                            onClick={() => onChange({ font: option.value })}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="settings-footer">
                            <button type="button" className="settings-footer-button primary" onClick={onSave}>
                                ذخیره
                            </button>
                            <button type="button" className="settings-footer-button" onClick={onDiscard}>
                                صرف‌نظر
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsPanel;
