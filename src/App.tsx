import React, { useState, useEffect, useMemo } from 'react';
import { TRANSLATIONS } from './constants';
import { Language, DeceasedGender, HeirsData, CalculationResponse } from './types';
import { StepIndicator } from './components/StepIndicator';
import { calculateInheritance } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  Users, Wallet, ChevronRight, ChevronLeft, Scale, AlertTriangle, Languages, GanttChart, Calculator
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ar');
  const [view, setView] = useState<'home' | 'form' | 'results'>('home');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CalculationResponse | null>(null);

  const [formData, setFormData] = useState<HeirsData>({
    deceasedGender: DeceasedGender.MALE,
    estateValue: 0,
    currency: 'SAR',
    debts: 0,
    willAmount: 0,
    hasHusband: false,
    wivesCount: 0,
    sonsCount: 0,
    daughtersCount: 0,
    hasFather: false,
    hasMother: false,
    fullBrothersCount: 0,
    fullSistersCount: 0,
    paternalBrothersCount: 0,
    paternalSistersCount: 0,
  });

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  const netEstateCalculations = useMemo(() => {
    const estate = formData.estateValue || 0;
    const debts = formData.debts || 0;
    const initialRemainder = Math.max(0, estate - debts);
    const maxWill = estate / 3;
    const actualWill = formData.willAmount || 0;
    const net = Math.max(0, initialRemainder - actualWill);
    return {
      estate,
      debts,
      will: actualWill,
      net,
      isWillOverLimit: actualWill > maxWill && estate > 0,
    };
  }, [formData.estateValue, formData.debts, formData.willAmount]);

  const individualHeirs = useMemo(() => {
    if (!results) return [];
    const list: { name: string; amount: number; percentage: number; fraction: string }[] = [];
    const labels = TRANSLATIONS.individualHeirLabels[lang] as any;
    const getShare = (keywords: string[]) =>
      results.shares.find(s => keywords.some(k => s.heir.toLowerCase().includes(k.toLowerCase())));
    if (formData.hasHusband) {
      const s = getShare(['husband', 'زوج']);
      if (s) list.push({ name: labels.husband, amount: s.amount, percentage: s.sharePercentage, fraction: s.shareFraction });
    }
    if (formData.wivesCount > 0) {
      const s = getShare(['wife', 'wives', 'زوجة', 'زوجات']);
      if (s) {
        const individualAmount = s.amount / formData.wivesCount;
        const individualPerc = s.sharePercentage / formData.wivesCount;
        for (let i = 1; i <= formData.wivesCount; i++) {
          list.push({
            name: formData.wivesCount > 1 ? `${labels.wife} ${i}` : labels.wife,
            amount: individualAmount,
            percentage: individualPerc,
            fraction: s.shareFraction,
          });
        }
      }
    }
    if (formData.hasFather) {
      const s = getShare(['father', 'أب']);
      if (s) list.push({ name: labels.father, amount: s.amount, percentage: s.sharePercentage, fraction: s.shareFraction });
    }
    if (formData.hasMother) {
      const s = getShare(['mother', 'أم']);
      if (s) list.push({ name: labels.mother, amount: s.amount, percentage: s.sharePercentage, fraction: s.shareFraction });
    }
    if (formData.sonsCount > 0) {
      const s = getShare(['son', 'sons', 'ابن', 'أبناء']);
      if (s) {
        const individualAmount = s.amount / formData.sonsCount;
        const individualPerc = s.sharePercentage / formData.sonsCount;
        for (let i = 1; i <= formData.sonsCount; i++) {
          list.push({
            name: formData.sonsCount > 1 ? `${labels.son} ${i}` : labels.son,
            amount: individualAmount,
            percentage: individualPerc,
            fraction: s.shareFraction,
          });
        }
      }
    }
    if (formData.daughtersCount > 0) {
      const s = getShare(['daughter', 'daughters', 'بنت', 'بنات', 'ابنة']);
      if (s) {
        const individualAmount = s.amount / formData.daughtersCount;
        const individualPerc = s.sharePercentage / formData.daughtersCount;
        for (let i = 1; i <= formData.daughtersCount; i++) {
          list.push({
            name: formData.daughtersCount > 1 ? `${labels.daughter} ${i}` : labels.daughter,
            amount: individualAmount,
            percentage: individualPerc,
            fraction: s.shareFraction,
          });
        }
      }
    }
    if (formData.fullBrothersCount > 0) {
      const s = getShare(['full brother', 'أخ شقيق']);
      if (s) {
        const individualAmount = s.amount / formData.fullBrothersCount;
        const individualPerc = s.sharePercentage / formData.fullBrothersCount;
        for (let i = 1; i <= formData.fullBrothersCount; i++) {
          list.push({ name: `${labels.brother} ${i}`, amount: individualAmount, percentage: individualPerc, fraction: s.shareFraction });
        }
      }
    }
    if (formData.fullSistersCount > 0) {
      const s = getShare(['full sister', 'أخت شقيقة']);
      if (s) {
        const individualAmount = s.amount / formData.fullSistersCount;
        const individualPerc = s.sharePercentage / formData.fullSistersCount;
        for (let i = 1; i <= formData.fullSistersCount; i++) {
          list.push({ name: `${labels.sister} ${i}`, amount: individualAmount, percentage: individualPerc, fraction: s.shareFraction });
        }
      }
    }
    return list;
  }, [results, formData, lang]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const res = await calculateInheritance(formData, lang);
      setResults(res);
      setView('results');
    } catch (error) {
      alert("Error calculating distribution. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  // --- Render Functions ---
  const renderHome = () => (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center text-center">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-8 animate-pulse">
        <Scale className="w-12 h-12 text-emerald-600" />
      </div>
      <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">{t('appName')}</h1>
      <p className="text-lg text-slate-600 mb-10 max-w-2xl">
        {lang === 'ar'
          ? "أداة سهلة وسريعة لمساعدتك في فهم توزيع المواريث حسب الشريعة الإسلامية. صُممت لتقديم معلومات واضحة ومبسطة للجميع."
          : "A quick and easy tool to help you understand inheritance distribution according to Islamic Sharia. Designed to provide clear and simplified information for everyone."}
      </p>
      <button
        onClick={() => setView('form')}
        className="px-10 py-4 bg-emerald-600 text-white rounded-full font-bold text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2 group"
      >
        {t('start')}
        {lang === 'ar' ? <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> : <ChevronRight className="group-hover:translate-x-1 transition-transform" />}
      </button>
    </div>
  );

  const renderForm = () => (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Step Indicator */}
      <StepIndicator currentStep={step} totalSteps={4} lang={lang} />

      {/* Step Content */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[450px] transition-all">
        {step === 1 && (
          <div className="space-y-8 flex flex-col items-center">
            <Languages className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">{t('step1Title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <button onClick={() => setLang('ar')} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-2 ${lang === 'ar' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                <span className="text-2xl font-bold font-arabic">العربية</span>
                <span className="text-slate-400 text-sm">Arabic</span>
              </button>
              <button onClick={() => setLang('en')} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-2 ${lang === 'en' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                <span className="text-2xl font-bold font-english">English</span>
                <span className="text-slate-400 text-sm">الإنجليزية</span>
              </button>
            </div>
          </div>
        )}
        {/* باقي الخطوات Step 2,3,4 هنا... */}
        {/* للتوفير، يمكنك نسخ باقي الكود السابق للخطوات وحقول الورثة */}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 && <button onClick={() => setStep(step - 1)} className="px-6 py-2 bg-slate-200 rounded">Back</button>}
          {step < 4 && <button onClick={() => setStep(step + 1)} className="px-6 py-2 bg-emerald-600 text-white rounded">Next</button>}
          {step === 4 && <button onClick={handleCalculate} className="px-6 py-2 bg-blue-600 text-white rounded">Calculate</button>}
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">{t('resultsTitle')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {individualHeirs.map((heir, idx) => (
          <div key={idx} className="p-4 bg-white border rounded-xl shadow-sm">
            <h3 className="font-bold">{heir.name}</h3>
            <p>{heir.amount.toLocaleString()} {formData.currency} ({heir.percentage.toFixed(2)}%)</p>
            <p className="text-sm text-slate-500">{heir.fraction}</p>
          </div>
        ))}
      </div>
      <button onClick={handleDownloadPDF} className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded">Download PDF</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {view === 'home' && renderHome()}
      {view === 'form' && renderForm()}
      {view === 'results' && renderResults()}
    </div>
  );
};

export default App;
