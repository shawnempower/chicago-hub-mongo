import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Package Builder Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="font-semibold text-destructive">Error Message:</p>
              <p className="text-sm text-destructive mt-2">{this.state.error.message}</p>
            </div>
            
            {this.state.errorInfo && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold text-sm mb-2">Component Stack:</p>
                <pre className="text-xs overflow-auto max-h-64 text-muted-foreground">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold text-sm mb-2">Error Stack:</p>
              <pre className="text-xs overflow-auto max-h-64 text-muted-foreground">
                {this.state.error.stack}
              </pre>
            </div>

            <Button onClick={this.handleReset} variant="outline">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

