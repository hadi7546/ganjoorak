export type ThemeOption = 'light' | 'dark' | 'paper';

export type PoemFontOption = 'vazirmatn' | 'noto' | 'scheherazade';

export interface PoemSettings {
    theme: ThemeOption;
    font: PoemFontOption;
    showCoupletNumbers: boolean;
}

export const DEFAULT_SETTINGS: PoemSettings = {
    theme: 'dark',
    font: 'vazirmatn',
    showCoupletNumbers: false,
};

export const THEME_ORDER: ThemeOption[] = ['light', 'dark', 'paper'];
