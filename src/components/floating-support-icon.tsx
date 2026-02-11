'use client'

import { useState, useEffect } from 'react'
import { HelpCircle, X, LogIn, AlertCircle, FileText, Calendar } from 'lucide-react'
import { IssueSubmissionForm } from './issue-submission-form'
import { MeetingRequestForm } from './meeting-request-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function FloatingSupportIcon() {
  const [isOpen, setIsOpen] = useState(false)
  const [supportType, setSupportType] = useState<'select' | 'issue' | 'meeting'>('select')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setIsAuthenticated(!!data.user)
          setUserRole(data.user?.role || null)
        } else {
          setIsAuthenticated(false)
        }
      } catch {
        setIsAuthenticated(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [])

  const handleClick = () => {
    if (!isAuthenticated) {
      setIsOpen(true)
    } else if (userRole === 'staff') {
      setIsOpen(true)
    } else {
      setIsOpen(true) // Still open but will show message
    }
  }

  return (
    <>
      {/* Floating Support Button */}
      <button
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        aria-label="Get Support"
      >
        <HelpCircle className="w-6 h-6" />
        <span className="ml-2 hidden sm:inline font-medium">Support</span>
      </button>

      {/* Support Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setIsOpen(false)
                setSupportType('select')
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6">
              {supportType === 'select' ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                    How can we help you?
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setSupportType('issue')}
                      className="p-6 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-left group"
                    >
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/40 transition-colors">
                        <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-foreground mb-2">
                        Report an Issue
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Submit a technical issue or problem you&apos;re experiencing
                      </p>
                    </button>
                    <button
                      onClick={() => setSupportType('meeting')}
                      className="p-6 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-left group"
                    >
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/40 transition-colors">
                        <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-foreground mb-2">
                        Request a Meeting
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Schedule a meeting with Technical Staff to discuss your needs
                      </p>
                    </button>
                  </div>
                </>
              ) : supportType === 'issue' ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    Report an Issue
                  </h2>
                  {isChecking ? (
                    <div className="py-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <p className="mt-4 text-slate-600 dark:text-slate-400">
                        Checking authentication...
                      </p>
                    </div>
                  ) : userRole && userRole !== 'staff' ? (
                    <div className="py-8 text-center">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-foreground mb-2">
                        Staff Access Required
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Only staff members can report issues. Please log in with a staff account.
                      </p>
                      <Link href="/login">
                        <Button variant="outline" className="flex items-center gap-2">
                          <LogIn className="w-4 h-4" />
                          Staff Login
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <IssueSubmissionForm
                      onSuccess={() => {
                        setIsOpen(false)
                        setSupportType('select')
                      }}
                      isAuthenticated={Boolean(isAuthenticated && userRole === 'staff')}
                    />
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    Request a Meeting
                  </h2>
                  {isChecking ? (
                    <div className="py-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <p className="mt-4 text-slate-600 dark:text-slate-400">
                        Checking authentication...
                      </p>
                    </div>
                  ) : (
                    <MeetingRequestForm
                      onSuccess={() => {
                        setIsOpen(false)
                        setSupportType('select')
                      }}
                      isAuthenticated={Boolean(isAuthenticated && userRole === 'staff')}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
