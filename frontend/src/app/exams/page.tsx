'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getApiUrl } from '@/config/api';

interface PublishedExam {
  id: string;
  title: string;
  courseCode: string;
  description?: string;
  duration: number;
  startDateTime: string;
  endDateTime: string;
  accessCode: string;
}

export default function PublishedExamsPage() {
  const [exams, setExams] = useState<PublishedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchExams() {
      try {
        const res = await fetch(`${getApiUrl()}/exams/published`);
        if (res.ok) {
          const data = await res.json();
          setExams(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchExams();
  }, []);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading exams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Available Exams</h1>
        <p className="text-muted-foreground mb-8">Select an exam to begin</p>

        {exams.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-lg">
            <p className="text-muted-foreground text-lg">No exams available at the moment</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{exam.title}</h3>
                    <p className="text-muted-foreground mb-2">{exam.courseCode}</p>
                    {exam.description && (
                      <p className="text-sm mb-4">{exam.description}</p>
                    )}
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Duration: {exam.duration} minutes</p>
                      <p>Starts: {formatDateTime(exam.startDateTime)}</p>
                      <p>Ends: {formatDateTime(exam.endDateTime)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/exam/${exam.accessCode}`)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                  >
                    Enter Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
