export const CLASSIFICATION_TYPES = {
  OFW_MESSAGE: 'OFW Message',
  EMAIL: 'Email',
  COURT_FILING: 'Court Filing',
  FINANCIAL_RECORD: 'Financial Record',
  MEDICAL_RECORD: 'Medical Record',
  SCHOOL_RECORD: 'School Record',
  PHOTO_EVIDENCE: 'Photo Evidence',
  TEXT_MESSAGE: 'Text Message',
  LEGAL_CORRESPONDENCE: 'Legal Correspondence',
  PARENTING_PLAN: 'Parenting Plan',
  OTHER: 'Other'
}

export const CATEGORY_COLORS = {
  OFW_MESSAGE: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-700' },
  EMAIL: { bg: 'bg-cyan-900/50', text: 'text-cyan-300', border: 'border-cyan-700' },
  COURT_FILING: { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-700' },
  FINANCIAL_RECORD: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-700' },
  MEDICAL_RECORD: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-700' },
  SCHOOL_RECORD: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-700' },
  PHOTO_EVIDENCE: { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-700' },
  TEXT_MESSAGE: { bg: 'bg-teal-900/50', text: 'text-teal-300', border: 'border-teal-700' },
  LEGAL_CORRESPONDENCE: { bg: 'bg-indigo-900/50', text: 'text-indigo-300', border: 'border-indigo-700' },
  PARENTING_PLAN: { bg: 'bg-pink-900/50', text: 'text-pink-300', border: 'border-pink-700' },
  OTHER: { bg: 'bg-slate-800/50', text: 'text-slate-300', border: 'border-slate-600' }
}

export const FILE_TYPE_MAPPINGS = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Image',
  'image/png': 'Image',
  'image/tiff': 'Image',
  'image/webp': 'Image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/csv': 'CSV',
  'text/plain': 'Text',
  'message/rfc822': 'Email'
}

export const OBLIGATION_CATEGORIES = [
  'Custody Schedule',
  'Communication',
  'Decision Making',
  'Financial',
  'Medical',
  'Education',
  'Travel',
  'Relocation',
  'Right of First Refusal',
  'Holiday Schedule',
  'Transportation',
  'Other'
]

export const CONFIDENCE_LEVELS = {
  HIGH: { label: 'High', color: 'text-green-400' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-400' },
  LOW: { label: 'Low', color: 'text-red-400' }
}

export const PROCESSING_STATUS = {
  PENDING: 'pending',
  EXTRACTING: 'extracting',
  CLASSIFYING: 'classifying',
  COMPLETE: 'complete',
  ERROR: 'error'
}
