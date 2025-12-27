import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Bell, ShieldCheck, Plus, Trash2, Loader2, CheckCircle, Pill, Stethoscope } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

import { Sidebar } from './components/Sidebar';
import { UploadReport } from './components/UploadReport';
import { generateHealthInsights, analyzeMedicalDocument, processMedicalImage } from './services/geminiService';
// Ensure strict relative path here:
import { syncPatientData, addPatientSymptom, updatePatientProfile, addPatientReport, isFirebaseReady } from './services/firebaseService';
import { PatientProfile, Medication, MedicalRecord, SymptomLog, AIInsight, UploadedFile } from './types';

// --- MOCK DATA FOR INITIALIZATION ---
const INITIAL_PROFILE: PatientProfile = {
  name: "John Doe",
  age: 45,
  gender: "Male",
  bloodGroup: "O+",
  height: 178,
  weight: 82,
  allergies: ["Penicillin", "Peanuts"],
  lifestyle: { smoking: false, alcohol: true, activityLevel: 'Moderate' }
};

const INITIAL_MEDS: Medication[] = [
  { id: '1', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', startDate: '2023-01-15', active: true },
  { id: '2', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', startDate: '2023-03-10', active: true }
];

const INITIAL_SYMPTOMS: SymptomLog[] = [
  { id: '1', symptom: 'Headache', severity: 4, date: new Date(Date.now() - 86400000 * 2).toISOString(), duration: '2 hours' },
  { id: '2', symptom: 'Mild Chest Pain', severity: 6, date: new Date(Date.now() - 86400000).toISOString(), duration: '15 mins' }
];

const INITIAL_HISTORY: MedicalRecord[] = [
  { id: '1', type: 'Condition', name: 'Type 2 Diabetes', date: '2020-05-20', notes: 'Diagnosed during routine checkup' },
  { id: '2', type: 'Surgery', name: 'Appendectomy', date: '2015-11-12', notes: 'Laparoscopic removal' }
];

const DEMO_USER_ID = "demo_patient_001";

function App() {
  // --- STATE ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const [profile, setProfile] = useState<PatientProfile>(INITIAL_PROFILE);
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDS);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>(INITIAL_SYMPTOMS);
  const [history, setHistory] = useState<MedicalRecord[]>(INITIAL_HISTORY);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // --- ACTIONS ---

  const refreshAIInsights = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const jsonResult = await generateHealthInsights(profile, symptoms, medications, history);
      const parsed = JSON.parse(jsonResult) as AIInsight;
      setAiInsight(parsed);
    } catch (e) {
      console.error("Failed to parse AI response", e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [profile, symptoms, medications, history]);

  // Initial load & Firebase Sync
  useEffect(() => {
    // 1. Initial Insight generation
    refreshAIInsights();
    
    // 2. Firebase Sync
    if (isFirebaseReady()) {
      setIsFirebaseConnected(true);
      const unsubscribe = syncPatientData(DEMO_USER_ID, (data) => {
        if (data.profile) setProfile(data.profile);
        if (data.medications) setMedications(data.medications);
        if (data.symptoms) setSymptoms(data.symptoms);
        if (data.history) setHistory(data.history);
        if (data.reports) setFiles(data.reports);
      }, {
        profile: INITIAL_PROFILE,
        medications: INITIAL_MEDS,
        symptoms: INITIAL_SYMPTOMS,
        history: INITIAL_HISTORY
      });
      return () => unsubscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    setProcessingStatus('Uploading...');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64DataUrl = reader.result as string;
      const base64String = base64DataUrl.split(',')[1];
      const mimeType = file.type;

      try {
        let processedImageBase64 = null;
        let finalImageBase64 = base64String;

        // 1. Process Image (Denoise/Crop) if it's an image
        if (file.type.startsWith('image/')) {
          setProcessingStatus('Removing noise & cropping...');
          const processed = await processMedicalImage(base64String, mimeType);
          if (processed) {
            processedImageBase64 = processed;
            finalImageBase64 = processed;
          }
        }

        // 2. Analyze the FINAL image (processed or original)
        setProcessingStatus('Detecting anomalies...');
        const analysisResult = await analyzeMedicalDocument(finalImageBase64, mimeType);

        const newFile: UploadedFile = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          date: new Date().toISOString(),
          previewUrl: base64DataUrl,
          processedUrl: processedImageBase64 ? `data:image/png;base64,${processedImageBase64}` : undefined,
          analysisResult: analysisResult
        };
        
        if (isFirebaseConnected) {
          setProcessingStatus('Saving to database...');
          await addPatientReport(DEMO_USER_ID, newFile);
        } else {
          setFiles(prev => [newFile, ...prev]);
        }

      } catch (error) {
        console.error("Pipeline failed", error);
      } finally {
        setIsUploading(false);
        setProcessingStatus('');
      }
    };
    reader.readAsDataURL(file);
  };

  const addSymptom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLog: SymptomLog = {
      id: Date.now().toString(),
      symptom: formData.get('symptom') as string,
      severity: Number(formData.get('severity')),
      duration: formData.get('duration') as string,
      date: new Date().toISOString()
    };
    
    if (isFirebaseConnected) {
      await addPatientSymptom(DEMO_USER_ID, newLog);
    } else {
      setSymptoms([newLog, ...symptoms]);
    }
    
    (e.target as HTMLFormElement).reset();
  };

  const handleProfileSave = async () => {
    if (isFirebaseConnected) {
      await updatePatientProfile(DEMO_USER_ID, profile);
      alert('Profile synced to database!');
    } else {
      alert('Profile saved locally.');
    }
  };

  // --- RENDER HELPERS ---

  const renderHealthScore = () => {
    const score = aiInsight?.healthScore || 0;
    const data = [
      { name: 'Score', value: score },
      { name: 'Remaining', value: 100 - score },
    ];
    let color = '#22c55e'; // Green
    if(score < 70) color = '#eab308'; // Yellow
    if(score < 50) color = '#ef4444'; // Red

    return (
      <div className="h-48 w-full relative flex items-center justify-center">
         <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                startAngle={180}
                endAngle={0}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell key="score" fill={color} />
                <Cell key="rest" fill="#e5e7eb" />
              </Pie>
            </PieChart>
         </ResponsiveContainer>
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1 text-center">
            <span className="text-4xl font-bold text-gray-800">{score}</span>
            <p className="text-xs text-gray-500 uppercase">Health Score</p>
         </div>
      </div>
    );
  };

  // --- VIEWS ---

  const DashboardView = () => (
    <div className="space-y-6">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profile.name}</h1>
          <p className="text-gray-500">Here's your daily health overview.</p>
        </div>
        {isFirebaseConnected && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium border border-green-200">
             Database Connected
          </span>
        )}
      </header>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Health Score</h3>
          {renderHealthScore()}
          <div className="text-center mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              (aiInsight?.healthScore || 0) > 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {aiInsight?.urgency === 'Low' ? 'Stable Condition' : 'Attention Needed'}
            </span>
          </div>
        </div>

        {/* AI Insights Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
               <ShieldCheck className="w-5 h-5 text-brand-600" /> 
               MediQuest AI Insights
            </h3>
            <button 
              onClick={refreshAIInsights}
              disabled={isAnalyzing}
              className="text-sm text-brand-600 hover:text-brand-800 disabled:opacity-50"
            >
              {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
          </div>
          
          {isAnalyzing ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 leading-relaxed">
                {aiInsight?.summary || "No data available yet. Please add symptoms or medical records."}
              </p>
              
              {aiInsight?.riskFactors && aiInsight.riskFactors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <p className="text-sm font-bold text-red-800 mb-2">Potential Risk Factors:</p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {aiInsight.riskFactors.map((rf, i) => <li key={i}>{rf}</li>)}
                  </ul>
                </div>
              )}

              {aiInsight?.recommendations && (
                <div className="bg-brand-50 p-4 rounded-lg border border-brand-100">
                  <p className="text-sm font-bold text-brand-800 mb-2">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm text-brand-700 space-y-1">
                     {aiInsight.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Medications</h3>
          <div className="space-y-3">
            {medications.filter(m => m.active).map(med => (
              <div key={med.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{med.name}</p>
                    <p className="text-xs text-gray-500">{med.dosage} • {med.frequency}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Active</span>
              </div>
            ))}
            {medications.length === 0 && <p className="text-gray-400 text-sm">No active medications.</p>}
          </div>
          <button onClick={() => setCurrentView('medications')} className="w-full mt-4 py-2 text-sm text-brand-600 font-medium hover:bg-brand-50 rounded-lg transition-colors">
            Manage Medications
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Symptoms</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symptoms.slice(0, 5).reverse()}>
                   <XAxis dataKey="symptom" tick={{fontSize: 10}} interval={0} />
                   <YAxis hide />
                   <RechartsTooltip />
                   <Bar dataKey="severity" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <button onClick={() => setCurrentView('symptoms')} className="w-full mt-4 py-2 text-sm text-brand-600 font-medium hover:bg-brand-50 rounded-lg transition-colors">
            Log New Symptom
          </button>
        </div>
      </div>
    </div>
  );

  const ProfileView = () => (
    <div className="max-w-2xl mx-auto space-y-6">
       <h2 className="text-2xl font-bold text-gray-900">Patient Profile</h2>
       <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500" />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input type="number" value={profile.age} onChange={e => setProfile({...profile, age: parseInt(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md" />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <select value={profile.bloodGroup} onChange={e => setProfile({...profile, bloodGroup: e.target.value})} className="w-full p-2 border border-gray-300 rounded-md">
                   {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                <input type="number" value={profile.height} onChange={e => setProfile({...profile, height: parseInt(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md" />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <input type="number" value={profile.weight} onChange={e => setProfile({...profile, weight: parseInt(e.target.value)})} className="w-full p-2 border border-gray-300 rounded-md" />
             </div>
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (comma separated)</label>
                <input type="text" value={profile.allergies.join(', ')} onChange={e => setProfile({...profile, allergies: e.target.value.split(',').map(s => s.trim())})} className="w-full p-2 border border-gray-300 rounded-md" />
             </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={handleProfileSave} className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors">
              Save Changes
            </button>
          </div>
       </div>
    </div>
  );

  const SymptomsView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Symptom Logger</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Log a New Symptom</h3>
        <form onSubmit={addSymptom} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
           <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Symptom Name</label>
              <input name="symptom" type="text" placeholder="e.g. Migraine, Nausea" required className="w-full p-2 border border-gray-300 rounded-md" />
           </div>
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity (1-10)</label>
              <input name="severity" type="number" min="1" max="10" required className="w-full p-2 border border-gray-300 rounded-md" />
           </div>
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <input name="duration" type="text" placeholder="e.g. 2 hours" required className="w-full p-2 border border-gray-300 rounded-md" />
           </div>
           <button type="submit" className="md:col-span-4 bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 flex items-center justify-center gap-2">
             <Plus className="w-4 h-4" /> Add Symptom
           </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="p-4 text-xs font-medium text-gray-500 uppercase">Symptom</th>
              <th className="p-4 text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th className="p-4 text-xs font-medium text-gray-500 uppercase">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {symptoms.map(log => (
               <tr key={log.id} className="hover:bg-gray-50">
                 <td className="p-4 text-sm text-gray-600">{new Date(log.date).toLocaleDateString()}</td>
                 <td className="p-4 text-sm font-medium text-gray-900">{log.symptom}</td>
                 <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.severity >= 7 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {log.severity}/10
                    </span>
                 </td>
                 <td className="p-4 text-sm text-gray-600">{log.duration}</td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const DoctorRecommendationView = () => (
     <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Doctor Recommendations</h2>
        
        {/* AI Suggestion Banner */}
        <div className="bg-gradient-to-r from-brand-600 to-teal-700 text-white p-6 rounded-xl shadow-lg">
           <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                 <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                 <h3 className="text-lg font-bold">Recommended Specialist: {aiInsight?.doctorSpecialty || "General Physician"}</h3>
                 <p className="text-brand-50 mt-1 opacity-90">
                    Based on your symptoms ({symptoms.map(s => s.symptom).join(', ')}) and history, MediQuest AI suggests consulting a specialist.
                 </p>
                 <div className="mt-4 flex gap-2">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium border border-white/30">
                       Urgency: {aiInsight?.urgency || "Low"}
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Doctor List (Mock) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1, 2, 3].map(i => (
             <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xl font-bold">
                      Dr
                   </div>
                   <div>
                      <h4 className="font-bold text-gray-900">Dr. Sarah Smith</h4>
                      <p className="text-sm text-brand-600">{aiInsight?.doctorSpecialty || "General Physician"}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                   <CheckCircle className="w-4 h-4 text-green-500" />
                   <span>Highly Recommended match</span>
                </div>
                <button className="w-full py-2 border border-brand-600 text-brand-600 rounded-lg hover:bg-brand-50 transition-colors font-medium">
                   Book Appointment
                </button>
             </div>
           ))}
        </div>
     </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'profile': return <ProfileView />;
      case 'medications': 
      case 'inventory':
          // Reusing Inventory logic simply for this demo
          return (
             <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <h2 className="text-xl font-bold mb-2">Medical Inventory</h2>
                <p className="text-gray-500">Comprehensive list of Conditions, Surgeries, and Medications.</p>
                <div className="mt-8 text-left space-y-4">
                   <h3 className="font-bold text-gray-800 border-b pb-2">Conditions</h3>
                   {history.map(h => <div key={h.id} className="p-3 bg-gray-50 rounded">{h.name} ({h.date})</div>)}
                   <h3 className="font-bold text-gray-800 border-b pb-2 pt-4">Medications</h3>
                   {medications.map(m => <div key={m.id} className="p-3 bg-gray-50 rounded">{m.name} - {m.dosage}</div>)}
                </div>
             </div>
          );
      case 'symptoms': return <SymptomsView />;
      case 'upload': return <UploadReport files={files} isUploading={isUploading} processingStatus={processingStatus} onFileUpload={handleFileUpload} />;
      case 'doctor': return <DoctorRecommendationView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
      {/* Sidebar */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header (Mobile) */}
        <header className="md:hidden bg-white border-b border-gray-200 flex items-center justify-between p-4 z-10">
           <button onClick={() => setIsMobileOpen(true)} className="text-gray-600">
              <Menu className="w-6 h-6" />
           </button>
           <span className="font-bold text-brand-700">MediQuest AI</span>
           <div className="w-6" /> {/* Spacer */}
        </header>

        {/* Header (Desktop - Search/Notifications) */}
        <header className="hidden md:flex bg-white border-b border-gray-200 h-16 items-center justify-between px-8">
           <h2 className="text-xl font-semibold text-gray-800 capitalize">{currentView.replace('-', ' ')}</h2>
           <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold">
                 JD
              </div>
           </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
           <div className="max-w-6xl mx-auto">
              {renderContent()}
           </div>
        </main>
      </div>
    </div>
  );
}

export default App;