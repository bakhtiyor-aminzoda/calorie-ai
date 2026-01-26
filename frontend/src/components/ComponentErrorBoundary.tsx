import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ComponentErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Modal Component Error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                    <h3 className="font-bold">Ошибка отображения</h3>
                    <pre className="text-xs mt-2 whitespace-pre-wrap">{this.state.error?.message}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}
