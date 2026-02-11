'use client'

import { useState, useEffect } from 'react'
import { HelpCircle, X, LogIn, AlertCircle } from 'lucide-react'
import { IssueSubmissionForm } from './issue-submission-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function FloatingSupportIcon() {
  const [isOpen, setIsOpen] = useState(false)
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
      } catch (error) {
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

      {/* Issue Submission Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6">
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
                  onSuccess={() => setIsOpen(false)}
                  isAuthenticated={isAuthenticated && userRole === 'staff'}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
