'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, Trash2, Info } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="h-6 w-6 text-[#EF4444]" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-[#F59E0B]" />
      case 'info':
        return <Info className="h-6 w-6 text-[#6366F1]" />
    }
  }

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
      case 'warning':
        return 'bg-[#F59E0B] hover:bg-[#D97706] text-white'
      case 'info':
        return 'bg-[#6366F1] hover:bg-[#818CF8] text-white'
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#12121A] border-[#2A2A3C]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${
              variant === 'danger' ? 'bg-[#EF4444]/10' :
              variant === 'warning' ? 'bg-[#F59E0B]/10' :
              'bg-[#6366F1]/10'
            }`}>
              {getIcon()}
            </div>
            <div>
              <AlertDialogTitle className="text-[#F0F0F5]">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-[#9494A8] mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={loading}
            className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5] hover:bg-[#2A2A3C]"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={loading}
            className={getButtonClass()}
          >
            {loading ? 'Loading...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
