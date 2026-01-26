export { };

declare global {
    interface Window {
        Telegram?: {
            WebApp: {
                initData: string;
                ready: () => void;
                expand: () => void;
                HapticFeedback: {
                    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
                    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
                    selectionChanged: () => void;
                };
                [key: string]: any;
            };
        };
    }
}
