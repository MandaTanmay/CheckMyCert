// File-based storage for verification results (development only)
// In production, replace with actual database

import fs from 'fs'
import path from 'path'

interface VerificationResult {
  job_id: string
  status: string
  extracted_text: string
  extracted_fields: any
  confidence: number
  timestamp: string
  ocr_result: any
  certificate_image?: string | null // Base64 encoded image
  certificate_filename?: string | null
  certificate_mimetype?: string | null
  word_coordinates?: Array<{
    text: string
    bbox: {
      x: number
      y: number
      width: number
      height: number
    }
    confidence: number
  }> | null
}

const STORAGE_DIR = path.join(process.cwd(), '.tmp', 'verification-results')

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

export class ResultsStorage {
  static store(jobId: string, data: VerificationResult): void {
    try {
      const filePath = path.join(STORAGE_DIR, `${jobId}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`ResultsStorage: Stored result for job ${jobId} in file ${filePath}`)
    } catch (error) {
      console.error(`ResultsStorage: Failed to store job ${jobId}:`, error)
    }
  }

  static get(jobId: string): VerificationResult | null {
    try {
      const filePath = path.join(STORAGE_DIR, `${jobId}.json`)
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8')
        const result = JSON.parse(data)
        console.log(`ResultsStorage: Retrieved result for job ${jobId}`)
        return result
      } else {
        console.log(`ResultsStorage: No file found for job ${jobId} at ${filePath}`)
        return null
      }
    } catch (error) {
      console.error(`ResultsStorage: Failed to retrieve job ${jobId}:`, error)
      return null
    }
  }

  static getAll(): VerificationResult[] {
    try {
      const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'))
      const results = files.map(file => {
        const data = fs.readFileSync(path.join(STORAGE_DIR, file), 'utf8')
        return JSON.parse(data)
      })
      console.log(`ResultsStorage: Retrieved ${results.length} total results`)
      return results
    } catch (error) {
      console.error(`ResultsStorage: Failed to retrieve all results:`, error)
      return []
    }
  }

  static debug(): void {
    try {
      const files = fs.readdirSync(STORAGE_DIR).filter(f => f.endsWith('.json'))
      console.log(`ResultsStorage: Current storage state:`)
      console.log(`  Storage directory: ${STORAGE_DIR}`)
      console.log(`  Total result files: ${files.length}`)
      files.forEach(file => {
        const jobId = file.replace('.json', '')
        console.log(`  - ${jobId}`)
      })
    } catch (error) {
      console.error(`ResultsStorage: Failed to debug storage:`, error)
    }
  }
}

export type { VerificationResult as StoredVerificationResult }