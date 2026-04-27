'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import axiosClient from '@/lib/axios';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Info } from 'lucide-react';

export default function CreateContestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPublic: true,
    startTime: '',
    endTime: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return null;
    const start = new Date(formData.startTime).getTime();
    const end = new Date(formData.endTime).getTime();
    const diff = end - start;
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { ms: diff, text: `${hours} hours ${minutes} minutes` };
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.title.trim()) {
        toast.error('Title is required');
        return;
      }
    } else if (step === 2) {
      if (!formData.startTime || !formData.endTime) {
        toast.error('Start and end times are required');
        return;
      }
      const start = new Date(formData.startTime).getTime();
      const end = new Date(formData.endTime).getTime();
      if (start <= Date.now()) {
        toast.error('Start time must be in the future');
        return;
      }
      if (end <= start) {
        toast.error('End time must be after start time');
        return;
      }
      const duration = end - start;
      if (duration < 30 * 60 * 1000) {
        toast.error('Contest duration must be at least 30 minutes');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.post('/api/contests', {
        title: formData.title,
        description: formData.description,
        isPublic: formData.isPublic,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      });
      toast.success('Contest created successfully!');
      router.push(`/contests/${response.data.contest.id}/manage`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create contest');
    } finally {
      setIsLoading(false);
    }
  };

  const duration = calculateDuration();

  return (
    <PageWrapper requireAuth>
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Create Contest</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Step {step} of 3</p>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Basic Information</h2>
                  <Input
                    label="Contest Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="E.g., Weekly Algorithm Challenge #42"
                    required
                  />
                </div>
                <div>
                  <Textarea
                    label="Description (Markdown supported)"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the rules, scoring, and prizes..."
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="font-medium text-slate-700 dark:text-slate-300">
                    Public Contest
                  </label>
                </div>
                {!formData.isPublic && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">This contest will be private. An invite link will be generated after creation for you to share with participants.</p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Schedule</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="datetime-local"
                    label="Start Time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    type="datetime-local"
                    label="End Time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                {duration && (
                  <div className={`p-4 rounded-lg text-sm font-medium flex items-center justify-between ${
                    duration.ms < 30 * 60 * 1000 
                      ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                      : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    <span>Calculated Duration: {duration.text}</span>
                    {duration.ms < 30 * 60 * 1000 && <span>⚠️ Minimum 30 minutes required</span>}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Review & Submit</h2>
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg space-y-4 text-sm">
                  <div className="grid grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <span className="text-slate-500 dark:text-slate-400">Title</span>
                    <span className="col-span-2 font-medium text-slate-900 dark:text-slate-100">{formData.title}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <span className="text-slate-500 dark:text-slate-400">Visibility</span>
                    <span className="col-span-2 font-medium text-slate-900 dark:text-slate-100">{formData.isPublic ? 'Public' : 'Private'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <span className="text-slate-500 dark:text-slate-400">Schedule</span>
                    <span className="col-span-2 font-medium text-slate-900 dark:text-slate-100">
                      {formData.startTime && format(new Date(formData.startTime), 'PPp')} <br/>
                      to <br/>
                      {formData.endTime && format(new Date(formData.endTime), 'PPp')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <span className="text-slate-500 dark:text-slate-400">Duration</span>
                    <span className="col-span-2 font-medium text-slate-900 dark:text-slate-100">{duration?.text}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button 
                variant="ghost" 
                onClick={() => setStep(s => s - 1)} 
                disabled={step === 1 || isLoading}
              >
                Back
              </Button>
              {step < 3 ? (
                <Button onClick={handleNext}>Next Step</Button>
              ) : (
                <Button onClick={handleSubmit} isLoading={isLoading}>Create Contest</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}