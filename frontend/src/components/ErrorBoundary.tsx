
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { t, type Language } from '../utils/i18n';
import { useStore } from '../store/useStore';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">{t('errors.appTitle', useStore.getState().language as Language)}</h1>
                    <pre className="bg-gray-900 p-4 rounded text-xs text-left overflow-auto max-w-full">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-blue-600 rounded-lg"
                    >
                        {t('errors.reload', useStore.getState().language as Language)}
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
