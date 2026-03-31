'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Resume } from '@/lib/types'

interface Props {
  onUploaded: (resume: Resume) => void
}

const GENERIC_UPLOAD_ERROR = 'AI parsing is temporarily unavailable. Please try again shortly.'

export function ResumeUploader({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'upload_step' | 'parse_step' | 'save_step' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [fileName, setFileName] = useState('')

  async function upload(file: File) {
    if (file.type !== 'application/pdf') {
      setStatus('error')
      setErrorMsg('Only PDF files are accepted.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus('error')
      setErrorMsg('File must be under 5 MB.')
      return
    }

    setFileName(file.name)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      // ----------------------------------------------------------------------
      // STEP 1: Upload to Storage & Extract Raw Text (Fast)
      // ----------------------------------------------------------------------
      setStatus('upload_step')
      const form = new FormData()
      form.append('file', file)

      const res1 = await fetch('/api/resumes/step-1-upload', { method: 'POST', body: form })
      const data1 = await res1.json()

      if (!res1.ok) throw new Error(data1?.error || `Upload failed (Status ${res1.status})`)
      
      const { text: rawPdfText, fileName: storageFileName } = data1

      // ----------------------------------------------------------------------
      // STEP 2: Make Gemini AI extract the JSON structure (Moderate)
      // ----------------------------------------------------------------------
      setStatus('parse_step')
      const res2 = await fetch('/api/resumes/step-2-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawPdfText })
      })
      const data2 = await res2.json()

      if (!res2.ok) throw new Error(data2?.error || `AI parsing failed (Status ${res2.status})`)
      
      const { parsedData } = data2

      // ----------------------------------------------------------------------
      // STEP 3: Create Vector Embeddings and Save to Database (Fast)
      // ----------------------------------------------------------------------
      setStatus('save_step')
      const res3 = await fetch('/api/resumes/step-3-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData, fileName: storageFileName })
      })
      const data3 = await res3.json()

      if (!res3.ok) throw new Error(data3?.error || `Database save failed (Status ${res3.status})`)

      // ----------------------------------------------------------------------
      // DONE!
      // ----------------------------------------------------------------------
      setStatus('success')
      setSuccessMsg('Resume uploaded and parsed successfully!')
      
      if (data3.resume && onUploaded) {
        onUploaded(data3.resume as Resume)
      }

    } catch (err) {
      console.error('Sequence Failed:', err)
      setStatus('error')
      const message = err instanceof Error ? err.message : 'Processing failed'
      const normalizedMessage = message.includes('quota') || message.includes('429') ? GENERIC_UPLOAD_ERROR : message
      setErrorMsg(normalizedMessage)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const isWorking = status === 'upload_step' || status === 'parse_step' || status === 'save_step'

  let workingMessage = 'Processing...'
  if (status === 'upload_step') workingMessage = 'Uploading and reading PDF...'
  if (status === 'parse_step') workingMessage = 'AI is extracting your skills...'
  if (status === 'save_step') workingMessage = 'Saving to database...'

  return (
    <Card>
      <CardContent className="p-6">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isWorking && status !== 'success' && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors
            ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'}
            ${status === 'success' ? 'border-green-500 bg-green-50 cursor-default' : ''}
            ${status === 'error' ? 'border-destructive bg-destructive/5' : ''}
          `}
        >
          {isWorking && (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-medium">{workingMessage}</p>
              <p className="text-xs text-muted-foreground">{fileName}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-10 w-10 text-green-600" />
              <p className="text-sm font-medium text-green-700">{successMsg}</p>
              <p className="text-xs text-muted-foreground">{fileName}</p>
              <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setStatus('idle') }}>
                Upload another
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div className="text-center">
                <p className="text-sm font-medium text-destructive">Upload Failed</p>
                <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
              </div>
              <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setStatus('idle') }}>
                Try again
              </Button>
            </>
          )}

          {status === 'idle' && (
            <>
              <div className="flex items-center justify-center rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Drop your resume here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF only · max 5 MB</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>We&apos;ll extract skills, experience and education automatically</span>
              </div>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  )
}
