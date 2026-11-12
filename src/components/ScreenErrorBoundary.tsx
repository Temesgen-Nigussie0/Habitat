import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Download, RotateCcw } from 'lucide-react'
import { exportBackup } from '../lib/backup'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Intentionally silent in production; user sees recovery card
  }

  handleReload = () => {
    this.setState({ hasError: false })
  }

  handleExport = async () => {
    try {
      await exportBackup()
    } catch {
      // Best-effort export
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center justify-center bg-[#070709] px-5"
          style={{ height: '100dvh' }}
        >
          <div className="w-full max-w-[360px] rounded-[24px] border border-[#242428] bg-[#161618] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FF453A]/15 text-[#FF453A]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-[18px] font-bold text-[#F5F5F7]">
              Something broke on this screen
            </h2>
            <p className="mt-1.5 text-[13px] text-[#A1A1AA]">
              Your habits and tasks are still safe on this phone.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#FF6A00] text-[14px] font-bold text-white active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                Reload screen
              </button>
              <button
                type="button"
                onClick={this.handleExport}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#2C2C30] bg-[#0D0D0E] text-[14px] font-semibold text-[#F5F5F7] active:scale-95"
              >
                <Download className="h-4 w-4 text-[#FF6A00]" />
                Export backup
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

