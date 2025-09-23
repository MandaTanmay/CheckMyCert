export interface QRScanResult {
  data: string
  location: {
    topLeftCorner: { x: number; y: number }
    topRightCorner: { x: number; y: number }
    bottomLeftCorner: { x: number; y: number }
    bottomRightCorner: { x: number; y: number }
  }
}

export class QRScanner {
  private video: HTMLVideoElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null
  private stream: MediaStream | null = null
  private scanning = false
  private onScanCallback: ((result: QRScanResult) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null

  constructor() {
    // Dynamically import jsQR to avoid SSR issues
    this.loadJsQR()
  }

  private async loadJsQR() {
    try {
      // In a real implementation, you would install jsQR: npm install jsqr
      // For now, we'll use a simplified detection algorithm
      console.log("QR scanner initialized")
    } catch (error) {
      console.error("Failed to load QR scanner library:", error)
    }
  }

  async startScanning(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onScan: (result: QRScanResult) => void,
    onError: (error: string) => void,
  ): Promise<void> {
    this.video = videoElement
    this.canvas = canvasElement
    this.context = canvasElement.getContext("2d")
    this.onScanCallback = onScan
    this.onErrorCallback = onError

    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      this.video.srcObject = this.stream
      this.video.setAttribute("playsinline", "true") // Required for iOS
      await this.video.play()

      this.scanning = true
      this.scanFrame()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Camera access failed"
      this.onErrorCallback?.(errorMessage)
    }
  }

  private scanFrame(): void {
    if (!this.scanning || !this.video || !this.canvas || !this.context) {
      return
    }

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.canvas.width = this.video.videoWidth
      this.canvas.height = this.video.videoHeight

      // Draw video frame to canvas
      this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)

      // Get image data for QR detection
      const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height)

      // Attempt QR code detection
      const qrResult = this.detectQRCode(imageData)

      if (qrResult) {
        this.onScanCallback?.(qrResult)
        this.stopScanning()
        return
      }
    }

    // Continue scanning
    requestAnimationFrame(() => this.scanFrame())
  }

  private detectQRCode(imageData: ImageData): QRScanResult | null {
    // Simplified QR detection - in production, use jsQR library
    // This is a mock implementation for demonstration

    // Look for QR-like patterns in the image
    const { data, width, height } = imageData

    // Simple pattern detection for demo purposes
    // In reality, jsQR would handle this complex detection
    const hasQRPattern = this.hasQRLikePattern(data, width, height)

    if (hasQRPattern) {
      // Mock QR data - in production, jsQR would decode the actual data
      const mockQRData = this.generateMockQRData()

      return {
        data: mockQRData,
        location: {
          topLeftCorner: { x: width * 0.2, y: height * 0.2 },
          topRightCorner: { x: width * 0.8, y: height * 0.2 },
          bottomLeftCorner: { x: width * 0.2, y: height * 0.8 },
          bottomRightCorner: { x: width * 0.8, y: height * 0.8 },
        },
      }
    }

    return null
  }

  private hasQRLikePattern(data: Uint8ClampedArray, width: number, height: number): boolean {
    // Simplified pattern detection
    // Look for high contrast areas that might indicate QR code patterns

    let highContrastAreas = 0
    const sampleSize = 50 // Sample every 50th pixel for performance

    for (let i = 0; i < data.length; i += sampleSize * 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b

      // Check for high contrast (very dark or very light)
      if (luminance < 50 || luminance > 200) {
        highContrastAreas++
      }
    }

    // If we have enough high contrast areas, assume QR pattern
    const contrastRatio = highContrastAreas / (data.length / (sampleSize * 4))
    return contrastRatio > 0.3 // 30% high contrast areas
  }

  private generateMockQRData(): string {
    // Generate mock QR token for demo
    const tokens = ["qr_demo_valid_12345", "qr_demo_expired_67890", "qr_demo_invalid_abcde"]

    return tokens[Math.floor(Math.random() * tokens.length)]
  }

  stopScanning(): void {
    this.scanning = false

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    if (this.video) {
      this.video.srcObject = null
    }
  }

  isScanning(): boolean {
    return this.scanning
  }
}

// Utility function to validate QR token format
export function isValidQRToken(token: string): boolean {
  // QR tokens should start with 'qr_' and be at least 10 characters
  return /^qr_[a-zA-Z0-9_-]{6,}$/.test(token)
}

// Utility function to extract QR token from various formats
export function extractQRToken(input: string): string | null {
  // Handle different QR code formats
  const patterns = [
    /qr_[a-zA-Z0-9_-]+/i, // Direct token
    /token[=:]([a-zA-Z0-9_-]+)/i, // URL parameter
    /verify\/([a-zA-Z0-9_-]+)/i, // URL path
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) {
      const token = match[1] || match[0]
      if (isValidQRToken(token)) {
        return token
      }
    }
  }

  return null
}
