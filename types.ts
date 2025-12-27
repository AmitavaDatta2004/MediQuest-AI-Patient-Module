export interface PatientProfile {
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  height: number; // cm
  weight: number; // kg
  allergies: string[];
  lifestyle: {
    smoking: boolean;
    alcohol: boolean;
    activityLevel: 'Sedentary' | 'Moderate' | 'Active';
  };
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  active: boolean;
}

export interface MedicalRecord {
  id: string;
  type: 'Condition' | 'Surgery' | 'Vaccination';
  name: string;
  date: string;
  notes: string;
}

export interface SymptomLog {
  id: string;
  symptom: string;
  severity: number; // 1-10
  date: string; // ISO string
  duration: string;
}

export interface AIInsight {
  healthScore: number;
  summary: string;
  riskFactors: string[];
  recommendations: string[];
  doctorSpecialty: string;
  urgency: 'Low' | 'Moderate' | 'High' | 'Emergency';
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface MedicalFinding {
  label: string;
  confidence: string;
  box_2d?: BoundingBox; // Normalized 0-1 coordinates
  explanation: string;
}

export interface AnalysisResult {
  findings: MedicalFinding[];
  summary: string;
  disclaimer: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  date: string;
  // We store the base64 url for display purposes in the overlay
  previewUrl?: string; 
  // The processed (denoised/cropped) image URL
  processedUrl?: string;
  analysisResult?: AnalysisResult;
}