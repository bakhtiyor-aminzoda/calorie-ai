
// Mock Telegram WebApp for local development
if (import.meta.env.DEV) {
    console.log('Mocking Telegram WebApp Environment');

    const mockUser = {
        id: 999999,
        first_name: "QA",
        last_name: "Tester",
        username: "qatester",
        language_code: "en",
        is_premium: true
    };

    const mockInitData = new URLSearchParams({
        query_id: "AAG",
        user: JSON.stringify(mockUser),
        auth_date: Math.floor(Date.now() / 1000).toString(),
        hash: "mock" // Matches our backend bypass
    }).toString();

    // Mock Session Storage for SDKProvider
    try {
        if (!sessionStorage.getItem('__telegram__initParams')) {
            const mockParams = {
                tgWebAppVersion: '7.0',
                tgWebAppData: mockInitData,
                tgWebAppPlatform: 'tdd',
                tgWebAppThemeParams: {}
            };
            sessionStorage.setItem('__telegram__initParams', JSON.stringify(mockParams));
        }
    } catch (e) {
        console.error('Failed to mock sessionStorage', e);
    }

    // Force Hash for SDK Safety (The "Sledgehammer" Fix)
    if (!window.location.hash && !window.location.search) {
        console.log('Injecting Mock Hash for SDK');
        window.location.hash = `tgWebAppData=${encodeURIComponent(mockInitData)}&tgWebAppVersion=7.0&tgWebAppPlatform=tdd&tgWebAppThemeParams=%7B%7D`;
    }

    // @ts-ignore
    window.Telegram = {
        WebApp: {
            initData: mockInitData,
            initDataUnsafe: {
                query_id: "AAG",
                user: mockUser,
                auth_date: Math.floor(Date.now() / 1000).toString(),
                hash: "mock"
            },
            version: '6.0',
            platform: 'unknown',
            colorScheme: 'dark',
            themeParams: {
                bg_color: '#000000',
                text_color: '#ffffff',
                hint_color: '#aaabac',
                link_color: '#2481cc',
                button_color: '#2481cc',
                button_text_color: '#ffffff',
                secondary_bg_color: '#1c1c1e'
            },
            isExpanded: true,
            viewportHeight: 800,
            viewportStableHeight: 800,
            headerColor: '#ffffff',
            backgroundColor: '#ffffff',
            BackButton: { isVisible: false, onClick: () => { }, offClick: () => { }, show: () => { }, hide: () => { } },
            MainButton: {
                text: 'CONTINUE',
                color: '#2481cc',
                textColor: '#ffffff',
                isVisible: false,
                isActive: true,
                isProgressVisible: false,
                setText: () => { },
                onClick: () => { },
                offClick: () => { },
                show: () => { },
                hide: () => { },
                enable: () => { },
                disable: () => { },
                showProgress: () => { },
                hideProgress: () => { },
                setParams: () => { }
            },
            HapticFeedback: {
                impactOccurred: () => console.log('Haptic: impact'),
                notificationOccurred: () => console.log('Haptic: notification'),
                selectionChanged: () => console.log('Haptic: selection')
            },
            ready: () => console.log('Telegram.WebApp.ready() called'),
            expand: () => console.log('Telegram.WebApp.expand() called'),
            close: () => console.log('Telegram.WebApp.close() called'),
            onEvent: (eventType: string, callback: () => void) => console.log(`Telegram.WebApp.onEvent(${eventType})`),
            offEvent: (eventType: string, callback: () => void) => console.log(`Telegram.WebApp.offEvent(${eventType})`),
            sendData: (data: any) => console.log(`Telegram.WebApp.sendData(${data})`),
            openLink: (url: string) => window.open(url, '_blank'),
            openTelegramLink: (url: string) => window.open(url, '_blank'),
            openInvoice: (url: string) => console.log(`Telegram.WebApp.openInvoice(${url})`),
            showPopup: (params: any, callback?: (id?: string) => void) => {
                console.log('Telegram.WebApp.showPopup', params);
                if (callback) callback('ok');
            },
            showAlert: (message: string, callback?: () => void) => {
                alert(message);
                if (callback) callback();
            },
            showConfirm: (message: string, callback?: (confirmed: boolean) => void) => {
                const result = confirm(message);
                if (callback) callback(result);
            },
            CloudStorage: {
                getItem: (key: string, callback?: (error: any, value: string) => void) => callback?.(null, ''),
                setItem: (key: string, value: string, callback?: (error: any, stored: boolean) => void) => callback?.(null, true),
                getItems: (keys: string[], callback?: (error: any, values: any) => void) => callback?.(null, {}),
                removeItem: (key: string, callback?: (error: any, deleted: boolean) => void) => callback?.(null, true),
                removeItems: (keys: string[], callback?: (error: any, deleted: boolean) => void) => callback?.(null, true),
                getKeys: (callback?: (error: any, keys: string[]) => void) => callback?.(null, [])
            }
        }
    };
}
