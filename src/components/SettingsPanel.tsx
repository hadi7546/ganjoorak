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
    previewCouplets: string[][];
    isModern: boolean;
}

const themeOptions: { value: ThemeOption; label: string; description: string }[] = [
    {
        value: 'light',
        label: 'پوسته روشن',
        description: 'پس‌زمینه روشن با کنتراست بالا برای خوانایی بیشتر.',
    },
    {
        value: 'dark',
        label: 'پوسته تاریک',
        description: 'پس‌زمینه تیره برای مطالعه در محیط‌های کم‌نور.',
    },
    {
        value: 'paper',
        label: 'پوسته کاغذی',
        description: 'حس کاغذ قدیمی با رنگ‌های گرم و بافت ملایم.',
    },
];

const fontOptions: { value: PoemFontOption; label: string; description: string }[] = [
    {
        value: 'vazirmatn',
        label: 'وزیرمتن',
        description: 'فونت مدرن و خوانا، مناسب برای صفحه‌نمایش‌های امروزی.',
    },
    {
        value: 'noto',
        label: 'نوتو نسخ',
        description: 'فونت کلاسیک با حروف نسخ برای حس سنتی‌تر.',
    },
    {
        value: 'scheherazade',
        label: 'شهرزاد',
        description: 'فونت نرم و ادبی برای تجربه‌ای شاعرانه‌تر.',
    },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen,
    settings,
    onChange,
    onSave,
    onDiscard,
    onClose,
    previewCouplets,
    isModern,
}) => {
    const showCoupletNumbers = settings.showCoupletNumbers && !isModern;

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
                        <div className={`settings-preview ${settings.theme}`} data-poem-font={settings.font}>
                            <div className="settings-preview-inner">
                                <h3 className="settings-section-title">پیش‌نمایش</h3>
                                <div className={`settings-preview-body ${isModern ? 'modern' : ''}`}>
                                    {previewCouplets.length === 0 ? (
                                        <p className="settings-preview-placeholder">
                                            برای نمایش پیش‌نمایش ابتدا شعری بارگیری کنید.
                                        </p>
                                    ) : (
                                        previewCouplets.map((couplet, index) => (
                                            <div
                                                key={`preview-${index}`}
                                                className={`settings-preview-verse ${showCoupletNumbers ? 'with-number' : ''}`}
                                            >
                                                {showCoupletNumbers && (
                                                    <span className="settings-preview-number">{index + 1}</span>
                                                )}
                                                {couplet.map((line, lineIndex) => (
                                                    <div key={`line-${index}-${lineIndex}`} className="settings-preview-line">
                                                        <span className="verse-text">{line}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
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
                                            <div className="option-content">
                                                <span className="option-label">{option.label}</span>
                                                <span className="option-description">{option.description}</span>
                                            </div>
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
                                            <div className="option-content">
                                                <span className="option-label">{option.label}</span>
                                                <span className="option-description">{option.description}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-group">
                                <div className="settings-group-header">
                                    <FaListOl />
                                    <h3>نمایش شماره ابیات</h3>
                                </div>
                                <label className="settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.showCoupletNumbers}
                                        onChange={event => onChange({ showCoupletNumbers: event.target.checked })}
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
