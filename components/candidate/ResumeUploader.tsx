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
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
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
    setStatus('uploading')
    setErrorMsg('')
    setSuccessMsg('')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/resumes', { method: 'POST', body: form })
      
      // 1. Get raw text to handle empty/malformed responses safely
      const rawText = await res.text()
      let data: any = null
      
      if (rawText) {
        try {
          data = JSON.parse(rawText)
        } catch (parseErr) {
          console.error('[Upload] Malformed JSON:', rawText.slice(0, 500))
        }
      }

      // 2. Check for HTTP errors
      if (!res.ok) {
        throw new Error(data?.error || `Upload failed (Status ${res.status})`)
      }

      // 3. Success!
      setStatus('success')
      setSuccessMsg(
        data?.notice || 'Resume uploaded successfully!'
      )
      
      if (data && onUploaded) {
        onUploaded(data as Resume)
      }
    } catch (err) {
      setStatus('error')
      const message = err instanceof Error ? err.message : 'Upload failed'
      
      // Handle the "Unexpected end of JSON input" error / timeout specifically
      const isTimeout = message.toLowerCase().includes('json') || message.toLowerCase().includes('end of input')
      
      const normalizedMessage = isTimeout 
        ? 'The server is busy parsing your resume. It will appear in your dashboard in a few seconds!'
        : (message.includes('quota') || message.includes('429') ? GENERIC_UPLOAD_ERROR : message)
      
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

  return (
    <Card>
      <CardContent className="p-6">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => status !== 'uploading' && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors
            ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'}
            ${status === 'success' ? 'border-green-500 bg-green-50' : ''}
            ${status === 'error' ? 'border-destructive bg-destructive/5' : ''}
          `}
        >
          {status === 'uploading' && (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-medium">Parsing {fileName}…</p>
              <p className="text-xs text-muted-foreground">This may take a few seconds</p>
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
                <p className="text-sm font-medium text-destructive">{errorMsg}</p>
                {/* Special case: if it was a timeout, let them know it's actually fine */}
                {errorMsg.includes('dashboard') && (
                  <p className="text-xs text-muted-foreground mt-1">Try refreshing the page in 1 minute.</p>
                )}
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
