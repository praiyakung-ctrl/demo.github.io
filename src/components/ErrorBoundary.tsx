import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // demo has no backend/monitoring service — this is where a real error
    // tracker (e.g. Sentry) would receive the report
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="card max-w-md w-full text-center p-8">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาดบางอย่าง</h1>
          <p className="text-xl text-gray-500 mb-6">ระบบขัดข้องชั่วคราว กรุณาลองโหลดหน้าใหม่อีกครั้ง</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            โหลดหน้าใหม่
          </button>
        </div>
      </div>
    );
  }
}
